# 區域與地點管理系統說明

本文件整理 **區域（Zone）／地點（Location）** 在前端的資料模型、元件分工、刪除邏輯與 API 使用，確保各系統（環境品質、照明、人流統計、車輛進出、全區點位圖）行為一致。

---

## 1. 資料模型概述

### 1.1 多系統共用架構

- **UnifiedZone**：一個區域，底下有多個地點。
- **UnifiedLocation**：一個地點，可被多個 **系統** 共用，每個系統在 `location.systems` 中有一筆 **LocationSystem**（含 `systemType`、`config`）。
- **SystemType**：`environment` | `lighting` | `people_counting` | `vehicle_access`。

同一筆地點（例如「大門口」）可同時出現在：
- 環境品質（感測器、參數）
- 人流統計（出入口設備、人員群組）
- 車輛進出（車道）
- 照明（點位、控制器）

因此 **刪除** 時必須區分：
- **只從「當前系統」移除此地點**（其他系統不受影響）
- **刪除整筆地點**（僅在該地點已無任何系統使用時）

### 1.2 類型定義位置

| 類型 | 檔案 |
|------|------|
| `UnifiedZone`, `UnifiedLocation`, `LocationSystem`, `SystemType` | `app/types/location.ts` |
| 各系統 Zone/Location（EnvironmentZone、LightingZone…） | `app/types/environment.ts`、`lighting.ts`、`peopleCounting.ts`、`vehicleAccess.ts` |
| 統一 ↔ 系統 轉換 | `app/utils/locationAdapter.ts` |

---

## 2. 元件分工

### 2.1 兩套對話框

| 對話框 | 用途 | 使用頁面 | 傳入 systemType |
|--------|------|----------|------------------|
| **ZoneManagementDialog** | 多區域列表 + 各區域內地點管理 | 環境品質、照明、人流統計、車輛進出 | 必傳（`system-type="environment"` 等） |
| **LocationManagementDialog** | 單一區域的地點管理（UnifiedZone） | 全區點位圖（area-point-map） | 可選（有篩選系統時傳入） |

### 2.2 地點表單元件（各系統）

每個系統有獨立的「地點欄位」元件，由 ZoneManagementDialog 依 `systemType` 動態載入：

| 系統 | 元件 |
|------|------|
| environment | `LocationManagement/EnvironmentLocationManagement.vue` |
| lighting | `LocationManagement/LightingLocationManagement.vue` |
| people_counting | `LocationManagement/PeopleCountingLocationManagement.vue` |
| vehicle_access | `LocationManagement/VehicleAccessLocationManagement.vue` |

上述元件負責：顯示地點列表、新增地點、**刪除按鈕**（每個地點皆顯示）、表單欄位，並透過 `@remove-location` 將刪除事件傳給上層。

---

## 3. 刪除邏輯（統一規則）

### 3.1 刪除「地點」

**原則**：在「某個系統」底下刪除地點時，只從該系統移除；若該地點已無其他系統使用，才刪除整筆地點。

**實作**（兩套對話框一致）：

- **無 id**（未儲存）：直接從列表移除，不呼叫 API；此情境若觸發後端參數錯誤（如「無效的整數參數: id」），統一錯誤處理會略過不顯示 toast。
- **有 id** 且 **有 systemType**：`getLocation(id)` → 過濾掉當前系統 → `otherSystems.length === 0` 則 `deleteLocation(id)`，否則 `updateLocation(id, { systems: otherSystems })`。
- **有 id** 且 **無 systemType**：`deleteLocation(id)`（刪除整筆地點）。

**程式位置**：`ZoneManagementDialog`、`LocationManagementDialog` 的 `handleConfirmDeleteLocation`。全區點位圖傳入 `system-type="selectedSystemType ?? undefined"`。

### 3.2 刪除「區域」

**原則**：在系統頁面刪除區域時，若該區域仍被其他系統使用，只移除「當前系統在該區域內的地點」；否則刪除整個區域。

