# 車輛進出系統（Vehicle Access System）頁面規格說明

## 目錄

1. [概述](#概述)
2. [頁面佈局](#頁面佈局)
3. [功能模組](#功能模組)
4. [資料結構](#資料結構)
5. [組件清單](#組件清單)
6. [API 需求](#api-需求)
7. [實作規劃](#實作規劃)

---

## 概述

車輛進出系統用於監控和管理工地的車輛進出，包含即時攝影機畫面、車牌辨識、柵欄機控制、進出記錄查詢等功能。

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
│                                          │                              │
│  ┌─────────────────┐  ┌──────────────┐   │         總 覽               │
│  │                 │  │  車牌號碼     │   │   ┌──────────────────┐      │
│  │   Camera1       │  │  進/出       │   │   │  北部            │      │
│  │   (攝影機圖片)   │  │  時間        │   │   │  ┌────────────┐  │      │
│  │                 │  │  ─────────── │   │   │  │ AA工地     │  │      │
│  │                 │  │  AA0751 進入 │   │   │  │ 入口：正常  │  │      │
│  │                 │  │  AA0752 離開 │   │   │  │ 出口：正常  │  │      │
│  │                 │  │  ...        │   │   │  │ 進:16 出:12 │  │      │
│  └─────────────────┘  │              │   │   │  └────────────┘  │      │
│   [車牌圖片 AA0751]   │              │   │   │  ┌────────────┐  │      │
│   ◀ 1/1 ▶            │              │   │   │  │ BB工地     │  │      │
│                       └──────────────┘   │   │  └────────────┘  │      │
│  ┌──────────────┐ ┌──────────────┐       │   └──────────────────┘      │
│  │ 出口柵欄機    │ │ 入口柵欄機   │       │   ┌──────────────────┐      │
│  │ ● 正常       │ │ ● 正常       │       │   │  中部            │      │
│  └──────────────┘ └──────────────┘       │   │  ...             │      │
│                                          │   └──────────────────┘      │
│                                          │                      [收縮] │
└──────────────────────────────────────────┴──────────────────────────────┘
```

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
- 功能：開啟地點管理對話框，新增/編輯/刪除車輛管理地點

### 3. 攝影機圖片區

- **車輛圖片顯示**
  - 顯示攝影機名稱（如 Camera1）
  - 顯示車輛進出時的擷取圖片（非即時串流）
  - 支援多張圖片瀏覽
- **車牌辨識結果**
  - 顯示辨識的車牌截圖
  - 車牌號碼文字顯示
  - 分頁控制（多筆辨識結果切換：◀ 1/1 ▶）

### 4. 柵欄機狀態區

顯示入口/出口柵欄機的運作狀態（僅顯示狀態，無控制功能）

#### 出口柵欄機

| 項目     | 說明                           |
| -------- | ------------------------------ |
| 狀態指示 | ● 正常（綠色）/ ● 異常（紅色） |

#### 入口柵欄機

| 項目     | 說明                           |
| -------- | ------------------------------ |
| 狀態指示 | ● 正常（綠色）/ ● 異常（紅色） |

### 5. 車輛進出記錄表

| 欄位     | 說明                                |
| -------- | ----------------------------------- |
| 車牌號碼 | 車牌圖片 + 車牌號碼文字             |
| 進/出    | 進入（入場）/ 離開（出場）          |
| 時間     | 進出時間戳記（YYYY/MM/DD HH:mm:ss） |

- 支援滾動瀏覽
- 即時更新（WebSocket 推送）

### 6. 總覽側邊欄

#### 收縮/展開功能

- 收縮按鈕位於右上角
- 收縮狀態僅顯示按鈕
- 展開狀態顯示完整總覽

#### 區域分組

按區域（北部、中部、南部等）分組顯示工地概況

#### 工地概況卡片

| 項目           | 說明                 |
| -------------- | -------------------- |
| 工地名稱       | 如 AA工地、BB工地    |
| 入口柵欄機狀態 | ● 正常 / ● 異常      |
| 出口柵欄機狀態 | ● 正常 / ● 異常      |
| 今日進車數量   | 統計今日入場車輛數   |
| 今日出車數量   | 統計今日出場車輛數   |
| 異常次數       | 今日異常事件次數     |
| 白名單車輛數   | 該地點白名單車輛總數 |

---

## 資料結構

### VehicleAccessZone（區域）

```typescript
interface VehicleAccessZone {
	id: string;
	name: string; // 區域名稱（如：北部、中部）
	locations: VehicleAccessLocation[];
}
```

### VehicleAccessLocation（地點）

```typescript
interface VehicleAccessLocation {
	id: string;
	locationId: number;
	name: string; // 工地名稱
	zoneId?: string;

	// 柵欄機狀態
	entryGate: GateStatus;
	exitGate: GateStatus;

	// 統計數據
	todayEntryCount: number;
	todayExitCount: number;
	anomalyCount: number;
	whitelistCount: number;

	// 攝影機資訊
	cameras: VehicleCamera[];
}
```

### GateStatus（柵欄機狀態）

```typescript
interface GateStatus {
	id: string;
	name: string; // "入口柵欄機" | "出口柵欄機"
	type: "entry" | "exit";
	status: "normal" | "error"; // 正常/異常
	isOnline: boolean;
}
```

### VehicleCamera（攝影機）

```typescript
interface VehicleCamera {
	id: string;
	name: string;
	type: "entry" | "exit"; // 入口/出口攝影機
}
```

### VehicleAccessLog（進出記錄）

```typescript
interface VehicleAccessLog {
	id: string;
	licensePlate: string; // 車牌號碼
	licensePlateImage?: string; // 車牌圖片 URL
	direction: "entry" | "exit"; // 進/出
	timestamp: string; // ISO 時間格式
	cameraId: string;
	locationId: string;
	isWhitelisted: boolean;
}
```

### LicensePlateRecognition（車牌辨識結果）

```typescript
interface LicensePlateRecognition {
	id: string;
	licensePlate: string;
	plateImage: string; // 車牌截圖 URL
	fullImage: string; // 完整車輛圖片 URL
	confidence: number; // 辨識信心度 0-100
	timestamp: string;
	direction: "entry" | "exit";
}
```

---

## 組件清單

### 新增組件

| 組件名稱                | 路徑                                                  | 說明                         |
| ----------------------- | ----------------------------------------------------- | ---------------------------- |
| `VehicleOverviewCard`   | `components/vehicle-access/VehicleOverviewCard.vue`   | 總覽區域的工地卡片           |
| `VehicleAccessLogTable` | `components/vehicle-access/VehicleAccessLogTable.vue` | 車輛進出記錄表格             |
| `GateStatusPanel`       | `components/vehicle-access/GateStatusPanel.vue`       | 柵欄機狀態顯示面板           |
| `LicensePlateViewer`    | `components/vehicle-access/LicensePlateViewer.vue`    | 車牌辨識結果檢視器（含分頁） |
| `VehicleImageViewer`    | `components/vehicle-access/VehicleImageViewer.vue`    | 車輛擷取圖片顯示器           |

### 複用組件

| 組件名稱               | 來源                   | 用途           |
| ---------------------- | ---------------------- | -------------- |
| `ZoneManagementDialog` | `components/location/` | 地點管理對話框 |

---

## API 需求

### Composables

```
composables/
├── systems/
│   ├── vehicleAccess/
│   │   ├── useVehicleAccessState.ts      # 狀態管理
│   │   ├── useVehicleAccessWebSocket.ts  # WebSocket 即時更新
│   │   └── useVehicleAccessApi.ts        # API 呼叫
│   └── location/
│       └── useVehicleAccessLocationApi.ts # 地點管理 API
```

### API 端點（預估）

| 方法 | 端點                                          | 說明                 |
| ---- | --------------------------------------------- | -------------------- |
| GET  | `/api/vehicle-access/locations`               | 取得所有地點列表     |
| GET  | `/api/vehicle-access/locations/:id`           | 取得地點詳情         |
| GET  | `/api/vehicle-access/zones`                   | 取得區域列表         |
| GET  | `/api/vehicle-access/logs`                    | 取得進出記錄         |
| GET  | `/api/vehicle-access/logs/:locationId`        | 取得指定地點進出記錄 |
| GET  | `/api/vehicle-access/recognition/:locationId` | 取得車牌辨識結果     |
| GET  | `/api/vehicle-access/gates/:locationId`       | 取得柵欄機狀態       |

### WebSocket 事件

| 事件名稱             | 說明           |
| -------------------- | -------------- |
| `vehicle:entry`      | 車輛入場事件   |
| `vehicle:exit`       | 車輛出場事件   |
| `gate:status`        | 柵欄機狀態變更 |
| `recognition:result` | 車牌辨識結果   |

---

## 實作規劃

### Phase 1：基礎架構

1. **建立頁面檔案**
   - `app/pages/construction-monitoring/vehicle-access.vue`

2. **建立類型定義**
   - `app/types/vehicleAccess.ts`

3. **建立基礎 Composables**
   - `useVehicleAccessState.ts`
   - `useVehicleAccessApi.ts`

### Phase 2：核心組件

1. **VehicleOverviewCard**
   - 顯示工地柵欄機狀態
   - 顯示今日統計數據

2. **VehicleAccessLogTable**
   - 顯示車牌號碼（含圖片）
   - 顯示進/出方向
   - 顯示時間

3. **GateStatusPanel**
   - 柵欄機狀態顯示（僅狀態，無控制功能）

### Phase 3：進階功能

1. **LicensePlateViewer**
   - 車牌圖片顯示
   - 分頁控制（◀ 1/1 ▶）

2. **VehicleImageViewer**
   - 車輛擷取圖片顯示
   - 攝影機名稱顯示

3. **WebSocket 即時更新**
   - 進出記錄即時推送
   - 柵欄機狀態即時更新

### Phase 4：整合優化

1. **地點管理對話框整合**
2. **效能優化**
3. **響應式設計調整**

---

## 注意事項

### UI/UX 考量

- 柵欄機狀態需要醒目的顏色區分（正常：綠色、異常：紅色）
- 車牌辨識結果需要清晰顯示，方便快速確認
- 進出記錄表格需支援滾動，保持頁面整潔
- 總覽區域可收縮，在小螢幕上節省空間

### 技術考量

- 圖片載入需考慮效能優化（lazy loading）
- WebSocket 連線需處理斷線重連
- 車牌辨識結果可能需要快取機制
- 圖片分頁需維護當前索引狀態

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
│       └── vehicle-access.vue          # 主頁面
├── components/
│   └── vehicle-access/
│       ├── VehicleOverviewCard.vue     # 總覽卡片
│       ├── VehicleAccessLogTable.vue   # 進出記錄表格
│       ├── GateStatusPanel.vue         # 柵欄機狀態顯示
│       ├── LicensePlateViewer.vue      # 車牌檢視器（含分頁）
│       └── VehicleImageViewer.vue      # 車輛圖片顯示器
├── composables/
│   └── systems/
│       ├── vehicleAccess/
│       │   ├── useVehicleAccessState.ts
│       │   ├── useVehicleAccessApi.ts
│       │   └── useVehicleAccessWebSocket.ts
│       └── location/
│           └── useVehicleAccessLocationApi.ts
└── types/
    └── vehicleAccess.ts                # 類型定義
```

---

## 變更紀錄

| 日期       | 版本 | 說明                                                 |
| ---------- | ---- | ---------------------------------------------------- |
| 2026-02-02 | 1.0  | 初版規格說明                                         |
| 2026-02-02 | 1.1  | 修正：攝影機為圖片顯示（非串流）、移除柵欄機控制功能 |
