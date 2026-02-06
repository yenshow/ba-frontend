# 車輛進出系統（Vehicle Access System）頁面規格說明

> 本規格與後端實作對齊，資料來源為外部 DB **vehiclebiz.passageway_log_data**（出入口過車日誌），API 為 `GET /api/external-data/vehiclebiz/passageway_log_data`，即時更新依 WebSocket **`yscp:event:vehicle`**。詳見後端 [YSCP_VEHICLE_ACCESS_IMPLEMENTATION_PLAN.md](../../ba-backend/docs/YSCP_VEHICLE_ACCESS_IMPLEMENTATION_PLAN.md)。

## 目錄

1. [概述](#概述)
2. [頁面佈局](#頁面佈局)
3. [功能模組](#功能模組)
4. [資料結構](#資料結構)
5. [組件清單](#組件清單)
6. [API 與 WebSocket](#api-與-websocket)
7. [實作規劃](#實作規劃)

---

## 概述

車輛進出系統用於監控與查詢工地的**過車記錄**，以外部資料 **vehiclebiz.passageway_log_data** 為來源，提供：

- **過車記錄列表**：頁面可篩選**時間**（今日、昨日、最近一週）；列表含過車時間、車牌、車道名稱、放行結果（`allow_result` + `lane_type`）、群組、黑名單、車牌圖片。
- **進出場與在場數量**：參考人流統計，顯示「進場車輛」「出場車輛」「在場車輛」三項統計（依選定地點的車道由 API count + `allow_result=1` 與 `lane_type` 取得）。
- **車輛群組**：依 `vehicle_list_name` 分組顯示，格式為「在場數/當日過車總數」；點擊群組可開啟彈窗顯示該群組的車輛名單（當日記錄）。
- **即時更新**：監聽 WebSocket `yscp:event:vehicle`，收到後重新拉取列表、進出場數量與總覽。
- **地點綁定**：地點來自既有 location／zone API，系統類型 `vehicle_access`，config 為 `entryLaneId`／`exitLaneId`（vehiclebiz.lane_info 入口／出口車道）。

**目前後端不提供**：柵欄機狀態、進／出方向、專用車牌辨識串流；若未來擴充再納入。

### 參考頁面

- 佈局結構參考：`app/pages/construction-monitoring/people-counting.vue`
- 功能設計參考：附圖（車輛進出系統 UI 設計）

### 頁面路徑

```
/construction-monitoring/vehicle-access
```

---

## 頁面佈局

採用與人流統計頁面相同的左右分割佈局：

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [位置標題：北部 | AA工地]                                               │
├──────────────────────────────────────────┬──────────────────────────────┤
│  [篩選列：地點▼ 時間▼ 僅無群組☐ 僅黑名單☐ 搜尋]  │    總 覽               │
├──────────────────────────────────────────┤   ┌──────────────────┐      │
│  ┌─────────────────┐  ┌──────────────────────────────┐   │  北部            │      │
│  │  選中記錄        │  │ 過車時間 │ 車牌 │ 車道 │ 群組 │ 黑名單 │   │  ┌────────────┐  │      │
│  │  車牌圖片        │  │ ────────┼──────┼──────┼──────┼───────│   │  │ AA工地     │  │      │
│  │  (license_plate  │  │ 12:00   │AA0751│ 入口  │ 訪客  │ 一般   │   │  │ 今日過車:24│  │      │
│  │   _image_url)    │  │ 11:58   │BB1234│ 出口  │ -    │ 黑名單 │   │  └────────────┘  │      │
│  │                  │  │ ...     │      │        │      │        │   │  ┌────────────┐  │      │
│  └─────────────────┘  └──────────────────────────────┘   │  │ BB工地     │  │      │
│  （點擊列表列可顯示詳情／車牌圖片）        │  │ 今日過車:12│  │      │
│                                          │  └────────────┘  │      │
│                                          │  中部 ...        │      │
│                                          │                      [收縮] │
└──────────────────────────────────────────┴──────────────────────────────┘
```

- **柵欄機狀態**：目前後端未提供，版面可預留或省略。
- **進／出方向**：後端過車日誌未區分進出，若有欄位可預留。

### 佈局比例

- **左側主區域**：`flex-[1.2]` ~ `flex-[1.3]`（根據螢幕大小調整）
- **右側總覽區域**：`flex-[0.8]` ~ `flex-[0.7]`（可收縮至 `flex-[0.05]`）

---

## 功能模組

### 1. 位置選擇標題列

- 顯示當前選中的「區域」與「工地名稱」
- 位置：左側區域頂部中央
- 樣式：白色背景、梯形裁切（`clip-path`）

### 2. 地點管理按鈕

- 位置：左側區域左上角
- 功能：開啟地點管理對話框，新增／編輯／刪除車輛管理地點；地點之 `vehicle_access` 系統需設定入口車道／出口車道（`entryLaneId`／`exitLaneId`，來自 vehiclebiz.lane_info）

### 3. 篩選列

| 項目       | 說明                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| 地點       | 下拉，依有 `vehicle_access` 的地點篩選；選定後以該地點的 `entryLaneId`／`exitLaneId` 傳 API `lane_id` |
| 時間範圍   | 今日／自訂（對應 API `timeRange=today` 或 `startTime`、`endTime`）                                    |
| 僅無群組   | 核取時傳 API `vehicle_list_id=-1`                                                                     |
| 僅黑名單   | 核取時傳 API `vehicle_category=5`                                                                     |
| 關鍵字搜尋 | 對應 API `search`（搜尋 license_plate、lane_name、owner_name、organization_name、passageway_name）    |

### 4. 選中記錄／車牌圖片區

- 顯示**當前選中一筆**過車記錄的車牌圖片（`plate_license_image_url`）與車牌號碼（`license_plate`）
- 點擊列表列時更新此區並可開啟詳情彈窗（可選）
- 多筆時可做分頁（◀ 1/n ▶）或僅顯示選中一筆

### 5. 過車記錄表（對應 API 列表）

| 欄位     | 說明                                                                      |
| -------- | ------------------------------------------------------------------------- |
| 過車時間 | `trigger_time`，轉為本地時區顯示（YYYY/MM/DD HH:mm:ss）                   |
| 車牌     | `license_plate`；可選縮圖 `plate_license_image_url`                       |
| 車道名稱 | `lane_name`                                                               |
| 車主     | `owner_name`（車主大頭照可依 `owner_id` 向 platform 取得）                |
| 群組     | `vehicle_list_name`（`vehicle_list_id=-1` 為無群組）                      |
| 黑名單   | `is_blacklist`：黑名單／一般（徽章或顏色；`vehicle_category=5` 為黑名單） |

- 支援滾動、分頁（`limit`／`offset`）
- 即時更新：監聽 WebSocket `yscp:event:vehicle` 後重新拉取列表

### 6. 總覽側邊欄

#### 收縮/展開功能

- 收縮按鈕位於右上角；收縮狀態僅顯示按鈕，展開狀態顯示完整總覽

#### 區域分組

按區域（北部、中部、南部等）分組顯示工地概況（資料來自既有 zone／location API，篩選含 `vehicle_access` 的地點）

#### 工地概況卡片

| 項目         | 說明                                                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 工地名稱     | 地點名稱                                                                                                                                |
| 今日過車筆數 | 呼叫 `GET /api/external-data/vehiclebiz/passageway_log_data/count`，篩選該地點之 `passageway_id`、`timeRange=today`（或當日 start/end） |
| （可選）     | 今日黑名單筆數：count 時加 `vehicle_category=5`                                                                                         |

**說明**：目前後端未提供柵欄機狀態與進／出分向統計，總覽僅以過車筆數為主；若未來 API 擴充再補入口／出口或柵欄機狀態。

---

## 資料結構

> 對齊後端 **vehiclebiz.passageway_log_data** 與既有 **location／zone** API；柵欄機、進／出方向為可選或預留。

### Zone / Location（區域與地點）

- 使用既有 **zone**、**location** API；地點之 `systems` 中 `systemType === "vehicle_access"` 者，`config` 含：
  - `entryLaneId`、`exitLaneId`（對應 API `lane_id`，來自 vehiclebiz.lane_info）
  - `cameraNames: string[]`（對應 `passageway_name`）
- 前端依此取得「有車輛進出地點」列表，並用於篩選與總覽分組。

### VehicleAccessLocationSummary（總覽用地點摘要）

```typescript
interface VehicleAccessLocationSummary {
	id: string;
	zoneId: string;
	zoneName: string;
	locationId: string;
	name: string;
	// 來自 vehicle_access system config
	entryLaneId?: number | null;
	exitLaneId?: number | null;
	// 由 count API 取得（timeRange=today + passageway_id）
	todayPassCount?: number;
	todayBlacklistCount?: number; // vehicle_category=5 時 count，可選
}
```

### VehicleDataLog（過車記錄，對應 API 單筆／列表）

```typescript
interface VehicleDataLog {
	id: number;
	lane_name: string | null;
	trigger_time: string | null; // ISO UTC，前端需轉本地顯示
	owner_id?: number | null;
	owner_name?: string | null;
	owner_phone?: string | null;
	license_plate: string | null;
	plate_license_image_url?: string | null;
	vehicle_list_id: number; // -1 或 0 = 無群組
	vehicle_list_name: string | null;
	vehicle_category: number; // 5 = 黑名單
	is_blacklist: boolean; // 後端回傳，vehicle_category === 5
}
```

### 列表 API 回應

```typescript
// GET .../vehiclebiz/passageway_log_data
interface VehicleDataLogListResponse {
	success: boolean;
	data: VehicleDataLog[];
	total?: number;
}

// GET .../vehiclebiz/passageway_log_data/count
interface VehicleDataLogCountResponse {
	success: boolean;
	data: number; // 或 { count: number }，依後端實際格式
}
```

### 可選／預留（後端目前未提供）

- **柵欄機狀態**（GateStatus）：若未來 API 提供再定義。
- **進／出方向**（direction）：目前過車日誌無此欄位，可預留型別。
- **車牌辨識串流**：目前無專用 recognition API，單筆記錄之 `plate_license_image_url` 即車牌圖片。車主大頭照可參考人流統計，依 `owner_id` 向 platform 取得。

---

## 組件清單

### 新增組件

| 組件名稱                | 路徑                                                  | 說明                                                                                    |
| ----------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `VehicleOverviewCard`   | `components/vehicle-access/VehicleOverviewCard.vue`   | 總覽側欄的工地卡片（今日過車筆數等）                                                    |
| `VehicleDataLogTable`   | `components/vehicle-access/VehicleDataLogTable.vue`   | 過車記錄表格（trigger_time、license_plate、lane_name、vehicle_list_name、is_blacklist） |
| `VehicleDataLogFilters` | `components/vehicle-access/VehicleDataLogFilters.vue` | 篩選列（地點、時間、僅無群組、僅黑名單、搜尋）                                          |
| `VehicleDataLogDetail`  | `components/vehicle-access/VehicleDataLogDetail.vue`  | 單筆詳情／彈窗（含車牌圖片、車主、is_blacklist 標示）                                   |
| `VehiclePlateImage`     | `components/vehicle-access/VehiclePlateImage.vue`     | 選中記錄的車牌圖片顯示（plate_license_image_url）                                       |

### 可選／預留組件

| 組件名稱             | 說明                                            |
| -------------------- | ----------------------------------------------- |
| `GateStatusPanel`    | 柵欄機狀態（後端未提供時可預留或省略）          |
| `LicensePlateViewer` | 多筆車牌結果分頁（可與 VehiclePlateImage 合併） |

### 複用組件

| 組件名稱               | 來源                   | 用途                                                                             |
| ---------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| `ZoneManagementDialog` | `components/location/` | 地點管理對話框（需支援 vehicle_access 的入口／出口車道 entryLaneId／exitLaneId） |

---

## API 與 WebSocket

### Composables 建議

```
composables/
├── systems/
│   ├── vehicleAccess/
│   │   ├── useVehicleAccessState.ts      # 狀態管理（篩選、選中記錄等）
│   │   ├── useVehicleAccessWebSocket.ts  # 訂閱 yscp:event:vehicle，觸發重新拉取
│   │   └── useVehicleAccessApi.ts        # 呼叫 external-data API（列表、count、單筆）
│   └── location/
│       └── (既有) useLocationApi 等      # 地點／zone 來自既有 API，篩選 vehicle_access
```

### 資料來源與 API（對齊後端）

- **地點／區域**：使用既有 **location／zone** API；篩選含 `systemType === "vehicle_access"` 的地點，其 `config` 含 `entryLaneId`、`exitLaneId`（vehiclebiz.lane_info）。
- **過車記錄**：使用外部資料 API，**需登入**（帶 auth token）。

| 方法 | 端點                                                      | 說明                                                                                                                                                                                                                                    |
| ---- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET  | `/api/external-data/vehiclebiz/passageway_log_data`       | 過車記錄列表。查詢參數：`timeRange=today` 或 `startTime`、`endTime`（ISO）；`passageway_id`（單一或多筆）；`vehicle_list_id=-1`（僅無群組）；`vehicle_category=5`（僅黑名單）；`search`、`limit`、`offset`、`orderBy`、`orderDirection` |
| GET  | `/api/external-data/vehiclebiz/passageway_log_data/count` | 筆數，篩選參數同上                                                                                                                                                                                                                      |
| GET  | `/api/external-data/vehiclebiz/passageway_log_data/:id`   | 單筆詳情（表有主鍵時）                                                                                                                                                                                                                  |

- **地點管理**：地點編輯時若系統類型含 `vehicle_access`，需可設定入口車道／出口車道（`entryLaneId`／`exitLaneId`）；使用既有 location 建立／更新 API。

### WebSocket（對齊後端）

| 事件名稱             | 說明                                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yscp:event:vehicle` | YSCP event_veh 推送；payload 為 `{ type: "vehicle_access", timestamp }`。前端收到後依目前篩選條件重新呼叫列表（及可選 count）API，取得最新過車資料。 |

- 與人流統計共用同一 WebSocket 連線；**無** `vehicle:entry`／`vehicle:exit`／`gate:status`／`recognition:result`。

---

## 實作規劃

### Phase 1：基礎架構

1. **建立頁面檔案**
   - `app/pages/construction-monitoring/vehicle-access.vue`

2. **建立類型定義**
   - `app/types/vehicleAccess.ts`（對應 `VehicleDataLog`、`VehicleAccessLocationSummary` 等）

3. **建立基礎 Composables**
   - `useVehicleAccessState.ts`（篩選、選中記錄、分頁狀態）
   - `useVehicleAccessApi.ts`（呼叫 `external-data/vehiclebiz/passageway_log_data` 列表、count、單筆）

### Phase 2：核心組件

1. **VehicleDataLogFilters**
   - 地點、時間範圍、僅無群組、僅黑名單、搜尋；產出 API 查詢參數（passageway_id、timeRange／startTime／endTime、vehicle_list_id=-1、vehicle_category=5、search）

2. **VehicleDataLogTable**
   - 過車時間（trigger_time 轉本地）、車牌、車道名稱、車主、群組、黑名單（is_blacklist）；可選車牌縮圖（plate_license_image_url）
   - 點擊列可選中並顯示詳情／車牌圖片

3. **VehicleOverviewCard**
   - 工地名稱、今日過車筆數（由 count API + passageway_id + timeRange=today）；可選今日黑名單筆數（vehicle_category=5）

### Phase 3：進階功能

1. **VehiclePlateImage / VehicleDataLogDetail**
   - 選中記錄的車牌圖片（plate_license_image_url）、詳情彈窗（單筆 API `/:id`）、is_blacklist 標示

2. **useVehicleAccessWebSocket**
   - 訂閱 `yscp:event:vehicle`，收到後依目前篩選重新拉取列表（及可選 count）

### Phase 4：整合優化

1. **地點管理**：地點編輯表單支援 `vehicle_access` 的入口／出口車道（entryLaneId／exitLaneId）
2. **效能**：列表分頁、圖片 lazy load、WebSocket 斷線重連
3. **響應式**：參考 people-counting 斷點與 Tailwind

---

## 注意事項

### UI/UX 考量

- **黑名單**（is_blacklist）：以徽章或顏色標示「黑名單／一般」；vehicle_category=5 為黑名單
- 過車時間（trigger_time）為 UTC，前端需轉為本地時區顯示
- 過車記錄表格需支援滾動／分頁，保持頁面整潔
- 總覽區域可收縮，在小螢幕上節省空間

### 技術考量

- 列表與 count 皆需 **auth token**（authenticate 中間件）
- 圖片載入建議 lazy loading（plate_license_image_url）
- WebSocket 訂閱 `yscp:event:vehicle`，需處理斷線重連
- API 錯誤依後端格式處理（403 白名單、404 無處理器、500）

### 響應式設計

- 參考 `people-counting.vue` 的響應式斷點
- 使用 Tailwind 的 `xl:` 和 `2xl:` 前綴
- 確保在不同螢幕尺寸下正常顯示

---

## 檔案結構預覽

```
app/
├── pages/
│   └── construction-monitoring/
│       └── vehicle-access.vue            # 主頁面
├── components/
│   └── vehicle-access/
│       ├── VehicleOverviewCard.vue       # 總覽卡片（今日過車筆數）
│       ├── VehicleDataLogTable.vue       # 過車記錄表格
│       ├── VehicleDataLogFilters.vue     # 篩選列
│       ├── VehicleDataLogDetail.vue      # 單筆詳情／彈窗
│       └── VehiclePlateImage.vue         # 選中記錄車牌圖片
├── composables/
│   └── systems/
│       └── vehicleAccess/
│           ├── useVehicleAccessState.ts
│           ├── useVehicleAccessApi.ts    # external-data API
│           └── useVehicleAccessWebSocket.ts  # yscp:event:vehicle
└── types/
    └── vehicleAccess.ts                  # VehicleDataLog、VehicleAccessLocationSummary 等
```

- 地點／zone 使用既有 location 相關 API 與 composables；GateStatusPanel、LicensePlateViewer、VehicleImageViewer 為可選或預留。

---

## 變更紀錄

| 日期       | 版本 | 說明                                                                                                                                                                                                                                                                                                           |
| ---------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-02 | 1.0  | 初版規格說明                                                                                                                                                                                                                                                                                                   |
| 2026-02-02 | 1.1  | 修正：攝影機為圖片顯示（非串流）、移除柵欄機控制功能                                                                                                                                                                                                                                                           |
| 2026-02-03 | 1.2  | 對齊後端：API 改為 external-data/vehiclebiz/passageway_log_data；WebSocket 改為 yscp:event:vehicle；資料結構與欄位對齊（trigger_time、license_plate、lane_name、vehicle_list_id/name、is_blacklist、owner 等）；移除／預留柵欄機、進出方向、專用 recognition API；總覽改為今日過車筆數；組件與實作規劃對應調整 |
