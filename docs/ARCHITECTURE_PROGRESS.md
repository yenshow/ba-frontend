# 系統架構進度報告

**最後更新：** 2026-01-26
**文件版本：** 3.0  
**專案定位：** BA 中央監控系統

---

## 📊 總覽

本專案採用**多系統架構設計**，規劃支援 **21 個系統模組**（整合後）。

### 整體進度統計

| 類別             | 總數 | 已完成 | 進行中 | 未開始 | 完成率 |
| ---------------- | ---- | ------ | ------ | ------ | ------ |
| **核心基礎系統** | 4    | 4      | 0      | 0      | 100%   |
| **工地監控系統** | 4    | 3      | 0      | 1      | 75%    |
| **基礎設施系統** | 5    | 1      | 0      | 4      | 20%    |
| **安全相關系統** | 3    | 0      | 0      | 3      | 0%     |
| **維護管理系統** | 1    | 0      | 0      | 1      | 0%     |
| **業務管理系統** | 2    | 0      | 0      | 2      | 0%     |
| **多媒體系統**   | 1    | 0      | 0      | 1      | 0%     |
| **總計**         | 21   | 8      | 0      | 13     | 38.1%  |

### 進度分布

```
已完成：   ████████░░░░░░░░░░░░░  38.1%  (8/21)
```

---

## 🎯 系統分類架構

### 分類說明

採用**按用途分類**的方式，更符合實際業務需求：

| 分類             | 數量 | 說明                                                 | 優先級 |
| ---------------- | ---- | ---------------------------------------------------- | ------ |
| **核心基礎系統** | 4    | 所有系統運作的基礎（設備、使用者、警示、全區點位圖） | P0     |
| **工地監控系統** | 4    | 工地管理核心功能（環境、人流、車輛、影像）           | P0-P1  |
| **基礎設施系統** | 5    | 建築物基礎設施監控（照明、空調、電力等）             | P0-P2  |
| **安全相關系統** | 3    | 安全、消防、緊急應變                                 | P0-P1  |
| **維護管理系統** | 1    | 整合：機電維護 + 可靠度 + 設施管理                   | P2     |
| **業務管理系統** | 2    | 訪客、寄物管理                                       | P3     |
| **多媒體系統**   | 1    | 整合：電視牆 + 多媒體 + 資訊平台                     | P3     |

**整合後總數：21 個系統**（原 28 個，整合減少 7 個）

---

## 🏗️ 核心基礎架構

### 統一地點管理系統 ⭐

**狀態：** ✅ 完整實作

**說明：** 這是所有系統的基礎架構，提供統一的區域（Zone）和地點（Location）管理。

**實作內容：**

- ✅ 資料表：`zones`、`locations`、`location_systems`
- ✅ API 端點：`/api/locations/zones/*`、`/api/locations/*`
- ✅ 後端服務：`locationService.js`
- ✅ 前端 API：`useLocationApi.ts`
- ✅ 系統適配器：`useZoneSystemAdapter.ts`
- ✅ 區域管理：`useZoneManagement.ts`
- ✅ UI 組件：`ZoneManagementDialog.vue`

**功能特性：**

- ✅ **統一架構**：所有系統使用相同的地點管理架構
- ✅ **多系統支援**：一個地點可以關聯多個系統（environment、lighting、people_counting）
- ✅ **跨系統共用**：同一地點可以被多個系統共用，避免重複配置
- ✅ **自動合併**：同名區域/地點自動合併，避免重複
- ✅ **類型安全**：使用 TypeScript 確保類型安全
- ✅ **批次查詢優化**：避免 N+1 問題，提高查詢效率

**系統整合：**

- ✅ 環境監測系統使用統一地點管理
- ✅ 照明系統使用統一地點管理
- ✅ 人流統計系統使用統一地點管理
- ✅ 全區點位圖使用統一地點管理

**相關文檔：**

