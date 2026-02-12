# 人員管理前端實作規劃

## 1. 概述

本文件規劃 **人員管理** 功能在前端（Nuxt 4 + Vue 3 + Tailwind）的實作方式，對接後端 `/api/personnel`：人員群組、人員主檔、門禁權限（可進出地點）、可同步地點、同步觸發、批次匯入。

**後端對應**：`ba-backend` 的 `PERSONNEL_DATABASE_AND_PEOPLE_COUNTING_PLAN.md` 與已實作 API。

---

## 2. 技術棧與既有模式

- **框架**：Nuxt 4、Vue 3、TypeScript、Tailwind。
- **API**：`useApiBase().request()`，認證透過 Cookie `auth_token`，統一錯誤與 401 處理。
- **頁面風格**：與 `users.vue`、`people-counting.vue` 一致：標題區、表格/卡片、彈窗表單、`useDataLoader` 或手動 `load`、`useToast` / `useErrorHandler`、`useAuth`（isAdmin / isOperator）。
- **導航**：`system-modules.ts` 註冊模組，`BottomNavigation` 依模組顯示；新增「人員管理」需加入模組並提供圖標。

---

## 3. 功能範圍與頁面結構

### 3.1 功能清單

| 功能 | 說明 | 後端 API |
|------|------|-----------|
| 人員群組 CRUD | 列表、新增、編輯、刪除（有引用時不可刪） | GET/POST/PUT/DELETE `/api/personnel/groups` |
| 人員 CRUD | 列表（篩選：群組、狀態、員工編號、姓名）、新增、編輯、刪除、依員工編號查詢 | GET/POST/PUT/DELETE `/api/personnel/persons`，GET `by-employee-no/:no` |
| 門禁權限 | 查詢某人員可進出之地點；覆寫為多選地點 | GET/PUT `/api/personnel/persons/:id/access-locations` |
| 可同步地點 | 取得具門禁入口設備之地點列表（用於同步、權限選單） | GET `/api/personnel/syncable-locations` |
| 同步 | 單一地點同步、全部地點同步（同步執行，完成後回傳） | POST `sync-location/:id`、POST `sync-all-locations` |
| 批次匯入 | JSON 上傳，回傳建立筆數與錯誤行 | POST `/api/personnel/import` |

### 3.2 頁面結構建議

**單一頁面**：`/core/personnel`（人員管理）

- **區塊一：人員群組**
  - 群組列表（表格：名稱、說明、操作）。
  - 新增 / 編輯群組（彈窗表單：name, description）。
  - 刪除前檢查（後端會回傳錯誤若有人員引用）。

- **區塊二：人員列表**
  - 篩選：群組（下拉）、狀態（啟用/停用/刪除）、員工編號/姓名（關鍵字）。
  - 表格：員工編號、姓名、所屬群組、狀態、操作（編輯、刪除、設定門禁權限）。
  - 新增 / 編輯人員（彈窗：employeeNo, fullName, personGroupId, status）。

- **區塊三：門禁權限（依人員）**
  - 點選「設定門禁權限」後開彈窗：顯示該人員可進出之地點列表，可多選/取消勾選地點（資料來源為「可同步地點」或完整地點列表，依後端是否只允許 syncable 而定），儲存時呼叫 `PUT persons/:id/access-locations`。

- **區塊四：設備同步（可選獨立區塊或放在頂部操作列）**
  - 顯示「可同步地點」列表（地點名稱、所屬區域）。
  - 按鈕：「同步全部」、每筆地點「同步」。
  - 同步為同步執行，需 loading 與逾時提示（若人數多可能較久）。

- **區塊五：批次匯入（可選）**
  - 上傳 JSON（格式見後端）或未來 Excel；顯示匯入結果（成功筆數、錯誤行）。

可依版面需要改為 **Tab**（群組 | 人員 | 同步）或 **上下/左右分區**，與現有 `users.vue`、`people-counting.vue` 風格一致即可。

---

## 4. 資料型別（types）

**新增** `app/types/personnel.ts`：

```ts
// 人員群組
export interface PersonGroup {
  id: number;
  name: string;
  description?: string | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

// 人員
export interface Person {
  id: number;
  employee_no: string;
  full_name?: string | null;
  person_group_id?: number | null;
  group_name?: string | null;  // 後端 JOIN 回傳
  status: "active" | "inactive" | "deleted";
  face_url?: string | null;
  config?: Record<string, unknown> | null;
  created_by?: number | null;
  user_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

// 門禁權限：人員可進出之地點
export interface AccessLocation {
  location_id: number;
  location_name: string;
  zone_name: string;
  zone_id: number;
}

// 可同步地點
export interface SyncableLocation {
  id: number;
  name: string;
  zone_name: string;
}

// 取得門禁權限回傳
export interface AccessLocationsResponse {
  person: { id: number; employeeNo: string; fullName: string };
  locations: AccessLocation[];
}

// 匯入請求單筆
export interface ImportPersonRow {
  employeeNo: string;
  fullName?: string;
  personGroupId?: number;
  locationIds?: number[];
}
```

---

## 5. API Composable

**新增** `app/composables/systems/usePersonnelApi.ts`：

