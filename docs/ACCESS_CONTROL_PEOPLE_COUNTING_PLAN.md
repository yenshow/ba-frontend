# 門禁設備與人流統計前端實作規劃

## 1. 架構原則

- **同一頁面、同一呈現**：門禁設備與現有人流統計共用 **人流統計管理** 頁面（`/construction-monitoring/people-counting`）及相同元件（地點列表、統計面板、進出記錄表、單位列表等）。
- **差異在「資料建置」**：僅在 **地點管理** 內的「資料來源」與「建置步驟」不同；建置完成後，同一套元件與頁面呈現即可套用。

---

## 2. 兩種資料建置流程對照

| 步驟 | 人流統計（YSCP） | 門禁設備（ISAPI） |
|------|------------------|-------------------|
| 1 | 在人流統計系統建立地點資料 | 在**設備管理**頁面新增門禁設備（類型：門禁設備，型號：如 AC-02 / AC-07） |
| 2 | 選擇 **YSCP 資料庫**中的出入口設備（`deviceaccess.door`） | 在人流統計系統建立地點後，選擇**本系統門禁設備**（`/api/devices?type_code=access_control`）作為入口／出口 |
| 3 | 勾選人員群組（從 **YSCP** `platform.person_group` 抓取） | **手動建立人員群組**（本系統或設備端管理） |
| 4 | — | 使用 **ISAPI** 建立人員資料與人臉資料（後端 5 支 API：搜尋、修改、刪除人員、上傳人臉、設備截圖） |

建置完成後，不論 YSCP 或門禁設備，皆使用相同：
- 地點選擇與區域管理
- 統計面板（進／出／在場人數）
- 進出場記錄表
- 進場單位與人員名單

---

## 3. 前端實作項目總覽

### 3.1 設備管理頁（與門禁設備建置相關）

| 項目 | 說明 |
|------|------|
| 設備類型 | 後端已有 `access_control`（門禁設備）；前端設備類型下拉／Tab 需包含此類型（若目前為靜態列表，改為依後端 `GET /api/devices/types` 動態顯示）。 |
| 設備型號 | 支援「門禁設備」類型之型號（如 AC-02、AC-07）。型號的 `config` 可含 `isapi.captureFaceData`（如 `dataType: "url"` / `"binary"`），由前端在型號表單中提供編輯（可為 JSON 或個別欄位）。 |
| 新增／編輯設備 | 當類型為「門禁設備」時，表單欄位：`host`（必填）、`port`（選填，預設 80）、`username`（必填）、`password`（必填）。可沿用現有 `DeviceDialog`，新增 `deviceTypeCode === 'access_control'` 的區塊。 |

**參考**：後端 `devices.config` 與 `device_models.config` 結構見 [ACCESS_CONTROL_DEVICE_DESIGN.md](../../ba-backend/docs/ACCESS_CONTROL_DEVICE_DESIGN.md)。

### 3.2 人流統計地點設定（資料來源分流）

目前人流地點的系統配置為 `PeopleCountingSystemConfig`（`entryDoorId`、`exitDoorId`、`personGroupIds`），資料來源為 YSCP。

- **擴充方向**（二擇一或並存）：
  - **方案 A**：同一 `people_counting` 系統類型，在 config 中增加「資料來源」欄位，例如：
    - `dataSource: 'yscp' | 'access_control'`
    - YSCP：維持現有 `entryDoorId`、`exitDoorId`（YSCP door id）、`personGroupIds`（YSCP person_group id）
    - 門禁：新增 `entryDeviceId`、`exitDeviceId`（本系統 `devices.id`），以及本系統的人員群組識別（見下）
  - **方案 B**：維持現有 config 不變，由後端依 `entryDoorId`／`exitDoorId` 是否為「本系統門禁設備」推斷資料來源（需後端約定 ID 區間或來源標記）。
- **建議**：方案 A 較直觀，前後端責任清楚；若後端尚未擴充 location_systems 的 config 結構，可先在前端型別與表單上預留 `dataSource` 與 `entryDeviceId`／`exitDeviceId`，後端再補齊。

