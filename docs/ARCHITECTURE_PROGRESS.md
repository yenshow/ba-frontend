# 系統架構進度報告

**最後更新：** 2025-12-22  
**文件版本：** 1.0

---

## 📊 總覽

本專案採用**多系統架構設計**，規劃支援 **28 個系統模組**（14 個主要系統 + 14 個擴充系統）。

### 整體進度統計

| 類別         | 總數 | 已完成 | 進行中 | 未開始 | 完成率 |
| ------------ | ---- | ------ | ------ | ------ | ------ |
| **主要系統** | 14   | 3      | 0      | 11     | 21.4%  |
| **擴充系統** | 14   | 3      | 0      | 11     | 21.4%  |
| **總計**     | 28   | 6      | 0      | 22     | 21.4%  |

---

## ✅ 已完成系統

### 1. 設備管理系統 ⭐

**狀態：** ✅ 完整實作

**實作內容：**

- ✅ 資料表：`devices`、`device_types`、`device_models`
- ✅ API 端點：`/api/devices/*`、`/api/devices/types/*`、`/api/devices/models/*`
- ✅ Composable：`useDeviceApi.ts`
- ✅ 頁面：`/system/devices`
- ✅ 組件：`DeviceDialog.vue`、`DeviceTypeDialog.vue`、`DeviceModelDialog.vue`

**功能特性：**

- 設備 CRUD 操作
- 設備類型管理
- 設備型號管理
- 支援多種設備類型（sensor、camera、lighting、modbus 等）
- 設備配置（JSONB 格式）

**相關文件：**

- `MULTI_SYSTEM_ARCHITECTURE.md`（架構設計）

---

### 2. 照明系統 ⭐

**狀態：** ✅ 完整實作

**實作內容：**

- ✅ 資料表：`lighting_categories`（照明分類點）
- ✅ API 端點：`/api/lighting/floors/*`、`/api/lighting/categories/*`
- ✅ Composable：`useLightingApi.ts`
- ✅ 頁面：`/system/lighting`
- ✅ 組件：
  - `CategoryList.vue`（分類列表）
  - `CategoryTooltip.vue`（分類提示）
  - `FloorManagementDialog.vue`（樓層管理）
  - `StatusCenter.vue`（狀態中心）

**功能特性：**

- 樓層管理（Floor）
- 區域管理（Area）
- 分類點管理（Category）
- Modbus 配置
- 設備關聯
- 位置座標（location_x, location_y）
- 編輯模式（拖曳定位）

**資料結構：**

```typescript
LightingFloor {
  id: string;
  name: string;
  areas: LightingArea[];
}

LightingArea {
  id: string;
  name: string;
  categories: LightingCategory[];
}

LightingCategory {
  id: string;
  name: string;
  floor_id: string;
  location_x: number;
  location_y: number;
  device_id?: number;
  modbus_config: JSONB;
  status: string;
}
```

**相關文件：**

- `MULTI_SYSTEM_ARCHITECTURE.md`（架構設計）

---

### 3. 環境品質系統 ⭐

**狀態：** ✅ 完整實作

**實作內容：**

- ✅ 資料表：`environment_floors`、`environment_locations`、`environment_readings`
- ✅ API 端點：
  - `/api/environment/floors/*`（樓層管理）
  - `/api/environment/readings/*`（感測器讀數）
- ✅ Composable：`useEnvironmentApi.ts`
- ✅ 頁面：`/system/environment`
- ✅ 組件：
  - `EnvironmentGauge.vue`（儀表顯示）
  - `EnvironmentParamCard.vue`（參數卡片）
  - `OverviewLocationCard.vue`（總覽卡片）
  - `LocationManagementDialog.vue`（地點管理）
  - `SensorTrendChart.vue`（趨勢圖表）

**功能特性：**

- 樓層管理（Floor）
- 地點管理（Location）
- 感測器參數配置（9 種參數類型）
- Modbus 資料讀取
- 即時資料顯示（5 秒自動刷新）
- 狀態判斷（正常/注意/警報）
- AQI 計算
- 歷史資料查詢

**支援的感測器參數：**

