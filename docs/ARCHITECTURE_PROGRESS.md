# 系統架構進度報告

**最後更新：** 2025-01-22  
**文件版本：** 2.0  
**專案定位：** BA系統 - 工地管理版本

---

## 📊 總覽

本專案採用**多系統架構設計**，規劃支援 **22 個系統模組**（整合後）。

### 整體進度統計

| 類別             | 總數 | 已完成 | 進行中 | 未開始 | 完成率 |
| ---------------- | ---- | ------ | ------ | ------ | ------ |
| **核心基礎系統** | 3    | 3      | 0      | 0      | 100%   |
| **工地監控系統** | 4    | 1      | 0      | 3      | 25%    |
| **基礎設施系統** | 6    | 1      | 0      | 5      | 16.7%  |
| **安全相關系統** | 4    | 0      | 0      | 4      | 0%     |
| **視覺化系統**   | 1    | 0      | 0      | 1      | 0%     |
| **維護管理系統** | 1    | 0      | 0      | 1      | 0%     |
| **業務管理系統** | 2    | 0      | 0      | 2      | 0%     |
| **多媒體系統**   | 1    | 0      | 0      | 1      | 0%     |
| **總計**         | 22   | 5      | 0      | 17     | 22.7%  |

### 進度分布

```
已完成：   ████░░░░░░░░░░░░░░░░░░  22.7%  (5/22)
```

---

## 🎯 系統重新分類（按用途）

### 分類架構說明

原本的「主要/擴充」分類方式過於模糊，現改為**按用途分類**，更符合實際業務需求：

| 分類             | 數量 | 說明                                       | 優先級 |
| ---------------- | ---- | ------------------------------------------ | ------ |
| **核心基礎系統** | 3    | 所有系統運作的基礎（設備、使用者、警示）   | P0     |
| **工地監控系統** | 4    | 工地管理核心功能（環境、人流、車輛、影像） | P0-P1  |
| **基礎設施系統** | 6    | 建築物基礎設施監控（照明、空調、電力等）   | P0-P2  |
| **安全相關系統** | 4    | 安全、消防、緊急應變                       | P0-P1  |
| **視覺化系統**   | 1    | 整合：區域平面圖 + 全區點位圖              | P1     |
| **維護管理系統** | 1    | 整合：機電維護 + 可靠度 + 設施管理         | P2     |
| **業務管理系統** | 2    | 訪客、寄物管理                             | P3     |
| **多媒體系統**   | 1    | 整合：電視牆 + 多媒體 + 資訊平台           | P3     |

**整合後總數：22 個系統**（原 28 個，整合減少 6 個）

---

## ✅ 已完成系統（5 個）

### 核心基礎系統（3 個）✅

#### 1. 設備管理系統 ⭐

**狀態：** ✅ 完整實作

**實作內容：**

- ✅ 資料表：`devices`、`device_types`、`device_models`
- ✅ API 端點：`/api/devices/*`、`/api/devices/types/*`、`/api/devices/models/*`
- ✅ Composable：`useDeviceApi.ts`
- ✅ 頁面：`/core/equipment-management`（`app/pages/core/equipment-management.vue`）
- ✅ 組件：`DeviceDialog.vue`、`DeviceTypeDialog.vue`、`DeviceModelDialog.vue`

**功能特性：**

- 設備 CRUD 操作
- 設備類型管理
- 設備型號管理
- 支援多種設備類型（sensor、camera、lighting、modbus 等）
- 設備配置（JSONB 格式）

---

#### 2. 使用者管理系統

**狀態：** ✅ 基本實作

**實作內容：**

- ✅ 資料表：`users`
- ✅ API 端點：`/api/users/*`
- ✅ Composable：`useUserApi.ts`
- ✅ 頁面：`/core/users`（`app/pages/core/users.vue`）
- ✅ 認證：`useAuth.ts`、`auth.global.ts`

**功能特性：**

- 使用者登入/登出
- 使用者 CRUD 操作
- 權限管理（admin/user）
- JWT 認證

---

#### 3. 警示紀錄系統

**狀態：** ✅ 基本實作

**實作內容：**

- ✅ API 端點：`/api/alerts/*`
- ✅ Composable：`useAlertApi.ts`、`useAlertMonitor.ts`
- ✅ 頁面：`/core/alert-log`（`app/pages/core/alert-log.vue`）
- ✅ 工具：`alertUtils.ts`

**功能特性：**