- 📄 `docs/ZONE_LOCATION_SYSTEM.md` - 區域/地點管理系統詳細說明

---

## ✅ 已完成系統（8 個）

### 核心基礎系統（4 個）✅

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

#### 3. 警示紀錄系統 ⭐

**狀態：** ✅ 完整實作

**實作內容：**

- ✅ 資料表：`alerts`、`alert_rules`
- ✅ API 端點：`/api/alerts/*`、`/api/alerts/rules`
- ✅ Composable：
  - `useAlertApi.ts` - 警示 API
  - `useAlertMonitor.ts` - 警示監控（主要入口）
  - `useAlertPolling.ts` - 輪詢備援
  - `useAlertWebSocket.ts` - WebSocket 監聽
  - `useUnresolvedAlertCount.ts` - 未解決警示計數
  - `useAlertRules.ts` - 警示規則管理
- ✅ 頁面：`/core/alert-log`（`app/pages/core/alert-log.vue`）
- ✅ 工具：`alertUtils.ts`

**功能特性：**

- ✅ **警示規則系統**：前端從後端取得規則，確保狀態評估一致
- ✅ **Toast 通知系統**：即時顯示警示，支援動態更新、去重、優先級管理
- ✅ **WebSocket 即時更新**：`alert:new`、`alert:updated`、`alert:count` 事件
- ✅ **輪詢備援機制**：WebSocket 斷線時使用輪詢確保更新
- ✅ **嚴重度映射**：`critical`/`error` → "警報"，`warning` → "注意"，無匹配 → "正常"
- ✅ **去重機制**：基於 `alertId`（持久化 Toast）或 `message + type`（非持久化）
- ✅ **數量限制**：最多 8 個 Toast，`critical` 警示可替換低優先級
- ✅ **錯誤處理**：基於優先級的警示過濾

**系統整合：**

- ✅ 與環境監測系統整合（感測器讀取失敗警示）
- ✅ 與人流統計系統整合（未註冊人員警示）
- ✅ 與設備管理系統整合（設備狀態警示）

**相關文檔：**

- 📄 `docs/ALERT_SYSTEM_REFACTORING.md` - 警示系統詳細說明

---

#### 4. 全區點位圖 ⭐

**狀態：** ✅ 完整實作

**實作內容：**

- ✅ 頁面：`/core/area-point-map`（`app/pages/core/area-point-map.vue`）
- ✅ 整合統一地點管理系統（Zone/Location API）
- ✅ 整合設備管理系統（設備點位顯示）

**功能特性：**

- 區域（Zone）管理
- 地點（Location）管理
- 設備點位視覺化
- 多系統類型篩選
- 空間座標定位
- 整合區域平面圖與全區點位圖功能

**系統整合：**

- ✅ 已整合統一地點管理系統（Zone/Location API）
- ✅ 已整合設備管理系統（設備點位顯示）

---

### 基礎設施系統（1 個）✅

#### 5. 照明系統 ⭐

**狀態：** ✅ 完整實作

**實作內容：**

- ✅ 資料表：`lighting_categories`（照明分類點）
- ✅ API 端點：
  - `/api/locations/zones*`（`locationType=lighting`，區域/地點管理）
  - `/api/lighting/categories/*`
- ✅ Composable：`useLightingApi.ts`
- ✅ 頁面：`/infrastructure/lighting`（`app/pages/infrastructure/lighting.vue`）
- ✅ 組件：
  - `CategoryList.vue`（分類列表）
  - `CategoryTooltip.vue`（分類提示）
  - `ZoneManagementDialog.vue`（區域管理）
  - `StatusCenter.vue`（狀態中心）

**功能特性：**

- 區域管理（Zone）
- 地點管理（Area）
- 分類點管理（Category）
- Modbus 配置
- 設備關聯
- 位置座標（location_x, location_y）
- 編輯模式（拖曳定位）

**系統整合：**

- ✅ 已整合統一地點管理系統（Zone/Location API）
- ✅ 已整合設備管理系統（設備關聯）

