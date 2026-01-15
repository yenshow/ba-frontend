# 首頁版面設計規劃文檔

## 📋 文檔目的

本文檔用於分析首頁設計需求，對比現有前端架構，並規劃首頁版面設計。

---

## 🖼️ 圖片內容分析

### 整體布局結構

首頁採用三欄式布局：
- **左側欄**：環境監測數據（詳細參數顯示）
- **中間區域**：人員統計與單位列表
- **右側欄**：人員進出記錄表格

### 1. 頂部橫幅（紅色警告區域）

**內容：**
- 警告訊息：「施工中，請勿擅自闖入。場內嚴禁酒精性飲料。工作人員請留意自身安全，保持...」
- 樣式：紅色背景，白色文字

**功能需求：**
- 顯示施工現場安全警告
- 可配置的警告訊息
- 醒目的視覺提示

---

### 2. 頂部區域（品牌與時間）

**左側 - 品牌標識：**
- YENSHOW Logo（帶有 Y 圖標）
- 公司名稱：「遠岫科技有限公司」

**中間 - 專案資訊：**
- 建設公司：「遠岫建設有限公司」
- 專案名稱：「蝶蛹新天地」

**右側 - 日期時間：**
- 日期：「2026/01/13」
- 時間：「星期二 下午 02:48:56」
- 格式：完整日期 + 星期 + 時段 + 時間

**功能需求：**
- 即時時間顯示（每秒更新）
- 動態日期格式（包含星期）
- 品牌標識展示

---

### 3. 左側欄 - 環境監測數據

#### 3.1 主要指標（大型圓形儀表）

**熱指數 (Heat Index)：**
- 顯示值：28.1
- 等級：Level 1
- 樣式：圓形儀表 + 數值卡片

**噪音值 (Noise Level)：**
- 顯示值：85 dBA
- 樣式：圓形儀表（紅色高亮）+ 數值卡片
- 狀態：警告級別（紅色標示）

**PM2.5 (細懸浮微粒)：**
- 顯示值：27 µg/m³
- 樣式：圓形儀表 + 數值卡片

#### 3.2 詳細參數（小型卡片）

**環境參數列表：**
- PM2.5：27 µg/m³
- PM10：33 µg/m³
- CO2：27 ppm
- 溫度：27.3°C
- 濕度：60%
- 風速：33 m/s

**功能需求：**
- 即時數據更新（5秒間隔）
- 狀態判斷（正常/注意/警告）
- 視覺化儀表顯示
- 參數卡片展示

---

### 4. 中間區域 - 人員統計

#### 4.1 總體統計（大型數字顯示）

**進場人數 (Entry Count)：**
- 數值：9999
- 標籤：「進場人數」

**出場人數 (Exit Count)：**
- 數值：9981
- 標籤：「出場人數」

**在場人數 (On-site Count)：**
- 數值：18
- 標籤：「在場人數」

#### 4.2 進場單位列表 (Entry Units)

**單位統計格式：**
- 格式：「單位名稱 當前人數/總人數」
- 範例：
  - 遠岫科技 3/5
  - 蝶蛹工程 4/20
  - 蝶蛹鋼鐵 7/20
  - 遠岫水泥 0/19
  - 遠岫開發 2/17
  - 遠岫監造 0/4
  - 遠岫建材 0/4
  - 蝶蛹營造 0/5

**功能需求：**
- 即時人員統計
- 單位分組顯示
- 當前/總人數對比
- 網格或列表布局

---

### 5. 右側欄 - 人員進出記錄

#### 5.1 記錄表格

**表格欄位：**
1. **設備截圖 (Device Screenshot)**
   - 類型：圓形頭像
   - 內容：人員照片

2. **建模照片 (Model Photo)**
   - 類型：圓形頭像
   - 內容：建模照片（現有組件已包含）

3. **進場單位 (Entry Unit)**
   - 類型：文字
   - 範例：「遠岫科技」

4. **工號 (Employee ID)**
   - 類型：文字
   - 範例：「999916」

