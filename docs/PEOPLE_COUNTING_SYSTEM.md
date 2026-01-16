# 人流統計系統 - 完整技術文件

**建立日期**：2025-01-15  
**最後更新**：2025-01-15  
**系統狀態**：✅ 核心功能已完成

---

## 📋 目錄

1. [系統概述](#系統概述)
2. [資料結構與對應](#資料結構與對應)
3. [前後端職權分工](#前後端職權分工)
4. [資料流程架構](#資料流程架構)
5. [前端實作架構](#前端實作架構)
6. [API 整合狀況](#api-整合狀況)
7. [UI 組件架構](#ui-組件架構)
8. [已知問題與優化建議](#已知問題與優化建議)
9. [待實作項目](#待實作項目)

---

## 系統概述

人流統計系統是一個基於外部資料庫的即時人員進出場監控系統，主要功能包括：

- **工地管理**：多工地監控，顯示進場/出場統計
- **單位管理**：顯示各進場單位的人員列表
- **人員追蹤**：顯示人員在場狀態、進出場記錄
- **記錄查詢**：查詢歷史進出場記錄

### 資料來源

系統從以下外部資料庫表取得資料：

- `platform.person` - 人員資料
- `platform.person_group` - 人員群組（進場單位）
- `platform.person_head_pic` - 人員照片
- `baseacs.slot_card_records` - 刷卡記錄
- `deviceaccess.door` - 門禁設備（待整合）

---

## 資料結構與對應

### 1. platform.person_group（人員群組/單位）

**實際資料結構**（根據 output 資料）：

```json
{
	"id": 1,
	"name": "遠岫科技",
	"is_deleted": 0
}
```

**對應前端類型**：`PeopleCountingUnit`

**關鍵欄位**：

- `id`: 單位 ID
- `name`: 單位名稱
- `is_deleted`: 是否已刪除（0=未刪除，1=已刪除）

---

### 2. platform.person（人員資料）

**實際資料結構**（根據 output 資料）：

```json
{
	"id": 3,
	"person_group_id": 34,
	"person_type": 0,
	"full_name": "Jerry"
}
```

**對應前端類型**：`PeopleCountingPersonnel`

**關鍵欄位**：

- `id`: 人員 ID（作為工號使用）
- `person_group_id`: 所屬單位 ID
- `person_type`: 人員類型（0=一般人員，1=訪客，2=黑名單）
- `full_name`: 完整姓名

**注意事項**：

- ❌ **沒有 `person_code` 欄位**：使用 `person.id` 作為工號
- ❌ **沒有 `card_no` 欄位**：卡片號碼需從其他來源取得

---

### 3. platform.person_head_pic（人員照片）

**實際資料結構**：

```json
{
	"id": 1,
	"person_id": 3,
	"standard_head_portrait": "base64編碼的字串",
	"thumbnail_head_portrait": "base64編碼的字串"
}
```

**對應前端類型**：`PeopleCountingPersonnel.photoUrl`

**處理方式**：

- Base64 解碼為 `data:image/jpeg;base64,{base64}` 格式（前端處理）

---

### 4. baseacs.slot_card_records（刷卡記錄）

**實際資料結構**（根據 output 資料）：

```json
{
	"person_id": 7,
	"swip_card_rev_time": "2026-01-14T06:42:25.000Z",
	"snap_pic_url": "Vsm://PHQG#20260114#20260114_123530965.d:39953581:85637",
	"is_registered": true
}
```

**對應前端類型**：`PeopleCountingLog`

**關鍵欄位**：

- `person_id`: 人員 ID（-1 表示未註冊人員）
- `swip_card_rev_time`: 刷卡時間（ISO 8601 格式）
- `snap_pic_url`: 設備截圖 URL
- `is_registered`: 是否為已註冊人員

**資料限制**：

- ❌ **沒有 `id` 欄位**：需要生成唯一識別碼
- ❌ **沒有 `message_key` 欄位**：無法直接判斷是 entry 還是 exit
- ❌ **沒有 `full_name` 欄位**：需要透過 `person_id` 關聯 `person` 表取得

---

### 5. 資料關聯圖

```
platform.person_group (單位)
  └─ id ───────────────┐
                        │
platform.person (人員)   │
  ├─ id ────────────────┤─┐
  └─ person_group_id ───┘ │
                           │
baseacs.slot_card_records  │
  └─ person_id ────────────┘
                           │
platform.person_head_pic   │
  └─ person_id ────────────┘
```

---

## 前後端職權分工

### 後端職責 ✅

#### 1. 資料提供

- ✅ 提供原始資料查詢 API（`/api/external-data/:schema/:table`）
- ✅ 提供資料關聯查詢（JOIN 查詢，減少前端 API 呼叫次數）
- ✅ 提供資料篩選和分頁功能

#### 2. 業務邏輯處理（建議後端處理）

- ⚠️ **統計計算**：今日進場/出場人數、當前在場人數
- ⚠️ **事件類型判斷**：判斷刷卡記錄是 entry 還是 exit
- ⚠️ **資料關聯**：將 `slot_card_records` 與 `person`、`person_group` 關聯
- ⚠️ **唯一 ID 生成**：為 `slot_card_records` 生成唯一識別碼

#### 3. 資料轉換（建議後端處理）

- ⚠️ **記錄格式轉換**：將原始記錄轉換為前端需要的格式（含關聯資料）
- ⚠️ **時間格式化**：將 ISO 8601 時間轉換為前端顯示格式

### 前端職責 ✅

#### 1. 資料展示

- ✅ 接收後端處理後的資料並顯示
- ✅ UI 組件渲染和互動
- ✅ 響應式設計和佈局

#### 2. 簡單資料轉換

- ✅ **Base64 圖片處理**：將 Base64 字串轉換為 `data:image/jpeg;base64,{base64}` 格式
- ✅ **時間格式化**：如果需要，將後端提供的時間格式化為中文顯示（如果後端未提供）

#### 3. 狀態管理

- ✅ 前端狀態管理（選中的工地、單位等）
- ✅ 快取機制（工地名稱快取等）
- ✅ 載入狀態和錯誤處理

### 職權分工建議

| 功能                | 當前實作          | 建議改進                                               |
| ------------------- | ----------------- | ------------------------------------------------------ |
| **統計計算**        | 前端計算          | ⚠️ **應由後端處理**：減少前端計算負擔，提高準確性      |
| **事件類型判斷**    | 前端推斷          | ⚠️ **應由後端處理**：業務邏輯應在後端，前端只負責顯示  |
| **資料關聯**        | 前端多個 API 呼叫 | ⚠️ **應由後端處理**：後端提供 JOIN 查詢，減少 API 呼叫 |
| **唯一 ID 生成**    | 前端生成          | ⚠️ **應由後端處理**：後端生成並返回                    |
| **Base64 圖片處理** | 前端處理          | ✅ **前端處理**：合理，屬於展示層處理                  |
| **時間格式化**      | 前端處理          | ⚠️ **可選**：後端提供格式化時間，前端直接顯示          |

---

## 資料流程架構

### 理想架構（建議）

```
┌─────────────────────────────────────────────────────────────┐
│                        後端                                  │
├─────────────────────────────────────────────────────────────┤
│  1. 外部資料庫查詢                                           │
│     └─> 查詢 platform.person, person_group, slot_card_records│
│                                                                 │
│  2. 資料關聯處理（JOIN）                                      │
│     └─> 將 slot_card_records 與 person、person_group 關聯    │
│                                                                 │
│  3. 業務邏輯處理                                             │
│     ├─> 判斷事件類型（entry/exit）                           │
│     ├─> 計算統計（進場/出場人數、當前在場人數）               │
│     └─> 生成唯一 ID                                          │
│                                                                 │
│  4. 資料格式化                                               │
│     ├─> 時間格式化                                           │
│     └─> 資料結構轉換                                         │
│                                                                 │
│  5. 返回處理後的資料                                         │
│     └─> GET /api/people-counting/sites                       │
│         GET /api/people-counting/sites/:id/stats            │
│         GET /api/people-counting/sites/:id/logs             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        前端                                  │
├─────────────────────────────────────────────────────────────┤
│  1. API 呼叫                                                │
│     └─> 呼叫後端 API 取得處理後的資料                        │
│                                                                 │
│  2. 簡單資料轉換                                             │
│     └─> Base64 圖片處理（data URL 轉換）                    │
│                                                                 │
│  3. 狀態管理                                                 │
│     └─> 管理選中的工地、單位等狀態                            │
│                                                                 │
│  4. UI 渲染                                                 │
│     └─> 將資料顯示在 UI 組件中                               │
└─────────────────────────────────────────────────────────────┘
```

### 當前架構（需要優化）

```
┌─────────────────────────────────────────────────────────────┐
│                        後端                                  │
├─────────────────────────────────────────────────────────────┤
│  僅提供原始資料查詢 API                                      │
│  GET /api/external-data/platform/person                     │
│  GET /api/external-data/platform/person_group               │
│  GET /api/external-data/baseacs/slot_card_records            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        前端                                  │
├─────────────────────────────────────────────────────────────┤
│  1. 多個 API 呼叫取得原始資料                                │
│  2. 前端進行資料關聯（建立映射表）                           │
│  3. 前端計算統計（進場/出場人數）                            │
│  4. 前端判斷事件類型（entry/exit）                           │
│  5. 前端生成唯一 ID                                          │
│  6. 前端處理 Base64 圖片                                     │
│  7. UI 渲染                                                 │
└─────────────────────────────────────────────────────────────┘
```

**問題**：

- ❌ 前端承擔過多業務邏輯
- ❌ 多個 API 呼叫造成效能問題
- ❌ 統計計算可能不準確
- ❌ 事件類型判斷邏輯複雜且可能出錯

---

## 前端實作架構

### 檔案結構

```
app/
├── composables/systems/
│   ├── useExternalDataApi.ts                    # 外部資料 API 基礎（原始資料）
│   ├── usePeopleCountingApi.ts                 # 主入口（應改為呼叫後端處理後的 API）
│   ├── usePeopleCountingLocationApi.ts          # 地點管理 API
│   └── peopleCounting/
│       ├── usePeopleCountingSiteApi.ts          # 工地相關 API（需簡化）
│       ├── usePeopleCountingPersonnelApi.ts    # 人員管理 API（需簡化）
│       └── usePeopleCountingEntryApi.ts         # 進出場記錄 API（需簡化）
├── utils/
│   └── peopleCountingAdapter.ts                # 資料轉換工具（應簡化，只處理 Base64）
├── types/
│   └── peopleCounting.ts                       # 類型定義
├── pages/construction-monitoring/
│   └── people-counting.vue                     # 主頁面
└── components/people-counting/
    ├── SiteStatsPanel.vue                      # 統計面板
    ├── SiteDetailPanel.vue                     # 詳情面板
    ├── SiteOverviewCard.vue                    # 工地卡片
    ├── UnitList.vue                            # 單位列表
    ├── PersonnelList.vue                       # 人員名單
    └── EntryExitLogTable.vue                   # 進出場記錄表
```

### 建議的 API 結構（後端應提供）

```typescript
// 1. 取得所有工地列表（含統計）
GET /api/people-counting/sites
Response: {
  sites: Array<{
    id: number;
    name: string;
    entryCount: number;      // 今日進場人數（後端計算）
    exitCount: number;       // 今日出場人數（後端計算）
    units: Array<{
      id: number;
      name: string;
      currentCount: number;  // 當前在場人數（後端計算）
      totalCount: number;    // 總人數（後端計算）
    }>;
  }>;
}

// 2. 取得工地詳情
GET /api/people-counting/sites/:id
Response: {
  id: number;
  name: string;
  entryCount: number;
  exitCount: number;
  units: Array<PeopleCountingUnit>;
}

// 3. 取得工地統計
GET /api/people-counting/sites/:id/stats
Response: {
  entryCount: number;
  exitCount: number;
  currentCount: number;
}

// 4. 取得工地進出場記錄（已關聯 person 和 person_group）
GET /api/people-counting/sites/:id/logs?limit=5&unitId=34
Response: {
  logs: Array<{
    id: string;              // 後端生成的唯一 ID
    personId: number;
    personName: string;      // 已關聯 person.full_name
    unitName: string;        // 已關聯 person_group.name
    eventType: "entry" | "exit";  // 後端判斷
    timestamp: string;       // 格式化後的時間
    deviceScreenshotUrl: string;
  }>;
}

// 5. 取得單位人員列表（已關聯照片和狀態）
GET /api/people-counting/units/:id/personnel
Response: {
  personnel: Array<{
    id: number;
    employeeId: string;      // person.id
    name: string;            // person.full_name
    photoUrl: string;        // Base64 字串（前端轉換為 data URL）
    isInside: boolean;       // 後端計算
    lastEntryTime: string;   // 格式化後的時間
    lastExitTime: string;    // 格式化後的時間
  }>;
}
```

---

## API 整合狀況

### ✅ 已實作的功能

#### 1. 外部資料 API 基礎架構

**檔案**：`app/composables/systems/useExternalDataApi.ts`

- ✅ 通用外部資料 API Composable
- ✅ 支援 `getList()`, `getById()`, `getCount()` 方法
- ✅ Platform Schema 專用方法：
  - `getPersons()` - 取得人員列表
  - `getPersonGroups()` - 取得人員群組列表
  - `getPersonHeadPics()` - 取得人員頭像
- ✅ Baseacs Schema 專用方法：
  - `getSlotCardRecords()` - 取得刷卡記錄

**用途**：目前用於取得原始資料，後續應改為呼叫後端處理後的 API

#### 2. 人流統計系統 API（當前實作）

**usePeopleCountingSiteApi.ts**：

- ✅ `getSites()` - 取得所有工地列表（前端計算統計）
- ✅ `getSiteDetail()` - 取得單一工地詳情
- ✅ `getSiteStats()` - 取得工地統計（前端計算）
- ✅ `getSiteUnits()` - 取得工地單位列表
- ⚠️ `calculateTodayStats()` - **應由後端處理**
- ⚠️ `calculateUnitCurrentCount()` - **應由後端處理**

**usePeopleCountingPersonnelApi.ts**：

- ✅ `getUnitPersonnel()` - 取得單位人員列表
  - 批次查詢人員頭像
  - ⚠️ 計算人員進出場時間和狀態（**應由後端處理**）

**usePeopleCountingEntryApi.ts**：

- ✅ `getSiteLogs()` - 取得工地進出場記錄
  - 支援按單位過濾
  - ⚠️ 批次建立 person_id -> person 映射表（**應由後端處理**）
  - ⚠️ 自動判斷事件類型（entry/exit）（**應由後端處理**）

#### 3. 地點管理 API

**檔案**：`app/composables/systems/usePeopleCountingLocationApi.ts`

- ✅ 樓層管理 API（透過統一地點管理 API）
- ✅ 地點管理 API（獨立 API `/api/people-counting/locations`）
- ✅ 工地名稱查詢 API（含快取機制）

#### 4. 資料轉換工具

**檔案**：`app/utils/peopleCountingAdapter.ts`

- ✅ `transformPerson()` - 轉換外部人員資料（含 Base64 圖片處理）
- ⚠️ `generateRecordId()` - **應由後端處理**
- ⚠️ `parseEventType()` - **應由後端處理**
- ✅ `sortRecordsByTime()` - 按時間排序記錄（如果後端未排序）
- ✅ `buildUnitNameMap()` - 建立 person_group_id -> name 映射表（如果後端未關聯）

### ❌ 缺少的功能

#### 1. 後端業務邏輯 API（建議新增）

**應由後端提供的 API**：

- ❌ `GET /api/people-counting/sites` - 取得所有工地列表（含統計）
- ❌ `GET /api/people-counting/sites/:id/stats` - 取得工地統計
- ❌ `GET /api/people-counting/sites/:id/logs` - 取得工地進出場記錄（已關聯）
- ❌ `GET /api/people-counting/units/:id/personnel` - 取得單位人員列表（含狀態）

#### 2. 系統分類 API 整合

**後端已提供的新 API**：

- `GET /api/external-data/systems` - 取得所有系統及其資料表
- `GET /api/external-data/systems/:systemType/tables` - 取得指定系統的資料表
- `GET /api/external-data/tables/:schema/:table/systems` - 取得資料表被哪些系統使用

**前端缺少**：

- ❌ 沒有在 `useExternalDataApi.ts` 中加入系統查詢方法

#### 3. 門禁設備 API 整合

**後端已提供的資料表**：

- `deviceaccess.door` - 門禁設備資料

**前端現況**：

- ✅ 類型定義中已包含 `entryDoorId` 和 `exitDoorId`
- ✅ 地點管理 API 已支援設定 `entryDoorId` 和 `exitDoorId`
- ❌ **缺少**：沒有使用 `deviceaccess.door` 的 API 查詢門禁設備列表

---

## UI 組件架構

### 頁面佈局

```
┌─────────────────────────────────────────────────────────────┐
│                     Header                                   │
├──────────────────────────────┬──────────────────────────────┤
│                              │                              │
│  左側：選中工地詳情           │  右側：總覽列表               │
│  (flex-[1.2])                │  (flex-[0.8])                │
│                              │                              │
│  ┌────────────┬────────────┐ │  ┌─────────────────────────┐ │
│  │ 左側-左     │ 左側-右     │ │  │ 總覽                    │ │
│  │            │            │ │  │                         │ │
│  │ StatsPanel │ DetailPanel│ │  │ - 工地卡片列表           │ │
│  │            │            │ │  │                         │ │
│  │ - 進/出場  │ - 進場單位 │ │  │                         │ │
│  │   人數     │   列表     │ │  │                         │ │
│  │ - 記錄表   │ - 人員名單 │ │  │                         │ │
│  └────────────┴────────────┘ │  └─────────────────────────┘ │
└──────────────────────────────┴──────────────────────────────┘
```

### 組件清單

#### ✅ 已完成組件

1. **`SiteStatsPanel.vue`** - 左側左區塊
   - 顯示進場/出場人數（應從後端 API 取得）
   - 顯示進出場記錄表（最新 5 筆，應從後端 API 取得）

2. **`SiteDetailPanel.vue`** - 左側右區塊
   - 顯示進場單位列表
   - 顯示選中單位的人員名單

3. **`EntryExitLogTable.vue`** - 進出場記錄表
   - ✅ 支援顯示設備截圖、進場單位、工號、姓名、事件、時間
   - ✅ 預設限制顯示最新 5 筆

4. **`PersonnelList.vue`** - 人員名單
   - ✅ 在場狀態用卡片透明度呈現
   - ✅ 顯示最近進場日期、進場時間、離場時間

5. **`SiteOverviewCard.vue`** - 工地卡片
   - ✅ 顯示工地名稱、狀態指示器、進場/出場人數
   - ✅ 顯示關聯單位標籤列表

6. **`UnitList.vue`** - 進場單位列表
   - ✅ 顯示單位名稱和當前/總人數

---

## 已知問題與優化建議

### 問題 1：前端承擔過多業務邏輯

**影響**：

- 前端程式碼複雜
- 統計計算可能不準確
- 多個 API 呼叫造成效能問題

**解決方案**：

- ⚠️ **後端應提供業務邏輯 API**：統計計算、事件類型判斷應由後端處理
- ⚠️ **後端應提供資料關聯 API**：減少前端 API 呼叫次數

---

### 問題 2：slot_card_records 沒有 id 欄位

**影響**：無法唯一識別記錄

**解決方案**：

- ⚠️ **應由後端處理**：後端生成唯一 ID 並返回
- ✅ 當前前端使用 `person_id + timestamp` 組合生成（臨時方案）

---

### 問題 3：slot_card_records 沒有 message_key 欄位

**影響**：無法直接判斷是 entry 還是 exit

**解決方案**：

- ⚠️ **應由後端處理**：後端根據業務邏輯判斷事件類型
- ✅ 當前前端使用智能判斷邏輯（臨時方案）

---

### 問題 4：資料關聯查詢效能

**影響**：大量 API 請求，載入速度慢

**解決方案**：

- ⚠️ **應由後端處理**：後端提供 JOIN 查詢，一次返回關聯資料
- ✅ 當前前端使用批次查詢和快取機制（臨時方案）

---

### 問題 5：統計計算準確性

**影響**：進出場統計可能不準確

**解決方案**：

- ⚠️ **應由後端處理**：後端統一計算統計，確保準確性
- ✅ 當前前端計算（臨時方案）

---

## 待實作項目

### 🔴 高優先級（後端優先）

1. **後端業務邏輯 API**
   - 建立 `/api/people-counting/sites` API（含統計計算）
   - 建立 `/api/people-counting/sites/:id/stats` API
   - 建立 `/api/people-counting/sites/:id/logs` API（含資料關聯和事件類型判斷）
   - 建立 `/api/people-counting/units/:id/personnel` API（含狀態計算）
   - 預計時間：後端 8-12 小時

2. **前端 API 簡化**
   - 修改前端 API 呼叫，改為使用後端業務邏輯 API
   - 移除前端統計計算邏輯
   - 移除前端事件類型判斷邏輯
   - 簡化資料轉換工具
   - 預計時間：前端 4-6 小時

### 🟡 中優先級

3. **擴展 useExternalDataApi**
   - 加入系統查詢方法（`getSystems()`, `getSystemTables()`, `getTableSystems()`）
   - 加入門禁設備查詢方法（`getDoors()`, `getDoorById()`）
   - 預計時間：1-2 小時

4. **整合門禁設備選擇**
   - 在工地配置中加入設備選擇
   - 修改相關的 API 呼叫
   - 預計時間：2-3 小時

### 🟢 低優先級

5. **地點管理系統優化**
   - 建立人流統計專屬的地點管理系統
   - 從地點管理系統取得工地名稱
   - 預計時間：8-10 小時

6. **效能優化**
   - 考慮加入更完整的快取機制
   - 優化資料載入順序
   - 照片 base64 解碼效能優化
   - 預計時間：4-6 小時

---

## 總結

### 實作狀態總覽

✅ **核心功能已完成**：所有主要組件和功能都已實作完成，頁面可以正常運作。

### 已完成項目 ✅

1. **整體佈局** ✅
   - ✅ 兩欄佈局（與 `environment.vue` 一致）
   - ✅ 左側：左右兩區塊結構
   - ✅ 右側：總覽列表
   - ✅ 側邊欄收縮功能

2. **組件實作** ✅
   - ✅ 所有 UI 組件已完成

3. **資料對應** ✅
   - ✅ 資料結構對應已完成

4. **API 實作** ✅
   - ✅ 外部資料 API 基礎架構已完成
   - ⚠️ 業務邏輯 API 需由後端提供

### 需要優化的項目 ⚠️

1. **職權分工** ⚠️
   - 當前：前端承擔過多業務邏輯
   - 建議：後端處理業務邏輯，前端只負責展示

2. **API 架構** ⚠️
   - 當前：前端多個 API 呼叫 + 前端計算
   - 建議：後端提供業務邏輯 API，前端單一 API 呼叫

3. **效能優化** ⚠️
   - 當前：多個 API 呼叫造成效能問題
   - 建議：後端提供 JOIN 查詢，減少 API 呼叫

---

**文件建立日期**：2025-01-15  
**最後更新**：2025-01-15
