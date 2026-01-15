# Composables 說明文件

本文檔說明 `app/composables` 資料夾中所有 composable 檔案的功能、用途與整合重構內容。

**目前共有 19 個 composables**（方案 B - 工地管理系統，已移除照明系統相關 composable）

## 目錄

1. [統一工具 Composables](#統一工具-composables)
2. [基礎設施類](#基礎設施類)
3. [資料載入與監控類](#資料載入與監控類)
4. [業務邏輯 API 類](#業務邏輯-api-類)
5. [UI 相關類](#ui-相關類)
6. [工具函數](#工具函數)
7. [整合重構說明](#整合重構說明)
8. [使用建議](#使用建議)

---

## 統一工具 Composables

### `useWebSocketMonitor.ts` - WebSocket 監聽器管理

提供統一的 WebSocket 事件監聽器管理，簡化監聽器的設置和移除。

**主要方法**：

- `setupListeners(configs)`: 設置多個事件監聽器
- `removeListeners(events?)`: 移除指定事件監聽器
- `cleanup()`: 清理所有監聽器（組件卸載時自動調用）

**已整合**：`useDeviceMonitor`

### `useFloorApiFactory.ts` - 樓層 CRUD Factory

提供通用的樓層 CRUD 操作，減少重複程式碼。

**主要方法**：

- `getFloors()`: 取得樓層列表
- `getFloor(id)`: 取得單一樓層
- `createFloor(data)`: 建立樓層
- `updateFloor(id, data)`: 更新樓層
- `deleteFloor(id)`: 刪除樓層

**已整合**：`useEnvironmentApi`

### `useErrorTrackingApiFactory.ts` - 錯誤追蹤 Factory

提供通用的錯誤追蹤操作，統一錯誤處理邏輯。

**主要方法**：

- `reportError(resourceId, errorMessage?)`: 記錄錯誤
- `clearError(resourceId)`: 清除錯誤

**已整合**：`useEnvironmentApi`

---

## 基礎設施類

### `useApiBase.ts`

統一處理 HTTP 請求、認證 headers、錯誤處理（401、403、404、500、503 等）。

### `useAuth.ts`

用戶認證管理：登入/登出、Cookie 儲存（7 天）、角色權限檢查（`isAdmin`、`isOperator`、`isViewer`）。

### `useErrorHandler.ts`

統一錯誤處理：錯誤優先級分類（CRITICAL、HIGH、MEDIUM、LOW）、錯誤去重（5 秒）、自動選擇 Toast 類型。

### `useWebSocket.ts`

WebSocket 連接管理（單例模式）：自動重連、監聽多種事件類型（警報、設備、監控狀態、RTSP 串流等）。

---

## 資料載入與監控類

### `useDataLoader.ts`

通用資料載入：防抖（300ms）、請求去重、分頁管理、載入狀態。

### `useAlertMonitor.ts`

警示監聽器：整合 WebSocket 和輪詢後備、增量查詢、優先級過濾、持久顯示 Toast。

**整合功能**：未解決警報數量管理（原 `useAlertCount` 的功能已整合）

**返回**：

- `startMonitoring()`: 開始監聽
- `stopMonitoring()`: 停止監聽
- `reset()`: 重置監聽器
- `checkNewAlerts()`: 手動檢查新警報
- `removeAlertToast(alertId)`: 移除特定警報的 Toast
- `unresolvedAlertCount`: 未解決警報數量（只讀）
- `isLoadingCount`: 是否正在載入數量（只讀）
- `loadUnresolvedAlertCount(filters?)`: 載入未解決警報數量
- `startAlertCountMonitoring()`: 開始監聽未解決警報數量
- `stopAlertCountMonitoring()`: 停止監聽未解決警報數量

### `useDeviceMonitor.ts`

設備監聽器：監聽設備 CRUD 事件、狀態變更、監控狀態（使用 `useWebSocketMonitor`）。

---

## 業務邏輯 API 類

### `useAlertApi.ts`

警報 API：取得警示列表、單一警示、歷史記錄、忽視/取消忽視、未解決數量。

### `useUserApi.ts`

用戶 API：註冊、登入、取得用戶資訊、用戶列表（支援分頁和篩選）、更新/刪除。

### `useDeviceApi.ts`

設備 API：設備 CRUD、設備類型管理（帶快取）、設備型號管理、支援篩選。

### `useEnvironmentApi.ts`

環境監控 API：樓層管理（CRUD）、感測器讀數管理、錯誤追蹤。

~~### `useLightingApi.ts`~~ **已移除**

~~照明系統 API：樓層管理（CRUD）、錯誤追蹤。~~

### `useSurveillanceApi.ts`

監控系統 API：獲取攝影機設備、啟動/停止串流、獲取串流狀態、生成 RTSP URL。

### `usePeopleCountingApi.ts`

人流統計 API：工地列表、詳情、統計、單位/人員列表、進出場記錄（目前使用模擬資料）。

### `useRtsp.ts`

RTSP 串流 API：啟動/停止串流、獲取串流狀態（已整合 `useApiBase` 統一錯誤處理和認證）。

---

## UI 相關類

### `useToast.ts`

Toast 通知管理：支援 success/error/warning/info、去重機制（5 秒）、持久顯示、疊加數量。

### `useTheme.ts`

主題管理：明暗主題切換、Cookie 儲存（1 年）、自動更新 HTML class。

---

## 工具函數（已移至 `app/utils/`）

以下工具函數已從 composables 移至 `app/utils/`，因為它們是純函數，不需要響應式狀態：

- **`imageUtils.ts`**: 圖片錯誤處理（`handleImageError`、`getImageErrorHandler`）
- **`sensorUtils.ts`**: 感測器參數工具（`getParameterDisplayName`、`getParameterUnit`、`getParameterIcon`、`getParameterFractionDigits`、`cleanParameters`、`cleanLocation`、`cleanFloor`）
- **`systemUtils.ts`**: 系統模組管理（`getAllModules`、`getModulesByCategory`、`getModuleById`、`getModuleByRoute`、`getCurrentModule`、`isModuleEnabled`）
- **`apiUtils.ts`**: API 工具函數（`buildQueryParams`、`buildPathWithQuery`、`buildResourcePath`、`buildPaginationParams`、`mergeQueryParams`）

---

## 整合重構說明

### 整合歷程

#### 第一階段：工具函數遷移（減少 3 個 composables）

將純工具函數從 composables 移至 `app/utils/`：

- `useImageError.ts` → `app/utils/imageUtils.ts`
- `useSensorParameter.ts` → `app/utils/sensorUtils.ts`
- `useSystem.ts` → `app/utils/systemUtils.ts`

**理由**：這些都是純工具函數，不需要響應式狀態，更符合職責分離原則。

#### 第二階段：功能合併（減少 1 個 composable）

合併 `useAlertCount.ts` 到 `useAlertMonitor.ts`：

- 功能相關（都是警報監聽）
- 減少重複的 WebSocket 監聽邏輯
- 統一管理警報相關功能

#### 第三階段：Factory Functions（新增 2 個，減少重複程式碼）

創建 Factory Functions 減少重複：

- `useFloorApiFactory.ts`：統一樓層 CRUD 操作（減少約 50 行重複程式碼）
- `useErrorTrackingApiFactory.ts`：統一錯誤追蹤操作（減少約 20 行重複程式碼）

**整合結果**：

- `useEnvironmentApi` 使用 Factory Functions
- 減少約 50-60 行重複程式碼

#### 第四階段：進一步精簡優化（減少 1 個 composable，整合 1 個）

1. **將 `useApiUtils` 轉換為工具函數**：
   - `useApiUtils.ts` → `app/utils/apiUtils.ts`
   - 理由：完全是純函數，不需要響應式狀態

2. **整合 `useRtsp` 使用 `useApiBase`**：
   - 統一錯誤處理和認證邏輯
   - 減少重複的請求處理程式碼
   - 簡化 RTSP API 的實作

**整合結果**：

- 減少 1 個 composable（`useApiUtils`）
- 所有 API composables 統一使用工具函數
- RTSP API 獲得統一的錯誤處理和認證

### 整合效益

**程式碼減少**：

- 查詢參數構建邏輯：從 5+ 個重複實現減少到 1 個統一工具函數（移至 `app/utils/apiUtils.ts`）
- WebSocket 監聽器管理：從 3+ 個重複實現減少到 1 個統一實現
- 樓層 CRUD 操作：從 2 個重複實現減少到 1 個統一實現
- 錯誤追蹤操作：從 2 個重複實現減少到 1 個統一實現
- RTSP API 請求處理：整合到 `useApiBase`，統一錯誤處理和認證

**維護性提升**：

- 統一的工具函數，修改一處即可影響所有使用的地方
- 更容易進行單元測試
- 統一 API 介面，類型安全

**一致性提升**：

- 所有 API composables 使用相同的查詢參數構建邏輯
- 所有 WebSocket 監聽器使用相同的管理機制
- 相關功能集中管理

### 遷移指南

**使用工具函數**：

```typescript
// 之前
import { useImageError } from "~/composables/useImageError";
const { handleImageError } = useImageError();

// 現在
import { handleImageError } from "~/utils/imageUtils";

// API 工具函數（之前是 composable）
// 之前
import { useApiUtils } from "~/composables/useApiUtils";
const { buildPathWithQuery } = useApiUtils();

// 現在
import { buildPathWithQuery } from "~/utils/apiUtils";
```

**使用未解決警報數量**：

```typescript
// 之前
import { useAlertCount } from "~/composables/useAlertCount";
const { count, loadCount, start, stop } = useAlertCount();

// 現在
import { useAlertMonitor } from "~/composables/useAlertMonitor";
const {
	unresolvedAlertCount,
	loadUnresolvedAlertCount,
	startAlertCountMonitoring,
	stopAlertCountMonitoring
} = useAlertMonitor();
```

**使用 Factory Functions**：

```typescript
// 使用樓層 CRUD Factory
import { useFloorApiFactory } from "~/composables/useFloorApiFactory";
const floorApi = useFloorApiFactory<EnvironmentFloor>("/environment");

// 使用錯誤追蹤 Factory
import { useErrorTrackingApiFactory } from "~/composables/useErrorTrackingApiFactory";
const errorTrackingApi = useErrorTrackingApiFactory("/environment/locations", "無法讀取感測器資料");
```

---

## 使用建議

### 1. API 請求

- 使用 `useApiBase` 的 `request` 方法確保統一錯誤處理和認證
- 業務邏輯 API composables 已封裝 `useApiBase`，可直接使用

### 2. 錯誤處理

- 使用 `useErrorHandler` 統一處理錯誤，避免重複訊息
- 錯誤會根據優先級自動選擇 Toast 類型和持續時間

### 3. WebSocket 監聽

- 使用 `useWebSocket` 建立連接（單例模式）
- 使用 `useAlertMonitor` 和 `useDeviceMonitor` 監聽特定事件
- 記得在組件卸載時清理監聽器

### 4. 資料載入

- 使用 `useDataLoader` 處理需要防抖和分頁的場景
- 使用 `useAlertMonitor` 的 `unresolvedAlertCount` 和 `startAlertCountMonitoring` 管理未解決警報數量

### 5. Toast 通知

- 使用 `useToast` 顯示通知，支援去重和持久顯示
- 警報相關的 Toast 應使用持久顯示（`persistent: true`）

### 6. 認證

- 使用 `useAuth` 管理登入狀態和權限檢查
- 認證狀態會自動從 Cookie 恢復

---

## 檔案依賴關係

```
useApiBase (基礎)
  ├── useAlertApi
  ├── useUserApi
  ├── useDeviceApi
  ├── useEnvironmentApi
  ~~├── useLightingApi~~ (已移除)
  └── useRtsp (已整合統一錯誤處理)

apiUtils (工具函數，位於 app/utils/)
  ├── useAlertApi
  ├── useDeviceApi
  ├── useEnvironmentApi
  └── useUserApi

useFloorApiFactory (工具)
  └── useEnvironmentApi

useErrorTrackingApiFactory (工具)
  └── useEnvironmentApi

useWebSocket (基礎)
  ├── useAlertMonitor
  └── useDeviceMonitor

useWebSocketMonitor (工具)
  └── useDeviceMonitor

useAuth
  └── useUserApi

useErrorHandler
  └── useAlertMonitor

useToast
  ├── useAlertMonitor
  └── useErrorHandler

useSurveillanceApi
  ├── useDeviceApi
  └── useRtsp

usePeopleCountingApi
  ├── useApiBase
  ├── useDeviceApi
  ├── useRtsp
  └── useSurveillanceApi
```

---

## 更新記錄

- **2025-01-XX**: 初始版本，整理所有 composables 檔案說明
- **2025-01-XX**: 第一階段整合，將工具函數移至 `app/utils/`（減少 3 個 composables）
- **2025-01-XX**: 第二階段整合，合併 `useAlertCount` 到 `useAlertMonitor`（減少 1 個 composable）
- **2025-01-XX**: 第三階段整合，創建 Factory Functions 減少重複程式碼（新增 2 個，減少約 50-60 行重複程式碼）
- **2025-01-XX**: 優化與修復，移除未使用的導入，修復邏輯問題
- **2025-01-XX**: 第四階段整合，將 `useApiUtils` 轉換為工具函數，整合 `useRtsp` 使用 `useApiBase`（減少 1 個 composable，統一錯誤處理）