---

### 工地監控系統（3 個）✅

#### 6. 環境品質系統 ⭐

**狀態：** ✅ 完整實作

**實作內容：**

- ✅ 資料表：
  - `zones`、`locations`、`location_systems`（統一地點管理）
  - `device_data_logs`（感測器讀數）
- ✅ API 端點：
  - `/api/locations/zones*`（`locationType=environment`，區域/地點管理）
  - `/api/environment/readings/*`（感測器讀數）
  - `/api/environment/locations/:id/errors`（錯誤追蹤）
- ✅ Composable：`useEnvironmentApi.ts`
- ✅ 頁面：`/construction-monitoring/environment`（`app/pages/construction-monitoring/environment.vue`）
- ✅ 組件：
  - `EnvironmentGauge.vue`（儀表顯示）
  - `EnvironmentParamCard.vue`（參數卡片）
  - `OverviewLocationCard.vue`（總覽卡片）
  - `ZoneManagementDialog.vue`（地點管理）
  - `SensorTrendChart.vue`（趨勢圖表）

**功能特性：**

- ✅ **區域管理**：使用統一地點管理系統
- ✅ **地點管理**：使用統一地點管理系統
- ✅ **感測器參數配置**：支援 9 種參數類型
- ✅ **Modbus 資料讀取**：批量讀取優化
- ✅ **即時資料顯示**：WebSocket 推送 + 動態輪詢（WebSocket 連接時 30 秒，否則 5 秒）
- ✅ **狀態判斷**：根據國際標準判斷參數狀態（正常/注意/警報）
- ✅ **AQI 計算**：PM2.5 和 PM10 的 AQI 計算
- ✅ **歷史資料查詢**：從 `device_data_logs` 聚合查詢
- ✅ **共享設備型號配置**：自動補充缺失的配置
- ✅ **錯誤追蹤整合**：與警報系統整合

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

**系統整合：**

- ✅ 已整合統一地點管理系統（Zone/Location API）
- ✅ 已整合設備管理系統（感測器設備）
- ✅ 已整合警報系統（錯誤追蹤）

**相關文檔：**

- 📄 `docs/ENVIRONMENT_QUALITY_SETTINGS.md` - 環境品質系統詳細說明

---

#### 7. 影像監視系統 ⭐

**狀態：** ✅ 前端完整實作

**實作內容：**

- ✅ Composable：
  - `useSurveillanceApi.ts` - 影像監視 API
  - `useStreamStatus.ts` - 串流狀態統一管理
- ✅ 頁面：`/construction-monitoring/surveillance`（`app/pages/construction-monitoring/surveillance.vue`）
- ✅ 組件：
  - `SurveillanceCameraGrid.vue`（監控網格）
  - `SurveillanceControlPanel.vue`（控制面板）
  - `SurveillanceCameraCard.vue`（攝影機卡片）
  - `VideoPlayer.vue`（影片播放器）

**功能特性：**

- 攝影機設備管理（整合設備管理系統）
- RTSP 串流整合（自動生成 RTSP URL）
- 串流狀態管理（統一狀態管理）
- 監控畫面管理（多畫面網格布局）
- 批量操作（全部啟動/停止）
- WebSocket 即時同步
- 串流控制（啟動/停止/狀態查詢）

**系統整合：**

- ✅ 已整合設備管理系統（自動獲取攝影機設備）
- ✅ 已整合 RTSP 串流系統（自動生成 RTSP URL）
- ✅ 已整合 WebSocket 系統（即時狀態同步）

---

#### 8. 人流統計管理系統 ⭐

**狀態：** ✅ 完整實作

**實作內容：**

- ✅ API 端點：
  - `/api/people-counting/sites`（工地列表與統計）
  - `/api/people-counting/sites/:id`（工地詳情）
  - `/api/people-counting/sites/:id/stats`（工地統計）
  - `/api/people-counting/sites/:id/logs`（進出場記錄）
  - `/api/people-counting/units/:id/personnel`（單位人員列表）
  - `/api/locations/zones*`（`locationType=people_counting`，區域/地點管理）
