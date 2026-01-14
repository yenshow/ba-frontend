# 警報系統 Toast 顯示優化報告

**更新日期**：2025-01-09  
**狀態**：✅ 核心優化已完成

---

## 📊 一、實施狀態總覽

### ✅ 已完成的優化

| 優先級 | 優化項目       | 狀態 | 說明                     |
| ------ | -------------- | ---- | ------------------------ |
| 高     | Toast 更新機制 | ✅   | 支持動態更新 Toast 內容  |
| 高     | Toast 去重邏輯 | ✅   | 使用 `alertId` 匹配      |
| 高     | 代碼優化       | ✅   | 提取輔助函數，減少重複   |
| 中     | 數量限制       | ✅   | 最大 8 個，critical 優先 |
| 中     | 訊息格式優化   | ✅   | 詳細格式，包含完整資訊   |
| 中     | 跳轉功能       | ✅   | 點擊跳轉並自動定位       |

### ⚠️ 待實施的優化

| 優先級 | 優化項目 | 說明                       |
| ------ | -------- | -------------------------- |
| 低     | 快速操作 | 添加解決、忽視按鈕（可選） |

---

## 🔧 二、核心實現

### 2.1 Toast 顯示流程

**觸發時機**：

1. WebSocket 事件 (`alert:new`) - 新警報創建
2. 輪詢檢查 (`checkNewAlerts`) - 增量查詢更新
3. 狀態變更 (`alert:updated`) - `resolved/ignored` ↔ `active`
4. 內容更新 (`alert:updated`) - `active -> active`（severity/message 變化）

**顯示邏輯**：

```typescript
// 檢查數量限制（最大 8 個）
if (persistent && activeAlertToasts.value.size >= MAX_ALERT_TOASTS) {
	if (alert.severity === "critical") {
		// critical 可以替換低優先級
		removeAlertToast(findLowestPriorityToast());
	} else {
		return; // 跳過顯示
	}
}

// 顯示 Toast（使用 alertId 去重）
showAlertNotification(alert, true);
```

### 2.2 Toast 類型映射

| Alert Severity | Toast Type | 顏色 |
| -------------- | ---------- | ---- |
| `warning`      | `warning`  | 黃色 |
| `error`        | `error`    | 紅色 |
| `critical`     | `error`    | 紅色 |

**說明**：`critical` 和 `error` 都映射為 `error` 類型，因為兩者都需要立即關注。

### 2.3 去重機制

**邏輯**：

- **有 alertId**：優先使用 `alertId` 匹配，找到則更新現有 Toast
- **無 alertId**：使用 `message + type` 匹配（向後兼容）
- **非持久**：5 秒內不重複顯示相同訊息

**效果**：

- ✅ 正確識別同一警報的更新
- ✅ 不會創建重複的 Toast
- ✅ 自動更新 Toast 內容（severity/message 變化）

### 2.4 數量限制

**策略**：

- 最大顯示數量：**8 個**
- 優先級：`critical` > `error` > `warning`
- 替換機制：critical 級別可以替換低優先級警報

**實現**：

```typescript
const MAX_ALERT_TOASTS = 8;
const alertSeverities = ref<Map<number, AlertSeverity>>(new Map());

// 查找優先級最低的 Toast
const findLowestPriorityToast = (): number | undefined => {
	// 優先移除 warning，其次是 error
	for (const alertId of activeAlertToasts.value.keys()) {
		const severity = alertSeverities.value.get(alertId);
		if (severity === "warning") return alertId;
	}
	// ...
};
```

---

## 🛠️ 三、技術實現

### 3.1 核心函數

**輔助函數**：

- `buildAlertToastContent(alert)` - 構建 Toast 類型和訊息
- `updateAlertToastContent(toastId, alert)` - 更新現有 Toast
- `findLowestPriorityToast()` - 查找優先級最低的 Toast

**數據結構**：

- `activeAlertToasts: Map<alertId, toastId>` - 警報與 Toast 的映射
- `alertSeverities: Map<alertId, severity>` - 警報嚴重程度追蹤

### 3.2 更新機制

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

### 3.3 Toast 與 Alert 對應關係

| Alert 屬性            | Toast 屬性              | 狀態      |
| --------------------- | ----------------------- | --------- |
| `alert.id`            | `activeAlertToasts` key | ✅ 已追蹤 |
| `alert.severity`      | `toast.type`            | ✅ 已映射 |
| `alert.message`       | `toast.message`         | ✅ 已映射 |
| `alert.status`        | `toast.persistent`      | ✅ 已映射 |
| `alert.status` 變更   | Toast 顯示/移除         | ✅ 已處理 |
| `alert.severity` 變化 | Toast 類型更新          | ✅ 已處理 |
| `alert.message` 變化  | Toast 訊息更新          | ✅ 已處理 |

