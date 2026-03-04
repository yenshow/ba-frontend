# 環境監控頁面重構與感測器設備複選規劃

本文件包含兩部分：
1. **environment.vue 重構計劃**：將過大的頁面拆成 composables 與子元件，便於維護。
2. **感測器設備改為複選**：地點管理中的「感測器設備」由單選改為複選（勾選），與感測器參數的 UI 模式一致；實際數值可由多台設備提供並彙總。

---

## 一、environment.vue 重構計劃

### 1.1 現況

- **檔案**：`app/pages/construction-monitoring/environment.vue`（約 2100+ 行）
- **問題**：單一檔案集中了區域/地點狀態、完整報表、感測器設備與型號載入、Modbus 輪詢、警報規則、狀態顯示、AQI 計算、錯誤追蹤、WebSocket、ResizeObserver 等，難以維護與單元測試。

### 1.2 重構目標

- 頁面只負責版面與組合，邏輯下放到 composables 或子元件。
- 每個 composable 職責單一、可獨立測試。
- 不改變現有對外行為（API、WebSocket、輪詢、報表、總覽）。

### 1.3 建議拆分結構

```
app/pages/construction-monitoring/environment.vue   （精簡後：約 200~350 行）
├── 僅保留：template 結構、子元件掛載、useXxx() 呼叫與必要 ref/computed 綁定
│
├── app/composables/environment/
│   ├── useEnvironmentZones.ts          區域/地點列表、載入、選中地點、排序
│   ├── useEnvironmentSensorData.ts    感測器資料狀態、輪詢、WebSocket 更新、總覽資料
│   ├── useEnvironmentDevices.ts        設備與型號配置載入、快取、Modbus 讀取
│   ├── useEnvironmentReport.ts         完整報表（模擬框、時間區間、雙表資料載入）
│   └── useEnvironmentStatus.ts         警報規則、狀態文字/樣式（getStatusText 等）
│
├── app/utils/environment/
│   ├── aqiUtils.ts                    AQI 斷點、calculatePollutantAQI、calculateAQI
│   ├── sensorDataUtils.ts             createEmptySensorReadings、applyTransform、類型
│   └── zoneSortUtils.ts               extractZoneNumber、區域排序（可與 lighting 共用則放 location）
│
└── app/components/environment/        （既有，必要時微調）
    ├── EnvironmentGauge.vue
    ├── EnvironmentParamCard.vue
    ├── OverviewLocationCard.vue
    └── （完整報表、趨勢圖等已存在）
```

### 1.4 各 Composable 職責建議

| Composable | 職責 | 導出 / 依賴 |
|------------|------|-------------|
| **useEnvironmentZones** | `environmentZones`、`loadZonesFromAPI`、`selectedLocationId`、`currentLocationData`、`sortedLocations`、`getLocationZone`、`getLocationId`、`selectLocation`、`loadZonesFromAPI`；可選：左側高度、ResizeObserver | useEnvironmentApi、useZoneManagement、cleanZone、locationAdapter |
| **useEnvironmentSensorData** | `sensorData`、`allLocationsSensorData`、`updateSensorData`、`getLocationSensorData`、`createEmptySensorReadings`、`clearSensorData`；與輪詢/WebSocket 的整合可放在此或由頁面組合 | useEnvironmentDevices（讀取後寫入）、useEnvironmentZones（locationId） |
| **useEnvironmentDevices** | 當前地點的 `sensorDevice`、`deviceModelConfig`、`sensorDeviceConfig`；`deviceModelConfigCache`、`sharedConfigCache`；`loadDeviceAndModelConfig`、`loadLocationSensorDevice`、`loadSensorData`、`loadLocationSensorData`、`loadLocationSensorDataForOverview`；Modbus 讀取、`readParametersBatch`、`groupConsecutiveAddresses`、`findParameterModbusConfig`、`validateConfiguration`；錯誤追蹤 `reportLocationError`、`clearLocationError` | useDeviceApi、useApiBase、useEnvironmentApi、sensorDataUtils、aqiUtils |
| **useEnvironmentReport** | `showSimulationFrame`、`simulationTimeRange`、`simulationReadingsSummary`、`simulationReadingsDetail`、`loadSimulationReadings`、`handleOpenSimulation`、`handleSimulationTimeRangeUpdate`；模擬用 zone/location/device 顯示字串 | useEnvironmentApi、getTodayDateRangeUTC、currentLocationData、sensorDeviceConfig |
| **useEnvironmentStatus** | `alertRules`、`rulesLoaded`、`loadAlertRules`；`getStatusText`、`getStatusClass`、`getStatusDotClass`、`getStatusTextClass`、`getDefaultStatusText`；`toFixedNumber` | useAlertRules |

