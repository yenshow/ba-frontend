# 人流統計系統架構與實現說明

**更新日期**：2025-01-09  
**狀態**：✅ 系統運行中  
**版本**：v1.0

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

人流統計系統是一個**實時監控與統計**系統，負責：

1. **地點管理**：管理工地（Location）配置，包括入口/出口設備、進場單位
2. **人員管理**：管理單位（Unit）和人員（Personnel）信息
3. **記錄查詢**：查詢進出場記錄（Log），支持篩選和分頁
4. **統計計算**：實時計算進場/出場/在場人數
5. **狀態判斷**：判斷人員在場狀態（是否在場、是否今日進場）
6. **異常監控**：監控未註冊人員刷卡，自動創建警報

### 設計原則

- ✅ **外部數據源**：直接查詢外部資料庫（platform、baseacs schema），不進行本地存儲
- ✅ **實時更新**：通過 WebSocket 接收 YSCP 事件，觸發資料重新載入
- ✅ **統一管理**：整合地點管理系統，使用統一的地點配置架構
- ✅ **性能優化**：批次查詢、SQL 優化、防抖機制
- ✅ **數據一致性**：使用事件序列邏輯，確保統計準確性

---

## 系統架構

### 整體架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                        外部資料庫                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐              ┌──────────────┐            │
│  │  platform    │              │   baseacs   │            │
│  │  schema      │              │   schema    │            │
│  │              │              │             │            │
│  │ - person     │              │ - slot_card  │            │
│  │ - person_    │              │   _records  │            │
│  │   group      │              │             │            │
│  │ - person_    │              │             │            │
│  │   head_pic   │              │             │            │
│  └──────────────┘              └──────────────┘            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 查詢
                              │
┌─────────────────────────────────────────────────────────────┐
│                        後端系統                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  地點管理     │    │  人流統計     │    │  YSCP 事件    │  │
│  │  系統        │    │  服務        │    │  服務        │  │
│  │              │    │              │    │              │  │
│  │ - locations  │◄───┤ - getSites   │    │ - handleEvent│  │
│  │ - zones      │    │ - getStats   │    │ - emitWS     │  │
│  └──────────────┘    │ - getLogs    │    └──────────────┘  │
│         │            │ - getPersonnel│                      │
│         │            └──────────────┘                      │
│         │                    │                               │
│         │                    ▼                               │
│         │            ┌──────────────┐                      │
│         │            │  監控服務     │                      │
│         │            │              │                      │
│         │            │ - checkRecords│                      │
│         │            │ - createAlert │                      │
│         │            └──────────────┘                      │
│         │                    │                               │
│         └────────────────────┘                               │
│                              │                               │
│                              │ WebSocket                     │
│                              │ yscp:event:alarm             │
│                              │ yscp:event:generic            │
│                              ▼                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP API / WebSocket
                              │
┌─────────────────────────────────────────────────────────────┐
│                        前端系統                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  API 層      │    │  狀態管理     │    │  WebSocket   │  │
│  │              │    │              │    │  監聽        │  │
│  │ usePeople    │◄───┤ usePeople    │◄───┤ usePeople    │  │
│  │ CountingApi  │    │ CountingState│    │ CountingWS   │  │
│  │              │    │              │    │              │  │
│  │ - getLocations│    │ - loadLocations│   │ - setupEvent │  │
│  │ - getDetail  │    │ - loadDetail  │   │   Listeners  │  │
│  │ - getPersonnel│   │ - loadPersonnel│  │              │  │
│  │ - getLogs    │    │ - loadLogs    │   │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         │                    │                    │          │
│         │                    ▼                    │          │
│         │            ┌──────────────┐            │          │
│         │            │  頁面組件     │            │          │
│         │            │              │            │          │
│         │            │ people-counting│          │          │
│         │            │ .vue         │            │          │
│         │            │              │            │          │
│         │            │ - Location    │            │          │
│         │            │   Overview    │            │          │
│         │            │ - Stats Panel │            │          │
│         │            │ - Personnel   │            │          │
│         │            │   List        │            │          │
│         │            │ - Log Table   │            │          │
│         │            └──────────────┘            │          │
│         │                                         │          │
│         └─────────────────────────────────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 模組劃分