- ✅ Composable：
  - `usePeopleCountingApi.ts` - 人流統計 API
  - `usePeopleCountingState.ts` - 狀態管理
  - `usePeopleCountingWebSocket.ts` - WebSocket 監聽
- ✅ 頁面：`/construction-monitoring/people-counting`（`app/pages/construction-monitoring/people-counting.vue`）
- ✅ 組件：
  - `SiteOverviewCard.vue`（工地總覽卡片）
  - `SiteStatsPanel.vue`（統計面板）
  - `SiteDetailPanel.vue`（詳情面板）
  - `UnitList.vue`（單位列表）
  - `PersonnelList.vue`（人員名單）
  - `EntryExitLogTable.vue`（進出場記錄表）

**功能特性：**

- ✅ **工地管理（Site）**：使用統一地點管理系統
- ✅ **單位管理（Unit）**：對應 `platform.person_group`
- ✅ **人員管理（Personnel）**：對應 `platform.person`
- ✅ **進出場記錄查詢**：對應 `baseacs.slot_card_records`
- ✅ **即時統計計算**：進場/出場/在場人數
- ✅ **狀態判斷**：人員在場狀態
- ✅ **事件序列邏輯**：確保統計準確性
- ✅ **批次查詢優化**：減少資料庫查詢
- ✅ **防抖機制**：避免重複載入
- ✅ **增量查詢機制**：只查詢新增記錄
- ✅ **未註冊人員警報**：與警報系統整合

**資料來源：**

- 使用外部資料庫查詢（`platform` 和 `baseacs` schema）
- 整合統一地點管理系統（Location API）用於工地配置

**系統整合：**

- ✅ 已整合統一地點管理系統（工地配置）
- ✅ 已整合外部資料庫 API（人員與記錄查詢）
- ✅ 已整合警報系統（未註冊人員警示）
- ✅ 已整合 YSCP WebSocket 事件（`yscp:event:alarm`、`yscp:event:generic`）

**相關文檔：**

- 📄 `docs/PEOPLE_COUNTING_SYSTEM.md` - 人流統計系統詳細說明

---

## 🔄 系統整合說明

### 已整合的系統（減少 7 個）

| 整合後系統           | 整合內容                             | 效益                 |
| -------------------- | ------------------------------------ | -------------------- |
| **統一地點管理系統** | 所有系統的地點管理統一               | 統一架構，降低維護成本 |
| **影像監視系統**     | RTSP 串流 + 影像監視                 | 統一管理攝影機與串流 |
| **全區點位圖**       | → 整合至核心基礎系統                 | 統一空間視覺化管理   |
| **設備維護系統** | 機電維護 + 設備運轉可靠度 + 設施管理 | 統一維護管理平台     |
| **多媒體資訊系統**   | 電視牆模組 + 多媒體伺服器 + 資訊平台 | 統一多媒體管理       |
| **Modbus 資料管理**  | → 整合至設備管理系統                 | 統一通訊與資料管理   |

**整合效益：**

- **減少系統數量**：28 個 → 21 個（減少 25%）
- **降低維護成本**：減少重複功能，統一管理
- **提升開發效率**：避免功能重疊，專注核心功能
- **改善使用者體驗**：統一介面，減少學習成本

---

## 🚧 規劃中系統

### 工地監控系統（1 個待實作）

#### 9. 車輛進出管理

- **狀態：** ⏳ 未開始
- **優先順序：** P0（工地管理核心功能）
- **規劃資料表：** `vehicle_access_logs`、`vehicle_registrations`
- **說明：** 車輛進出記錄與管理，工地車輛監控

---

### 基礎設施系統（4 個待實作）

#### 10. 空調系統（HVAC）