1. PM2.5（µg/m³）
2. PM10（µg/m³）
3. TVOC（ppm）
4. HCHO（ppm）
5. 濕度（%）
6. 溫度（°C）
7. CO2（ppm）
8. 噪音值（dB）
9. 風速（m/s）

**資料結構：**

```typescript
EnvironmentFloor {
  id: string;
  name: string;
  locations: EnvironmentLocation[];
}

EnvironmentLocation {
  id: string;
  name: string;
  deviceId?: number;
  parameters: SensorParameter[];
}

SensorParameter {
  id?: string;
  type: SensorParameterType;
  enabled: boolean;
}
```

**相關文件：**

- `ENVIRONMENT_QUALITY_SETTINGS.md`（完整設定文件）

---

### 4. 使用者管理系統

**狀態：** ✅ 基本實作

**實作內容：**

- ✅ 資料表：`users`
- ✅ API 端點：`/api/users/*`
- ✅ Composable：`useUserApi.ts`
- ✅ 頁面：`/system/users`
- ✅ 認證：`useAuth.ts`、`auth.global.ts`

**功能特性：**

- 使用者登入/登出
- 使用者 CRUD 操作
- 權限管理（admin/user）
- JWT 認證

---

### 5. 警示紀錄系統

**狀態：** ✅ 基本實作

**實作內容：**

- ✅ API 端點：`/api/alerts/*`
- ✅ Composable：`useAlertApi.ts`、`useAlertMonitor.ts`
- ✅ 頁面：`/system/alert-log`
- ✅ 工具：`alertUtils.ts`

**功能特性：**

- 警示記錄查詢
- 即時警示監控
- 警示狀態管理

---

### 6. RTSP 串流系統

**狀態：** ✅ 基本實作

**實作內容：**

- ✅ API 端點：`/api/rtsp/*`
- ✅ Composable：`useRtspApi.ts`
- ✅ 頁面：`/rtsp`
- ✅ 組件：`VideoPlayer.vue`

**功能特性：**

- RTSP 串流啟動/停止
- HLS 轉換與播放
- 串流狀態監控
- 多串流管理

**已知問題：**

- ⚠️ 與設備管理系統尚未完全整合
- ⚠️ RTSP URL 需要手動輸入
- ⚠️ 缺少設備與串流的關聯

**相關文件：**

- `RTSP_ANALYSIS.md`（分析與改進建議）

---

## 🚧 規劃中系統

### 主要系統（Primary Systems）

#### 1. 區域平面圖

- **狀態：** ⏳ 未開始
- **規劃資料表：** `map_floors`
- **說明：** 建築物區域平面圖管理

#### 2. 影像監視系統

- **狀態：** ⏳ 未開始
- **規劃資料表：** `surveillance_cameras`、`surveillance_recordings`
- **說明：** 與 RTSP 系統整合，攝影機配置與錄影管理
- **備註：** 已有 RTSP 基礎，可優先實作

#### 3. 車輛進出管理

- **狀態：** ⏳ 未開始
- **規劃資料表：** `vehicle_access_logs`、`vehicle_registrations`
- **說明：** 車輛進出記錄與管理

#### 4. 人流統計管理

- **狀態：** ⏳ 未開始
- **規劃資料表：** `people_counting_logs`、`people_counting_zones`
- **說明：** 人流統計與管理

#### 5. 衛生排水系統

- **狀態：** ⏳ 未開始
- **規劃資料表：** `drainage_systems`、`drainage_sensors`
- **說明：** 衛生與排水系統管理

#### 6. 消防系統

- **狀態：** ⏳ 未開始
- **規劃資料表：** `fire_alarms`、`fire_sensors`
- **優先順序：** 🔥 高（安全相關）
- **說明：** 消防設備監控與管理

#### 7. 門禁保全系統

- **狀態：** ⏳ 未開始
- **規劃資料表：** `security_access_points`、`security_cards`
- **優先順序：** 🔥 高（安全相關）
- **說明：** 門禁與保全系統管理

#### 8. 電力系統

- **狀態：** ⏳ 未開始
- **規劃資料表：** `power_meters`、`power_circuits`
- **優先順序：** 🔥 高（基礎設施）
- **說明：** 電力系統監控與管理

