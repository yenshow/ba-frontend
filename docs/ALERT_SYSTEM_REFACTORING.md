# 警報系統架構與實現說明

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

警報系統是一個**前後端統一**的監控與通知系統，負責：

1. **規則管理**：從資料庫獲取警報規則，用於判斷感測器狀態
2. **狀態顯示**：根據規則動態顯示感測器參數狀態（正常/注意/警報）
3. **實時通知**：通過 WebSocket 和輪詢雙路徑，實時推送警報信息
4. **Toast 顯示**：智能管理 Toast 通知，支持更新、去重和優先級管理
5. **交互功能**：點擊 Toast 可跳轉到警報詳情頁面

### 設計原則

- ✅ **前後端一致**：前端使用與後端相同的規則，確保顯示狀態與實際警報記錄一致
- ✅ **動態配置**：通過修改資料庫規則調整閾值，無需修改代碼
- ✅ **實時性**：WebSocket 優先，輪詢作為後備，確保即時通知
- ✅ **性能優化**：規則緩存、增量查詢、防抖機制
- ✅ **用戶體驗**：智能去重、優先級管理、詳細訊息格式

---

## 系統架構

### 整體架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                        後端系統                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  資料庫       │    │  警報服務     │    │  WebSocket   │  │
│  │              │    │              │    │   服務       │  │
│  │ - alerts     │◄───┤ - createAlert│───►│ - emitAlert  │  │
│  │ - alert_rules│    │ - updateAlert │    │   New       │  │
│  │              │    │ - getAlerts   │    │ - emitAlert  │  │
│  └──────────────┘    └──────────────┘    │   Updated    │  │
│         ▲                    │             │ - emitAlert  │  │
│         │                    │             │   Count     │  │
│         │                    ▼             └──────────────┘  │
│  ┌──────────────┐    ┌──────────────┐                      │
│  │  規則服務     │    │  監控服務     │                      │
│  │              │    │              │                      │
│  │ - getRules   │    │ - 環境監控    │                      │
│  │ - evaluate   │    │ - 設備監控    │                      │
│  └──────────────┘    └──────────────┘                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP API / WebSocket
                              │
┌─────────────────────────────────────────────────────────────┐
│                        前端系統                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  規則管理     │    │  警報監聽     │    │  Toast 管理   │  │
│  │              │    │              │    │              │  │
│  │ useAlertRules│◄───┤ useAlert     │───►│ useToast     │  │
│  │              │    │ Monitor      │    │              │  │
│  │ - getRules   │    │ - WebSocket  │    │ - showToast  │  │
│  │ - evaluate   │    │ - Polling    │    │ - updateToast│  │
│  │ - getStatus  │    │ - Priority   │    │ - removeToast│  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         │                    │                    ▼          │
│         │                    │            ┌──────────────┐  │
│         │                    │            │ ToastContainer│  │
│         │                    │            │   (UI)       │  │
│         │                    │            └──────────────┘  │
│         │                    │                              │
│         ▼                    ▼                              │
│  ┌──────────────┐    ┌──────────────┐                      │
│  │  頁面組件     │    │  警報列表     │                      │
│  │              │    │              │                      │
│  │ environment  │    │ alert-log    │                      │
│  │ lighting     │    │              │                      │
│  └──────────────┘    └──────────────┘                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 模組劃分

#### 後端模組

| 模組 | 文件 | 職責 |
|------|------|------|
| **警報服務** | `alertService.js` | 警報 CRUD、狀態管理、WebSocket 推送 |
| **規則服務** | `alertRuleService.js` | 規則查詢、條件評估、緩存管理 |
| **WebSocket 服務** | `websocketService.js` | 事件推送、連接管理 |
| **API 路由** | `alertRoutes.js` | REST API 端點 |

#### 前端模組

| 模組 | 文件 | 職責 |
|------|------|------|
| **警報監聽** | `useAlertMonitor.ts` | 主入口、協調 WebSocket 和輪詢 |
| **WebSocket 監聽** | `useAlertWebSocket.ts` | WebSocket 事件處理 |
| **輪詢監聽** | `useAlertPolling.ts` | 增量查詢、後備機制 |
| **規則管理** | `useAlertRules.ts` | 規則獲取、緩存、狀態判斷 |
| **Toast 管理** | `useToast.ts` | Toast 顯示、更新、去重 |
| **UI 組件** | `ToastContainer.vue` | Toast 顯示組件 |