**實作**：`useZoneManagement.baseHandleDeleteZone`。

- 若傳入 `systemType`、`getFullZoneApiCall`、`updateZoneApiCall`：
  - 取得完整區域（不帶 systemType 篩選）。
  - 對每個地點過濾掉當前系統的 `systems` 條目。
  - 若過濾後區域已無地點或僅剩當前系統 → 呼叫 `deleteZone` 刪除整個區域。
  - 否則 → 呼叫 `updateZoneApiCall` 更新該區域的 `locations`（僅保留其他系統的地點）。
- 未提供上述選項或僅當前系統使用 → 直接 `deleteZone`。

環境品質、照明、人流、車輛進出頁的「刪除區域」皆透過此 composable，並傳入對應的 `systemType` 與 API。

---

## 4. API 使用

### 4.1 統一地點 API（區域／地點管理皆用）

- **Composable**：`useLocationApi()`（`app/composables/systems/location/useLocationApi.ts`）。
- **端點**：`/locations`、`/locations/zones`（依專案實際 base URL）。
- **用途**：取得／建立／更新／刪除區域與地點；刪除地點時依上述「僅移當前系統」邏輯在元件內呼叫 `getLocation`、`updateLocation`、`deleteLocation`。

區域管理相關的 **建立／更新／刪除區域**、以及 **刪除地點**，一律透過此統一 API，不混用各系統的獨立地點 API。

### 4.2 各系統的區域 API（包裝統一 API）

- 環境品質：`useEnvironmentApi()` → 內部使用 `useSystemLocationApiFactory` + `useLocationApi`。
- 照明：`useLightingApi()`。
- 人流統計：`usePeopleCountingLocationApi()`。
- 車輛進出：`useVehicleAccessLocationApi()`。

上述皆透過 Factory 或共用 API 取得 `getZones`、`getZone`、`createZone`、`updateZone`、`deleteZone`，與統一地點 API 一致。

### 4.3 人流統計的獨立地點 API（非區域管理用）

- `usePeopleCountingLocationApi` 另有 `getLocations`、`getLocation`、`createLocation`、`updateLocation`、`deleteLocation`，對應 **`/people-counting/locations`**。
- 用途：人流模組其他功能（例如地點名稱查詢、獨立地點 CRUD）。
- **區域管理內的「刪除地點」不使用此 API**，仍使用 `useLocationApi()`，以維持「僅移當前系統」的統一邏輯。

---

## 5. UI 行為一致性

### 5.1 地點刪除按鈕

每個地點皆顯示刪除按鈕；四個系統的 LocationManagement 元件一致，按鈕具 `title` 與 `aria-label`。

### 5.2 確認對話框

刪除地點依「僅當前系統」或「多系統」顯示對應說明；刪除區域由 `baseHandleDeleteZone` 與 toast 處理。

---

## 6. 檔案對照速查

| 功能 | 主要檔案 |
|------|----------|
| 統一類型 | `app/types/location.ts` |
| 統一 API | `app/composables/systems/location/useLocationApi.ts` |
| 系統 API 工廠 | `app/composables/systems/location/useSystemLocationApiFactory.ts` |
| 區域刪除共用邏輯 | `app/composables/systems/useZoneManagement.ts`（baseHandleDeleteZone） |
| 多區域對話框 | `app/components/location/ZoneManagementDialog.vue` |
| 單區域對話框 | `app/components/location/LocationManagementDialog.vue` |
| 地點表單（各系統） | `app/components/location/LocationManagement/*.vue` |
| 統一 ↔ 系統 轉換 | `app/utils/locationAdapter.ts` |

---

## 7. 總結

- 一個地點可被多系統共用；刪除時僅移當前系統或整筆刪除，不影響其他系統。
- 兩套對話框刪除地點邏輯一致；區域刪除由 `baseHandleDeleteZone` 統一處理。
- 區域／地點 CRUD 與刪除皆透過統一地點 API（`useLocationApi`）。