#### 9. 空調系統（HVAC）

- **狀態：** ⏳ 未開始
- **規劃資料表：** `hvac_zones`、`hvac_schedules`
- **優先順序：** 🔥 高（基礎設施）
- **說明：** 空調系統控制與監控

#### 10. 電梯系統

- **狀態：** ⏳ 未開始
- **規劃資料表：** `elevator_cars`、`elevator_floors`
- **說明：** 電梯系統監控與管理

#### 11. 環境感測器

- **狀態：** ✅ 已整合至環境品質系統
- **說明：** 已作為環境品質系統的一部分實作

---

### 擴充系統（Extended Systems）

#### 1. 全區點位圖

- **狀態：** ⏳ 未開始
- **說明：** 全區設備點位圖

#### 2. 緊急求救系統

- **狀態：** ⏳ 未開始
- **優先順序：** 🔥 高（安全相關）
- **說明：** 緊急求救與通報系統

#### 3. 機電維護

- **狀態：** ⏳ 未開始
- **說明：** 機電設備維護管理

#### 4. 設備運轉可靠度

- **狀態：** ⏳ 未開始
- **說明：** 設備運轉可靠度分析

#### 5. 設施管理系統

- **狀態：** ⏳ 未開始
- **說明：** 設施管理與維護

#### 6. 寄物管理

- **狀態：** ⏳ 未開始
- **說明：** 寄物櫃管理系統

#### 7. 訪客系統

- **狀態：** ⏳ 未開始
- **說明：** 訪客登記與管理

#### 8. 檔案系統

- **狀態：** ⏳ 未開始
- **說明：** 檔案與文件管理

#### 9. 空間管理

- **狀態：** ⏳ 未開始
- **說明：** 空間使用與管理

#### 10. 電視牆模組

- **狀態：** ⏳ 未開始
- **說明：** 電視牆顯示控制

#### 11. 多媒體伺服器

- **狀態：** ⏳ 未開始
- **說明：** 多媒體伺服器管理

#### 12. 資訊平台

- **狀態：** ⏳ 未開始
- **說明：** 資訊發布平台

#### 13. Modbus 資料

- **狀態：** ⚠️ 部分實作
- **說明：** Modbus 通訊已整合在設備管理中，但缺少獨立的 Modbus 資料管理系統

---

## 🏗️ 架構設計原則

### 統一設計模式

每個系統都遵循相同的設計模式：

```
系統模組
  ├─ 核心資料表（{system_name}_{entity_name}）
  ├─ 配置資料表（{system_name}_{entity_name}_config，如需要）
  ├─ 歷史記錄表（{system_name}_{entity_name}_history，如需要）
  └─ API 路由（/api/{system-name}/{entity-name}/*）
```

### 命名規範

#### 資料表命名

- 格式：`{system_name}_{entity_name}`
- 使用小寫字母和底線
- 實體名稱使用複數
- 範例：`lighting_categories`、`hvac_zones`、`fire_alarms`

#### API 路由命名

- 格式：`/api/{system-name}/{entity-name}`
- 使用小寫字母和連字號
- 實體名稱使用複數
- 範例：`/api/lighting/categories`、`/api/hvac/zones`

#### Composable 命名

- 格式：`use{SystemName}Api`
- 使用 PascalCase
- 範例：`useLightingApi`、`useHvacApi`

### 資料表設計模式

每個系統的核心資料表都包含：