### 3.3 地點表單與資料載入（人流統計）

| 項目 | 說明 |
|------|------|
| 資料來源選擇 | 在地點表單中新增「資料來源」：YSCP / 門禁設備。依選擇切換「出入口」與「人員群組」的資料來源。 |
| 出入口選擇（門禁） | 當資料來源為門禁設備時，「入口／出口設備」改為呼叫 `GET /api/devices?type_code=access_control`，選項為本系統門禁設備（id + name）；存成 `entryDeviceId`、`exitDeviceId`（或沿用現有欄位名由後端對應）。 |
| 人員群組（門禁） | 門禁時改為「手動建立人員群組」。可為：<br>• 本系統新增「門禁人員群組」實體（需後端 API 與 DB），或<br>• 僅在 UI 上管理「群組名稱 + 成員列表」，成員透過 ISAPI 同步至設備（後端代為呼叫 5 支 API）。<br>若後端暫無群組實體，可先做「依門禁設備取得人員列表 + 手動勾選／新增／編輯／刪除人員與人臉」的介面，再演進為群組。 |

### 3.4 ISAPI 門禁 API 整合（5 支）

後端已提供 `/api/access-control/*`，需在前端封裝成 composable 或 API 層，供「人員／人臉管理」與（若需）地點設定流程使用：

| 後端 API | 前端用途 |
|----------|----------|
| `POST /api/access-control/devices/:deviceId/user-info` | 取得設備人員列表（用於列表顯示、匯入群組、比對） |
| `PUT /api/access-control/devices/:deviceId/user-info` | 修改／新增單一人員（表單送出時呼叫） |
| `DELETE /api/access-control/devices/:deviceId/user-info` | 刪除人員（Body: `employeeNo` 或 `employeeNoList`） |
| `PUT /api/access-control/devices/:deviceId/user-info/:employeeNo/face` | 上傳人臉圖（multipart，欄位 `img`） |
| `POST /api/access-control/devices/:deviceId/capture-face` | 呼叫設備截圖（可選覆寫 `dataType`、`readerID` 等） |

建議新增：
- **Composable**：`useAccessControlApi.ts`（或 `useIsapiDeviceApi.ts`），封裝上述 5 支，參數為 `deviceId` 與對應 body/query。
- **型別**：與後端回應對齊（例如人員列表欄位：`employeeNo`、`name`、`userType`、`Valid`、`doorRight`、`RightPlan`、`faceURL`）。

### 3.5 地點建立後的門禁設備人員資料處理

建立以「門禁設備（本系統）」為資料來源的地點後，**人員與人臉資料**不在 YSCP 同步，而是由本系統透過 **ISAPI** 與設備通訊維護：

| 時點 | 說明 |
|------|------|
| **建立地點時** | 只需設定入口／出口設備（本系統門禁設備）。人員群組為選填；表單提示：「建立地點後可於設備管理或門禁人員功能中，以 ISAPI 建立／維護人員與人臉資料。」 |
| **建立地點後** | 可從 **設備管理**（門禁設備操作列）或 **門禁人員** 功能進入該設備的人員／人臉管理，使用後端 5 支 ISAPI：搜尋人員、修改／新增人員、刪除人員、上傳人臉、設備截圖。 |
| **資料流** | 人員名單存在**設備端**；後端代為呼叫 ISAPI，不另建「門禁人員群組」表（可選：前端或後端維護「群組名稱 + 設備人員子集」對應，供統計或篩選用）。 |

**實作要點**：前端封裝 `useAccessControlApi` 呼叫上述 5 支 API；人員管理 UI 以「選擇門禁設備 → 取得人員列表 → 新增／編輯／刪除人員、上傳人臉或設備截圖」為主流程，與地點的「人員群組（選填）」可並存或後續整合。

### 3.6 人員與人臉管理 UI（門禁專用）

