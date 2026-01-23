# 環境監測系統架構與實現說明

**更新日期**：2025-01-09  
**狀態**：✅ 系統運行中  
**版本**：v2.0

---

## 📋 目錄

1. [系統概述](#系統概述)
2. [系統架構](#系統架構)
3. [後端實現](#後端實現)
4. [前端實現](#前端實現)
5. [數據流與交互](#數據流與交互)
6. [核心機制](#核心機制)
7. [技術細節](#技術細節)
8. [測試與驗證](#測試與驗證)

---

## 系統概述

### 核心目標

環境監測系統負責：

1. **感測器資料讀取**：透過 Modbus 協議讀取感測器設備資料
2. **即時監控**：顯示當前環境參數（PM2.5、PM10、溫度、濕度、CO₂、噪音等）
3. **狀態判斷**：根據國際標準判斷參數狀態（正常/注意/警報）
4. **歷史記錄**：儲存感測器讀數歷史資料
5. **警報整合**：與警報系統整合，自動產生異常警報
6. **多地點管理**：支援多個地點的環境監測

### 設計原則

- ✅ **統一架構**：使用統一的 Zone/Location 架構（與其他系統一致）
- ✅ **設備型號配置**：Modbus 配置定義在設備型號中，地點只需選擇參數
- ✅ **批量讀取優化**：使用批量 Modbus 讀取提升性能
- ✅ **實時更新**：WebSocket 推送 + 輪詢備援機制
- ✅ **共享配置**：支援共享設備型號配置，避免重複配置

---

## 系統架構

### 整體架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                      感測器設備                              │
│                  (Modbus 協議)                              │
└───────────────────────┬─────────────────────────────────────┘
                        │ Modbus 讀取
                        │
┌─────────────────────────────────────────────────────────────┐
│                        後端系統                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  環境服務     │    │  Modbus API   │    │  監控服務     │  │
│  │              │    │              │    │              │  │
│  │ environment  │    │ /modbus/     │    │ environment  │  │
│  │ Service      │    │ holding-     │    │ Monitor      │  │
│  │              │    │ registers    │    │              │  │
│  │ - getZones   │    │              │    │ - 定期讀取    │  │
│  │ - saveReading│    │ - 讀取寄存器  │    │ - 儲存資料    │  │
│  │ - getReadings│    │ - 批量讀取    │    │ - 推送事件    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         │                    │                    │          │
│         └────────────────────┴────────────────────┘          │
│                          WebSocket                             │
│                    (environment:reading:new)                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ HTTP API / WebSocket
                        │
┌─────────────────────────────────────────────────────────────┐
│                        前端系統                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  環境 API     │    │  Modbus 讀取  │    │  WebSocket    │  │
│  │              │    │              │    │              │  │
│  │ useEnvironment│    │ readModbus   │    │ useWebSocket  │  │
│  │ Api          │    │ Register     │    │              │  │
│  │              │    │              │    │ - 監聽事件    │  │
│  │ - getZones   │    │ - 單個讀取    │    │ - 更新資料    │  │
│  │ - saveReading│    │ - 批量讀取    │    │              │  │
│  │ - getReadings│    │ - 轉換公式    │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  狀態管理     │    │  資料處理     │    │  UI 組件      │  │
│  │              │    │              │    │              │  │
│  │ - sensorData │    │ - 批量讀取    │    │ Environment   │  │
│  │ - allLocations│    │ - 轉換公式    │    │ Gauge        │  │
│  │   SensorData │    │ - AQI 計算    │    │ Environment   │  │
│  │              │    │ - 狀態判斷    │    │ ParamCard    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 模組劃分

#### 後端模組

| 模組 | 文件 | 職責 |
|------|------|------|
| **環境服務** | `environmentService.js` | 區域管理、讀數儲存、歷史查詢 |
| **環境監控** | `environmentMonitor.js` | 定期讀取感測器資料、推送 WebSocket 事件 |
| **API 路由** | `environmentRoutes.js` | REST API 端點 |
| **Modbus API** | `modbusRoutes.js` | Modbus 讀取端點 |

#### 前端模組

| 模組 | 文件 | 職責 |
|------|------|------|
| **環境 API** | `useEnvironmentApi.ts` | 環境監測 API 封裝 |
| **環境頁面** | `environment.vue` | 主頁面、資料讀取、狀態管理 |
| **儀表組件** | `EnvironmentGauge.vue` | 大儀表顯示（噪音、AQI、溫度） |
| **參數卡片** | `EnvironmentParamCard.vue` | 參數卡片顯示 |
| **總覽卡片** | `OverviewLocationCard.vue` | 總覽面板卡片 |

---

## 後端實現

### 1. 環境服務 (`environmentService.js`)

#### 核心功能

**區域管理**（使用統一地點管理服務）：

- 區域和地點管理通過 `locationService` 統一處理
- 系統類型：`environment`
- 配置格式：`{ deviceId, parameters }`

**感測器讀數管理**：

- `saveReading(data)`: 儲存感測器讀數（已廢棄，改由監控服務自動記錄）
- `getReadings(locationId, options)`: 取得歷史讀數（從 `device_data_logs` 聚合查詢）

**錯誤追蹤**：

- `reportError(systemId, errorMessage)`: 記錄環境位置錯誤
- `clearError(systemId)`: 清除環境位置錯誤

### 2. 環境監控 (`environmentMonitor.js`)

#### 核心功能

**定期讀取**：

- 定期讀取所有有設備的地點的感測器資料
- 使用批量 Modbus 讀取優化性能
- 自動儲存到 `device_data_logs` 表

**WebSocket 推送**：

- 讀取成功後推送 `environment:reading:new` 事件
- 事件包含 `locationId`、`reading`（所有參數值）、`timestamp`

### 3. API 端點

**區域管理**（統一 API）：

```
GET    /api/locations/zones?locationType=environment
GET    /api/locations/zones/:id?locationType=environment
POST   /api/locations/zones
PUT    /api/locations/zones/:id
DELETE /api/locations/zones/:id
```

**感測器讀數**：

```
POST   /api/environment/readings          # 儲存讀數（已廢棄，保留用於向後兼容）
GET    /api/environment/readings/:locationId?startTime=&endTime=&limit=
```

**錯誤追蹤**：

```
POST   /api/environment/locations/:locationId/errors  # locationId 實際上是 systemId
DELETE /api/environment/locations/:locationId/errors
```

---

## 前端實現

### 1. 環境 API (`useEnvironmentApi.ts`)

#### 核心方法

**區域管理**（使用系統 API 工廠）：

```typescript
getZones(): Promise<{ zones: EnvironmentZone[] }>
getZone(id: string): Promise<{ zone: EnvironmentZone }>
createZone(data): Promise<{ merged: boolean; message: string; zone: EnvironmentZone }>
updateZone(id, data): Promise<{ merged: boolean; message: string; zone: EnvironmentZone }>
deleteZone(id): Promise<{ message: string }>
```

**感測器讀數**：

```typescript
saveReading(data: SaveReadingData): Promise<{ message: string; reading: SensorReading }>
getReadings(locationId: string, options?): Promise<{ readings: SensorReading[] }>
```

**錯誤追蹤**：

```typescript
reportError(systemId: string, errorMessage: string): Promise<void>
clearError(systemId: string): Promise<void>
```

### 2. 環境頁面 (`environment.vue`)

#### 核心功能

**資料讀取**：

- `loadSensorData()`: 讀取當前選中地點的感測器資料
- `loadLocationSensorDataForOverview()`: 讀取總覽面板地點的感測器資料
- 使用批量 Modbus 讀取優化性能

**批量讀取優化**：

```typescript
// 將參數按地址分組
const paramAddressMap = new Map<number, ParameterWithModbusConfig>();

// 找出連續的地址組
const addressGroups = groupConsecutiveAddresses(Array.from(paramAddressMap.keys()));

// 對連續組使用批量讀取，對單個地址使用單個讀取
for (const group of addressGroups) {
  if (group.length > 1) {
    // 批量讀取
    readModbusRegisterBatch(config, group.start, group.length);
  } else {
    // 單個讀取
    readModbusRegister(config, group.addresses[0]);
  }
}
```

**共享設備型號配置**：

```typescript
// 查找使用相同設備（相同 host/port）的其他地點
const findSharedDeviceModelConfig = async (
  currentLocation: EnvironmentLocation,
  currentDevice: Device
): Promise<SensorDeviceModelConfig | null> => {
  // 如果當前地點的設備型號配置不完整，查找其他使用相同設備的地點
  // 使用它們的設備型號配置作為補充
};
```

**WebSocket 監聽**：

```typescript
// 監聽環境讀數新事件
const handleEnvironmentReadingNew = (event: EnvironmentReadingNewEvent) => {
  const { locationId, reading } = event;
  
  // 更新當前選中地點的資料
  if (currentLocationData.value?.id === String(locationId)) {
    Object.keys(reading).forEach(key => {
      if (key in sensorData) {
        sensorData[key] = reading[key];
      }
    });
  }
  
  // 更新總覽面板的資料
  const existingData = allLocationsSensorData.value.get(String(locationId)) || createEmptySensorReadings();
  Object.keys(reading).forEach(key => {
    if (key in existingData) {
      existingData[key] = reading[key];
    }
  });
  allLocationsSensorData.value.set(String(locationId), existingData);
};
```

**動態輪詢間隔**：

```typescript
// WebSocket 連接時 30 秒，否則 5 秒
const pollingInterval = computed(() => {
  return isConnected.value ? 30000 : 5000;
});

const { start: startPolling, stop: stopPolling } = usePolling({
  callback: async () => {
    // 讀取感測器資料
  },
  interval: pollingInterval, // 使用響應式間隔時間
  immediate: false
});
```

### 3. 感測器參數類型

#### 支援的參數

| 參數類型 | 顯示名稱 | 單位 | 小數位數 | 圖標路徑 |
|---------|---------|------|---------|---------|
| `pm25` | PM2.5 | µg/m³ | 0 | `/environment/PM2.5.png` |
| `pm10` | PM10 | µg/m³ | 0 | `/environment/PM10.png` |
| `tvoc` | TVOC | ppm | 3 | `/environment/TVOC.png` |
| `hcho` | HCHO | ppm | 0 | `/environment/HCHO.png` |
| `humidity` | 濕度 | % | 1 | `/environment/humidity.png` |
| `temperature` | 溫度 | °C | 1 | `/environment/temperature.png` |
| `co2` | CO2 | ppm | 0 | `/environment/CO2.png` |
| `noise` | 噪音值 | dB | 0 | `/environment/noise.png` |
| `wind` | 風速 | m/s | 1 | `/environment/wind-speed.png` |

#### 參數配置結構

**設備型號層級** (`SensorParameterDefinition`)：

```typescript
interface SensorParameterDefinition {
  type: string; // 參數類型
  modbusConfig: {
    address: number; // Modbus 地址（必填）
    transform?: string; // 轉換公式（可選）
  };
}
```

**地點層級** (`SensorParameter`)：

```typescript
interface SensorParameter {
  id?: string;
  type: SensorParameterType; // 參數類型
  enabled: boolean; // 是否啟用
}
```

### 4. 狀態判斷

#### 狀態判斷閾值

**PM2.5**（WHO 2021 標準）：

| 數值範圍 | 狀態 | 邊框顏色 | 背景顏色 | 狀態燈顏色 |
|---------|------|---------|---------|-----------|
| ≤ 25 µg/m³ | 正常 | 預設 | `bg-white/10` | `bg-green-400` |
| 25.1 - 50 µg/m³ | 注意 | `border-yellow-400` | `bg-yellow-500/10` | `bg-yellow-400` |
| > 50 µg/m³ | 警報 | `border-red-400` | `bg-red-500/20` | `bg-red-400` |

**PM10**（WHO 2021 標準）：

| 數值範圍 | 狀態 | 邊框顏色 | 背景顏色 | 狀態燈顏色 |
|---------|------|---------|---------|-----------|
| ≤ 50 µg/m³ | 正常 | 預設 | `bg-white/10` | `bg-green-400` |
| 50.1 - 100 µg/m³ | 注意 | `border-yellow-400` | `bg-yellow-500/10` | `bg-yellow-400` |
| > 100 µg/m³ | 警報 | `border-red-400` | `bg-red-500/20` | `bg-red-400` |

**CO₂**（ASHRAE 標準）：

| 數值範圍 | 狀態 | 邊框顏色 | 背景顏色 | 狀態燈顏色 |
|---------|------|---------|---------|-----------|
| ≤ 1000 ppm | 正常 | 預設 | `bg-white/10` | `bg-green-400` |
| 1000.1 - 2000 ppm | 注意 | `border-yellow-400` | `bg-yellow-500/10` | `bg-yellow-400` |
| > 2000 ppm | 警報 | `border-red-400` | `bg-red-500/20` | `bg-red-400` |

**溫度**（ASHRAE 55 標準）：

| 數值範圍 | 狀態 | 邊框顏色 | 背景顏色 | 狀態燈顏色 |
|---------|------|---------|---------|-----------|
| 20 - 26 °C | 正常 | 預設 | `bg-white/10` | `bg-green-400` |
| 18 - 20 °C 或 26 - 28 °C | 注意 | `border-yellow-400` | `bg-yellow-500/10` | `bg-yellow-400` |
| < 18 °C 或 > 28 °C | 警報 | `border-red-400` | `bg-red-500/20` | `bg-red-400` |

**濕度**（ASHRAE 標準）：

| 數值範圍 | 狀態 | 邊框顏色 | 背景顏色 | 狀態燈顏色 |
|---------|------|---------|---------|-----------|
| 30 - 60 % | 正常 | 預設 | `bg-white/10` | `bg-green-400` |
| 20 - 30 % 或 60 - 70 % | 注意 | `border-yellow-400` | `bg-yellow-500/10` | `bg-yellow-400` |
| < 20 % 或 > 70 % | 警報 | `border-red-400` | `bg-red-500/20` | `bg-red-400` |

**噪音值**（OSHA/WHO 標準）：

| 數值範圍 | 狀態 | 邊框顏色 | 背景顏色 | 狀態燈顏色 |
|---------|------|---------|---------|-----------|
| ≤ 55 dB | 正常 | 預設 | `bg-white/10` | `bg-green-400` |
| 55.1 - 70 dB | 注意 | `border-yellow-400` | `bg-yellow-500/10` | `bg-yellow-400` |
| > 70 dB | 警報 | `border-red-400` | `bg-red-500/20` | `bg-red-400` |

**其他參數**：

- **TVOC**: 固定顯示「正常」（綠色）
- **HCHO**: 固定顯示「正常」（綠色）
- **風速**: 固定顯示「正常」（綠色）

**狀態判斷實現**：

```typescript
// 使用警報規則進行狀態判斷
const getStatusText = (type: SensorParameterType, value: number | null): string => {
  if (value === null) return "無資料";
  
  // 使用警報規則判斷狀態
  const status = evaluateParameter(alertRules.value, type, value);
  return getStatusText(status);
};
```

### 5. 儀表顯示

#### 噪音值儀表

- **範圍**: 0-100 dB
- **最大值**: 100 dB
- **顏色邏輯**:
  - ≤ 60 dB: 綠色 (`#00ffb4`)
  - 60.1 - 70 dB: 黃色 (`#FFC701`)
  - > 70 dB: 紅色 (`#FF0000`)

#### AQI 儀表

- **範圍**: 0-150
- **最大值**: 150
- **計算方式**: 取 PM2.5 和 PM10 的 AQI 最大值
- **顏色邏輯**:
  - < 10: 藍色 (`#001Eff`)
  - 10 - 50: 綠色 (`#00ffb4`)
  - 51 - 100: 黃色 (`#FFC701`)
  - > 100: 紅色 (`#FF0000`)

#### 溫度儀表

- **範圍**: 0-50 °C
- **最大值**: 50 °C
- **顏色邏輯**:
  - ≤ 20 °C: 藍色 (`#001Eff`)
  - 20.1 - 25 °C: 綠色 (`#00ffb4`)
  - 25.1 - 30 °C: 橙色 (`#FFC701`)
  - > 30 °C: 紅色 (`#FF0000`)

---

## 數據流與交互

### 1. 感測器資料讀取流程

```
┌─────────────┐
│  選擇地點    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 載入設備資訊 │
│ (deviceId)  │
└──────┬──────┘
       │
       ├─► 從設備 API 取得設備資訊
       ├─► 從設備型號配置取得參數定義
       └─► 查找共享設備型號配置（補充）
       │
       ▼
┌─────────────┐
│ 驗證配置     │
│ 完整性      │
└──────┬──────┘
       │
       ├─► 檢查地點是否有設備
       ├─► 檢查是否有啟用的參數
       ├─► 檢查參數是否有 Modbus 配置
       └─► 如果驗證失敗，顯示錯誤提示
       │
       ▼
┌─────────────┐
│ 批量讀取     │
│ Modbus 資料  │
└──────┬──────┘
       │
       ├─► 將參數按地址分組
       ├─► 找出連續的地址組
       ├─► 對連續組使用批量讀取
       └─► 對單個地址使用單個讀取
       │
       ▼
┌─────────────┐
│ 應用轉換公式 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 更新感測器   │
│ 資料        │
└──────┬──────┘
       │
       ├─► 更新當前選中地點的資料
       ├─► 更新總覽面板的資料
       └─► 儲存到後端（可選）
       │
       ▼
┌─────────────┐
│ 更新 UI 顯示 │
└─────────────┘
```

### 2. WebSocket 事件流程

```
┌─────────────┐
│  後端監控    │
│  服務讀取    │
│  感測器資料  │
└──────┬──────┘
       │
       ├─► 定期讀取所有有設備的地點
       ├─► 使用批量 Modbus 讀取
       └─► 自動儲存到 device_data_logs
       │
       ▼
┌─────────────┐
│ 推送 WebSocket│
│ 事件         │
└──────┬──────┘
       │
       ├─► environment:reading:new
       │   {
       │     locationId: number,
       │     reading: { pm25, pm10, ... },
       │     timestamp: string
       │   }
       │
       ▼
┌─────────────┐
│  前端監聽    │
│  事件        │
└──────┬──────┘
       │
       ├─► 更新當前選中地點的資料
       └─► 更新總覽面板的資料
       │
       ▼
┌─────────────┐
│ 更新 UI 顯示 │
└─────────────┘
```

### 3. 批量讀取優化流程

```
┌─────────────┐
│ 收集所有參數 │
│ 的 Modbus  │
│ 地址        │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 按地址分組   │
│ 和排序      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 找出連續的   │
│ 地址組      │
└──────┬──────┘
       │
       ├─► [0, 1, 2, 3] → 連續組（批量讀取）
       ├─► [5] → 單個地址（單個讀取）
       └─► [10, 11, 12] → 連續組（批量讀取）
       │
       ▼
┌─────────────┐
│ 並行讀取     │
│ (Promise.all)│
└──────┬──────┘
       │
       ├─► 批量讀取連續組
       └─► 單個讀取單個地址
       │
       ▼
┌─────────────┐
│ 應用轉換公式 │
│ 和映射結果   │
└─────────────┘
```

---

## 核心機制

### 1. 批量 Modbus 讀取優化

**目的**：減少 Modbus 請求次數，提升讀取性能

**實現**：

```typescript
// 將參數按地址分組
const paramAddressMap = new Map<number, ParameterWithModbusConfig>();

// 找出連續的地址組
function groupConsecutiveAddresses(addresses: number[]): AddressGroup[] {
  const sorted = [...addresses].sort((a, b) => a - b);
  const groups: AddressGroup[] = [];
  let currentGroup: number[] = [];
  
  for (let i = 0; i < sorted.length; i++) {
    if (currentGroup.length === 0 || sorted[i] === currentGroup[currentGroup.length - 1] + 1) {
      currentGroup.push(sorted[i]);
    } else {
      groups.push({
        start: currentGroup[0],
        length: currentGroup.length,
        addresses: currentGroup
      });
      currentGroup = [sorted[i]];
    }
  }
  
  if (currentGroup.length > 0) {
    groups.push({
      start: currentGroup[0],
      length: currentGroup.length,
      addresses: currentGroup
    });
  }
  
  return groups;
}

// 對連續組使用批量讀取
for (const group of addressGroups) {
  if (group.length > 1) {
    // 批量讀取
    await readModbusRegisterBatch(config, group.start, group.length);
  } else {
    // 單個讀取
    await readModbusRegister(config, group.addresses[0]);
  }
}
```

**效果**：

- ✅ 減少 Modbus 請求次數（從 N 次減少到 M 次，M < N）
- ✅ 提升讀取速度
- ✅ 降低設備負載

### 2. 共享設備型號配置機制

**目的**：如果當前地點的設備型號配置不完整，使用其他使用相同設備的地點的配置作為補充

**實現**：

```typescript
const findSharedDeviceModelConfig = async (
  currentLocation: EnvironmentLocation,
  currentDevice: Device
): Promise<SensorDeviceModelConfig | null> => {
  // 查找使用相同設備（相同 host/port）的其他地點
  const sharedLocations = environmentZones.value
    .flatMap(zone => zone.locations)
    .filter(loc => 
      loc.deviceId && 
      loc.id !== currentLocation.id &&
      // 檢查是否使用相同設備（需要查詢設備資訊）
    );
  
  // 如果找到共享地點，使用它們的設備型號配置
  if (sharedLocations.length > 0) {
    const sharedLocation = sharedLocations[0];
    const sharedDevice = await loadDeviceAndModelConfig(sharedLocation.deviceId);
    return sharedDevice?.modelConfig || null;
  }
  
  return null;
};
```

**效果**：

- ✅ 避免重複配置
- ✅ 自動補充缺失的配置
- ✅ 提高配置效率

### 3. 動態輪詢間隔

**目的**：根據 WebSocket 連接狀態動態調整輪詢間隔

**實現**：

```typescript
// WebSocket 連接時 30 秒，否則 5 秒
const pollingInterval = computed(() => {
  return isConnected.value ? 30000 : 5000;
});

const { start: startPolling, stop: stopPolling } = usePolling({
  callback: async () => {
    // 讀取感測器資料
  },
  interval: pollingInterval, // 使用響應式間隔時間
  immediate: false
});
```

**效果**：

- ✅ WebSocket 連接時減少輪詢頻率（降低後端負擔）
- ✅ WebSocket 斷線時增加輪詢頻率（確保資料更新）
- ✅ 自動適應連接狀態

### 4. 轉換公式機制

**目的**：支援 Modbus 原始值的轉換

**支援的格式**：

1. **運算符開頭格式**（推薦）
   - `"/ 10"` → `value / 10`
   - `"* 2"` → `value * 2`
   - `"+ 5"` → `value + 5`
   - `"-1"` 或 `"- 1"` → `value - 1`

2. **純數字格式**
   - `"1"` → `value - 1`（預設為減法）

3. **複雜表達式**
   - `"value / 10 + 5"` → 直接替換 `value` 為實際數值

**實現**：

```typescript
function applyTransform(value: number, transform?: string): number {
  if (!transform) return value;
  
  // 運算符開頭格式
  if (transform.startsWith("/")) {
    return value / parseFloat(transform.substring(1).trim());
  }
  if (transform.startsWith("*")) {
    return value * parseFloat(transform.substring(1).trim());
  }
  if (transform.startsWith("+")) {
    return value + parseFloat(transform.substring(1).trim());
  }
  if (transform.startsWith("-")) {
    return value - parseFloat(transform.substring(1).trim());
  }
  
  // 複雜表達式
  if (transform.includes("value")) {
    return eval(transform.replace(/value/g, String(value)));
  }
  
  // 純數字格式（預設為減法）
  return value - parseFloat(transform);
}
```

---

## 技術細節

### 1. 數據結構

**環境區域** (`EnvironmentZone`)：

```typescript
interface EnvironmentZone {
  id?: string;
  name: string; // 區域名稱（如：1F、2F）
  locations: EnvironmentLocation[]; // 位置列表
}
```

**環境地點** (`EnvironmentLocation`)：

```typescript
interface EnvironmentLocation {
  id?: string; // 地點 ID (locations.id)
  systemId?: string; // 系統 ID (location_systems.id)，用於錯誤追蹤和警報
  name: string; // 位置名稱（如：管理中心、展廳）
  deviceId?: number; // 關聯的感測器設備 ID
  parameters: SensorParameter[]; // 該位置支援的感測器參數列表
}
```

**感測器參數** (`SensorParameter`)：

```typescript
interface SensorParameter {
  id?: string;
  type: SensorParameterType; // 參數類型
  enabled: boolean; // 是否啟用
}
```

**感測器讀數** (`SensorReading`)：

```typescript
interface SensorReading {
  id?: string;
  locationId: string; // 位置 ID
  timestamp: string; // ISO 8601 時間戳
  data: {
    pm25?: number | null;
    pm10?: number | null;
    tvoc?: number | null;
    hcho?: number | null;
    humidity?: number | null;
    temperature?: number | null;
    co2?: number | null;
    noise?: number | null;
    wind?: number | null;
  };
}
```

### 2. Modbus 配置

**設備配置**：

```typescript
interface ModbusDeviceConfig {
  host: string; // Modbus 主機地址
  port: number; // Modbus 端口（預設 502）
  unitId: number; // Modbus Unit ID（預設 1）
}
```

**參數配置**：

```typescript
interface SensorParameterModbusConfig {
  address: number; // Modbus 地址（必填）
  transform?: string; // 轉換公式（可選）
}
```

### 3. WebSocket 事件

**環境讀數新事件** (`environment:reading:new`)：

```typescript
interface EnvironmentReadingNewEvent {
  locationId: number; // 地點 ID
  reading: {
    pm25?: number | null;
    pm10?: number | null;
    tvoc?: number | null;
    hcho?: number | null;
    humidity?: number | null;
    temperature?: number | null;
    co2?: number | null;
    noise?: number | null;
    wind?: number | null;
    [key: string]: number | null | undefined;
  };
  timestamp: string; // ISO 8601 時間戳
}
```

### 4. AQI 計算

**PM2.5 AQI 斷點**：

| 濃度範圍 (µg/m³) | AQI 範圍 |
|-----------------|---------|
| 0 - 12 | 0 - 50 |
| 12.1 - 35.4 | 51 - 100 |
| 35.5 - 55.4 | 101 - 150 |
| 55.5 - 150.4 | 151 - 200 |
| 150.5 - 250.4 | 201 - 300 |
| 250.5 - 350.4 | 301 - 400 |
| 350.5 - 500.4 | 401 - 500 |

**PM10 AQI 斷點**：

| 濃度範圍 (µg/m³) | AQI 範圍 |
|-----------------|---------|
| 0 - 54 | 0 - 50 |
| 55 - 154 | 51 - 100 |
| 155 - 254 | 101 - 150 |
| 255 - 354 | 151 - 200 |
| 355 - 424 | 201 - 300 |
| 425 - 504 | 301 - 400 |
| 505 - 604 | 401 - 500 |

**AQI 計算實現**：

```typescript
function calculateAQI(data: SensorReadings): number | null {
  const pm25AQI = calculatePM25AQI(data.pm25);
  const pm10AQI = calculatePM10AQI(data.pm10);
  
  // 取最大值
  return Math.max(pm25AQI || 0, pm10AQI || 0) || null;
}
```

---

## 測試與驗證

### 1. 後端測試

**環境服務測試**：

- ✅ 區域管理（CRUD）
- ✅ 感測器讀數儲存
- ✅ 歷史讀數查詢
- ✅ 錯誤追蹤

**環境監控測試**：

- ✅ 定期讀取感測器資料
- ✅ WebSocket 事件推送
- ✅ 資料自動儲存

### 2. 前端測試

**資料讀取測試**：

- ✅ 單個 Modbus 讀取
- ✅ 批量 Modbus 讀取
- ✅ 轉換公式應用
- ✅ 共享設備型號配置

**WebSocket 測試**：

- ✅ 事件監聽
- ✅ 資料更新
- ✅ 連接狀態處理

**狀態判斷測試**：

- ✅ 各參數狀態判斷
- ✅ AQI 計算
- ✅ 儀表顯示

### 3. 整合測試

**端到端測試**：

1. 建立區域 → 建立地點 → 選擇設備 → 啟用參數 → 讀取資料
2. WebSocket 連接 → 接收事件 → 更新資料 → 顯示狀態
3. 批量讀取 → 轉換公式 → 狀態判斷 → 警報產生

**性能測試**：

- ✅ 批量讀取效果
- ✅ 共享配置效果
- ✅ 動態輪詢效果

---

## 總結

### 系統優勢

1. **統一架構**：使用統一的 Zone/Location 架構，與其他系統一致
2. **批量讀取優化**：使用批量 Modbus 讀取，提升讀取性能
3. **實時更新**：WebSocket 推送 + 輪詢備援機制，確保資料即時性
4. **共享配置**：支援共享設備型號配置，避免重複配置
5. **動態輪詢**：根據 WebSocket 連接狀態動態調整輪詢間隔
6. **狀態判斷**：根據國際標準判斷參數狀態，與警報系統整合

### 未來改進方向

1. **歷史資料分析**：支援歷史資料的統計分析和趨勢預測
2. **自定義閾值**：允許管理員自定義狀態判斷閾值
3. **多設備支援**：支援一個地點關聯多個感測器設備
4. **資料導出**：支援感測器資料的導出功能

---

**文檔結束**