#### 後端模組

| 模組 | 文件 | 職責 |
|------|------|------|
| **人流統計服務** | `peopleCountingService.js` | 地點管理、統計計算、記錄查詢、人員管理 |
| **監控服務** | `peopleCountingMonitor.js` | 監控刷卡記錄、處理未註冊人員警報 |
| **YSCP 事件服務** | `yscpEventService.js` | 處理 YSCP 事件、推送 WebSocket 通知 |
| **API 路由** | `peopleCountingRoutes.js` | REST API 端點 |

#### 前端模組

| 模組 | 文件 | 職責 |
|------|------|------|
| **API 層** | `usePeopleCountingApi.ts` | 統一處理 API 調用 |
| **狀態管理** | `usePeopleCountingState.ts` | 統一管理頁面狀態和數據載入 |
| **WebSocket 監聽** | `usePeopleCountingWebSocket.ts` | 監聽 YSCP 事件、觸發資料重新載入 |
| **UI 組件** | `people-counting.vue` | 主頁面組件 |

---

## 後端實現

### 1. 人流統計服務 (`peopleCountingService.js`)

#### 核心功能

**地點管理**：

- `getPeopleCountingLocations()`：取得地點列表
- `getPeopleCountingLocationById()`：取得單一地點
- `createPeopleCountingLocation()`：建立地點
- `updatePeopleCountingLocation()`：更新地點
- `deletePeopleCountingLocation()`：刪除地點

**業務邏輯 API**：

- `getSites()`：取得所有工地列表（含統計）
- `getSiteStats()`：取得工地統計（進場/出場/在場人數）
- `getSiteLogs()`：取得工地進出場記錄
- `getUnitPersonnel()`：取得單位人員列表（含狀態計算）

#### 統計計算邏輯

**今日統計計算** (`calculateTodayStatsByPhysicalId`)：

```javascript
1. 按時間排序記錄
2. 使用 Map 追蹤每個人的最後事件類型
3. 事件序列邏輯：
   - 如果沒有前一個事件，直接計數（第一個事件）
   - 如果前一個事件與當前事件不同，計數（進場後出場，或出場後進場）
   - 如果前一個事件與當前事件相同，跳過（連續相同事件，可能是重複刷卡）
4. 返回 { entryCount, exitCount }
```

**在場人數計算** (`calculateCurrentCount`)：

```javascript
1. 按時間排序記錄
2. 追蹤每個人的最後事件類型和時間
3. 計算最後事件為 "entry" 的人數
4. 返回在場人數
```

**事件類型判斷** (`parseEventType`)：

```javascript
1. 檢查 person_id：
   - 如果 person_id === -1，返回 null（未註冊人員，視為失敗事件）
2. 檢查 physical_id：
   - 如果 physical_id === entryDoorId，返回 "entry"
   - 如果 physical_id === exitDoorId，返回 "exit"
   - 否則返回 null
```

#### 人員狀態計算

**在場狀態判斷** (`isPresent`)：

```javascript
1. 如果沒有進場記錄，則不在場
2. 只有今日進場且沒有今日出場時，才在場
3. 如果不是今日進場，無論是否有出場記錄，都不在場
```

**今日進場判斷** (`isTodayEntry`)：

```javascript
1. 取得最近進場記錄（不受時間限制）
2. 檢查進場時間是否在今日時間範圍內（00:00 - 23:59:59.999）
3. 返回布爾值
```

### 2. 監控服務 (`peopleCountingMonitor.js`)

#### 監控流程

**檢查新記錄** (`checkPeopleCountingRecords`)：

```javascript
1. 查詢自上次檢查後的新記錄（增量查詢）
2. 取得所有人流統計地點配置
3. 建立地點配置映射（physical_id -> location）
4. 處理每筆記錄：
   a. 檢查是否為未註冊人員（person_id = -1）
      - 使用 errorTracker 累積機制
      - 達到 5 次以上才創建警報
   b. 判斷事件類型（entry/exit）
   c. 記錄處理完成（不再推送 WebSocket，由前端收到 YSCP 事件後重新載入）
5. 更新最後檢查時間
```

