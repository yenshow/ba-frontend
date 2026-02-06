# 用戶登入與權限說明

本文件說明專案中用戶登入、認證狀態與角色權限的處理方式與設定。

---

## 一、架構概覽

| 層級 | 說明 |
|------|------|
| **類型定義** | `app/types/user.ts`：User、角色、登入/註冊型別 |
| **API 層** | `app/composables/systems/useUserApi.ts`：登入、取得當前用戶等 API |
| **認證狀態** | `app/composables/core/useAuth.ts`：Token、用戶、角色、登入/登出 |
| **請求層** | `app/composables/core/useApiBase.ts`：帶入 Token、401/403 處理 |
| **路由守衛** | `app/middleware/auth.global.ts`、`app/middleware/admin.ts` |
| **初始化** | `app/plugins/auth.client.ts`：客戶端恢復登入狀態 |

---

## 二、用戶與角色類型

定義於 `app/types/user.ts`：

- **User**
  - `id`, `username`, `email`
  - **role**：`"admin"` \| `"operator"` \| `"viewer"`
  - **status**：`"active"` \| `"inactive"` \| `"suspended"`
  - `created_at`, `updated_at`（可選）

- **LoginCredentials**：`username`, `password`

- **LoginResponse**：`message`, `user`, `token`

角色階層（由高到低）：

- **admin**：管理員，最高權限
- **operator**：操作員（含 admin 權限的判斷時通常與 admin 一併處理）
- **viewer**：檢視者（含 operator/admin）

---

## 三、認證狀態：`useAuth`

**檔案**：`app/composables/core/useAuth.ts`

### 3.1 儲存方式

- **Cookie**
  - `auth_token`：JWT 或後端發放的 token
  - `auth_user`：當前用戶物件（含 role）
  - 選項：`maxAge` 7 天、`secure` 僅在 production、`sameSite: "strict"`、`httpOnly: false`

- **Nuxt state**（與 cookie 同步）
  - `useState("auth_user")`、`useState("auth_token")` 供全站讀取

### 3.2 對外介面

| 屬性/方法 | 說明 |
|-----------|------|
| `user` | 當前用戶（readonly） |
| `token` | 當前 token（readonly） |
| `isAuthenticated` | 是否已登入（有 token 且有用戶） |
| `isAdmin` | `user.role === "admin"` |
| `isOperator` | `user.role === "operator"` 或 `"admin"` |
| `isViewer` | `user.role === "viewer"` 或為 operator/admin |
| `login(credentials)` | 呼叫登入 API，成功後寫入 token 與 user |
| `logout()` | 清空 token 與 user（cookie + state） |
| `fetchUser()` | 呼叫 `/users/me` 更新當前用戶 |
| `init()` | 從 cookie 恢復 state，若有 token 則呼叫 `getMe` 刷新用戶 |

### 3.3 登入流程（useAuth 側）

1. 呼叫 `userApi.login(credentials)`（POST `/users/login`）。
2. 成功後：寫入 `auth_token`、`auth_user` 到 cookie 與 state。
3. 失敗：執行 `logout()` 並拋錯。

---

## 四、API 請求與錯誤處理：`useApiBase`

**檔案**：`app/composables/core/useApiBase.ts`

### 4.1 認證 Header

- 從 Cookie `auth_token` 讀取 token（含非 Vue 情境的 fallback，如 `document.cookie`）。
- 若有 token：`Authorization: Bearer <token>`。
- 所有透過 `useApiBase().request()` 的 API 都會自動帶上上述 header。

### 4.2 狀態碼處理（與權限相關）

- **401**
  - 呼叫 `useAuth().logout()` 清空登入狀態。
  - 若在客戶端：`router.push({ path: "/login", query: { redirect: currentPath } })`。
  - 拋出錯誤訊息：「登入已過期，請重新登入」。

- **403**
  - 拋出：「權限不足，無法執行此操作」（或後端回傳的訊息）。

其他 400/404/500/503 等亦有統一錯誤訊息，不在此重複。

---

## 五、路由中間件

### 5.1 全域認證：`auth.global.ts`

**檔案**：`app/middleware/auth.global.ts`

- **公開路由**：`PUBLIC_ROUTES = ["/login"]`，不檢查登入。
- **其餘路由**：
  - 若 `!isAuthenticated.value`，導向 `/login?redirect=<to.fullPath>`。
- 因此除了 `/login` 外，所有頁面都需先通過「已登入」檢查。

### 5.2 管理員權限：`admin.ts`

**檔案**：`app/middleware/admin.ts`

- **職責**：只做「是否為管理員」檢查；認證由 `auth.global.ts` 負責。
- **邏輯**：若 `!isAdmin.value`，`navigateTo("/")` 導回首頁。
- **使用方式**：在需要「僅管理員可進入」的頁面加上：

  ```ts
  definePageMeta({
    middleware: ["admin"],
    // ...
  });
  ```