- **入口**：可從「地點管理」中當資料來源為門禁時，在該地點下提供「管理門禁人員」；或從設備管理頁的門禁設備操作列進入「人員／人臉管理」。
- **功能建議**：
  - 列出設備人員：呼叫上述「取得人員列表」API。
  - 新增／編輯人員：表單（employeeNo、name、userType、Valid、doorRight、RightPlan 等）送出時呼叫「修改單一人員」API。
  - 刪除人員：呼叫「刪除人員」API。
  - 上傳人臉：選擇檔案後呼叫「上傳人臉」API；可選「設備截圖」再從結果帶入或上傳檔案。
- 上述 UI 可與「手動建立人員群組」整合：例如先選設備 → 拉取人員列表 → 勾選或篩選為某群組成員，群組僅前端暫存或另存後端（依後端是否提供群組 API）。

### 3.7 共用元件與頁面

- **不需重做**：人流統計主頁、地點選擇、區域管理對話框外殼、`LocationStatsPanel`、`EntryExitLogTable`、`UnitList`、`UnitPersonnelDialog` 等。
- **需配合**：
  - 地點列表與詳情之資料來源：若後端依 `dataSource` 或 device 來源回傳相同形狀的統計與記錄，前端僅需傳正確的 location config；若後端分開 API，前端需依 `dataSource` 呼叫不同 API 再對齊同一 view model。
  - 人員群組選項來源：`dataSource === 'yscp'` 時沿用現有 `externalDataApi.getPersonGroups()` 與 `getList('deviceaccess','door')`；`dataSource === 'access_control'` 時改用本系統門禁設備列表與（若有）門禁人員群組 API。

---

## 4. 型別與設定建議（摘要）

- **設備**：`DeviceTypeCode` 加入 `'access_control'`；`DeviceConfig` 新增 `AccessControlDeviceConfig`（`host`, `port?`, `username`, `password`）。
- **設備型號**：`config` 允許 `isapi?: { captureFaceData?: { dataType?, captureInfrared?, readerID? } }`。
- **地點系統配置**：`PeopleCountingSystemConfig` 擴充為例如：
  - `dataSource?: 'yscp' | 'access_control'`
  - `entryDeviceId?`, `exitDeviceId?`（本系統 devices.id，門禁時使用）
  - 若有人員群組實體：`accessControlPersonGroupIds?: number[]`，或沿用 `personGroupIds` 由後端依 `dataSource` 解讀。

（實際欄位名與後端 API 對齊後再定案。）

---

## 5. 實作順序建議

1. **設備管理**：設備類型／型號支援門禁、`DeviceDialog` 門禁 config 表單、型號 config 的 isapi 編輯。
2. **門禁 API 層**：`useAccessControlApi` + 型別，可先用 Postman 驗證後端再接前端。
3. **地點設定擴充**：`PeopleCountingSystemConfig` 與表單的「資料來源」、門禁設備下拉、`entryDeviceId`／`exitDeviceId` 寫入與讀取。
4. **人員群組（門禁）**：先「依設備拉取人員列表 + 手動新增／編輯／刪除人員與人臉」的 UI，再視需求補「群組」實體與 API。
5. **資料呈現**：確認後端對門禁地點能回傳與 YSCP 相同形狀的統計與記錄（或前端依 `dataSource` 呼叫不同 API 並對齊），使現有統計與記錄表無需改版即可共用。

---

## 6. 與後端文件對應

- 門禁設備與型號設計、config 結構：[ba-backend/docs/ACCESS_CONTROL_DEVICE_DESIGN.md](../../ba-backend/docs/ACCESS_CONTROL_DEVICE_DESIGN.md)
- ISAPI 五支 API 規格：[ba-backend/docs/ISAPI_DEVICE_REQUEST_SERVICES.md](../../ba-backend/docs/ISAPI_DEVICE_REQUEST_SERVICES.md)
- Postman 測試：[ba-backend/docs/POSTMAN_ACCESS_CONTROL_TESTING.md](../../ba-backend/docs/POSTMAN_ACCESS_CONTROL_TESTING.md)