5. **姓名 (Name)**
   - 類型：文字
   - 範例：「鍾善武」

6. **事件 (Event)**
   - 類型：文字
   - 範例：「進入」

7. **時間 (Time)**
   - 類型：日期時間
   - 格式：「2025/12/22 14:06:59」

**注意：** 現有 `EntryExitLogTable.vue` 組件已包含所有必要欄位，可直接使用。

**功能需求：**
- 即時記錄更新
- 表格滾動顯示
- 時間排序（最新在前）
- 分頁或無限滾動

---

## 🔍 現有前端架構對比

### 已實現的功能模組

#### 1. 環境監測系統 ✅

**位置：** `app/pages/construction-monitoring/environment.vue`

**現有功能：**
- ✅ 環境品質數據讀取（PM2.5, PM10, TVOC, HCHO, 濕度, 溫度, CO2, 噪音, 風速）
- ✅ 即時數據更新（5秒間隔）
- ✅ 狀態判斷（正常/注意/警報）
- ✅ 儀表顯示組件（`EnvironmentGauge.vue`）
- ✅ 參數卡片組件（`EnvironmentParamCard.vue`）
- ✅ Modbus 數據讀取
- ✅ 地點管理（樓層、位置）

**可用組件：**
- `EnvironmentGauge.vue` - 儀表顯示
- `EnvironmentParamCard.vue` - 參數卡片
- `SensorTrendChart.vue` - 趨勢圖表

**API：**
- `useEnvironmentApi` - 環境數據 API
- 感測器數據讀取（Modbus）

---

#### 2. 人流統計系統 ✅

**位置：** `app/pages/construction-monitoring/people-counting.vue`

**現有功能：**
- ✅ 工地列表
- ✅ 人員統計（進場、出場、在場）
- ✅ 單位列表（`UnitList.vue`）
- ✅ 人員列表（`PersonnelList.vue`）
- ✅ 進出記錄表格（`EntryExitLogTable.vue`）
- ✅ 工地詳情面板（`SiteDetailPanel.vue`）

**可用組件：**
- `SiteOverviewCard.vue` - 工地總覽卡片（包含進場、出場、在場人數）
- `UnitList.vue` - 單位列表（顯示單位名稱、當前人數/總人數）
- `PersonnelList.vue` - 人員列表
- `EntryExitLogTable.vue` - 進出記錄表格（包含設備截圖、建模照片、單位、工號、姓名、事件、時間）

**API：**
- `usePeopleCountingApi` - 人流統計 API

---

#### 3. 通用組件 ✅

**時間顯示：**
- `dateUtils.ts` - 日期工具函數
- 可實現即時時間更新

**布局組件：**
- `AppHeader.vue` - 頂部導航（可參考布局）
- `ToastContainer.vue` - 通知容器

**數據載入：**
- `useDataLoader.ts` - 數據載入工具
- `useApiBase.ts` - API 基礎工具

---

## 📊 功能對比表

| 功能需求 | 現有實現 | 狀態 | 備註 |
|---------|---------|------|------|
| **頂部橫幅警告** | ❌ | 需新增 | 簡單文字顯示組件 |
| **品牌標識** | ✅ | 可用 | `AppHeader.vue` 已有 Logo |
| **日期時間顯示** | ⚠️ | 需增強 | 需即時更新 + 星期顯示 |
| **環境監測 - 熱指數** | ❌ | 需新增 | 需計算熱指數 |
| **環境監測 - 噪音值** | ✅ | 可用 | 已有噪音參數 |
| **環境監測 - PM2.5** | ✅ | 可用 | 已有 PM2.5 參數 |
| **環境監測 - 詳細參數** | ✅ | 可用 | 已有所有參數 |
| **環境監測 - 儀表顯示** | ✅ | 可用 | `EnvironmentGauge.vue` |
| **人員統計 - 總體數據** | ✅ | 可用 | `usePeopleCountingApi` |
| **人員統計 - 單位列表** | ✅ | 可用 | `UnitList.vue` |
| **進出記錄表格** | ✅ | 可用 | `EntryExitLogTable.vue` |