---

## 後端實現

### 1. 警報服務 (`alertService.js`)

#### 核心功能

**創建警報流程**：

```javascript
createAlert(alertData) {
  1. 驗證參數（source, source_id, alert_type, severity, message）
  2. 檢查是否已被忽視（findIgnoredAlert）
  3. 查詢現有 active 警報（findExistingActiveAlert，按天限制）
  4. 如果存在：
     - 檢查是否需要更新（severity 升級、message 變化）
     - 更新警報內容（updateAlertContent）
     - 推送 WebSocket 事件：alert:updated (active -> active)
  5. 如果不存在：
     - 創建新警報（INSERT INTO alerts）
     - 推送 WebSocket 事件：alert:new
  6. 推送未解決警報數量（防抖 500ms）
}
```

**關鍵特性**：

- ✅ **按天限制**：同一天同一來源同一類型只會有一個 active 警報
- ✅ **參數匹配**：閾值警報支持通過 message 匹配參數（PM2.5、PM10 等）
- ✅ **自動更新**：如果警報已存在，自動更新 severity 和 message
- ✅ **並發處理**：處理唯一約束衝突，確保數據一致性

#### 狀態管理

**警報狀態**：

- `active`：活躍警報，需要處理
- `resolved`：已解決，系統自動或手動標記
- `ignored`：已忽視，不再顯示相同來源和類型的警報

**狀態變更流程**：

```javascript
updateAlertStatus(sourceId, source, alertType, newStatus, userId) {
  1. 查詢匹配的警報（批量處理）
  2. 更新狀態欄位（updated_at, ignored_at 等；解決時間由 status=resolved 時的 updated_at 表示）
  3. 推送 WebSocket 事件：alert:updated (oldStatus -> newStatus)
  4. 推送未解決警報數量
}
```

### 2. 規則服務 (`alertRuleService.js`)

#### 規則查詢

**API 端點**：`GET /api/alerts/rules`

**參數**：
- `source` (必填)：警報來源，如 `environment`
- `alert_type` (可選)：警報類型，如 `threshold`
- `parameter` (可選)：參數名稱，如 `pm25`

**回應格式**：

```json
{
  "success": true,
  "data": {
    "rules": [
      {
        "id": 1,
        "source": "environment",
        "alert_type": "threshold",
        "condition_type": "threshold",
        "severity": "warning",
        "condition_config": {
          "parameter": "pm25",
          "operator": ">",
          "value": 50,
          "unit": "µg/m³"
        },
        "message_template": "{parameter} 超過閾值：{value}{unit}",
        "enabled": true
      }
    ]
  }
}
```

#### 規則緩存

- **緩存策略**：規則寫入資料庫後就是固定的，可以永久緩存
- **緩存鍵**：`source`（如 `environment`）
- **清除時機**：規則更新時手動清除

### 3. WebSocket 服務 (`websocketService.js`)

#### 事件類型

| 事件名稱 | 觸發時機 | 數據格式 |
|---------|---------|---------|
| `alert:new` | 新警報創建 | `Alert` 對象 |
| `alert:updated` | 警報狀態或內容更新 | `{ alert, oldStatus, newStatus, timestamp }` |
| `alert:count` | 未解決警報數量變化 | `{ count, timestamp }` |

#### 推送時機

1. **新警報創建**：`createAlert()` 成功後立即推送
2. **警報更新**：
   - 狀態變更：`active` ↔ `resolved/ignored`
   - 內容更新：`active -> active`（severity 升級、message 變化）
3. **數量更新**：防抖 500ms，避免頻繁推送

---

## 前端實現

### 1. 警報監聽 (`useAlertMonitor.ts`)

#### 架構設計

```
useAlertMonitor (主入口)
├── useAlertWebSocket (WebSocket 監聽)
├── useAlertPolling (輪詢監聽)
└── useUnresolvedAlertCount (數量管理)
```

#### 監聽策略

**智能切換機制**：

1. **初始載入**：使用 REST API 獲取當前警報列表
2. **WebSocket 模式**（優先）：
   - 建立連接
   - 監聽 `alert:new` 和 `alert:updated` 事件
   - 連接成功時停止輪詢
