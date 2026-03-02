# 人員管理前端實作規劃

## 1. 概述

本文件規劃 **人員管理** 前端（Nuxt 4 + Vue 3 + Tailwind）實作，對接後端 `/api/personnel`：人員群組、人員主檔、門禁權限、可同步地點、同步、批次匯入。

**後端對應**：`ba-backend` 的 `PERSONNEL_DATABASE_AND_PEOPLE_COUNTING_PLAN.md` 與已實作 API。

---

## 2. 整體資料流程

三系統依序配合，資料流如下：

| 順序 | 系統         | 頁面                                                    | 職責                                                                                                                                                                                   |
| ---- | ------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **設備系統** | `app/pages/core/equipment-management.vue`               | 新增 **門禁設備**（type_code: access_control）                                                                                                                                         |
| 2    | **人員系統** | `app/pages/core/personnel.vue`（本功能）                | 新增群組與人員，配對 **門禁權限**（可進出之地點）；權限選單中的「可進出地點」來自後端可同步地點；**門禁設備**列表與設備管理頁一致，由設備系統維護，人員管理僅做「人員 ↔ 地點」權限配對 |
| 3    | **人流統計** | `app/pages/construction-monitoring/people-counting.vue` | 新增區域與地點，為地點 **配對門禁設備**（入口/出口設備 ID）                                                                                                                            |

- **門禁權限的設備來源**：人員管理在設定「可進出地點」時，地點是否具門禁入口設備由後端「可同步地點」決定；這些地點所綁定的門禁設備，來自 **設備管理頁**（`equipment-management.vue`）所新增的門禁設備。亦即設備管理負責設備主檔，人員管理負責人員與地點權限，人流統計負責地點與設備綁定。
- **可同步地點**：為人流統計中已設定門禁入口/出口設備的地點，供人員管理做權限選項與同步目標。

---

## 3. 技術棧與頁面風格

- **框架**：Nuxt 4、Vue 3、TypeScript、Tailwind；API 用 `useApiBase().request()`，認證 Cookie `auth_token`，統一錯誤與 401 處理。
- **頁面風格**：參考 **`app/pages/core/users.vue`** — 標題區、主內容區（表格/卡片）、彈窗表單、`useDataLoader`、`useToast` / `useErrorHandler`、`useAuth`（isAdmin / isOperator）。表格與彈窗樣式（如 `tableHeaderClass`、`dialog-panel-bg`、`form-input`、`btn-primary`）與 users 一致。
- **導航**：`app/config/system-modules.ts` 註冊模組；入口為 **`app/components/common/BottomNavigation.vue`** 的 **「更多功能」→ 人員管理**，路由 `/core/personnel`。若目前「人員管理」指向使用者管理，改為人員管理 → `/core/personnel`，使用者管理保留在「用戶設定」→ `/core/users`。

---

## 4. 功能範圍與頁面區塊

### 4.1 功能與 API 對照

| 功能          | 說明                                                                    | 後端 API                                                               |
| ------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 人員群組 CRUD | 列表、新增、編輯、刪除（有引用時不可刪）                                | GET/POST/PUT/DELETE `/api/personnel/groups`                            |
| 人員 CRUD     | 列表（篩選：群組、狀態、工號、姓名）、新增、編輯、刪除                  | GET/POST/PUT/DELETE `/api/personnel/persons`，GET `by-employee-no/:no` |
| 門禁權限      | 查詢/覆寫人員可進出之地點（選項來自可同步地點；門禁設備由設備管理維護） | GET/PUT `/api/personnel/persons/:id/access-locations`                  |
| 可同步地點    | 具門禁入口設備之地點（用於權限選單、同步）                              | GET `/api/personnel/syncable-locations`                                |
| 同步          | 單一/全部地點同步（將人員寫入各地點門禁設備）                           | POST `sync-location/:id`、POST `sync-all-locations`                    |
| 批次匯入      | JSON 上傳，回傳建立筆數與錯誤行                                         | POST `/api/personnel/import`                                           |

### 4.2 頁面區塊（單頁 `/core/personnel`）

- **人員群組**：表格（名稱、說明、操作），新增/編輯/刪除彈窗（name, description）。
- **人員列表**：篩選（群組、狀態、工號/姓名），表格（工號、姓名、群組、狀態、操作），新增/編輯/刪除；操作含「設定門禁權限」。
- **門禁權限**：點「設定門禁權限」開彈窗，多選可進出地點（選項來自 `getSyncableLocations()`），儲存 `PUT persons/:id/access-locations`。門禁設備本身在 **設備管理**（`equipment-management.vue`）維護，此地點列表對應的設備即該處的門禁設備。
- **設備同步**：可同步地點列表、「同步全部」/單筆「同步」、loading 與逾時提示。
- **批次匯入**（可選）：JSON 上傳，顯示成功筆數與錯誤行。

版面可用 Tab（群組 | 人員 | 同步）或分區，與 users / people-counting 風格一致即可。

---

## 5. 資料型別與 API Composable

### 5.1 Types（`app/types/personnel.ts`）

- `PersonGroup`：id, name, description?, created_by?, created_at?, updated_at?
- `Person`：id, employee_no, full_name?, person_group_id?, group_name?, status, face_url?, config?, user_id?, created_at?, updated_at?
- `AccessLocation`：location_id, location_name, zone_name, zone_id
- `SyncableLocation`：id, name, zone_name
- `AccessLocationsResponse`：person, locations
- `ImportPersonRow`：employeeNo, fullName?, personGroupId?, locationIds?

### 5.2 Composable（`app/composables/systems/usePersonnelApi.ts`）

- 使用 `useApiBase().request`，路徑前綴 `/personnel`。
- 方法：getPersonGroups、getPersonGroupById、createPersonGroup、updatePersonGroup、deletePersonGroup；getPersons、getPersonById、getPersonByEmployeeNo、createPerson、updatePerson、deletePerson；getAccessLocations、setAccessLocations；getSyncableLocations；syncLocation、syncAllLocations；importPersons。回傳型別與後端一致。

---

## 6. 與人流統計的整合

- **人員管理**負責：群組/人員 CRUD、門禁權限（可進出地點）、同步至門禁設備、批次匯入。**門禁設備**由 **設備管理**（`equipment-management.vue`）新增與維護。
- **人流統計**負責：區域與地點建立、**地點與門禁設備的綁定**（入口/出口設備 ID）。
- **已精簡**：`PeopleCountingLocationFields` 在「門禁設備（本系統）」下已移除入口/出口設備人員面板與人員群組交集編輯，改為說明文字導向人員管理；YSCP 資料庫流程不變。可同步地點仍為人流統計中已綁定門禁設備的地點。

---

## 7. 實作順序與參考

1. 新增 `app/types/personnel.ts`
2. 新增 `app/composables/systems/usePersonnelApi.ts`
3. `system-modules.ts` 新增人員管理、`app/pages/core/personnel.vue`（空白或靜態標題）
4. 人員群組 CRUD
5. 人員 CRUD + 門禁權限彈窗（地點選項用 getSyncableLocations；門禁設備來自設備管理）
6. 可同步地點列表、同步單一/全部
7. 批次匯入（可選）

**參考**：後端 `ba-backend/docs/PERSONNEL_DATABASE_AND_PEOPLE_COUNTING_PLAN.md`、`personnelRoutes.js`；前端 `users.vue`（頁面結構）、`BottomNavigation.vue`（導航）、`equipment-management.vue`（門禁設備來源）、`people-counting.vue`、`ZoneManagementDialog.vue`、`PeopleCountingLocationFields.vue`（整合調整）。