---

## 🎨 設計規劃

### 布局結構

```
┌─────────────────────────────────────────────────────────┐
│  頂部橫幅（紅色警告區域）                                  │
├─────────────────────────────────────────────────────────┤
│  品牌標識  │  專案資訊  │  日期時間                      │
├───────────┼────────────┼───────────────────────────────┤
│           │            │                                │
│  左側欄   │  中間區域   │  右側欄                        │
│           │            │                                │
│  環境監測 │  人員統計   │  進出記錄                      │
│           │            │                                │
│  - 熱指數 │  - 進場人數 │  - 記錄表格                    │
│  - 噪音值 │  - 出場人數 │                                │
│  - PM2.5  │  - 在場人數 │                                │
│           │            │                                │
│  詳細參數 │  - 單位列表 │                                │
│  - PM2.5  │            │                                │
│  - PM10   │            │                                │
│  - CO2    │            │                                │
│  - 溫度   │            │                                │
│  - 濕度   │            │                                │
│  - 風速   │            │                                │
└───────────┴────────────┴───────────────────────────────┘
```

### 響應式設計

- **桌面版（≥1280px）**：三欄布局
- **平板版（768px-1279px）**：兩欄布局（左側+中間，右側下方）
- **手機版（<768px）**：單欄布局（垂直堆疊）

---

## 🛠️ 技術實現規劃

### 1. 頁面結構

**文件位置：** `app/pages/index.vue`

**主要區塊：**
1. `SafetyBanner.vue` - 安全警告橫幅
2. `HomeHeader.vue` - 頂部品牌與時間
3. `EnvironmentDashboard.vue` - 環境監測儀表板
4. `PersonnelStatistics.vue` - 人員統計
5. `EntryExitLog.vue` - 進出記錄

### 2. 組件規劃

#### 2.1 新增組件

**`components/home/SafetyBanner.vue`**
- 功能：顯示安全警告訊息
- Props：`message` (string)
- 樣式：紅色背景，白色文字

**`components/home/HomeHeader.vue`**
- 功能：品牌標識、專案資訊、日期時間
- Props：`projectName` (string), `constructionCompany` (string)
- 功能：即時時間更新

**`components/home/EnvironmentDashboard.vue`**
- 功能：環境監測數據展示
- 整合：`EnvironmentGauge`, `EnvironmentParamCard`
- 數據來源：`useEnvironmentApi`

**`components/home/PersonnelStatistics.vue`**
- 功能：人員統計展示
- 整合：`SiteOverviewCard`, `UnitList`
- 數據來源：`usePeopleCountingApi`

**`components/home/EntryExitLog.vue`**
- 功能：進出記錄表格
- 整合：`EntryExitLogTable`
- 數據來源：`usePeopleCountingApi`

#### 2.2 複用現有組件

- `EnvironmentGauge.vue` - 環境儀表
- `EnvironmentParamCard.vue` - 參數卡片
- `SiteOverviewCard.vue` - 工地總覽
- `UnitList.vue` - 單位列表
- `EntryExitLogTable.vue` - 進出記錄表格

### 3. 數據管理

#### 3.1 環境數據

**使用現有 API：**
- `useEnvironmentApi` - 環境數據
- `useDeviceApi` - 設備數據
- Modbus 數據讀取

**數據更新：**
- 5秒間隔自動刷新
- WebSocket 即時更新（如可用）

#### 3.2 人員數據

**使用現有 API：**
- `usePeopleCountingApi` - 人流統計
- 工地列表、人員統計、進出記錄

**數據更新：**
- 10秒間隔自動刷新
- WebSocket 即時更新（如可用）

#### 3.3 時間顯示

**實現方式：**
- `setInterval` 每秒更新
- 使用 `dateUtils.ts` 格式化（需新增格式化函數）
- 顯示格式：「YYYY/MM/DD 星期X 時段 HH:mm:ss」