3. **輪詢模式**（後備）：
   - WebSocket 斷線時自動啟動
   - 使用增量查詢（`updated_after`）優化
   - 間隔：30 秒（可配置）

#### 優先級過濾

**優先級定義**：

| 警報類型 | 優先級 | 說明 |
|---------|--------|------|
| `offline` | HIGH | 設備離線 |
| `error` | HIGH | 系統錯誤 |
| `threshold` | MEDIUM | 閾值超標 |
| 其他 | LOW | 低優先級 |

**過濾規則**：

- 如果當前有更高優先級的錯誤，忽略低優先級警報
- 特殊規則：連線錯誤時，不處理數值錯誤

### 2. Toast 管理

#### Toast 類型映射

| Alert Severity | Toast Type | 顏色 | 說明 |
|---------------|------------|------|------|
| `warning` | `warning` | 黃色 | 注意級別 |
| `error` | `error` | 紅色 | 錯誤級別 |
| `critical` | `error` | 紅色 | 嚴重級別 |

#### 去重機制

**策略**：

1. **有 alertId**：優先使用 `alertId` 匹配，找到則更新現有 Toast
2. **無 alertId**：使用 `message + type` 匹配（向後兼容）
3. **非持久**：5 秒內不重複顯示相同訊息

**效果**：

- ✅ 正確識別同一警報的更新
- ✅ 不會創建重複的 Toast
- ✅ 自動更新 Toast 內容（severity/message 變化）

#### 數量限制

- **最大顯示數量**：8 個
- **優先級**：`critical` > `error` > `warning`
- **替換機制**：critical 級別可以替換低優先級警報

**處理邏輯**：

```typescript
if (currentToastCount >= MAX_ALERT_TOASTS) {
  if (alert.severity === "critical") {
    // 替換優先級最低的 Toast
    const lowestPriorityAlertId = findLowestPriorityToast();
    if (lowestPriorityAlertId) {
      removeAlertToast(lowestPriorityAlertId);
    }
  } else {
    // 跳過顯示
    return;
  }
}
```

#### Toast 訊息格式

**詳細格式**：

```
[嚴重] 環境系統 - 展廳 1F
PM2.5 超過閾值：51µg/m³
10:18
```

**格式說明**：

- 第一行：嚴重程度標示 + 來源系統 + 位置資訊
- 第二行：詳細訊息
- 第三行：時間戳（HH:mm）

### 3. 規則管理 (`useAlertRules.ts`)

#### 規則獲取

**緩存機制**：

- 使用 `Map` 結構緩存規則
- 緩存鍵格式：`${source}:${alertType}`
- 支持手動清除緩存

**使用範例**：

```typescript
const { getRules, getStatusText } = useAlertRules();
const alertRules = ref<AlertRule[]>([]);

// 載入規則
alertRules.value = await getRules("environment", "threshold");

// 判斷狀態
const status = getStatusText("pm25", 55, alertRules.value);
// 返回："注意" 或 "警報" 或 "正常"
```

#### 狀態判斷邏輯

**評估流程**：

1. 過濾出該參數的規則
2. 按嚴重程度排序（critical < error < warning）
3. 檢查每個規則，返回第一個匹配的（最嚴重的）
4. 根據嚴重程度返回狀態文字

**狀態映射**：

| 規則 Severity | 狀態文字 |
|--------------|---------|
| `critical` | "警報" |
| `error` | "警報" |
| `warning` | "注意" |
| 無匹配規則 | "正常" |

---

## 數據流與交互

### 1. 警報創建流程

```
┌─────────────┐
│  監控服務    │
│ (環境/設備)  │
└──────┬──────┘
       │ 檢測到異常
       ▼
┌─────────────┐
│ alertService│
│ createAlert │
└──────┬──────┘
       │
       ├─► 檢查是否已忽視
       ├─► 查詢現有 active 警報
       │
       ├─► [存在] 更新警報內容
       │   └─► WebSocket: alert:updated
       │
       └─► [不存在] 創建新警報
           └─► WebSocket: alert:new
               │
               ▼
       ┌─────────────┐
       │ 前端監聽    │
       │ useAlert    │
       │ Monitor     │
       └──────┬──────┘
              │
              ├─► 優先級過濾
              ├─► 檢查是否為今日
              └─► 顯示 Toast
```