- 使用 `useApiBase().request`，路徑前綴 `/personnel`。
- 方法建議：
  - `getPersonGroups(params?)` → GET `/personnel/groups`
  - `getPersonGroupById(id)` → GET `/personnel/groups/:id`
  - `createPersonGroup(body)` → POST `/personnel/groups`
  - `updatePersonGroup(id, body)` → PUT `/personnel/groups/:id`
  - `deletePersonGroup(id)` → DELETE `/personnel/groups/:id`
  - `getPersons(params?)` → GET `/personnel/persons`（query: personGroupId, status, employeeNo, fullName）
  - `getPersonById(id)` → GET `/personnel/persons/:id`
  - `getPersonByEmployeeNo(no)` → GET `/personnel/persons/by-employee-no/:no`
  - `createPerson(body)` → POST `/personnel/persons`
  - `updatePerson(id, body)` → PUT `/personnel/persons/:id`
  - `deletePerson(id)` → DELETE `/personnel/persons/:id`
  - `getAccessLocations(personId)` → GET `/personnel/persons/:personId/access-locations`
  - `setAccessLocations(personId, locationIds)` → PUT `/personnel/persons/:personId/access-locations`，body: `{ locationIds }`
  - `getSyncableLocations()` → GET `/personnel/syncable-locations`
  - `syncLocation(locationId)` → POST `/personnel/sync-location/:locationId`
  - `syncAllLocations()` → POST `/personnel/sync-all-locations`
  - `importPersons(body)` → POST `/personnel/import`，body: `{ persons: ImportPersonRow[] }`

回傳型別與後端一致（含 `sendSuccess` 解包後的 `data`）。

---

## 6. 路由與導航

- **路由**：新增頁面 `app/pages/core/personnel.vue`，路徑 `/core/personnel`。
- **模組**：在 `app/config/system-modules.ts` 新增一筆（建議放在 core）：
  - `name: "人員管理"`，`route: "/core/personnel"`，`category: "core"`，`icon` 可沿用現有（例如 `user-management` 與使用者管理區分時改用 `people-counting` 或新增 `personnel`）。
- **權限**：讀取列表/單筆可依現有登入即可；新增/編輯/刪除/同步/匯入建議僅 **管理員或操作員**（與後端一致），頁面內依 `useAuth().isOperator` 控制按鈕顯示。

---

## 7. 組件與 UI 要點

- **表格**：與 `users.vue` 類似，表頭/表格樣式、操作欄（編輯、刪除、設定門禁權限）。
- **表單**：彈窗（Teleport + Transition），表單欄位與後端欄位對應；必填驗證（如員工編號、群組名稱）。
- **門禁權限彈窗**：多選地點（checkbox 或 multi-select），選項來自 `getSyncableLocations()` 或統一地點 API；儲存時呼叫 `setAccessLocations`。
- **同步**：按鈕點擊後設 loading，呼叫 `syncLocation(id)` 或 `syncAllLocations()`，成功 toast、失敗用 `useErrorHandler`；若後端執行較久，可考慮延長 request timeout 或提示「同步中請稍候」。
- **批次匯入**：可先做 JSON 貼上或上傳 JSON 檔，解析為 `{ persons: [...] }` 呼叫 `importPersons`，顯示回傳的 `created`、`errors`。

與現有專案一致：使用 `useToast`、`useErrorHandler`、`useConfirmDialog`（若有）、Tailwind 樣式、必要時 `useDataLoader` 做列表載入與分頁。

---

## 8. 實作順序建議

1. **types**：新增 `app/types/personnel.ts`。
2. **composable**：新增 `app/composables/systems/usePersonnelApi.ts`，對接上述 API。
3. **模組與路由**：在 `system-modules.ts` 新增「人員管理」，新增 `app/pages/core/personnel.vue`（先空白或靜態標題）。
4. **人員群組**：群組列表、新增/編輯/刪除彈窗與表單。
5. **人員**：人員列表（含篩選）、新增/編輯/刪除、依員工編號查詢（可選）。
6. **門禁權限**：取得可同步地點、門禁權限取得/覆寫、設定權限彈窗（多選地點）。
7. **同步**：可同步地點列表、同步單一/全部按鈕與 loading、錯誤處理。
8. **批次匯入**：JSON 匯入表單與結果顯示（可選）。

---

## 9. 與人流統計頁面的關係

- **人流統計**（`/construction-monitoring/people-counting`）：建立區域、地點，並為地點配對 **入口/出口門禁設備**（現有 people_counting location 設定）。
- **人員管理**（`/core/personnel`）：建立群組、人員，並為人員設定 **門禁權限**（可進出的地點）；同步時依權限將人員寫入各地點之入口/出口設備。
- 兩邊不需同頁面：人流頁專注地點與設備；人員頁專注人員與權限；「可同步地點」來自人流地點中已設定門禁設備者。

---

## 10. 參考

- 後端規劃：`ba-backend/docs/PERSONNEL_DATABASE_AND_PEOPLE_COUNTING_PLAN.md`
- 後端 API：`ba-backend/src/routes/personnelRoutes.js`
- 前端範例：`app/pages/core/users.vue`、`app/composables/systems/useUserApi.ts`、`app/composables/systems/useAccessControlApi.ts`