### 1.5 共用工具（utils）

- **aqiUtils.ts**：`PM25_BREAKPOINTS`、`PM10_BREAKPOINTS`、`calculatePollutantAQI`、`calculateAQI(data: SensorReadings)`（或由 status composable 再包一層供頁面用）。
- **sensorDataUtils.ts**：`SensorReadings` 類型、`createEmptySensorReadings`、`applyTransform`；若 Modbus 轉換僅環境用則放此，否則可放在更上層的 device/utils。
- **zoneSortUtils.ts**：`extractZoneNumber(zoneName)`、依區域名稱排序地點列表（與 `environment.vue` 內 `sortedLocations` 邏輯一致）；若照明等也需相同排序可抽到 `location` 或共用 utils。

### 1.6 重構順序建議

1. **第一階段（不影響行為）**  
   - 抽出 `aqiUtils`、`sensorDataUtils`、`zoneSortUtils`，environment.vue 改為從 utils 引入並刪除重複程式碼。  
   - 抽出 **useEnvironmentZones**，頁面改為使用 composable，確認地點選擇、總覽列表、載入區域行為不變。

2. **第二階段**  
   - 抽出 **useEnvironmentStatus**（警報規則、狀態文字與樣式），頁面與 `EnvironmentParamCard` 改為使用 composable。  
   - 抽出 **useEnvironmentReport**，完整報表開關、時間區間、雙表資料載入與傳給 `EnvironmentSimulation` 的 props 改由 composable 提供。

3. **第三階段**  
   - 抽出 **useEnvironmentDevices**（設備/型號、Modbus、驗證、錯誤追蹤）與 **useEnvironmentSensorData**（感測器資料、更新、總覽 Map）。  
   - 頁面只保留：輪詢/WebSocket 的啟動與回調、左側高度/ResizeObserver（若保留在頁面）、以及將 devices 與 sensorData 串接的邏輯（例如輪詢時呼叫 `loadSensorData`、WebSocket 時 `updateSensorData`）。

4. **第四階段（可選）**  
   - 精簡頁面 template，將「左側主內容區」或「總覽區」再拆成 1～2 個子元件，減少單檔 template 行數。

### 1.7 注意事項

- **向後相容**：`getLocationId`、`currentLocationData`、地點與系統 ID 的對應關係維持不變，避免 WebSocket、報表、錯誤追蹤錯亂。
- **輪詢與 WebSocket**：`usePolling` 與 `on("environment:reading:new")` 的 callback 仍須能存取「當前地點的設備配置」與「寫入感測器資料」的函式，因此 devices 與 sensorData 的介面要在 composable 間約定清楚（例如由頁面注入 callback 或由 useEnvironmentSensorData 接受「當筆讀數寫入」的依賴）。
- **型別**：`EnvironmentLocation`、`SensorReadings`、`SensorParameterType` 等仍以 `types/environment.ts`、`types/device.ts` 為準，utils/composables 僅引用、不重複定義。

---

## 二、感測器設備改為複選

### 2.1 需求說明

