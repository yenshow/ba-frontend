# Toast 消失機制說明

**更新日期**：2025-01-09  
**狀態**：✅ 已實施

---

## 📋 一、Toast 消失方式總覽

Toast 有以下幾種消失方式：

1. **定時自動消失**（僅適用於非持久顯示的 Toast）
2. **點擊關閉按鈕**
3. **點擊跳轉到警示頁面**（僅適用於警報 Toast）
4. **警報狀態變更**（active → resolved/ignored）

---

## ⏱️ 二、定時消失機制

### 2.1 適用範圍

**只有非持久顯示的 Toast 才會定時消失**。

- ✅ **非持久顯示的 Toast**：`duration > 0`，會根據 `duration` 自動消失
- ❌ **持久顯示的 Toast**：`duration = 0`，不會自動消失

**統一標準**：使用 `duration` 統一控制，不再使用 `persistent` 標記。

### 2.2 定時消失時間

#### 警報 Toast（非持久顯示）

| 嚴重程度   | 消失時間 | 說明                     |
| ---------- | -------- | ------------------------ |
| `critical` | 10 秒    | 較嚴重，給予更多時間查看 |
| `error`    | 5 秒     | 標準錯誤提示時間         |
| `warning`  | 5 秒     | 標準警告提示時間         |

**實現位置**：`app/composables/useAlertMonitor.ts:288`

```typescript
const duration = persistent ? 0 : alert.severity === "critical" ? 10000 : 5000;
```

#### 普通 Toast（非持久顯示）

| Toast 類型 | 預設消失時間 | 說明     |
| ---------- | ------------ | -------- |
| `success`  | 3 秒         | 成功提示 |
| `error`    | 3 秒         | 錯誤提示 |
| `warning`  | 3 秒         | 警告提示 |
| `info`     | 3 秒         | 資訊提示 |

**實現位置**：`app/composables/useToast.ts:19`

```typescript
const showToast = (type: ToastType, message: string, duration = 3000, ...)
```

### 2.3 實現邏輯

**實現位置**：`app/composables/useToast.ts`

```typescript
// 自動移除（只有非持久顯示的 Toast）
if (duration > 0) {
	setTimeout(() => {
		removeToast(id);
	}, duration);
}
```

**關鍵點**：

- `duration = 0`：持久顯示，不會設置定時器
- `duration > 0`：非持久顯示，根據 `duration` 設置定時器

---

## 🖱️ 三、點擊關閉按鈕

### 3.1 實現方式

**實現位置**：`app/components/common/ToastContainer.vue:70-82`

```vue
<button
	@click.stop="removeToast(toast.id)"
	class="flex-shrink-0 text-current opacity-60 transition-opacity hover:opacity-100"
	aria-label="關閉"
>
    <!-- 關閉圖標 -->
</button>
```

### 3.2 適用範圍

**所有 Toast**（無論是否持久顯示）都可以通過點擊關閉按鈕手動關閉。

---

## 🔗 四、點擊跳轉到警示頁面

### 4.1 適用範圍

**僅適用於警報 Toast**（`toast.alertId` 存在）。

### 4.2 實現方式

**實現位置**：`app/components/common/ToastContainer.vue:104-111`

```typescript
const handleToastClick = (toast: Toast) => {
	if (toast.alertId) {
		// 移除警報 Toast（從 useAlertMonitor 中移除，會自動清理相關狀態）
		removeAlertToast(toast.alertId);
		// 跳轉到警報詳情頁面
		navigateTo(`/core/alert-log?alertId=${toast.alertId}`);
	}
};
```

### 4.3 清理邏輯

**實現位置**：`app/composables/useAlertMonitor.ts:677-684`

```typescript
const removeAlertToast = (alertId: number) => {
	const toastId = activeAlertToasts.value.get(alertId);
	if (toastId) {
		toast.removeToast(toastId);
		activeAlertToasts.value.delete(alertId);
		alertSeverities.value.delete(alertId);
	}
};
```

**清理內容**：

1. 移除 Toast 本身
2. 從 `activeAlertToasts` Map 中移除記錄
3. 從 `alertSeverities` Map 中移除記錄

---

## 🔄 五、警報狀態變更

### 5.1 觸發條件

當警報狀態從 `active` 變為 `resolved` 或 `ignored` 時，對應的 Toast 會自動移除。

### 5.2 實現方式

**實現位置**：`app/composables/useAlertMonitor.ts:324-327`

```typescript
// 如果從 active 變為 resolved/ignored，移除 Toast
if (oldStatus === "active" && (newStatus === "resolved" || newStatus === "ignored")) {
	removeAlertToast(alert.id);
}
```

### 5.3 觸發時機

- **WebSocket 事件**：`alert:updated` 事件
- **輪詢檢查**：`checkNewAlerts` 函數中的狀態同步

---

## 📊 六、Toast 類型與消失機制對照表

| Toast 類型     | duration        | 定時消失 | 點擊關閉 | 點擊跳轉 | 狀態變更 |
| -------------- | --------------- | -------- | -------- | -------- | -------- |
| **警報 Toast** | `0`（持久顯示） | ❌       | ✅       | ✅       | ✅       |
| **普通 Toast** | `3000`（3秒）   | ✅ (3秒) | ✅       | ❌       | ❌       |

**說明**：

- 警報 Toast 永遠是持久顯示（`duration = 0`），不會自動消失
- 普通 Toast 預設 3 秒後自動消失

---

## 🔍 七、關鍵代碼位置

### 7.1 定時消失邏輯

- **`app/composables/useToast.ts:83-88`** - 設置定時器
- **`app/composables/useAlertMonitor.ts:288`** - 設置警報 Toast 的 duration

### 7.2 點擊關閉

- **`app/components/common/ToastContainer.vue:70-82`** - 關閉按鈕
- **`app/composables/useToast.ts:93-98`** - `removeToast` 函數

### 7.3 點擊跳轉

- **`app/components/common/ToastContainer.vue:104-111`** - 點擊處理
- **`app/composables/useAlertMonitor.ts:677-684`** - `removeAlertToast` 函數

### 7.4 狀態變更

- **`app/composables/useAlertMonitor.ts:324-327`** - 狀態變更處理

---

## ✅ 八、總結

1. **定時消失**：僅適用於非持久顯示的 Toast
   - 警報 Toast（非持久）：critical 10 秒，其他 5 秒
   - 普通 Toast：預設 3 秒

2. **點擊關閉**：所有 Toast 都支持

3. **點擊跳轉**：僅適用於警報 Toast，跳轉後自動移除

4. **狀態變更**：警報從 active 變為 resolved/ignored 時自動移除

---

**文檔結束**