- **狀態：** ⏳ 未開始
- **優先順序：** P0（基礎設施）
- **規劃資料表：** `hvac_zones`、`hvac_schedules`
- **說明：** 空調系統控制與監控

---

#### 11. 電力系統

- **狀態：** ⏳ 未開始
- **優先順序：** P0（基礎設施）
- **規劃資料表：** `power_meters`、`power_circuits`
- **說明：** 電力系統監控與管理

---

#### 12. 衛生排水系統

- **狀態：** ⏳ 未開始
- **優先順序：** P2（基礎設施）
- **規劃資料表：** `drainage_systems`、`drainage_sensors`
- **說明：** 衛生與排水系統管理

---

#### 13. 電梯系統

- **狀態：** ⏳ 未開始
- **優先順序：** P2（基礎設施）
- **規劃資料表：** `elevator_cars`、`elevator_floors`
- **說明：** 電梯系統監控與管理

---

### 安全相關系統（3 個待實作）

#### 14. 消防系統

- **狀態：** ⏳ 未開始
- **優先順序：** P0（法規要求）🔥
- **規劃資料表：** `fire_alarms`、`fire_sensors`
- **說明：** 消防設備監控與管理

---

#### 15. 門禁保全系統

- **狀態：** ⏳ 未開始
- **優先順序：** P0（法規要求）🔥
- **規劃資料表：** `security_access_points`、`security_cards`
- **說明：** 門禁與保全系統管理

---

#### 16. 緊急求救系統

- **狀態：** ⏳ 未開始
- **優先順序：** P1（安全相關）
- **說明：** 緊急求救與通報系統

---

### 維護管理系統（1 個待實作）

#### 17. 設備維護系統（整合後）

- **狀態：** ⏳ 未開始
- **優先順序：** P2
- **整合內容：** 機電維護 + 設備運轉可靠度 + 設施管理
- **規劃資料表：** `maintenance_tasks`、`reliability_metrics`、`facility_assets`
- **說明：** 統一維護管理平台

---

### 業務管理系統（2 個待實作）

#### 18. 訪客系統

- **狀態：** ⏳ 未開始
- **優先順序：** P3
- **規劃資料表：** `visitor_registrations`、`visitor_logs`
- **說明：** 訪客登記與管理

---

#### 19. 寄物管理

- **狀態：** ⏳ 未開始
- **優先順序：** P3
- **規劃資料表：** `locker_units`、`locker_rentals`
- **說明：** 寄物櫃管理系統

---

### 多媒體系統（1 個待實作）

#### 20. 多媒體資訊系統（整合後）

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
- ✅ 全區點位圖
- ✅ 統一地點管理系統（基礎架構）

---

### Phase 2：平台基本功能 ✅ **已完成**

- ✅ 照明系統（基礎設施範例）
- ✅ 環境品質系統（工地監控範例）

---

### Phase 3：工地管理核心功能 🔥 **當前優先**

根據 BA系統 - 工地管理版本的優先順序：

1. **環境品質系統** ✅ **已完成**
2. **影像監視系統** ✅ **已完成**（前端完整實作，已整合 RTSP 和設備管理系統）
3. **人流統計管理** ✅ **已完成**（前端和後端 API 完整實作，整合外部資料庫查詢）
4. **車輛進出管理** ⏳ **待實作**

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

### Phase 6：其他系統（P2-P3）

1. **電梯系統** - 基礎設施
2. **衛生排水系統** - 基礎設施
3. **設備維護系統** - 整合維護、可靠度、設施管理
4. **訪客系統** - 業務管理
5. **寄物管理** - 業務管理
6. **多媒體資訊系統** - 整合電視牆、多媒體、資訊平台

---

## ✅ 需要 vs 想要 分析

### ✅ 需要（Must Have）- 工地管理版本核心功能

**已完成（8）：**