- 目前：地點管理中的「感測器設備」為**單選**（一個地點對應一台感測器設備）。
- 目標：改為**複選**，類似「感測器參數」以勾選方式選擇多台設備；同一地點的數值可由多台設備提供，前端或後端彙總後顯示。

### 2.2 資料模型變更

| 層級 | 現況 | 變更後 |
|------|------|--------|
| **前端類型** `EnvironmentLocation` | `deviceId?: number` | `deviceIds?: number[]`（建議保留 `deviceId` 一段時間做向後相容，讀取時若僅有 `device_id` 則轉成 `deviceIds: [deviceId]`） |
| **後端** `location_systems.system_config`（environment） | `device_id: number \| null` | `device_ids: number[]`（陣列）；舊欄位 `device_id` 可保留讀取相容，寫入時改寫 `device_ids` |
| **後端環境監控 / 讀數** | 依單一 `device_id` 輪詢、寫入 `environment_readings` | 依 `device_ids` 逐台輪詢；寫入時可每筆帶 `device_id`，或由後端依 location 彙總多設備資料 |

### 2.3 後端變更要點

1. **locationService.js**  
   - `buildSystemConfig("environment", config)`：改為寫入 `device_ids: config.deviceIds ?? []`；讀取 `formatSystem("environment")` 時改為 `deviceIds: config.device_ids || (config.device_id != null ? [config.device_id] : [])`，以相容舊資料。  
   - 若有 `createLocationWithSystems` / 更新邏輯依賴 `deviceId`，改為支援 `deviceIds` 陣列。

2. **environmentMonitor.js**  
   - 取得地點時改為讀取 `system_config->'device_ids'`（或相容 `device_id` 單一值轉成陣列）。  
   - 對每個地點的每個 `deviceId` 分別輪詢 Modbus、寫入 `environment_readings`（每筆可帶 `device_id`）；若設計為「同一 location 多筆 device 彙總成一筆顯示」，則需定義彙總規則（例如平均、最後一筆、優先順序）。

3. **environmentReadingsService / 彙總 / API**  
   - 若讀數表仍為「每筆一 device」，則現有 API 依 `location_id` 查詢即可得到多設備資料；前端或後端再依需求彙總。  
   - 若後端要提供「依 location 彙總多設備」的介面，可在既有 API 上擴充參數或另開 endpoint。

### 2.4 前端變更要點

1. **類型** `app/types/environment.ts`  
   - `EnvironmentLocation`：新增 `deviceIds?: number[]`；可保留 `deviceId?: number` 並在 adapter 中轉為 `deviceIds` 以相容舊 API。

2. **locationAdapter** `app/utils/locationAdapter.ts`  
   - 從後端讀取：若 API 回傳 `device_ids` 則用，若僅有 `device_id` 則 `deviceIds = device_id != null ? [device_id] : []`。  
   - 送出：`config.deviceIds` 陣列；若後端仍吃 `device_ids`，則在 `environmentLocationToUnified` 內寫成 `deviceIds: loc.deviceIds ?? (loc.deviceId != null ? [loc.deviceId] : [])`。

3. **地點表單** `app/components/location/LocationFormFields/EnvironmentLocationFields.vue`  
   - **感測器設備**：由單選 `FilterDropdown` 改為**複選列表**（與感測器參數類似）：  
     - 列出所有感測器設備（`props.devices`），每項為一個 checkbox；  
     - `v-model` 或本地狀態為 `localLocation.deviceIds`（`number[]`）；  
     - 勾選/取消時更新 `deviceIds` 並 `emit("update", ...)`。  
   - **感測器參數**：參數定義可改為「依所選多台設備的型號聯集」顯示可用參數（或仍以第一台設備型號為主，依產品需求決定）；若多設備型號不同，可顯示多組參數並標註來源設備，或統一為聯集後勾選。