- 警示記錄查詢
- 即時警示監控
- 警示狀態管理

---

### 基礎設施系統（1 個）✅

#### 4. 照明系統 ⭐

**狀態：** ✅ 完整實作

**實作內容：**

- ✅ 資料表：`lighting_categories`（照明分類點）
- ✅ API 端點：`/api/lighting/floors/*`、`/api/lighting/categories/*`
- ✅ Composable：`useLightingApi.ts`
- ✅ 頁面：`/infrastructure/lighting`（`app/pages/infrastructure/lighting.vue`）
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

---

### 工地監控系統（1 個）✅

#### 5. 環境品質系統 ⭐

**狀態：** ✅ 完整實作

**實作內容：**

- ✅ 資料表：`environment_floors`、`environment_locations`、`environment_readings`
- ✅ API 端點：
  - `/api/environment/floors/*`（樓層管理）
  - `/api/environment/readings/*`（感測器讀數）
- ✅ Composable：`useEnvironmentApi.ts`
- ✅ 頁面：`/construction-monitoring/environment`（`app/pages/construction-monitoring/environment.vue`）
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

---

## 🔄 系統整合說明

### 已整合的系統（減少 6 個）

| 整合後系統           | 整合內容                             | 效益                     |
| -------------------- | ------------------------------------ | ------------------------ |
| **影像監視系統**     | RTSP 串流 + 影像監視                 | 統一管理攝影機與串流     |
| **空間視覺化系統**   | 區域平面圖 + 全區點位圖              | 避免功能重疊，統一視覺化 |
| **設備維護管理系統** | 機電維護 + 設備運轉可靠度 + 設施管理 | 統一維護管理平台         |
| **多媒體資訊系統**   | 電視牆模組 + 多媒體伺服器 + 資訊平台 | 統一多媒體管理           |
| **Modbus 資料管理**  | → 整合至設備管理系統                 | 統一通訊與資料管理       |

**整合效益：**

- **減少系統數量**：28 個 → 22 個（減少 21.4%）
- **降低維護成本**：減少重複功能，統一管理
- **提升開發效率**：避免功能重疊，專注核心功能
- **改善使用者體驗**：統一介面，減少學習成本

---

## 🚧 規劃中系統

### 工地監控系統（3 個待實作）

#### 1. 人流統計管理

- **狀態：** ⏳ 部分實作（已有頁面框架）
- **優先順序：** P0（工地管理核心功能）
- **規劃資料表：** `people_counting_logs`、`people_counting_zones`
- **說明：** 人流統計與管理，工地人員進出監控
- **頁面：** `/construction-monitoring/people-counting`（`app/pages/construction-monitoring/people-counting.vue`，已有）

---

#### 2. 車輛進出管理

- **狀態：** ⏳ 未開始
- **優先順序：** P0（工地管理核心功能）
- **規劃資料表：** `vehicle_access_logs`、`vehicle_registrations`
- **說明：** 車輛進出記錄與管理，工地車輛監控

---

#### 3. 影像監視系統

- **狀態：** ⏳ 部分實作（已有頁面框架，RTSP 基礎功能）
- **優先順序：** P1（整合 RTSP 串流系統）
- **規劃資料表：** `surveillance_cameras`、`surveillance_recordings`
- **說明：** 與 RTSP 系統整合，攝影機配置與錄影管理
- **頁面：** `/construction-monitoring/surveillance`（`app/pages/construction-monitoring/surveillance.vue`，已有）
- **已知問題：**
  - ⚠️ 與設備管理系統尚未完全整合
  - ⚠️ RTSP URL 需要手動輸入
  - ⚠️ 缺少設備與串流的關聯

---

### 基礎設施系統（5 個待實作）

#### 4. 空調系統（HVAC）

- **狀態：** ⏳ 未開始
- **優先順序：** P0（基礎設施）
- **規劃資料表：** `hvac_zones`、`hvac_schedules`
- **說明：** 空調系統控制與監控

---

#### 5. 電力系統

- **狀態：** ⏳ 未開始
- **優先順序：** P0（基礎設施）
- **規劃資料表：** `power_meters`、`power_circuits`
- **說明：** 電力系統監控與管理

---

#### 6. 衛生排水系統

- **狀態：** ⏳ 未開始
- **優先順序：** P2（基礎設施）
- **規劃資料表：** `drainage_systems`、`drainage_sensors`
- **說明：** 衛生與排水系統管理

---