- ✅ 設備管理系統
- ✅ 使用者管理系統
- ✅ 警示紀錄系統
- ✅ 全區點位圖
- ✅ 統一地點管理系統（基礎架構）
- ✅ 照明系統
- ✅ 環境品質系統
- ✅ 影像監視系統
- ✅ 人流統計管理系統

**待實作（7）：**

1. **車輛進出管理** ⏳ 待實作（Phase 3）
2. **空調系統（HVAC）** - 基礎設施（Phase 4）
3. **電力系統** - 基礎設施（Phase 4）
4. **消防系統** - 法規要求 🔥（Phase 5）
5. **門禁保全系統** - 法規要求 🔥（Phase 5）
6. **緊急求救系統** - 安全相關（Phase 5）

---

### ⚠️ 想要（Nice to Have）- 未來擴充功能

1. **設備維護系統**（整合後）- Phase 6
2. **電梯系統** - Phase 6
3. **衛生排水系統** - Phase 6
4. **訪客系統** - Phase 6
5. **寄物管理** - Phase 6
6. **多媒體資訊系統**（整合後）- Phase 6

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

### 統一地點管理架構

所有系統都使用統一的地點管理架構：

```
統一地點管理系統
  ├─ zones（區域）
  ├─ locations（地點）
  └─ location_systems（地點系統關聯）
      └─ 支援多系統：environment、lighting、people_counting
```

**優勢：**

- ✅ 統一架構，降低維護成本
- ✅ 跨系統共用地點，避免重複配置
- ✅ 自動合併同名區域/地點
- ✅ 批次查詢優化，提高性能

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

---

## 🔧 技術架構

### 前端技術棧

- **框架：** Nuxt 3
- **語言：** TypeScript
- **UI 框架：** Tailwind CSS
- **狀態管理：** Composables（Vue 3 Composition API）
- **HTTP 客戶端：** Fetch API（封裝在 `useApiBase`）
- **WebSocket：** Socket.IO 客戶端（封裝在 `useWebSocket`）

### 後端技術棧

- **API 框架：** Express.js
- **資料庫：** PostgreSQL
- **通訊協定：** Modbus（透過後端 API）
- **WebSocket：** Socket.IO 伺服器
- **外部資料庫：** 支援查詢 `platform` 和 `baseacs` schema

### 核心 Composables

#### 基礎 Composables

1. **`useApiBase.ts`** - API 請求基礎封裝
2. **`useWebSocket.ts`** - WebSocket 連接管理
3. **`useToast.ts`** - Toast 通知管理
4. **`useErrorHandler.ts`** - 錯誤處理

#### 系統 Composables

1. **`useDeviceApi.ts`** - 設備管理 API
2. **`useUserApi.ts`** - 使用者管理 API
3. **`useAlertApi.ts`** - 警示系統 API
4. **`useLightingApi.ts`** - 照明系統 API
5. **`useEnvironmentApi.ts`** - 環境品質系統 API
6. **`useSurveillanceApi.ts`** - 影像監視系統 API
7. **`usePeopleCountingApi.ts`** - 人流統計 API
8. **`useExternalDataApi.ts`** - 外部資料庫查詢 API

#### 地點管理 Composables

1. **`useLocationApi.ts`** - 統一地點管理 API
2. **`useZoneSystemAdapter.ts`** - 系統適配器
3. **`useSystemLocationApiFactory.ts`** - 系統 API 工廠
4. **`useZoneManagement.ts`** - 區域管理邏輯

#### 監控 Composables

1. **`useAlertMonitor.ts`** - 警示監控（主要入口）
2. **`useAlertPolling.ts`** - 輪詢備援
3. **`useAlertWebSocket.ts`** - WebSocket 監聽
4. **`useUnresolvedAlertCount.ts`** - 未解決警示計數
5. **`useAlertRules.ts`** - 警示規則管理

---

## 📝 已知問題與改進建議

### 1. 統一錯誤處理 ✅ **已改進**

**現狀：**