### 2. 規則載入流程

```
┌─────────────┐
│  頁面載入    │
│ environment  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ useAlertRules│
│ getRules     │
└──────┬──────┘
       │
       ├─► 檢查緩存
       │   └─► [命中] 返回緩存
       │
       └─► [未命中] API 請求
           GET /api/alerts/rules
           │
           ▼
       ┌─────────────┐
       │ alertRule    │
       │ Service      │
       └──────┬──────┘
              │
              ├─► 查詢資料庫
              ├─► 存入緩存
              └─► 返回規則
                  │
                  ▼
           ┌─────────────┐
           │ 狀態判斷     │
           │ getStatusText│
           └─────────────┘
```

### 3. Toast 更新流程

```
┌─────────────┐
│ WebSocket    │
│ alert:updated│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ handleAlert │
│ Updated     │
└──────┬──────┘
       │
       ├─► active -> resolved/ignored
       │   └─► removeAlertToast
       │
       ├─► resolved/ignored -> active
       │   └─► showAlertNotification
       │
       └─► active -> active
           ├─► 更新現有 Toast 內容
           └─► 更新嚴重程度映射
```

### 4. 輪詢檢查流程

```
┌─────────────┐
│ 輪詢觸發     │
│ (30秒間隔)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ checkNew    │
│ Alerts      │
└──────┬──────┘
       │
       ├─► 構建增量查詢
       │   - status: active
       │   - start_date: 今日開始
       │   - updated_after: 上次檢查時間
       │
       ▼
┌─────────────┐
│ API 請求     │
│ GET /alerts  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 處理結果     │
└──────┬──────┘
       │
       ├─► 優先級過濾
       ├─► 檢查現有 Toast
       │   └─► [存在] 更新內容
       │   └─► [不存在] 顯示新 Toast
       │
       └─► 移除已解決的 Toast
```

---

## 核心機制

### 1. 按天限制機制

**目的**：確保同一天同一來源同一類型只會有一個 active 警報

**實現**：

- 後端：查詢現有 active 警報時，限制在當天範圍內
- 前端：只顯示今日創建的警報

**效果**：

- ✅ 避免重複警報
- ✅ 簡化警報管理
- ✅ 提高查詢效率

### 2. 增量查詢機制

**目的**：優化輪詢效率，只獲取更新的警報

**實現**：

```typescript
const filters: AlertFilters = {
  status: "active",
  start_date: todayStart.toISOString(),
  updated_after: lastCheckTime.value?.toISOString(), // 增量查詢
  limit: 50
};
```

**效果**：

- ✅ 減少數據傳輸量
- ✅ 提高查詢速度
- ✅ 降低服務器負載

### 3. 防抖機制

**目的**：避免頻繁推送未解決警報數量

**實現**：

```javascript
const UNRESOLVED_COUNT_DEBOUNCE_MS = 500; // 500ms 防抖

function emitUnresolvedAlertCount() {
  if (unresolvedCountTimer) {
    clearTimeout(unresolvedCountTimer);
  }
  unresolvedCountTimer = setTimeout(async () => {
    const count = await getUnresolvedAlertCount();
    websocketService.emitAlertCount(count);
  }, UNRESOLVED_COUNT_DEBOUNCE_MS);
}
```

**效果**：

- ✅ 減少 WebSocket 推送次數
- ✅ 降低資料庫查詢頻率
- ✅ 提高系統性能

### 4. 規則緩存機制

**目的**：避免重複 API 請求，提高性能

**實現**：

- 前端：使用 `Map` 結構緩存規則
- 後端：使用 `Map` 結構緩存閾值規則（永久緩存）

**效果**：

- ✅ 減少 API 請求
- ✅ 提高響應速度
- ✅ 降低服務器負載

---

## 技術細節

### 1. 規則格式要求

**condition_config 格式**：

```json
{
  "parameter": "pm25",      // 參數名稱（必填）
  "operator": ">",          // 運算符（必填）：>, >=, <, <=
  "value": 50,              // 閾值（必填）
  "unit": "µg/m³"           // 單位（可選）
}
```

**參數名稱對應**：