- **目前狀態**：專案中尚無任何頁面在 `definePageMeta` 內使用 `middleware: "admin"`，即目前沒有「路由級」的 admin-only 頁面；管理員專用行為多以「元件內 `isAdmin`」控制。

---

## 六、客戶端認證初始化：`auth.client.ts`

**檔案**：`app/plugins/auth.client.ts`

- 僅在客戶端執行。
- 每次載入 SPA 時呼叫 `useAuth().init()`：
  - 從 cookie 還原 `token`、`user` 到 state。
  - 若有 token 與 user，再呼叫 `userApi.getMe()` 更新用戶；失敗時由 `useApiBase` 的 401 處理負責登出與導向登入頁。

---

## 七、登入頁與登出

### 7.1 登入頁 `app/pages/login.vue`

- **layout**：`layout: false`（無共用 layout）。
- **已登入時**：`onMounted` 中若 `isAuthenticated.value` 為 true，導向 `route.query.redirect` 或 `/`。
- **登入成功**：呼叫 `useAuth().login()`，成功後 `router.push(redirect || "/")`，並顯示成功 toast。
- **錯誤**：透過 `useErrorHandler` 顯示訊息；`useUserApi` 會將登入相關錯誤統一為「用戶名或密碼錯誤」。

### 7.2 登出

- **觸發**：
  - 使用者點擊 Header 等處的登出按鈕時呼叫 `useAuth().logout()`。
  - API 回傳 401 時由 `useApiBase` 呼叫 `logout()` 並導向登入頁。
- **效果**：清空 `auth_token`、`auth_user` 的 cookie 與 state。

---

## 八、權限在頁面/元件中的使用

目前權限以「元件內依角色顯示/隱藏」為主，而非一律用路由中間件擋下。

| 頁面/元件 | 使用方式 |
|-----------|----------|
| **AppHeader** | `user`、`isAdmin`、`logout`；顯示用戶名、角色標籤（管理員/操作員/檢視者）、登出。 |
| **core/users.vue** | `isAdmin`：僅管理員顯示「新增用戶」、表格「操作」欄（編輯/刪除）。非管理員仍可進入頁面，僅看不到這些操作。 |
| **core/equipment-management.vue** | `isAdmin`：僅管理員顯示新增/編輯/刪除等 UI，並傳 `is-admin` 給子元件。 |
| **core/area-point-map.vue** | `isAdmin`：部分功能僅在 `isAdmin` 時顯示。 |
| **core/alert-log.vue** | `isAdmin`：與警示忽略等操作相關的 UI。 |

若希望「僅管理員可進入某頁」，需在該頁加上：

```ts
definePageMeta({
  middleware: ["admin"],
  // ...
});
```

---

## 九、使用者管理 API（與權限相關）

**檔案**：`app/composables/systems/useUserApi.ts`

- **登入**：`POST /users/login`，回傳 `LoginResponse`（含 `user`、`token`）。
- **取得當前用戶**：`GET /users/me`，用於 `init()` 與 `fetchUser()`。
- **用戶列表/更新/刪除**：由後端依 token 判斷是否為管理員；前端在「使用者管理」頁用 `isAdmin` 控制是否顯示新增/編輯/刪除。

登入錯誤在 `useUserApi` 內被統一為「用戶名或密碼錯誤」，以利 UX。

---

## 十、流程整理

1. **首次造訪**：`auth.global` 發現未登入 → 導向 `/login?redirect=...`。
2. **登入**：輸入帳密 → `useAuth().login()` → `useUserApi().login()` → 成功後寫入 token/user → 導向 `redirect` 或 `/`。
3. **每次客戶端載入**：`auth.client` 執行 `useAuth().init()` → 從 cookie 還原並可選呼叫 `getMe()`。
4. **每次路由**：`auth.global` 檢查 `isAuthenticated`；若頁面設了 `middleware: "admin"`，再檢查 `isAdmin`。
5. **API 請求**：`useApiBase` 自動帶上 `Authorization: Bearer <token>`；收到 401 則登出並導向登入頁，403 則顯示權限不足。

---

## 十一、注意事項與建議

- **Cookie 安全**：目前 `httpOnly: false`，token 可被前端 JS 讀取；若後端改為 HttpOnly cookie 認證，需配合後端與 CORS 設定調整。
- **admin 中間件**：若需「僅管理員可進入」的頁面（例如完整的使用者管理），建議在該頁加上 `middleware: ["admin"]`，與現有 `isAdmin` UI 並用，避免非管理員直接改網址進入。
- **角色擴充**：新增角色時需同步修改 `app/types/user.ts` 的 `User.role` 型別，以及 `useAuth` 的 `isAdmin` / `isOperator` / `isViewer` 邏輯（若新角色要納入既有階層）。

以上為目前用戶登入與權限的處理與設定說明。