**觸發時機**：

- **YSCP 事件觸發**（主要）：收到 YSCP 事件後自動觸發
- **定時任務**（已停用）：不再使用定時任務，改為事件驅動

### 3. YSCP 事件服務 (`yscpEventService.js`)

#### 事件處理

**事件類型**：

- `yscp:event:alarm`：警報事件（YSCP 系統已設定為只發送此類型事件）

**處理流程**：

```javascript
1. 接收 YSCP 事件數據（結構：{ method: 'OnEventNotify', params: { events: [...] }, ... }）
2. 直接通過 WebSocket 推送 yscp:event:alarm 事件給前端
3. 前端收到事件後重新載入資料
```

**注意**：YSCP 系統已設定為只發送包含 `events` 數組的警報事件，因此後端不需要進行事件類型判斷，統一處理即可。

---

## 前端實現

### 1. API 層 (`usePeopleCountingApi.ts`)

#### 核心方法

**取得地點列表** (`getLocations`)：

```typescript
1. 並行請求：
   - GET /people-counting/sites（工地列表與統計）
   - GET /people-counting/locations（地點管理系統）
2. 轉換為前端格式：
   - 合併統計數據和地點配置
   - 提取區域信息（從 zone 名稱）
3. 返回 { locations, zones }
```

**取得地點詳情** (`getLocationDetail`)：

```typescript
1. 如果提供了現有列表，直接使用（避免重複 API 調用）
2. 否則從 API 獲取
3. 返回地點詳情
```

**取得單位人員** (`getUnitPersonnel`)：

```typescript
1. 請求：GET /people-counting/units/:id/personnel?siteId=:siteId
2. 轉換為前端格式：
   - 處理照片 URL（Base64 解碼）
   - 格式化時間
3. 返回人員列表
```

**取得進出場記錄** (`getLocationLogs`)：

```typescript
1. 請求：GET /people-counting/sites/:id/logs?limit=:limit&unitId=:unitId
2. 轉換為前端格式
3. 返回記錄列表
```

### 2. 狀態管理 (`usePeopleCountingState.ts`)

#### 狀態定義

```typescript
- locations: PeopleCountingLocation[]        // 地點列表
- selectedLocation: PeopleCountingLocation | null  // 選中的地點
- personnel: PeopleCountingPersonnel[]       // 人員列表
- logs: PeopleCountingLog[]                  // 進出場記錄
- peopleCountingZones: PeopleCountingZone[]  // 區域列表
- selectedUnitId: number | null              // 選中的單位 ID
```

#### 核心方法

**載入地點列表** (`loadLocations`)：

```typescript
1. 調用 API 取得地點列表
2. 如果當前有選中的地點，同步更新統計資料
3. 確保總覽卡片和詳情面板的資料保持一致
```

**載入地點詳情** (`loadLocationDetail`)：

```typescript
1. 使用現有的 locations 列表，避免重複 API 調用
2. 預設選取第一個單位
3. 並行載入人員列表和進出場記錄
```

**載入單位人員** (`loadUnitPersonnel`)：

```typescript
1. 調用 API 取得單位人員
2. 更新 personnel 狀態
```

**載入進出場記錄** (`loadLocationLogs`)：

```typescript
1. 調用 API 取得進出場記錄
2. 更新 logs 狀態
```

### 3. WebSocket 監聽 (`usePeopleCountingWebSocket.ts`)

#### 監聽機制

**設置事件監聽器** (`setupEventListeners`)：

```typescript
1. 監聽 WebSocket 連接狀態
2. 連接成功時：
   - 監聽 yscp:event:alarm
   - 監聽 yscp:event:generic
3. 斷線時：
   - 移除監聽器
   - 清除防抖計時器
```

**防抖機制**：

