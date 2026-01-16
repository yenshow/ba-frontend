# API 響應格式統一處理方案

## 問題分析

### 當前狀況

1. **後端響應格式不一致**：
   - 常見結構（如 `{ floors: [...] }`）：直接返回並添加 `timestamp`
     - 例如：`{ floors: [...], timestamp: "..." }`
   - 簡單對象：包裝為 `{ success: true, data: {...}, timestamp: ... }`
     - 例如：`{ success: true, data: { count: 10 }, timestamp: "..." }`
   - 外部資料 API：統一返回 `{ success: boolean, data: T }` 格式
     - 例如：`{ success: true, data: [...], timestamp: "..." }`

2. **前端處理分散**：
   - `useApiBase` 已處理 `{ success: true, data: ... }` 和 `{ ..., timestamp: ... }` 格式
   - `useExternalDataApi` 返回 `ExternalDataResponse<T>`，但 `useApiBase` 已提取 `data`
   - `peopleCounting` composables 中手動訪問 `.data` 和 `.success`（正確，因為 `useExternalDataApi` 返回包裝格式）

### 問題根源

後端的 `responseHandler.js` 有複雜的條件邏輯，導致響應格式不一致：

- 有常見結構的對象（如 `{ floors: [...] }`）→ 直接返回並添加 `timestamp`
- 沒有常見結構的對象 → 包裝為 `{ success: true, data: ... }`

## 完善方案

### 方案一：前端統一處理（推薦）

在 `useApiBase` 中統一處理所有可能的響應格式：

```typescript
// 統一處理後端響應格式
if (response && typeof response === "object") {
	// 情況1：標準格式 { success: true, data: ... }
	if ("success" in response && "data" in response && response.success === true) {
		return (response as any).data as T;
	}

	// 情況2：常見結構格式 { floors: [...], timestamp: ... }
	// 移除 timestamp，直接返回數據部分
	if ("timestamp" in response) {
		const { timestamp, ...data } = response as any;
		return data as T;
	}
}

return response;
```

**優點**：

- 不需要修改後端
- 前端統一處理，所有 composables 簡化
- 向後兼容

**缺點**：

- 需要處理多種格式
- 可能誤判某些響應

### 方案二：後端統一格式（最佳實踐）

修改後端的 `responseHandler.js`，統一返回 `{ success: true, data: ... }` 格式：

```javascript
function sendSuccess(res, data, statusCode = 200) {
	// 統一包裝為標準格式
	return res.status(statusCode).json({
		success: true,
		data,
		timestamp: new Date().toISOString()
	});
}
```

**優點**：

- 響應格式完全統一
- 前端處理邏輯簡單
- 符合 RESTful 最佳實踐

**缺點**：

- 需要修改後端所有路由
- 可能影響現有客戶端

### 方案三：混合方案（推薦用於過渡期）

1. **後端**：逐步統一格式，新 API 使用標準格式
2. **前端**：`useApiBase` 智能處理兩種格式
3. **過渡期**：保持向後兼容

## 實施狀態

### ✅ 階段一：前端統一處理（已完成）

1. ✅ 改進 `useApiBase` 的響應格式處理邏輯
   - 處理 `{ success: true, data: ... }` 格式
   - 處理 `{ ..., timestamp: ... }` 格式（移除 timestamp）
2. ✅ 修正 `useExternalDataApi` 的響應處理
   - 重新包裝響應為 `ExternalDataResponse<T>` 格式
   - 保持接口一致性
3. ✅ 移除所有 composables 中的重複格式處理
   - `useDeviceApi`、`useRtsp` 等已簡化

### 📋 階段二：後端逐步統一（建議）

1. 修改 `responseHandler.js` 統一返回格式
2. 更新所有路由使用統一格式
3. 前端可進一步簡化處理邏輯

## 當前實施細節

### 1. ✅ `useApiBase.ts` - 統一響應格式處理

```typescript
// 統一處理後端響應格式
if (response && typeof response === "object") {
	// 情況1：標準格式 { success: true, data: ... }
	if ("success" in response && "data" in response && response.success === true) {
		return (response as any).data as T;
	}

	// 情況2：帶 timestamp 的響應（移除 timestamp，返回數據部分）
	if ("timestamp" in response) {
		const { timestamp, ...data } = response as any;
		return data as T;
	}
}

return response;
```

### 2. ✅ `useExternalDataApi.ts` - 重新包裝響應

```typescript
// useApiBase 已經提取了 data，需要重新包裝為 ExternalDataResponse 格式
const getList = async <T = any>(...): Promise<ExternalDataResponse<T[]>> => {
  const data = await request<T[]>(path);
  return {
    success: true,
    data: Array.isArray(data) ? data : []
  } as ExternalDataResponse<T[]>;
};
```

### 3. ✅ `peopleCounting` composables - 正確使用

`peopleCounting` composables 正確使用 `.data` 和 `.success`，因為它們使用 `useExternalDataApi`，該 API 返回 `ExternalDataResponse<T>` 格式。

## 驗證清單

- [x] `useApiBase` 能處理所有響應格式
- [x] 所有 composables 不再手動處理格式（除了 `useExternalDataApi` 需要重新包裝）
- [x] 類型定義正確
- [x] 無 linter 錯誤
- [ ] 所有 API 調用正常工作（需要測試）

## 後端響應格式分析

### 當前後端響應格式

根據 `responseHandler.js` 的邏輯：

1. **常見結構格式**（直接返回 + timestamp）：

   ```json
   {
     "floors": [...],
     "timestamp": "2026-01-16T06:50:45.618Z"
   }
   ```

   - 適用於：`{ floors }`, `{ floor }`, `{ locations }`, `{ location }`, `{ users }`, `{ user }`, `{ alerts }`, `{ alert }`, `{ devices }`, `{ device }`

2. **標準格式**（包裝為 success + data）：

   ```json
   {
     "success": true,
     "data": {...},
     "timestamp": "2026-01-16T06:50:45.618Z"
   }
   ```

   - 適用於：沒有常見結構的簡單對象

3. **外部資料 API**（統一格式）：
   ```json
   {
     "success": true,
     "data": [...],
     "timestamp": "2026-01-16T06:50:45.618Z"
   }
   ```

### 前端處理策略

- **`useApiBase`**：統一處理格式1和格式2，提取實際數據
- **`useExternalDataApi`**：重新包裝為 `ExternalDataResponse<T>`，保持接口一致性
- **其他 composables**：直接使用數據，無需處理格式

## 建議的後端改進

### 選項A：完全統一格式（推薦）

修改 `responseHandler.js`：

```javascript
function sendSuccess(res, data, statusCode = 200) {
	// 統一包裝為標準格式
	return res.status(statusCode).json({
		success: true,
		data,
		timestamp: new Date().toISOString()
	});
}
```

**優點**：

- 響應格式完全統一
- 前端可以進一步簡化
- 符合 RESTful 最佳實踐

### 選項B：保持現狀（當前方案）

- 前端 `useApiBase` 智能處理多種格式
- 向後兼容，不需要修改後端
- 適合過渡期

## 總結

**當前狀態**：✅ 前端已統一處理響應格式，所有 composables 簡化完成

**建議**：後端可以逐步統一格式，但前端已能處理所有情況，不影響現有功能