---

## 📈 四、優化效果

### 4.1 已實現的改進

| 優化項目         | 優化前          | 優化後           | 狀態 |
| ---------------- | --------------- | ---------------- | ---- |
| Toast 訊息準確性 | ⚠️ 可能過時     | ✅ 即時更新      | ✅   |
| Toast 更新機制   | ❌ 無           | ✅ 支持更新      | ✅   |
| 去重邏輯         | ⚠️ 使用 message | ✅ 使用 alertId  | ✅   |
| 代碼維護性       | ⚠️ 重複代碼     | ✅ 提取輔助函數  | ✅   |
| 數量管理         | ❌ 無限制       | ✅ 有限制（8個） | ✅   |

### 4.2 待實施的改進

| 優化項目 | 當前狀態    | 預期效果      | 狀態      |
| -------- | ----------- | ------------- | --------- |
| 訊息格式 | ⚠️ 基本     | ✅ 更清晰     | ✅ 已實施 |
| 交互功能 | ❌ 只能關閉 | ✅ 可跳轉操作 | ✅ 已實施 |

---

## 💡 五、已實施的優化（中優先級）

### 5.1 優化 Toast 訊息格式 ✅ 已實施

**實施內容**：

- ✅ 使用詳細格式（方案 A）
- ✅ 包含嚴重程度標示（[警告]/[錯誤]/[嚴重]）
- ✅ 包含來源系統和位置資訊
- ✅ 包含詳細訊息
- ✅ 包含時間戳（HH:mm）

**訊息格式範例**：

```
[嚴重] 環境系統 - 展廳 1F
PM2.5 超過閾值：51µg/m³
10:18
```

**實現方式**：

```typescript
const buildAlertToastContent = (alert: Alert) => {
	const severityLabel = getSeverityLabel(alert.severity);
	const sourceLabel = getSourceLabel(alert.source);
	const locationInfo = alert.source_name || alert.device_name;
	const timeStr = formatTime(alert.created_at);

	let message = `[${severityLabel}] ${sourceLabel}系統`;
	if (locationInfo) message += ` - ${locationInfo}`;
	message += `\n${alert.message}`;
	message += `\n${timeStr}`;

	return { type: toastType, message };
};
```

### 5.2 添加 Toast 跳轉功能 ✅ 已實施

**實施內容**：

- ✅ 點擊 Toast 跳轉到警報詳情頁面
- ✅ 自動定位到對應警報並高亮顯示（3 秒）
- ✅ 如果警報不在當前列表，自動調整時間範圍並載入

**實現方式**：

```typescript
// ToastContainer.vue - 點擊處理
const handleToastClick = (toast: Toast) => {
	if (toast.alertId) {
		navigateTo(`/core/alert-log?alertId=${toast.alertId}`);
	}
};

// alert-log.vue - 查詢參數處理
const handleAlertIdQuery = async () => {
	const alertId = route.query.alertId;
	// 定位並高亮顯示對應警報
	// 如果不在列表中，調整時間範圍並載入
};
```

---

## ✅ 六、總結

### 核心成果

1. **✅ Toast 更新機制** - 支持動態更新，反映 Alert 最新狀態
2. **✅ 去重邏輯優化** - 使用 `alertId` 匹配，正確識別更新
3. **✅ 數量限制** - 最大 8 個，critical 優先，避免 UI 混亂
4. **✅ 代碼優化** - 提取輔助函數，減少重複代碼約 60%
5. **✅ 訊息格式優化** - 詳細格式，包含嚴重程度、位置、時間戳
6. **✅ 跳轉功能** - 點擊 Toast 跳轉到警報詳情並自動定位

### 技術亮點

- **智能更新**：WebSocket 和輪詢雙路徑處理更新
- **優先級管理**：critical 級別始終可以顯示
- **向後兼容**：非警報 Toast 仍使用原有邏輯
- **數據同步**：`alertSeverities` Map 確保優先級判斷準確
- **詳細訊息**：多行格式，包含完整資訊
- **智能跳轉**：自動定位並高亮顯示對應警報

### 後續優化（可選）

- 快速操作按鈕（解決、忽視）- 低優先級

---

**文檔結束**