```typescript
1. 收到 YSCP 事件後，不立即執行回調
2. 設置防抖計時器（預設 500ms）
3. 如果正在載入，跳過本次事件（避免重複載入）
4. 防抖後執行回調（重新載入資料）
```

**效果**：

- ✅ 避免短時間內多次觸發
- ✅ 減少 API 請求次數
- ✅ 提高系統性能

---

## 數據流與交互

### 1. 地點列表載入流程

```
┌─────────────┐
│  頁面載入    │
│ people-counting│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ loadLocations│
└──────┬──────┘
       │
       ├─► 並行請求
       │   ├─► GET /people-counting/sites
       │   └─► GET /people-counting/locations
       │
       ▼
┌─────────────┐
│ 後端處理     │
│ getSites    │
└──────┬──────┘
       │
       ├─► 取得地點配置
       ├─► 批次取得人員 ID
       ├─► 批次取得今日記錄
       ├─► 計算統計（進場/出場/在場）
       └─► 返回工地列表
       │
       ▼
┌─────────────┐
│ 前端轉換     │
│ 合併數據     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 更新狀態     │
│ locations   │
└─────────────┘
```

### 2. YSCP 事件觸發流程

```
┌─────────────┐
│  YSCP 系統   │
│  刷卡事件    │
│  (已設定為   │
│   只發送     │
│   alarm)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ yscpEvent   │
│ Service     │
└──────┬──────┘
       │
       │ (統一處理，無需判斷類型)
       │
       ▼
┌─────────────┐
│ WebSocket   │
│ emit        │
└──────┬──────┘
       │
       └─► yscp:event:alarm
       │
       ▼
┌─────────────┐
│ 前端監聽     │
│ usePeople   │
│ CountingWS  │
└──────┬──────┘
       │
       ├─► 防抖處理（500ms）
       ├─► 檢查是否正在載入
       └─► 觸發資料重新載入
           │
           ▼
       ┌─────────────┐
       │ 重新載入     │
       │ - loadLocations│
       │ - loadLocationDetail│
       └─────────────┘
```

### 3. 統計計算流程

```
┌─────────────┐
│  刷卡記錄    │
│ slot_card   │
│ _records    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 取得今日記錄 │
│ getToday    │
│ RecordsOnly │
└──────┬──────┘
       │
       ├─► 過濾條件：
       │   - person_id IN (...)
       │   - person_id != -1
       │   - swip_card_rev_time >= 今日 00:00
       │   - swip_card_rev_time <= 今日 23:59:59.999
       │
       ▼
┌─────────────┐
│ 計算統計     │
│ calculate   │
│ TodayStats  │
└──────┬──────┘
       │
       ├─► 按時間排序
       ├─► 追蹤每人的最後事件類型
       ├─► 事件序列邏輯（先進後出）
       └─► 返回 { entryCount, exitCount }
       │
       ▼
┌─────────────┐
│ 計算在場人數 │
│ calculate   │
│ CurrentCount│
└──────┬──────┘
       │
       ├─► 追蹤每人的最後事件
       └─► 計算最後事件為 "entry" 的人數
       │
       ▼
┌─────────────┐
│ 返回統計     │
│ { entryCount,│
│   exitCount, │
│   currentCount }│
└─────────────┘
```

### 4. 未註冊人員警報流程

```
┌─────────────┐
│  刷卡記錄    │
│ person_id=-1│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 監控服務     │
│ checkPeople │
│ Counting    │
└──────┬──────┘
       │
       ├─► 檢查 person_id === -1
       │
       ▼
┌─────────────┐
│ errorTracker│
│ recordError │
└──────┬──────┘
       │
       ├─► 查詢規則獲取 min_errors 閾值（預設 5 次）
       ├─► 累積錯誤次數
       ├─► 達到閾值時創建警報
       └─► 使用規則的 severity 和 message_template
       │
       ▼
┌─────────────┐
│ alertService│
│ createAlert │
└──────┬──────┘
       │
       ├─► 創建警報
       └─► WebSocket: alert:new
       │
       ▼
┌─────────────┐
│ 前端顯示     │
│ Toast 通知   │
└─────────────┘
```