#### 7. 電梯系統

- **狀態：** ⏳ 未開始
- **優先順序：** P2（基礎設施）
- **規劃資料表：** `elevator_cars`、`elevator_floors`
- **說明：** 電梯系統監控與管理

---

### 安全相關系統（4 個待實作）

#### 8. 消防系統

- **狀態：** ⏳ 未開始
- **優先順序：** P0（法規要求）🔥
- **規劃資料表：** `fire_alarms`、`fire_sensors`
- **說明：** 消防設備監控與管理

---

#### 9. 門禁保全系統

- **狀態：** ⏳ 未開始
- **優先順序：** P0（法規要求）🔥
- **規劃資料表：** `security_access_points`、`security_cards`
- **說明：** 門禁與保全系統管理

---

#### 10. 緊急求救系統

- **狀態：** ⏳ 未開始
- **優先順序：** P1（安全相關）
- **說明：** 緊急求救與通報系統

---

### 視覺化系統（1 個待實作）

#### 11. 空間視覺化系統（整合後）

- **狀態：** ⏳ 未開始
- **優先順序：** P1（工地管理核心功能）
- **整合內容：** 區域平面圖 + 全區點位圖
- **規劃資料表：** `map_floors`、`device_points`
- **說明：** 統一視覺化平台，整合平面圖與點位圖功能

---

### 維護管理系統（1 個待實作）

#### 12. 設備維護管理系統（整合後）

- **狀態：** ⏳ 未開始
- **優先順序：** P2
- **整合內容：** 機電維護 + 設備運轉可靠度 + 設施管理
- **規劃資料表：** `maintenance_tasks`、`reliability_metrics`、`facility_assets`
- **說明：** 統一維護管理平台

---

### 業務管理系統（2 個待實作）

#### 13. 訪客系統

- **狀態：** ⏳ 未開始
- **優先順序：** P3
- **規劃資料表：** `visitor_registrations`、`visitor_logs`
- **說明：** 訪客登記與管理

---

#### 14. 寄物管理

- **狀態：** ⏳ 未開始
- **優先順序：** P3
- **規劃資料表：** `locker_units`、`locker_rentals`
- **說明：** 寄物櫃管理系統

---

### 多媒體系統（1 個待實作）

#### 15. 多媒體資訊系統（整合後）

- **狀態：** ⏳ 未開始
- **優先順序：** P3
- **整合內容：** 電視牆模組 + 多媒體伺服器 + 資訊平台
- **規劃資料表：** `video_wall_configs`、`multimedia_content`、`info_displays`
- **說明：** 統一多媒體管理平台

---

## 📋 實作優先順序（BA系統 - 工地管理版本）

### Phase 1：核心基礎系統 ✅ **已完成**

- ✅ 設備管理系統
- ✅ 使用者管理系統
- ✅ 警示紀錄系統

---

### Phase 2：平台基本功能 ✅ **已完成**

- ✅ 照明系統（基礎設施範例）
- ✅ 環境品質系統（工地監控範例）

---

### Phase 3：工地管理核心功能 🔥 **當前優先**

根據 BA系統 - 工地管理版本的優先順序：

1. **環境品質系統** ✅ **已完成**
2. **人流統計管理** ⏳ **進行中**（已有頁面框架）
3. **車輛進出管理** ⏳ **待實作**
4. **影像監視系統** ⏳ **進行中**（已有頁面框架，需整合 RTSP）
5. **全區點位圖** ⏳ **待實作**（整合至空間視覺化系統）

---

### Phase 4：基礎設施系統（P0）

1. **空調系統（HVAC）** - 基礎設施，影響舒適度
2. **電力系統** - 基礎設施，影響所有系統運作

---

### Phase 5：安全相關系統（P0-P1）

1. **消防系統** - 法規要求 🔥
2. **門禁保全系統** - 法規要求 🔥
3. **緊急求救系統** - 安全相關

---

### Phase 6：視覺化系統（P1）

1. **空間視覺化系統** - 整合區域平面圖與全區點位圖

---

### Phase 7：其他系統（P2-P3）

1. **電梯系統** - 基礎設施
2. **衛生排水系統** - 基礎設施
3. **設備維護管理系統** - 整合維護、可靠度、設施管理
4. **訪客系統** - 業務管理
5. **寄物管理** - 業務管理
6. **多媒體資訊系統** - 整合電視牆、多媒體、資訊平台

---

## ✅ 需要 vs 想要 分析