4. **環境監控頁面** `environment.vue`（或重構後的 useEnvironmentDevices / useEnvironmentSensorData）  
   - **當前地點設備**：由單一 `sensorDevice` 改為「當前地點的設備列表」`sensorDevices: Device[]`（或 `deviceIds` + 快取 Map）。  
   - **載入資料**：`loadLocationSensorData`、`loadLocationSensorDataForOverview` 改為依 `location.deviceIds` 迴圈，對每台設備載入型號與讀取 Modbus；同一參數若多台設備都有，需訂規則（例如最後一台覆蓋、或平均、或取優先順序）。  
   - **總覽 / 詳細視圖**：若多設備彙總為一組數值，可在 composable 內先合併再寫入 `sensorData` / `allLocationsSensorData`；若需顯示「某參數來自哪台設備」，則需擴充資料結構（例如 `sensorData` 改為依參數+設備區分）。  
   - **disabled 狀態**：總覽卡片目前為 `:disabled="!location.deviceId"`，改為 `:disabled="!(location.deviceIds?.length)"`。

5. **完整報表 / 趨勢圖**  
   - 若後端讀數 API 仍依 `location_id` 回傳（含多設備寫入的筆數），則前端報表與趨勢圖可不必改；若後端改為「依 location 彙總後才回傳」，則前端只需配合新回傳格式。  
   - 報表匯出若需標註資料來源設備，可依 `environment_readings.device_id` 在後端 API 一併回傳，前端再加欄位。

### 2.5 UI 設計建議（感測器設備複選）

- **標題**：維持「感測器設備」，副標或說明改為「可勾選多台設備，該地點數值將由所選設備提供」。
- **列表**：與「感測器參數」區塊類似，以網格或列表列出所有感測器設備（來自 `props.devices`，可篩選 `type_code === 'sensor'`），每列一個 checkbox + 設備名稱；可選顯示設備型號或 host:port。
- **空狀態**：未選任何設備時，提示「請至少勾選一台感測器設備」；未載入設備時顯示「載入中…」。
- **與參數的互動**：若選擇多台設備，可用參數為各設備型號參數的聯集；勾選參數時表示「此地點要顯示該參數」，資料來源為「有該參數的任一台設備」（需訂優先順序或合併規則，見上）。

### 2.6 實作順序建議

1. **後端**：  
   - 支援 `system_config.device_ids` 讀寫與舊 `device_id` 相容；  
   - environmentMonitor 改為依 `device_ids` 輪詢多台設備並寫入讀數。

2. **前端類型與 adapter**：  
   - `EnvironmentLocation` 新增 `deviceIds`，adapter 雙向轉換並相容舊 `deviceId`。

3. **EnvironmentLocationFields**：  
   - 感測器設備改為複選 UI，綁定 `deviceIds`，送出時帶陣列。

4. **environment.vue（或 useEnvironmentDevices / useEnvironmentSensorData）**：  
   - 依 `deviceIds` 載入多台設備與讀數、合併規則、總覽 disabled 條件。

5. **完整報表 / 趨勢**：  
   - 依後端 API 與需求決定是否加「來源設備」或維持依 location 彙總顯示。

---

## 三、文件與程式對照

| 項目 | 檔案 / 位置 |
|------|-------------|
| 環境區域與地點類型 | `app/types/environment.ts` |
| 地點表單（感測器設備 + 參數） | `app/components/location/LocationFormFields/EnvironmentLocationFields.vue` |
| 環境地點管理（列表） | `app/components/location/LocationManagement/EnvironmentLocationManagement.vue` |
| 統一地點與後端 config 轉換 | `app/utils/locationAdapter.ts`（environmentLocationToUnified、unified 轉 EnvironmentLocation） |
| 後端環境 system_config | `ba-backend/src/services/systems/locationService.js`（buildSystemConfig、formatSystem） |
| 後端環境輪詢與寫入 | `ba-backend/src/services/monitoring/environmentMonitor.js` |

完成重構與複選後，建議更新本文件「實作順序」的勾選狀態，並在 **ZONE_LOCATION_SYSTEM.md** 的環境段落補充「感測器設備為複選（deviceIds）」的說明。