---

## 核心機制

### 1. 事件序列邏輯

**目的**：確保統計準確性，避免重複計算

**實現**：

```javascript
// 使用 Map 追蹤每個人的最後事件類型
const lastEventType = new Map();

// 事件序列邏輯：確保先進後出
if (previousEventType === undefined || previousEventType !== eventType) {
  // 計數並更新最後事件類型
  if (eventType === "entry") {
    entryCount++;
  } else {
    exitCount++;
  }
  lastEventType.set(personId, eventType);
}
```

**效果**：

- ✅ 避免重複刷卡造成的統計錯誤
- ✅ 確保先進後出的邏輯
- ✅ 提高統計準確性

### 2. 批次查詢優化

**目的**：減少資料庫查詢次數，提高性能

**實現**：

- **批次取得人員 ID**：使用單一 SQL 查詢取代多個 API 呼叫
- **批次取得群組資訊**：使用單一 SQL 查詢
- **批次取得人員照片**：使用 SQL DISTINCT ON 查詢
- **批次取得工地資料**：統一查詢所有工地的記錄

**效果**：

- ✅ 減少資料庫查詢次數
- ✅ 提高查詢速度
- ✅ 降低資料庫負載

### 3. 防抖機制

**目的**：避免短時間內多次觸發資料重新載入

**實現**：

```typescript
// 防抖計時器
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// 收到事件後，不立即執行，而是設置計時器
debounceTimer = setTimeout(() => {
  // 執行回調（重新載入資料）
  onYscpEvent(data);
}, 500); // 500ms 防抖
```

**效果**：

- ✅ 減少 API 請求次數
- ✅ 提高系統性能
- ✅ 避免重複載入

### 4. 增量查詢機制

**目的**：只查詢新增的記錄，提高查詢效率

**實現**：

```javascript
// 查詢自上次檢查後的新記錄
const sql = `
  SELECT * FROM baseacs.slot_card_records
  WHERE is_deleted = false
    AND swip_card_rev_time > $1  -- 上次檢查時間
    AND swip_card_rev_time <= $2  -- 當前時間
  ORDER BY swip_card_rev_time ASC
`;
```

**效果**：

- ✅ 減少數據傳輸量
- ✅ 提高查詢速度
- ✅ 降低資料庫負載

---

## 技術細節

### 1. 數據結構

**地點配置**：

```typescript
interface PeopleCountingLocation {
  id?: string;
  name: string;
  locationType?: "people_counting";
  personGroupIds?: number[];      // 對應的 person_group.id 列表
  entryDoorId?: number;            // 入口設備 ID
  exitDoorId?: number;             // 出口設備 ID
  locationId?: number;             // 業務層的地點 ID
  region?: string;                 // 區域
  status?: "active" | "equipment_anomaly" | "intrusion_detected";
  entryCount?: number;             // 今日進場人數
  exitCount?: number;              // 今日出場人數
  units?: PeopleCountingUnit[];    // 關聯的單位
}
```

**人員信息**：

```typescript
interface PeopleCountingPersonnel {
  id: number;
  unitId: number;
  employeeId: string;
  name: string;
  photoUrl?: string;
  lastEntryTime?: string;          // 最近進場時間（完整格式）
  lastExitTime?: string;            // 最近出場時間（完整格式）
  lastEntryDate?: string;           // 最近進場日期
  entryTime?: string;               // 進場時間（時分秒）
  exitTime?: string;                // 離場時間（時分秒）
  isPresent?: boolean;              // 在場狀態
  isTodayEntry?: boolean;           // 是否為今日進場
}
```

**進出場記錄**：

```typescript
interface PeopleCountingLog {
  id: string | number;
  locationId: number;
  unitId: number;
  personnelId?: number;
  deviceId: number;
  eventType: "entry" | "exit" | "failed";
  employeeId?: string;
  personName?: string;
  deviceScreenshotUrl?: string;
  timestamp: string;
  unit?: PeopleCountingUnit;
  unitName?: string;
}
```

