# 角色與權限設計說明（Role vs Permission）

本文檔說明系統中「三角色 RBAC」與「細粒度權限樹」的關係、設計原則與實作規範。

---

## 一、設計目標

- **同時滿足兩種需求**：
  - 既有的「三角色」簡單 RBAC：`admin` / `operator` / `viewer`
  - 細粒度、可勾選的「權限樹」UI（依功能點授權）
- **核心原則**：
  - **只有 Admin 可以管理「使用者帳號 + 權限」**
  - 實際功能判斷以「權限（permissions）」為準，不單看角色名稱

---

## 二、核心概念

### 2.1 角色（Role）

- **定義**：一組「預設權限組合」的模板。
- **系統內預設角色**：
  - `admin`：擁有全部權限的模板
  - `operator`：日常操作人員的預設權限組合
  - `viewer`：僅瀏覽資料的預設權限組合

- **用途**：
  - 建立新帳號時，選擇角色 → 自動帶入對應的預設權限
  - 後續 Admin 可透過「權限樹」針對個別帳號微調（加減權限）

### 2.2 權限（Permission）

- **定義**：實際授權的「功能點」，以字串標識。例如：
  - `user.view`、`user.manage`
  - `device.view`、`device.manage`
  - `alarm.rule.view`、`alarm.rule.edit`
  - `area.view`、`area.manage`
  - `report.view`、`report.export`
  - `system.config`
  - …（依模組擴充）

- **系統實作**：
  - 每個使用者擁有一個 `permissions: string[]`
  - 前後端「是否允許某操作」一律以 `permissions` 判斷：
    - 有該權限 → 允許
    - 無 → 禁止

### 2.3 角色 vs 權限 的關係

| 概念     | 說明 |
|----------|------|
| **角色** | 權限的「預設組合」；建立帳號時選角色 = 套用一組預設 permission |
| **權限** | 實際控制「能做什麼」的依據；系統邏輯只看 `permissions[]` |

- 角色用來「快速建立合理預設」與溝通（例如：「viewer = 純看」）
- 權限用來「精準控制實際可做什麼」，可針對單一帳號微調

---

## 三、使用情境與規則

### 3.1 誰可以管理「用戶 + 權限」？

- **唯一：Admin**
  - 只有 `role = "admin"` 的使用者可以：
    - 進入「使用者管理」頁面
    - 開啟「權限樹 / 權限設定」對話框
    - 呼叫使用者 / 權限相關 API（新增、修改、刪除使用者、變更權限）

- **非 Admin（含 operator / viewer）不得**：
  - 看見「用戶管理」入口
  - 開啟任何「權限設定」UI
  - 呼叫相關後端 API（前端隱藏 + 後端二次驗證）

### 3.2 建立新帳號流程

1. Admin 進入「用戶管理」頁面，新增使用者。
2. 填寫基本資料（帳號、姓名、部門…）並選擇 **角色**：`admin` / `operator` / `viewer`。
3. 系統依角色套用 **預設 permission 套餐**：
   - **viewer**：唯讀權限（各模組 `*.view`）
   - **operator**：日常操作權限（設備、人員、門禁、場域、報表…，不含用戶/權限管理）
   - **admin**：全部權限
4. Admin 可選擇是否開啟「權限樹 UI」微調該帳號的勾選（加權限或減權限）。

### 3.3 權限樹（Permission Tree）UI

- **說明**：以模組 / 功能分類列出所有可用權限，每個節點可勾選。
- **存取規則**：
  - **僅 Admin** 可看到「權限設定」按鈕並開啟權限樹對話框。
  - **Operator / Viewer** 完全沒有入口；後端也應拒絕相關 API，防止繞過前端。

---

## 四、前端實作規範

### 4.1 UI 顯示邏輯

| 項目 | 規則 |
|------|------|
| 用戶管理入口（如 `core/users.vue`） | 僅在目前登入者為 Admin 時顯示（或具 `user.manage` 等管理權限） |
| 權限設定對話框（如 `PermissionSettingsDialog.vue`） | 僅 Admin 可看到觸發按鈕並開啟 |
| 權限樹內容 | 顯示完整可勾選權限，僅 Admin 可儲存變更 |

### 4.2 權限檢查方式

- **頁面層級**：進入「用戶管理」前，檢查是否具備 `user.manage` 或 Admin 身份；否則導回首頁或顯示無權限。
- **元件 / 按鈕層級**：依 `permissions` 決定是否顯示或啟用，例如：
  - `canEditAlarmRule = permissions.includes("alarm.rule.edit")`
  - 僅在 `canEditAlarmRule` 時顯示「編輯告警規則」按鈕。

### 4.3 使用者資料結構（示意）

```ts
type UserRole = "admin" | "operator" | "viewer";

type UserPermission =
  | "user.view"
  | "user.manage"
  | "device.view"
  | "device.manage"
  | "alarm.rule.view"
  | "alarm.rule.edit"
  | "area.view"
  | "area.manage"
  | "report.view"
  | "report.export"
  | "system.config";
  // ... 依模組擴充

type User = {
  id: string;
  name: string;
  role: UserRole;
  permissions: UserPermission[];
};
```

---

## 五、後端實作規範

### 5.1 權限驗證策略

- **Admin 專用 API（用戶 / 權限管理）**：
  - 例如：`POST /users`、`PUT /users/:id`、`DELETE /users/:id`、`PUT /users/:id/permissions`
  - 一律使用 **requireAdmin**（或等效：僅 `role === "admin"` 或具 `user.manage` 者通過）。
  - 不再使用「Admin 或 Operator 皆可」的邏輯。

- **一般功能 API**：
  - 依對應的 Permission 驗證，例如 `requirePermission("device.manage")`、`requirePermission("alarm.rule.edit")` 等。

### 5.2 角色 → 預設權限對應

後端維護「角色 → 預設權限」對應表，建立使用者時依 `role` 寫入對應的 `permissions[]`：

```ts
const roleDefaultPermissions: Record<UserRole, UserPermission[]> = {
  admin: ALL_PERMISSIONS,
  operator: [
    "user.view",
    "device.view", "device.manage",
    "alarm.rule.view", "alarm.rule.edit",
    "area.view", "area.manage",
    "report.view",
    // ... 其他日常操作權限
  ],
  viewer: [
    "user.view",
    "device.view",
    "alarm.rule.view",
    "area.view",
    "report.view",
    // ... 其他唯讀權限
  ],
};
```

- 新增使用者：依 `role` 從表中取得預設 `permissions` 寫入 DB。
- Admin 在權限樹調整後：以使用者為單位更新 `permissions[]`（覆寫或增量依實作決定）。

---

## 六、系統行為總結

| 項目 | 說明 |
|------|------|
| **角色** | 保留 admin / operator / viewer，作為「預設模板」與溝通用名稱 |
| **權限** | 實際控制「能做什麼」；可透過權限樹對單一帳號微調 |
| **Admin 專屬** | 管理用戶、開啟權限樹、調整任何人的權限 |
| **Operator / Viewer** | 不可管理人員與權限，僅在既有權限內操作系統 |

---

## 七、與現有文檔的關係

- **本文檔**：定義「角色 vs 權限」的設計與規則（誰能管權限、角色如何對應預設權限）。
- **USER_PERMISSION_VERIFICATION_SCENARIOS.md**：可依本設計更新為「以 permissions 為準」的驗證情境，並明確標註「用戶管理與權限樹僅 Admin」。

---

*最後更新：依專案需求整理。*
