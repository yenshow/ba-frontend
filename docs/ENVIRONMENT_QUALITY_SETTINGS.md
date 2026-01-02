# 環境品質頁面設定文件

## 目錄

1. [頁面結構](#頁面結構)
2. [感測器參數類型](#感測器參數類型)
3. [設備配置](#設備配置)
4. [地點與樓層管理](#地點與樓層管理)
5. [狀態判斷閾值](#狀態判斷閾值)
6. [Modbus 配置](#modbus-配置)
7. [顯示設定](#顯示設定)
8. [API 端點](#api-端點)

---

## 頁面結構

### 主要組件

- **頁面**: `app/pages/construction-monitoring/environment.vue`
- **儀表組件**: `app/components/environment/EnvironmentGauge.vue`
- **參數卡片**: `app/components/environment/EnvironmentParamCard.vue`
- **總覽卡片**: `app/components/environment/OverviewLocationCard.vue`
- **地點管理對話框**: `app/components/environment/LocationManagementDialog.vue`

### 頁面佈局

- **左側**: 詳細視圖
  - 三個大儀表（噪音值、AQI、溫度）
  - 環境參數網格（3-4 欄）
- **右側**: 總覽面板
  - 所有地點的總覽卡片
  - 顯示 AQI、噪音值和參數摘要

---

## 感測器參數類型

### 支援的參數類型

系統支援以下 9 種感測器參數類型：

| 參數類型      | 顯示名稱 | 單位  | 小數位數 | 圖標路徑                       |
| ------------- | -------- | ----- | -------- | ------------------------------ |
| `pm25`        | PM2.5    | µg/m³ | 0        | `/environment/PM2.5.png`       |
| `pm10`        | PM10     | µg/m³ | 0        | `/environment/PM10.png`        |
| `tvoc`        | TVOC     | ppm   | 3        | `/environment/TVOC.png`        |
| `hcho`        | HCHO     | ppm   | 0        | `/environment/HCHO.png`        |
| `humidity`    | 濕度     | %     | 1        | `/environment/humidity.png`    |
| `temperature` | 溫度     | °C    | 1        | `/environment/temperature.png` |
| `co2`         | CO2      | ppm   | 0        | `/environment/CO2.png`         |
| `noise`       | 噪音值   | dB    | 0        | `/environment/noise.png`       |
| `wind`        | 風速     | m/s   | 1        | `/environment/wind-speed.png`  |

### 參數定義結構

```typescript
interface SensorParameter {
	id?: string;
	type: SensorParameterType; // 參數類型
	enabled: boolean; // 是否啟用
}
```

### 參數配置來源

參數配置分為兩個層級：

1. **設備型號層級** (`SensorParameterDefinition`)
   - 定義在設備型號的 `config.sensorParameters` 中
   - 包含 Modbus 配置（地址、轉換公式）
   - 由管理員在「設備型號管理」中設定

2. **地點層級** (`SensorParameter`)
   - 定義在地點的 `parameters` 中
   - 只需指定 `type` 和 `enabled`
   - 由管理員在「地點管理」中選擇和啟用

---

## 設備配置

### 感測器設備配置

感測器設備的配置結構：

```typescript
interface SensorDeviceConfig {
	type: "sensor";
	protocol: "modbus" | "http" | "mqtt";
	host?: string; // Modbus 主機地址
	port?: number; // Modbus 端口（預設 502）
	unitId?: number; // Modbus Unit ID（由後端自動生成，預設 1）
	connection_string?: string; // 其他協議用
	api_endpoint?: string; // HTTP 專用
}
```

### 設備型號配置

設備型號的感測器參數配置：

```typescript
interface SensorDeviceModelConfig {
	sensorParameters?: SensorParameterDefinition[];
}

interface SensorParameterDefinition {
	type: string; // 參數類型（pm25, pm10, tvoc, ...）
	modbusConfig: {
		address: number; // Modbus 地址（必填）
		transform?: string; // 轉換公式（可選）
	};
}
```

### 設備關聯流程

1. 在「設備管理」中建立感測器設備
   - 選擇設備型號（必須已配置 `sensorParameters`）
   - 設定 Modbus 連線資訊（host, port）

2. 在「地點管理」中為地點選擇感測器設備
   - 系統會自動載入該設備型號支援的參數列表
   - 管理員可選擇要啟用的參數

3. 系統根據設備型號配置讀取感測器資料
   - 使用設備的 Modbus 配置（host, port, unitId）
   - 使用參數的 Modbus 配置（address, transform）

---

## 地點與樓層管理

### 資料結構

```typescript
interface EnvironmentLocation {
	id?: string;
	name: string; // 位置名稱（如：管理中心、展廳）
	// floor 欄位已移除（冗餘），樓層資訊從 EnvironmentFloor.name 取得
	deviceId?: number; // 關聯的感測器設備 ID
	parameters: SensorParameter[]; // 該位置支援的感測器參數列表
}

interface EnvironmentFloor {
	id?: string;
	name: string; // 樓層名稱（如：1F、2F）
	locations: EnvironmentLocation[]; // 位置列表
}
```

### ✅ 設計改進：已移除 Location.floor 冗餘欄位

**改進說明**：

- ✅ `EnvironmentLocation` 中的 `floor` 欄位已**移除**
- ✅ Location 通過 `Floor.locations` 陣列屬於某個 Floor
- ✅ 樓層資訊從父層級（Floor）取得，使用 `getLocationFloor()` helper function

**對比照明系統**：

- ✅ 與 `LightingArea` 設計一致（沒有 `floor` 欄位）
- ✅ Area 通過 `Floor.areas` 陣列屬於某個 Floor
- ✅ 需要顯示樓層時，從父層級取得

**實現方式**：

1. ✅ 前端：使用 `getLocationFloor(location)` helper function 從 `environmentFloors` 陣列中查找
2. ✅ 後端：移除對 `floor` 欄位的驗證和儲存
3. ✅ 資料庫：移除 `environment_locations.floor` 欄位

**使用範例**：

```typescript
// 取得地點所屬的樓層名稱
const getLocationFloor = (location: EnvironmentLocation): string | null => {
	for (const floor of environmentFloors.value) {
		if (floor.locations.some(loc => loc.id === location.id || loc.name === location.name)) {
			return floor.name;
		}
	}
	return null;
};

// 使用範例
const floorName = getLocationFloor(currentLocationData.value);
```

### 管理流程

1. **建立樓層**
   - 在「地點管理」對話框中點擊「新增樓層」
   - 系統自動生成樓層名稱（如：1F、2F）

2. **新增地點**
   - 在樓層中點擊「新增地點」
   - 填寫地點名稱和樓層
   - 選擇感測器設備（可選）
   - 選擇要啟用的參數

3. **配置參數**
   - 選擇感測器設備後，系統會顯示該設備型號支援的參數
   - 勾選要啟用的參數
   - 系統會顯示每個參數的 Modbus 地址

4. **儲存變更**
   - 所有變更會暫存在前端
   - 點擊「儲存變更」後才會提交到後端

---

## 狀態判斷閾值

> **參考標準**：
> - **PM2.5/PM10**: WHO 2021 空氣品質指引
> - **CO₂**: ASHRAE 室內空氣品質標準
> - **溫度**: ASHRAE 55 熱舒適標準
> - **濕度**: ASHRAE 室內環境標準
> - **噪音**: OSHA/WHO 工作場所噪音標準

### PM2.5 狀態判斷（WHO 2021 標準）

| 數值範圍        | 狀態 | 邊框顏色            | 背景顏色           | 狀態燈顏色      | 狀態文字 |
| --------------- | ---- | ------------------- | ------------------ | --------------- | -------- |
| ≤ 25 µg/m³      | 正常 | 預設                | `bg-white/10`      | `bg-green-400`  | 正常     |
| 25.1 - 50 µg/m³ | 注意 | `border-yellow-400` | `bg-yellow-500/10` | `bg-yellow-400` | 注意     |
| > 50 µg/m³      | 警報 | `border-red-400`    | `bg-red-500/20`    | `bg-red-400`    | 警報     |

### PM10 狀態判斷（WHO 2021 標準）

| 數值範圍         | 狀態 | 邊框顏色            | 背景顏色           | 狀態燈顏色      | 狀態文字 |
| ---------------- | ---- | ------------------- | ------------------ | --------------- | -------- |
| ≤ 50 µg/m³       | 正常 | 預設                | `bg-white/10`      | `bg-green-400`  | 正常     |
| 50.1 - 100 µg/m³ | 注意 | `border-yellow-400` | `bg-yellow-500/10` | `bg-yellow-400` | 注意     |
| > 100 µg/m³      | 警報 | `border-red-400`    | `bg-red-500/20`    | `bg-red-400`    | 警報     |

### CO₂ 狀態判斷（ASHRAE 標準）

| 數值範圍          | 狀態 | 邊框顏色            | 背景顏色           | 狀態燈顏色      | 狀態文字 |
| ----------------- | ---- | ------------------- | ------------------ | --------------- | -------- |
| ≤ 1000 ppm        | 正常 | 預設                | `bg-white/10`      | `bg-green-400`  | 正常     |
| 1000.1 - 2000 ppm | 注意 | `border-yellow-400` | `bg-yellow-500/10` | `bg-yellow-400` | 注意     |
| > 2000 ppm        | 警報 | `border-red-400`    | `bg-red-500/20`    | `bg-red-400`    | 警報     |

### 溫度狀態判斷（ASHRAE 55 標準）

| 數值範圍                    | 狀態 | 邊框顏色            | 背景顏色           | 狀態燈顏色      | 狀態文字 |
| --------------------------- | ---- | ------------------- | ------------------ | --------------- | -------- |
| 20 - 26 °C                  | 正常 | 預設                | `bg-white/10`      | `bg-green-400`  | 正常     |
| 18 - 20 °C 或 26 - 28 °C    | 注意 | `border-yellow-400` | `bg-yellow-500/10` | `bg-yellow-400` | 注意     |
| < 18 °C 或 > 28 °C          | 警報 | `border-red-400`    | `bg-red-500/20`    | `bg-red-400`    | 警報     |

### 濕度狀態判斷（ASHRAE 標準）

| 數值範圍                    | 狀態 | 邊框顏色            | 背景顏色           | 狀態燈顏色      | 狀態文字 |
| --------------------------- | ---- | ------------------- | ------------------ | --------------- | -------- |
| 30 - 60 %                   | 正常 | 預設                | `bg-white/10`      | `bg-green-400`  | 正常     |
| 20 - 30 % 或 60 - 70 %      | 注意 | `border-yellow-400` | `bg-yellow-500/10` | `bg-yellow-400` | 注意     |
| < 20 % 或 > 70 %            | 警報 | `border-red-400`    | `bg-red-500/20`    | `bg-red-400`    | 警報     |

### 噪音值狀態判斷（OSHA/WHO 標準）

| 數值範圍     | 狀態 | 邊框顏色            | 背景顏色           | 狀態燈顏色      | 狀態文字 |
| ------------ | ---- | ------------------- | ------------------ | --------------- | -------- |
| ≤ 55 dB      | 正常 | 預設                | `bg-white/10`      | `bg-green-400`  | 正常     |
| 55.1 - 70 dB | 注意 | `border-yellow-400` | `bg-yellow-500/10` | `bg-yellow-400` | 注意     |
| > 70 dB      | 警報 | `border-red-400`    | `bg-red-500/20`    | `bg-red-400`    | 警報     |

### 其他參數狀態

- **TVOC**: 固定顯示「正常」（綠色）
- **HCHO**: 固定顯示「正常」（綠色）
- **風速**: 固定顯示「正常」（綠色）

### 閃爍動畫

- **正常**: 不閃爍
- **注意/異常**: 慢速閃爍（2 秒）
- **警報**: 快速閃爍（1 秒）
- **設備異常**: 中等速度閃爍（1.5 秒），顯示黃黑條紋警告條

---

## Modbus 配置

### Modbus 設備配置

```typescript
interface ModbusDeviceConfig {
	host: string; // Modbus 主機地址
	port: number; // Modbus 端口（預設 502）
	unitId: number; // Modbus Unit ID（預設 1）
}
```

### Modbus 參數配置

```typescript
interface SensorParameterModbusConfig {
	address: number; // Modbus 地址（必填）
	transform?: string; // 轉換公式（可選）
}
```

### 轉換公式格式

轉換公式支援以下格式：

1. **運算符開頭格式**（推薦）
   - `"/ 10"` → `value / 10`
   - `"* 2"` → `value * 2`
   - `"+ 5"` → `value + 5`
   - `"-1"` 或 `"- 1"` → `value - 1`

2. **純數字格式**
   - `"1"` → `value - 1`（預設為減法）

3. **複雜表達式**
   - `"value / 10 + 5"` → 直接替換 `value` 為實際數值

### Modbus 讀取流程

1. 系統從地點配置中取得 `deviceId`
2. 從設備 API 取得設備資訊（包含 `config` 和 `model.config`）
3. 從設備型號配置中取得每個參數的 Modbus 配置
4. 使用 Modbus API 讀取每個啟用參數的資料
   - 端點: `/modbus/holding-registers`
   - 參數: `host`, `port`, `unitId`, `address`
   - `length` 預設為 1，不需要傳遞
5. 應用轉換公式（如果存在）
6. 更新感測器資料

---

## 顯示設定

### 儀表顯示

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

### AQI 計算

#### PM2.5 AQI 斷點

| 濃度範圍 (µg/m³) | AQI 範圍  |
| ---------------- | --------- |
| 0 - 12           | 0 - 50    |
| 12.1 - 35.4      | 51 - 100  |
| 35.5 - 55.4      | 101 - 150 |
| 55.5 - 150.4     | 151 - 200 |
| 150.5 - 250.4    | 201 - 300 |
| 250.5 - 350.4    | 301 - 400 |
| 350.5 - 500.4    | 401 - 500 |

#### PM10 AQI 斷點

| 濃度範圍 (µg/m³) | AQI 範圍  |
| ---------------- | --------- |
| 0 - 54           | 0 - 50    |
| 55 - 154         | 51 - 100  |
| 155 - 254        | 101 - 150 |
| 255 - 354        | 151 - 200 |
| 355 - 424        | 201 - 300 |
| 425 - 504        | 301 - 400 |
| 505 - 604        | 401 - 500 |

### 自動刷新

- **刷新間隔**: 5 秒（`AUTO_REFRESH_INTERVAL = 5000`）
- **離線警報間隔**: 30 秒（`OFFLINE_ALERT_INTERVAL = 30000`）
- **刷新條件**: 僅在選中地點且有感測器設備時才讀取資料

---

## API 端點

### 環境 API

#### 取得樓層列表

```
GET /environment/floors
```

#### 取得單一樓層

```
GET /environment/floors/:id
```

#### 建立樓層

```
POST /environment/floors
Body: {
  name: string;
  locations?: EnvironmentLocation[];
}
```

#### 更新樓層

```
PUT /environment/floors/:id
Body: {
  name?: string;
  locations?: EnvironmentLocation[];
}
```

#### 刪除樓層

```
DELETE /environment/floors/:id
```

### 設備 API

#### 取得感測器設備列表

```
GET /devices?type_code=sensor&status=active
```

#### 取得單一設備

```
GET /devices/:id
```

#### 取得設備型號

```
GET /devices/models/:id
```

### Modbus API

#### 讀取保持寄存器

```
GET /modbus/holding-registers?host={host}&port={port}&unitId={unitId}&address={address}
```

**參數說明**:

- `host`: Modbus 主機地址（必填）
- `port`: Modbus 端口（必填）
- `unitId`: Modbus Unit ID（必填）
- `address`: 寄存器地址（必填）
- `length`: 讀取長度（預設為 1，不需要傳遞）

**回應格式**:

```json
{
	"address": 0,
	"length": 1,
	"data": [123],
	"device": {
		"host": "192.168.1.100",
		"port": 502,
		"unitId": 1
	}
}
```

---

## 配置驗證

系統會在讀取感測器資料前進行配置驗證：

1. **地點驗證**
   - 必須選擇地點

2. **設備驗證**
   - 地點必須關聯感測器設備

3. **參數驗證**
   - 地點必須至少啟用一個參數

4. **設備型號驗證**
   - 設備必須關聯設備型號
   - 設備型號必須配置 `sensorParameters`

5. **Modbus 配置驗證**
   - 每個啟用的參數都必須有 Modbus 配置
   - Modbus 配置必須包含 `address`

如果驗證失敗，系統會顯示相應的錯誤提示，並在 30 秒內最多顯示一次。

---

## 資料流程

### 讀取感測器資料流程

```
1. 選擇地點
   ↓
2. 載入地點的感測器設備
   ↓
3. 從設備 API 取得設備資訊
   ↓
4. 從設備型號配置取得參數定義
   ↓
5. 驗證配置完整性
   ↓
6. 為每個啟用的參數讀取 Modbus 資料
   ↓
7. 應用轉換公式
   ↓
8. 更新感測器資料
   ↓
9. 更新 UI 顯示
```

### 地點管理流程

```
1. 打開地點管理對話框
   ↓
2. 載入感測器設備列表
   ↓
3. 為已選擇設備的地點載入參數定義
   ↓
4. 管理員編輯樓層和地點
   ↓
5. 選擇感測器設備（觸發載入參數定義）
   ↓
6. 選擇要啟用的參數
   ↓
7. 儲存變更（提交到後端）
```

---

## 注意事項

1. **設備型號配置優先**
   - 所有 Modbus 配置都定義在設備型號中
   - 地點配置只需選擇要啟用的參數

2. **參數清理**
   - 系統會自動清理參數格式，確保 `enabled` 欄位為布林值
   - 支援多種 `enabled` 格式：布林值、字串 "true"/"false"、數字 1/0

3. **錯誤處理**
   - 設備離線時會顯示警告提示
   - 配置不完整時會顯示相應的錯誤訊息
   - 讀取失敗的參數會顯示為 `null`

4. **效能優化**
   - 使用快取避免重複載入設備型號配置
   - 自動刷新間隔設為 5 秒，減少後端負擔
   - 離線警報間隔設為 30 秒，避免重複提示

5. **資料格式**
   - 所有數值使用 `toFixed()` 格式化
   - 小數位數根據參數類型自動設定
   - 無資料時顯示 "—"

---

## 相關文件

- `ENVIRONMENT_PARAMETER_REFACTOR.md`: 環境參數重構說明
- `HOME_PAGE_SENSOR_PARAMETERS.md`: 首頁感測器參數配置
- `MULTI_SYSTEM_ARCHITECTURE.md`: 多系統架構說明

---

## 更新記錄

- 2024: 初始版本
  - 支援 9 種感測器參數
  - 完整的樓層和地點管理
  - Modbus 配置從設備型號讀取
  - 狀態判斷和視覺化顯示