### 2. API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/people-counting/sites` | GET | 取得所有工地列表（含統計） |
| `/api/people-counting/sites/:id` | GET | 取得單一工地詳情 |
| `/api/people-counting/sites/:id/stats` | GET | 取得工地統計 |
| `/api/people-counting/sites/:id/logs` | GET | 取得工地進出場記錄 |
| `/api/people-counting/units/:id/personnel` | GET | 取得單位人員列表 |
| `/api/people-counting/locations` | GET | 取得地點列表（地點管理） |
| `/api/people-counting/locations/:id` | GET | 取得單一地點（地點管理） |
| `/api/people-counting/locations` | POST | 建立地點（地點管理） |
| `/api/people-counting/locations/:id` | PUT | 更新地點（地點管理） |
| `/api/people-counting/locations/:id` | DELETE | 刪除地點（地點管理） |

### 3. WebSocket 事件

| 事件名稱 | 觸發時機 | 數據格式 |
|---------|---------|---------|
| `yscp:event:alarm` | YSCP 警報事件（YSCP 系統已設定為只發送此類型） | `{ type: "alarm", data: {...}, timestamp: string }` |

**注意**：YSCP 系統已設定為只發送 `alarm` 類型的事件，因此前端只需監聽 `yscp:event:alarm` 事件。

### 4. 外部資料庫 Schema

**platform schema**：

- `person`：人員表
- `person_group`：單位表
- `person_head_pic`：人員照片表

**baseacs schema**：

- `slot_card_records`：刷卡記錄表
  - `person_id`：人員 ID（-1 表示未註冊）
  - `physical_id`：設備 ID（對應 entryDoorId/exitDoorId）
  - `swip_card_rev_time`：刷卡時間
  - `snap_pic_url`：設備截圖 URL
  - `is_deleted`：是否已刪除

---

## 測試與驗證

### 1. 後端測試

**統計計算測試**：

- ✅ 今日統計計算（進場/出場人數）
- ✅ 在場人數計算
- ✅ 事件序列邏輯（先進後出）
- ✅ 重複刷卡處理

**人員狀態測試**：

- ✅ 在場狀態判斷
- ✅ 今日進場判斷
- ✅ 進場/出場時間計算

**未註冊人員警報測試**：

- ✅ 錯誤累積機制
- ✅ 達到閾值時創建警報
- ✅ 警報訊息格式

### 2. 前端測試

**資料載入測試**：

- ✅ 地點列表載入
- ✅ 地點詳情載入
- ✅ 單位人員載入
- ✅ 進出場記錄載入

**WebSocket 監聽測試**：

- ✅ YSCP 事件監聽
- ✅ 防抖機制
- ✅ 資料重新載入

**狀態管理測試**：

- ✅ 狀態同步
- ✅ 資料更新
- ✅ 錯誤處理

### 3. 整合測試

**端到端測試**：

1. 刷卡事件 → YSCP 事件 → WebSocket 推送 → 前端重新載入 → 統計更新
2. 未註冊人員刷卡 → 錯誤累積 → 達到閾值 → 創建警報 → Toast 通知
3. 地點選擇 → 載入詳情 → 顯示統計 → 顯示人員列表 → 顯示記錄

**性能測試**：

- ✅ 批次查詢效果
- ✅ 防抖機制效果
- ✅ 增量查詢效果
- ✅ SQL 優化效果

---

## 總結

### 系統優勢

1. **實時性**：通過 WebSocket 接收 YSCP 事件，實時更新資料
2. **準確性**：使用事件序列邏輯，確保統計準確性
3. **性能優化**：批次查詢、SQL 優化、防抖機制
4. **統一管理**：整合地點管理系統，使用統一配置架構
5. **異常監控**：自動監控未註冊人員，創建警報

### 未來改進方向

1. **數據緩存**：考慮添加 Redis 緩存，提高查詢速度
2. **歷史統計**：提供歷史統計分析功能
3. **報表功能**：提供進出場報表和分析
4. **批量操作**：支持批量導入/導出人員資料

---

**文檔結束**