```sql
CREATE TABLE {system_name}_{entity_name} (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  system_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  floor_id VARCHAR(50),
  location_x DECIMAL(5,2),
  location_y DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'active',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📋 實作優先順序建議

### Phase 1：核心基礎設施（已完成）✅

1. ✅ **設備管理系統** - 所有系統的基礎
2. ✅ **照明系統** - 第一個完整實作的業務系統
3. ✅ **環境品質系統** - 第二個完整實作的業務系統

### Phase 2：高優先順序系統（建議優先實作）🔥

1. **空調系統（HVAC）** - 基礎設施，影響舒適度
2. **電力系統** - 基礎設施，影響所有系統運作
3. **消防系統** - 安全相關，法規要求
4. **門禁保全系統** - 安全相關，法規要求
5. **影像監視系統** - 整合 RTSP，已有基礎

### Phase 3：中優先順序系統

1. **電梯系統** - 基礎設施
2. **緊急求救系統** - 安全相關
3. **車輛進出管理** - 業務需求
4. **人流統計管理** - 業務需求

### Phase 4：擴充功能系統

1. **區域平面圖** - 視覺化功能
2. **全區點位圖** - 視覺化功能
3. **其他擴充系統** - 根據實際需求

---

## 🔧 技術架構

### 前端技術棧

- **框架：** Nuxt 3
- **語言：** TypeScript
- **UI 框架：** Tailwind CSS
- **狀態管理：** Composables（Vue 3 Composition API）
- **HTTP 客戶端：** Fetch API（封裝在 `useApiBase`）

### 後端技術棧

- **API 框架：** （需確認後端技術棧）
- **資料庫：** PostgreSQL
- **通訊協定：** Modbus（透過後端 API）

### 核心 Composables

1. **`useApiBase.ts`** - API 請求基礎封裝
2. **`useDeviceApi.ts`** - 設備管理 API
3. **`useLightingApi.ts`** - 照明系統 API
4. **`useEnvironmentApi.ts`** - 環境品質系統 API
5. **`useUserApi.ts`** - 使用者管理 API
6. **`useAlertApi.ts`** - 警示系統 API
7. **`useRtspApi.ts`** - RTSP 串流 API

---

## 📝 已知問題與改進建議

### 1. RTSP 系統整合

**問題：**

- RTSP 系統與設備管理系統分離
- 需要手動輸入 RTSP URL
- 缺少設備與串流的關聯

**建議：**

- 整合設備管理與 RTSP 串流
- 自動從設備配置生成 RTSP URL
- 在設備列表增加「啟動串流」功能

**相關文件：** `RTSP_ANALYSIS.md`

### 2. 統一錯誤處理

**建議：**

- 建立 `useSystemApiBase.ts` 提供統一的 CRUD 操作模板
- 統一錯誤處理機制
- 統一資料驗證

### 3. 系統間資料關聯

**建議：**

- 建立系統間資料關聯的統一規範
- 實作跨系統查詢功能
- 建立資料同步機制

---

## 📚 相關文件

1. **`MULTI_SYSTEM_ARCHITECTURE.md`** - 多系統架構設計方案
2. **`ENVIRONMENT_QUALITY_SETTINGS.md`** - 環境品質系統設定文件
3. **`RTSP_ANALYSIS.md`** - RTSP 處理與攝影機設備分析報告
4. **`app/config/system-modules.ts`** - 系統模組配置定義

---

## 🎯 下一步行動

### 短期目標（1-2 個月）

1. **完成 RTSP 系統整合**
   - 整合設備管理與 RTSP 串流
   - 實作自動 RTSP URL 生成
   - 改進設備新增流程

2. **實作空調系統（HVAC）**
   - 建立 `hvac_zones` 資料表
   - 建立 `/api/hvac/*` API 路由
   - 建立 `useHvacApi` composable
   - 建立 HVAC 管理頁面

3. **實作電力系統**
   - 建立 `power_meters` 資料表
   - 建立 `/api/power/*` API 路由
   - 建立 `usePowerApi` composable
   - 建立電力監控頁面

### 中期目標（3-6 個月）

1. **實作安全相關系統**
   - 消防系統
   - 門禁保全系統
   - 緊急求救系統

2. **實作基礎設施系統**
   - 電梯系統
   - 衛生排水系統

3. **實作業務系統**
   - 車輛進出管理
   - 人流統計管理
   - 訪客系統

### 長期目標（6-12 個月）

1. **實作視覺化系統**
   - 區域平面圖
   - 全區點位圖

2. **實作擴充功能系統**
   - 機電維護
   - 設備運轉可靠度
   - 設施管理系統
   - 其他擴充系統

---

**最後更新：** 2025-01-XX  
**維護者：** 開發團隊