### ✅ 需要（Must Have）- 工地管理版本核心功能

**已完成（5）：**

- ✅ 設備管理系統
- ✅ 使用者管理系統
- ✅ 警示紀錄系統
- ✅ 照明系統
- ✅ 環境品質系統

**待實作（10）：**

1. **環境品質系統** ✅ 已完成
2. **人流統計管理** ⏳ 進行中（Phase 3）
3. **車輛進出管理** ⏳ 待實作（Phase 3）
4. **影像監視系統** ⏳ 進行中（Phase 3）
5. **全區點位圖** ⏳ 待實作（Phase 3，整合至空間視覺化系統）
6. **空調系統（HVAC）** - 基礎設施（Phase 4）
7. **電力系統** - 基礎設施（Phase 4）
8. **消防系統** - 法規要求 🔥（Phase 5）
9. **門禁保全系統** - 法規要求 🔥（Phase 5）
10. **緊急求救系統** - 安全相關（Phase 5）

---

### ⚠️ 想要（Nice to Have）- 未來擴充功能

1. **空間視覺化系統**（整合後）- Phase 6
2. **設備維護管理系統**（整合後）- Phase 7
3. **電梯系統** - Phase 7
4. **衛生排水系統** - Phase 7
5. **訪客系統** - Phase 7
6. **寄物管理** - Phase 7
7. **多媒體資訊系統**（整合後）- Phase 7

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
7. **`useRtspApi.ts`** - RTSP 串流 API（待整合至影像監視系統）

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

---

### 2. 統一錯誤處理

**建議：**

- 建立 `useSystemApiBase.ts` 提供統一的 CRUD 操作模板
- 統一錯誤處理機制
- 統一資料驗證

---

### 3. 系統間資料關聯

**建議：**

- 建立系統間資料關聯的統一規範
- 實作跨系統查詢功能
- 建立資料同步機制

---

## 🎯 下一步行動

### 短期目標（1-2 個月）- Phase 3：工地管理核心功能

1. **完成環境品質系統** ✅ **已完成**
2. **完成人流統計管理**
   - 完善頁面功能
   - 建立資料表與 API
   - 實作即時統計功能
3. **實作車輛進出管理**
   - 建立 `vehicle_access_logs`、`vehicle_registrations` 資料表
   - 建立 `/api/vehicle-access/*` API 路由
   - 建立 `useVehicleAccessApi` composable
   - 建立車輛進出管理頁面
4. **完成影像監視系統**
   - 整合 RTSP 系統
   - 整合設備管理系統
   - 實作攝影機配置與錄影管理
5. **實作全區點位圖**（整合至空間視覺化系統）
   - 建立 `device_points` 資料表
   - 建立 `/api/visualization/points/*` API 路由
   - 建立點位圖視覺化頁面

---

### 中期目標（3-6 個月）- Phase 4-5

1. **實作基礎設施系統**
   - 空調系統（HVAC）
   - 電力系統
2. **實作安全相關系統**
   - 消防系統
   - 門禁保全系統
   - 緊急求救系統

---

### 長期目標（6-12 個月）- Phase 6-7

1. **實作視覺化系統**
   - 整合區域平面圖與全區點位圖
2. **實作其他系統**
   - 電梯系統
   - 衛生排水系統
   - 設備維護管理系統
   - 業務管理系統（訪客、寄物）
   - 多媒體資訊系統

---

## 📊 效益分析

### 整合效益

- **減少系統數量**：28 個 → 22 個（減少 21.4%）
- **降低維護成本**：減少重複功能，統一管理
- **提升開發效率**：避免功能重疊，專注核心功能
- **改善使用者體驗**：統一介面，減少學習成本

### 重新分類效益

- **更清晰的分類**：按用途分類，取代模糊的主要/擴充分類
- **更符合業務需求**：針對工地管理版本優化優先順序
- **更明確的目標**：聚焦工地管理核心功能

---

## 📚 相關文件

1. **`ARCHITECTURE_PROGRESS_EXECUTIVE.md`** - 高層管理報告（已整合）
2. **`ENVIRONMENT_QUALITY_SETTINGS.md`** - 環境品質系統設定文件
3. **`RTSP_ANALYSIS.md`** - RTSP 處理與攝影機設備分析報告
4. **`app/config/system-modules.ts`** - 系統模組配置定義（需更新分類）

---

**最後更新：** 2025-01-22  
**維護者：** 開發團隊