| 前端參數 | 後端參數 | 顯示名稱 |
|---------|---------|---------|
| `pm25` | `pm25` | PM2.5 |
| `pm10` | `pm10` | PM10 |
| `co2` | `co2` | CO2 |
| `temperature` | `temperature` | 溫度 |
| `humidity` | `humidity` | 濕度 |

### 2. WebSocket 事件格式

**alert:new**：

```typescript
interface AlertNewEvent extends Alert {
  // Alert 對象的所有欄位
}
```

**alert:updated**：

```typescript
interface AlertUpdatedEvent {
  alert: Alert;
  oldStatus: AlertStatus;
  newStatus: AlertStatus;
  timestamp: string;
}
```

**alert:count**：

```typescript
interface AlertCountEvent {
  count: number;
  timestamp: string;
}
```

### 3. 警報數據結構（與後端對齊）

- **時間**：僅 `created_at`、`updated_at`、`ignored_at`；無 `resolved_at`。解決時間 = `status === 'resolved'` 時的 `updated_at`。
- **操作者**：僅 `ignored_by` / `ignored_by_username`（忽視者）；無解決者欄位，解決一律為系統自動。

```typescript
interface Alert {
  id: number;
  source: AlertSource;
  source_id: number;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;            // active, resolved, ignored
  created_at: string;
  updated_at: string;             // resolved 時即為解決時間
  ignored_at?: string | null;
  ignored_by?: number | null;
  ignored_by_username?: string | null;
  source_name?: string;
  zone_name?: string;
  // ...
}
```

### 4. 前端 API 使用

**獲取警報列表**：

```typescript
const { getAlerts } = useAlertApi();

const result = await getAlerts({
  source: "environment",
  status: "active",
  start_date: todayStart.toISOString(),
  end_date: todayEnd.toISOString(),
  updated_after: lastCheckTime.value?.toISOString(),
  limit: 50,
  offset: 0
});
```

**獲取警報規則**：

```typescript
const { getAlertRules } = useAlertApi();

const result = await getAlertRules("environment", "threshold");
// 返回：{ rules: AlertRule[] }
```

---

## 測試與驗證

### 1. 後端測試

**警報創建測試**：

- ✅ 創建新警報
- ✅ 更新現有警報（severity 升級）
- ✅ 更新現有警報（message 變化）
- ✅ 按天限制機制
- ✅ 參數匹配機制
- ✅ 並發處理

**規則查詢測試**：

- ✅ 獲取閾值規則
- ✅ 參數過濾
- ✅ 緩存機制

**WebSocket 推送測試**：

- ✅ 新警報推送
- ✅ 警報更新推送
- ✅ 數量更新推送

### 2. 前端測試

**規則載入測試**：

- ✅ 規則緩存機制
- ✅ 狀態判斷邏輯
- ✅ 向後兼容

**Toast 顯示測試**：

- ✅ 新警報顯示
- ✅ Toast 更新
- ✅ Toast 去重
- ✅ 數量限制
- ✅ 優先級管理

**監聽機制測試**：

- ✅ WebSocket 連接
- ✅ 輪詢後備
- ✅ 智能切換
- ✅ 優先級過濾

### 3. 整合測試

**端到端測試**：

1. 感測器讀數超標 → 後端創建警報 → WebSocket 推送 → 前端顯示 Toast
2. 警報 severity 升級 → 後端更新警報 → WebSocket 推送 → 前端更新 Toast
3. 警報解決 → 後端更新狀態 → WebSocket 推送 → 前端移除 Toast

**性能測試**：

- ✅ 規則緩存效果
- ✅ 增量查詢效果
- ✅ 防抖機制效果
- ✅ Toast 數量限制效果

---

## 總結

### 系統優勢

1. **前後端一致**：使用相同的規則，確保顯示狀態與實際警報記錄一致
2. **實時性**：WebSocket 優先，輪詢後備，確保即時通知
3. **性能優化**：規則緩存、增量查詢、防抖機制
4. **用戶體驗**：智能去重、優先級管理、詳細訊息格式
5. **可維護性**：模組化設計、清晰的數據流、完整的文檔

### 未來改進方向

1. **規則管理界面**：提供 UI 界面管理警報規則
2. **警報統計**：提供警報統計和分析功能
3. **通知渠道**：支持郵件、短信等通知渠道
4. **規則模板**：提供規則模板，簡化配置

---

**文檔結束**