**格式化函數需求：**
```typescript
// 新增到 dateUtils.ts
export function formatHomePageDateTime(date: Date): {
  date: string;      // "2026/01/13"
  weekday: string;   // "星期二"
  period: string;    // "下午"
  time: string;      // "02:48:56"
} {
  // 實現日期時間格式化
  // 包含星期轉換（一、二、三...）
  // 包含時段判斷（上午、下午）
}
```

### 4. 熱指數計算

**需要新增功能：**
- 計算公式：基於溫度和濕度
- 等級判斷：Level 1-5
- 顯示組件：類似 `EnvironmentGauge`

**計算邏輯：**
```typescript
// 熱指數計算（使用 NOAA 標準公式）
function calculateHeatIndex(temperature: number, humidity: number): {
  value: number;
  level: number;
} {
  // 熱指數公式（華氏度）
  // HI = -42.379 + 2.04901523*T + 10.14333127*RH - 0.22475541*T*RH
  //      - 6.83783e-3*T^2 - 5.481717e-2*RH^2 + 1.22874e-3*T^2*RH
  //      + 8.5282e-4*T*RH^2 - 1.99e-6*T^2*RH^2
  
  // 轉換為攝氏度並計算等級
  // Level 1: < 27°C (安全)
  // Level 2: 27-32°C (注意)
  // Level 3: 32-41°C (警告)
  // Level 4: 41-54°C (危險)
  // Level 5: > 54°C (極度危險)
  
  return { value: calculatedValue, level: calculatedLevel };
}
```

**實現位置：**
- 新增工具函數：`app/utils/heatIndexUtils.ts`
- 或整合到：`app/utils/sensorUtils.ts`

---

## 📝 實作步驟

### Phase 1: 基礎布局 ✅
1. 創建 `app/pages/index.vue`
2. 實現三欄布局結構
3. 添加響應式設計

### Phase 2: 頂部區域
1. 實現 `SafetyBanner.vue`
2. 實現 `HomeHeader.vue`
3. 整合品牌標識和時間顯示

### Phase 3: 環境監測
1. 整合 `EnvironmentDashboard.vue`
2. 實現熱指數計算
3. 整合現有環境組件

### Phase 4: 人員統計
1. 整合 `PersonnelStatistics.vue`
2. 實現總體統計顯示
3. 整合單位列表

### Phase 5: 進出記錄
1. 整合 `EntryExitLog.vue`
2. 實現表格顯示
3. 添加即時更新

### Phase 6: 優化與測試
1. 性能優化
2. 響應式測試
3. 數據更新測試

---

## 🎯 設計重點

### 視覺設計
- **色彩方案**：藍色系主色調，紅色用於警告
- **字體大小**：大數字顯示（統計數據），中等字體（參數）
- **間距**：充足的留白，清晰的區塊分隔

### 交互設計
- **即時更新**：數據自動刷新，無需手動操作
- **響應式**：適配不同螢幕尺寸
- **載入狀態**：顯示數據載入中狀態

### 性能優化
- **數據快取**：避免重複請求
- **防抖處理**：避免頻繁更新
- **組件懶加載**：按需載入組件

---

## 📌 待確認事項

1. **熱指數計算公式**：需要確認具體的計算邏輯和等級標準
2. **警告訊息來源**：是否需要後端 API 提供，還是前端配置
3. **專案資訊來源**：是否需要從後端獲取，還是前端配置
4. **數據更新頻率**：環境數據 5秒，人員數據 10秒（可調整）
5. **預設工地選擇**：首頁顯示哪個工地的數據（預設第一個？）

---

## 🔗 相關文件

- `app/pages/construction-monitoring/environment.vue` - 環境監測頁面
- `app/pages/construction-monitoring/people-counting.vue` - 人流統計頁面
- `app/composables/useEnvironmentApi.ts` - 環境 API
- `app/composables/usePeopleCountingApi.ts` - 人流統計 API
- `app/components/environment/` - 環境組件
- `app/components/people-counting/` - 人流統計組件

---

**最後更新：** 2025-01-XX  
**維護者：** 開發團隊

