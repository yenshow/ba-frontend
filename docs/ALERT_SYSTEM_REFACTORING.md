# 警報系統說明

**更新日期**：2025-01-09  
**狀態**：✅ 系統運行中

---

## 📋 目錄

1. [系統概述](#系統概述)
2. [警報規則系統](#警報規則系統)
3. [Toast 通知系統](#toast-通知系統)
4. [系統架構](#系統架構)
5. [使用方式](#使用方式)
6. [系統特性](#系統特性)
7. [測試建議](#測試建議)

---

## 系統概述

警報系統負責監控各種感測器數據，根據預設規則判斷狀態，並通過 Toast 通知向用戶展示警報信息。系統確保前後端使用相同的規則進行狀態判斷，保證顯示的一致性。

### 核心功能

1. **警報規則管理**：前端從後端獲取警報規則，用於判斷感測器讀數狀態
2. **狀態顯示**：根據規則動態顯示感測器參數的狀態（正常/注意/警報）
3. **Toast 通知**：實時顯示警報通知，支持更新、去重和優先級管理
4. **交互功能**：點擊 Toast 可跳轉到警報詳情頁面

---

## 警報規則系統

### 系統架構

前端使用後端資料庫中的警報規則來判斷感測器狀態，確保前後端完全一致。

### 後端 API

**端點**: `GET /api/alerts/rules`

**參數**:

- `source` (必填): 警報來源，如 `environment`
- `alert_type` (可選): 警報類型，如 `threshold`
- `parameter` (可選): 參數名稱，如 `pm25`

**範例**:

```javascript
GET /api/alerts/rules?source=environment&alert_type=threshold
```

**回應格式**:

```json
{
	"success": true,
	"data": {
		"rules": [
			{
				"id": 1,
				"source": "environment",
				"alert_type": "threshold",
				"severity": "warning",
				"condition_config": {
					"parameter": "pm25",
					"operator": ">",
					"value": 50
				},
				"enabled": true
			}
		]
	}
}
```

### 前端規則管理

**Composable**: `app/composables/monitoring/useAlertRules.ts`

提供以下功能：

- `getRules(source, alertType)`: 獲取警報規則（帶緩存）
- `evaluateParameter(parameter, value, rules)`: 評估參數值是否符合規則
- `getStatusText(parameter, value, rules)`: 根據規則獲取狀態文字
- `clearCache()`: 清除規則緩存

**使用範例**:

```typescript
import { useAlertRules } from "~/composables/monitoring/useAlertRules";

const { getRules, getStatusText } = useAlertRules();

// 載入規則
const rules = await getRules("environment", "threshold");

// 判斷狀態
const status = getStatusText("pm25", 55, rules); // 返回 "注意" 或 "警報" 或 "正常"
```

### 狀態判斷邏輯

前端頁面（如 `environment.vue`）在載入時自動獲取規則，並使用規則判斷狀態：

```typescript
const { getRules, getStatusText: getStatusTextFromRules } = useAlertRules();
const alertRules = ref<AlertRule[]>([]);
const rulesLoaded = ref(false);

const loadAlertRules = async () => {
	try {
		alertRules.value = await getRules("environment", "threshold");
		rulesLoaded.value = true;
	} catch (error) {
		console.error("[environment] 載入警報規則失敗:", error);
		rulesLoaded.value = false;
	}
};

const getStatusText = (type: string, value: number | null): string => {
	if (value === null) return "無資料";
	if (rulesLoaded.value && alertRules.value.length > 0) {
		try {
			return getStatusTextFromRules(type, value, alertRules.value);
		} catch (error) {
			console.warn("[environment] 使用規則判斷狀態失敗，使用預設值:", error);
		}
	}
	return getDefaultStatusText(type, value); // 向後兼容
};
```

### 狀態映射

規則的 `severity` 會映射到狀態文字：

- `critical` 或 `error` → "警報"
- `warning` → "注意"
- 無匹配規則 → "正常"

### 規則格式要求

1. **condition_config 格式**：必須包含 `parameter`、`operator`、`value` 欄位
2. **參數名稱**：前端使用的參數名稱（如 "pm25", "pm10"）必須與後端規則中的 `parameter` 欄位一致
3. **運算符**：支持的運算符包括 `>`, `>=`, `<`, `<=`
4. **規則評估**：系統會按嚴重程度排序，優先返回最嚴重的匹配規則

### 規則緩存機制

- 使用 `Map` 結構緩存規則，避免重複 API 請求
- 緩存鍵格式：`${source}:${alertType}`
- 支持手動清除緩存

---

## Toast 通知系統

### 系統概述

Toast 通知系統負責實時顯示警報信息，支持動態更新、去重和優先級管理。

### 觸發時機

1. **WebSocket 事件** (`alert:new`) - 新警報創建
2. **輪詢檢查** (`checkNewAlerts`) - 增量查詢更新
3. **狀態變更** (`alert:updated`) - `resolved/ignored` ↔ `active`
4. **內容更新** (`alert:updated`) - `active -> active`（severity/message 變化）

### Toast 類型映射

| Alert Severity | Toast Type | 顏色 |
| -------------- | ---------- | ---- |
| `warning`      | `warning`  | 黃色 |
| `error`        | `error`    | 紅色 |
| `critical`     | `error`    | 紅色 |

**說明**：`critical` 和 `error` 都映射為 `error` 類型，因為兩者都需要立即關注。

### 去重機制

- **有 alertId**：優先使用 `alertId` 匹配，找到則更新現有 Toast
- **無 alertId**：使用 `message + type` 匹配（向後兼容）
- **非持久**：5 秒內不重複顯示相同訊息

**效果**：

- 正確識別同一警報的更新
- 不會創建重複的 Toast
- 自動更新 Toast 內容（severity/message 變化）

### 數量限制

- **最大顯示數量**：8 個
- **優先級**：`critical` > `error` > `warning`
- **替換機制**：critical 級別可以替換低優先級警報

當達到最大數量時：

- 如果新警報是 `critical` 級別，會替換優先級最低的現有 Toast
- 如果新警報是 `error` 或 `warning` 級別，則跳過顯示

### 更新機制

**WebSocket 事件處理**：

```typescript
// 處理 active -> active 的內容更新
if (oldStatus === "active" && newStatus === "active") {
	const existingToastId = activeAlertToasts.value.get(alert.id);
	if (existingToastId) {
		updateAlertToastContent(existingToastId, alert);
		alertSeverities.value.set(alert.id, alert.severity);
	}
}
```

**輪詢檢查**：

- 使用增量查詢 (`updated_after`)
- 同步更新現有 Toast 內容
- 移除已解決/忽視的警報的 Toast

### Toast 訊息格式

Toast 訊息採用詳細格式，包含以下信息：

```
[嚴重] 環境系統 - 展廳 1F
PM2.5 超過閾值：51µg/m³
10:18
```

**格式說明**：

- 第一行：嚴重程度標示 + 來源系統 + 位置資訊
- 第二行：詳細訊息
- 第三行：時間戳（HH:mm）

### 跳轉功能

點擊 Toast 可以跳轉到警報詳情頁面：

- 自動定位到對應警報並高亮顯示（3 秒）
- 如果警報不在當前列表，自動調整時間範圍並載入

**實現**：

```typescript
// ToastContainer.vue - 點擊處理
const handleToastClick = (toast: Toast) => {
	if (toast.alertId) {
		navigateTo(`/core/alert-log?alertId=${toast.alertId}`);
	}
};
```

### 核心數據結構

- `activeAlertToasts: Map<alertId, toastId>` - 警報與 Toast 的映射
- `alertSeverities: Map<alertId, severity>` - 警報嚴重程度追蹤

### Toast 與 Alert 對應關係

| Alert 屬性            | Toast 屬性              | 說明            |
| --------------------- | ----------------------- | --------------- |
| `alert.id`            | `activeAlertToasts` key | 用於去重和更新  |
| `alert.severity`      | `toast.type`            | 決定 Toast 類型 |
| `alert.message`       | `toast.message`         | Toast 顯示內容  |
| `alert.status`        | `toast.persistent`      | 是否持久顯示    |
| `alert.status` 變更   | Toast 顯示/移除         | 狀態同步        |
| `alert.severity` 變化 | Toast 類型更新          | 內容同步        |
| `alert.message` 變化  | Toast 訊息更新          | 內容同步        |

---

## 系統架構

### 架構圖

```
┌─────────────────┐
│   後端資料庫     │
│  alert_rules    │
└────────┬────────┘
         │
         │ API: GET /api/alerts/rules
         ▼
┌─────────────────┐
│  前端 Composable │
│  useAlertRules   │
│  (規則緩存)      │
└────────┬────────┘
         │
         │ 使用規則判斷狀態
         ▼
┌─────────────────┐
│  environment.vue │
│  (狀態顯示)      │
└─────────────────┘

┌─────────────────┐
│   後端資料庫     │
│     alerts      │
└────────┬────────┘
         │
         │ WebSocket / 輪詢
         ▼
┌─────────────────┐
│ useAlertMonitor │
│  (Toast 管理)    │
└────────┬────────┘
         │
         │ 顯示/更新 Toast
         ▼
┌─────────────────┐
│ ToastContainer   │
│  (UI 顯示)       │
└─────────────────┘
```

### 數據流

1. **規則載入流程**：

   ```
   頁面載入 → useAlertRules.getRules() → API 請求 → 規則緩存 → 狀態判斷
   ```

2. **Toast 更新流程**：

   ```
   WebSocket/輪詢 → 警報更新 → useAlertMonitor → 檢查現有 Toast → 更新/創建 Toast
   ```

3. **狀態判斷流程**：
   ```
   感測器讀數 → getStatusText() → 使用規則評估 → 返回狀態文字 → UI 顯示
   ```

### 關鍵技術點

1. **規則緩存機制**：
   - 使用 `Map` 結構緩存規則
   - 避免重複 API 請求
   - 支持手動清除緩存

2. **狀態判斷統一**：
   - 所有狀態判斷函數基於 `getStatusText` 的結果
   - 確保視覺樣式與文字狀態一致

3. **Toast 去重與更新**：
   - 使用 `alertId` 作為唯一標識
   - 支持動態更新內容
   - 優先級管理確保重要警報始終顯示

---

## 使用方式

### 後端配置

確保資料庫中有正確的警報規則：

```sql
SELECT * FROM alert_rules
WHERE source = 'environment'
  AND alert_type = 'threshold'
  AND enabled = TRUE;
```

### 前端使用

前端會自動在頁面載入時獲取規則，並使用規則來判斷狀態。無需額外配置。

**在組件中使用**：

```typescript
import { useAlertRules } from "~/composables/monitoring/useAlertRules";

const { getRules, getStatusText } = useAlertRules();
const alertRules = ref<AlertRule[]>([]);

onMounted(async () => {
	// 載入規則
	alertRules.value = await getRules("environment", "threshold");

	// 使用規則判斷狀態
	const status = getStatusText("pm25", 55, alertRules.value);
});
```

### 注意事項

1. **規則格式**：後端規則的 `condition_config` 必須包含 `parameter`、`operator`、`value` 欄位
2. **參數名稱**：前端使用的參數名稱（如 "pm25", "pm10"）必須與後端規則中的 `parameter` 欄位一致
3. **運算符**：目前支持的運算符包括 `>`, `>=`, `<`, `<=`
4. **向後兼容**：如果規則載入失敗，會使用預設值，確保系統正常運作

---

## 系統特性

### 核心特性

1. **前後端一致**：前端使用與後端相同的規則，確保顯示的狀態與實際警報記錄一致
2. **動態配置**：可以通過修改資料庫中的規則來調整閾值，不需要修改前端代碼
3. **向後兼容**：如果規則載入失敗，會使用預設值，確保系統正常運作
4. **性能優化**：規則緩存機制，避免重複請求

### Toast 通知特性

1. **智能更新**：WebSocket 和輪詢雙路徑處理更新
2. **優先級管理**：critical 級別始終可以顯示
3. **數據同步**：`alertSeverities` Map 確保優先級判斷準確
4. **詳細訊息**：多行格式，包含完整資訊
5. **智能跳轉**：自動定位並高亮顯示對應警報

### 狀態判斷特性

1. **單一數據源**：所有狀態判斷基於後端規則，確保一致性
2. **統一邏輯**：所有狀態判斷函數基於 `getStatusText` 的結果
3. **視覺一致性**：確保視覺樣式與文字狀態一致

---

## 測試建議

### 警報規則系統測試

1. **規則載入測試**：
   - 確認後端 API `/api/alerts/rules?source=environment&alert_type=threshold` 返回正確的規則
   - 確認前端在頁面載入時成功載入規則
   - 測試規則緩存機制是否正常工作

2. **狀態判斷測試**：
   - 測試不同參數值的狀態判斷是否正確
   - 測試規則載入失敗時的向後兼容行為
   - 確認前後端狀態顯示一致

3. **規則格式測試**：
   - 確認規則的 `condition_config` 格式正確
   - 測試不同運算符（`>`, `>=`, `<`, `<=`）是否正常工作
   - 測試嚴重程度映射是否正確

### Toast 通知系統測試

1. **更新機制測試**：
   - 測試 WebSocket 事件觸發時 Toast 是否正確更新
   - 測試輪詢檢查時 Toast 是否正確更新
   - 測試警報狀態變更時 Toast 是否正確顯示/移除

2. **去重機制測試**：
   - 測試使用 `alertId` 去重是否正常工作
   - 測試無 `alertId` 時的向後兼容行為
   - 確認不會創建重複的 Toast

3. **數量限制測試**：
   - 測試超過 8 個警報時的處理邏輯
   - 測試 critical 級別是否可以替換低優先級警報
   - 確認優先級管理是否正確

4. **交互功能測試**：
   - 測試點擊 Toast 是否正確跳轉到警報詳情頁面
   - 測試自動定位和高亮顯示是否正常工作
   - 測試警報不在當前列表時的處理邏輯

### 整合測試

1. **端到端測試**：
   - 測試完整的警報流程：感測器讀數 → 規則判斷 → 狀態顯示 → Toast 通知
   - 測試多個地點共用同一個感測器時的處理邏輯
   - 確認前後端完全一致

2. **性能測試**：
   - 測試規則緩存機制是否減少 API 請求
   - 測試 Toast 數量限制是否提高 UI 性能
   - 確認系統在大量警報時的表現

---

## 總結

警報系統通過統一使用後端規則、實施完整的 Toast 更新機制和優化代碼結構，實現了前後端一致性、動態配置和良好的用戶體驗。系統現在更加穩定、一致和易於維護。

---

**文檔結束**