- ✅ 已建立 `useErrorHandler.ts` 提供統一的錯誤處理
- ✅ 已建立 `useToast.ts` 提供統一的 Toast 通知
- ✅ 已建立 `useSystemLocationApiFactory.ts` 提供統一的系統 API 模板

**建議：**

- 繼續擴展統一的 CRUD 操作模板
- 統一資料驗證機制

---

### 2. 系統間資料關聯 ✅ **已改進**

**現狀：**

- ✅ 已建立統一地點管理系統，所有系統使用相同的地點架構
- ✅ 已建立系統適配器機制，支援不同系統類型的轉換
- ✅ 已建立跨系統共用地點機制

**建議：**

- 建立系統間資料關聯的統一規範文檔
- 實作跨系統查詢功能
- 建立資料同步機制

---

### 3. 性能優化 ✅ **已改進**

**現狀：**

- ✅ 統一地點管理系統已實作批次查詢優化
- ✅ 環境監測系統已實作批量 Modbus 讀取優化
- ✅ 人流統計系統已實作批次查詢和增量查詢

**建議：**

- 繼續優化其他系統的查詢性能
- 建立統一的快取機制

---

## 🎯 下一步行動

### 短期目標（1-2 個月）- Phase 3：工地管理核心功能

1. **完成環境品質系統** ✅ **已完成**
2. **完成影像監視系統** ✅ **已完成**（前端完整實作，已整合 RTSP 和設備管理系統）
3. **完成人流統計管理** ✅ **已完成**（前端和後端 API 完整實作，整合外部資料庫查詢）
4. **完成全區點位圖** ✅ **已完成**（已整合至核心基礎系統）
5. **實作車輛進出管理**
   - 建立 `vehicle_access_logs`、`vehicle_registrations` 資料表
   - 建立 `/api/vehicle-access/*` API 路由
   - 建立 `useVehicleAccessApi` composable
   - 建立車輛進出管理頁面

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

### 長期目標（6-12 個月）- Phase 6

1. **實作其他系統**
   - 電梯系統
   - 衛生排水系統
   - 設備維護系統
   - 業務管理系統（訪客、寄物）
   - 多媒體資訊系統

---

## 📊 效益分析

### 整合效益

- **減少系統數量**：28 個 → 21 個（減少 25%）
- **降低維護成本**：減少重複功能，統一管理
- **提升開發效率**：避免功能重疊，專注核心功能
- **改善使用者體驗**：統一介面，減少學習成本

### 統一架構效益

- **統一地點管理**：所有系統使用相同的地點架構，降低維護成本
- **跨系統共用**：同一地點可以被多個系統共用，避免重複配置
- **自動合併**：同名區域/地點自動合併，提高用戶體驗
- **批次查詢優化**：避免 N+1 問題，提高查詢效率

### 重新分類效益

- **更清晰的分類**：按用途分類，取代模糊的主要/擴充分類
- **更符合業務需求**：針對工地管理版本優化優先順序
- **更明確的目標**：聚焦工地管理核心功能

---

## 📚 相關文件

### 系統詳細文檔

1. **`docs/ALERT_SYSTEM_REFACTORING.md`** - 警示系統架構與實現說明
2. **`docs/PEOPLE_COUNTING_SYSTEM.md`** - 人流統計系統架構與實現說明
3. **`docs/ZONE_LOCATION_SYSTEM.md`** - 區域/地點管理系統架構與實現說明
4. **`docs/ENVIRONMENT_QUALITY_SETTINGS.md`** - 環境品質系統架構與實現說明

### 配置與架構文件

1. **`app/config/system-modules.ts`** - 系統模組配置定義
2. **`app/types/location.ts`** - 統一地點管理類型定義
3. **`app/types/alert.ts`** - 警示系統類型定義
4. **`app/types/environment.ts`** - 環境監測系統類型定義
5. **`app/types/peopleCounting.ts`** - 人流統計系統類型定義

---

**最後更新：** 2025-01-09  
**維護者：** 開發團隊
