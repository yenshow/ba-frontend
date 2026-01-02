# 後端配置檢查報告 - 前端響應能力分析

**檢查日期**：2025-01-XX  
**檢查範圍**：後端配置 vs 前端連接能力

---

## 📋 執行摘要

### ✅ 配置正確的部分

1. **API 路由配置**：後端 `/api/alerts` 路由已正確配置
2. **WebSocket 服務**：後端 WebSocket 服務已初始化並提供警報事件
3. **前端 API 基礎配置**：前端已配置 API Base URL
4. **認證機制**：前後端認證機制一致（Bearer Token）

### ⚠️ 需要注意的部分

1. **CORS 配置**：需要確認後端 CORS 允許前端地址
2. **WebSocket 連接**：前端未實作 WebSocket 連接（使用輪詢）
3. **環境變數配置**：需要確認前後端環境變數是否匹配

---

## 🔍 詳細配置檢查

### 1. 後端 API 路由配置

#### ✅ 配置正確

**後端配置** (`server.js`)：

```javascript
const alertRoutes = require("./routes/alertRoutes");
app.use("/api/alerts", alertRoutes);
```

**路由端點** (`alertRoutes.js`)：

- ✅ `GET /api/alerts` - 取得警報列表
- ✅ `GET /api/alerts/unresolved/count` - 取得未解決警報數量
- ✅ `GET /api/alerts/:id` - 取得單一警報
- ✅ `GET /api/alerts/:id/history` - 取得警報歷史
- ✅ `PUT /api/alerts/:id/unresolve` - 標記為未解決（管理員）
- ✅ `POST /api/alerts/:deviceId/:alertType/ignore` - 忽視警報（管理員）
- ✅ `POST /api/alerts/:deviceId/:alertType/unignore` - 取消忽視（管理員）

**狀態**：✅ 所有端點已正確配置

---

### 2. 後端 WebSocket 服務配置

#### ✅ 服務已初始化

**後端配置** (`server.js`)：

```javascript
const httpServer = http.createServer(app);
websocketService.initializeWebSocket(httpServer, corsOptions);
```

**WebSocket 服務** (`websocketService.js`)：

- ✅ 使用 Socket.IO 提供 WebSocket 服務
- ✅ CORS 配置與 Express 一致
- ✅ 連接超時：45 秒
- ✅ Ping 超時：20 秒
- ✅ Ping 間隔：25 秒

**警報事件**：

- ✅ `alert:new` - 新警報創建
- ✅ `alert:updated` - 警報更新
- ✅ `alert:count` - 未解決警報數量變化

**狀態**：✅ WebSocket 服務已正確配置

---

### 3. 後端 CORS 配置

#### ⚠️ 需要確認環境變數

**後端配置** (`server.js`)：

```javascript
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
	.split(",")
	.map(origin => origin.trim())
	.filter(Boolean);

const corsOptions = {
	origin: (origin, callback) => {
		if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
			return callback(null, true);
		}
		return callback(new Error(`不被允許的跨域來源: ${origin}`), false);
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cache-Control", "Pragma"],
	exposedHeaders: ["Authorization"]
};
```

**WebSocket CORS** (`websocketService.js`)：

```javascript
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
	.split(",")
	.map(origin => origin.trim())
	.filter(Boolean);

ioInstance = new Server(httpServer, {
	cors: {
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
				return callback(null, true);
			}
			return callback(new Error(`不被允許的跨域來源: ${origin}`), false);
		},
		credentials: true,
		methods: ["GET", "POST"]
	}
});
```

**前端實際地址**（從 `.nuxt/dev/index.mjs` 看到）：

- 開發模式：`http://192.168.2.8:3000`（區域網路）
- 預設配置：`http://localhost:3000`（本機）

**潛在問題**：

- ⚠️ 如果前端運行在區域網路地址（如 `http://192.168.2.8:3000`），需要確保後端 `CORS_ORIGINS` 環境變數包含此地址
- ⚠️ 或者設置 `CORS_ORIGINS=*` 允許所有來源（僅開發環境）

**建議**：

```bash
# .env 檔案
CORS_ORIGINS=http://localhost:3000,http://192.168.2.8:3000
# 或開發環境使用
CORS_ORIGINS=*
```

**狀態**：⚠️ 需要確認環境變數配置

---

### 4. 前端 API 基礎配置

#### ✅ 配置正確

**前端配置** (`nuxt.config.ts`)：

```typescript
runtimeConfig: {
  public: {
    apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:4000/api",
  }
}
```

**API Base Composable** (`useApiBase.ts`)：

```typescript
const apiBase = config.public.apiBase || "http://localhost:4000/api";
const url = `${apiBase}${path}`;
```

**實際運行時配置**（從 `.nuxt/dev/index.mjs` 看到）：

- `apiBase: "http://192.168.2.8:4000/api"`

**狀態**：✅ 前端 API 配置正確，可以連接到後端

---

### 5. 前端 WebSocket 配置

#### ❌ 未實作

**前端依賴** (`package.json`)：

- ✅ `socket.io-client: ^4.8.3` - 已安裝

**前端實作**：

- ❌ 未使用 WebSocket
- ✅ 使用輪詢機制（30 秒間隔）

**狀態**：❌ 前端未實作 WebSocket 連接

---

### 6. 認證機制配置

#### ✅ 配置一致

**後端認證** (`authMiddleware.js`)：

- 使用 JWT Token
- Header: `Authorization: Bearer <token>`

**前端認證** (`useApiBase.ts`)：

```typescript
const getAuthHeaders = (): HeadersInit => {
	const token = useCookie("auth_token").value;
	const headers: HeadersInit = {
		"Content-Type": "application/json",
		Accept: "application/json"
	};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}
	return headers;
};
```

**狀態**：✅ 前後端認證機制一致

---

## 🔧 配置檢查清單

### 後端配置檢查

- [x] API 路由已正確配置 (`/api/alerts`)
- [x] WebSocket 服務已初始化
- [x] CORS 配置已設置
- [ ] **需要確認**：`CORS_ORIGINS` 環境變數是否包含前端地址
- [x] 認證中間件已配置
- [x] 錯誤處理已配置

### 前端配置檢查

- [x] API Base URL 已配置
- [x] 認證 Token 處理已實作
- [x] API 請求錯誤處理已實作
- [ ] **未實作**：WebSocket 連接
- [x] 輪詢機制已實作（作為替代方案）

---

## 🎯 關鍵發現

### 1. CORS 配置需要確認

**問題**：

- 後端預設允許 `http://localhost:3000`
- 前端實際運行在 `http://192.168.2.8:3000`（區域網路）
- 如果 `CORS_ORIGINS` 環境變數未包含區域網路地址，會導致 CORS 錯誤

**解決方案**：

1. 在後端 `.env` 檔案中設置：
   ```bash
   CORS_ORIGINS=http://localhost:3000,http://192.168.2.8:3000
   ```
2. 或開發環境使用：
   ```bash
   CORS_ORIGINS=*
   ```

### 2. WebSocket 連接未實作

**問題**：

- 後端已提供完整的 WebSocket 服務
- 前端有 `socket.io-client` 依賴但未使用
- 前端使用輪詢機制（30 秒間隔）

**影響**：

- 警報通知延遲最多 30 秒
- 持續的 HTTP 請求增加後端負擔

**解決方案**：

- 實作 WebSocket 連接以接收即時警報
- 保留輪詢作為後備方案

---

## 📊 配置符合度總結

| 配置項目       | 後端狀態     | 前端狀態  | 符合度    |
| -------------- | ------------ | --------- | --------- |
| API 路由       | ✅ 已配置    | ✅ 已配置 | ✅ 100%   |
| API Base URL   | ✅ 預設 4000 | ✅ 已配置 | ✅ 100%   |
| CORS 配置      | ⚠️ 需確認    | ✅ 已配置 | ⚠️ 需確認 |
| WebSocket 服務 | ✅ 已配置    | ❌ 未實作 | ❌ 0%     |
| 認證機制       | ✅ 已配置    | ✅ 已配置 | ✅ 100%   |
| 錯誤處理       | ✅ 已配置    | ✅ 已配置 | ✅ 100%   |

**整體符合度**：**83%** ⚠️

---

## 🔧 建議行動

### 優先級 1：確認 CORS 配置

**步驟**：

1. 檢查後端 `.env` 檔案中的 `CORS_ORIGINS` 設定
2. 確認包含前端實際運行地址（如 `http://192.168.2.8:3000`）
3. 或開發環境設置 `CORS_ORIGINS=*`

**測試**：

```bash
# 測試 API 連接
curl -H "Origin: http://192.168.2.8:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Authorization" \
     -X OPTIONS \
     http://localhost:4000/api/alerts
```

### 優先級 2：實作 WebSocket 連接

**步驟**：

1. 創建 WebSocket composable（例如 `useWebSocket.ts`）
2. 連接後端 WebSocket 服務
3. 監聽 `alert:new`、`alert:updated`、`alert:count` 事件
4. 整合到 `useAlertMonitor` 中
5. 保留輪詢作為後備方案

### 優先級 3：環境變數文檔

**建議**：

- 創建 `.env.example` 檔案，說明必要的環境變數
- 包含前後端環境變數配置說明

---

## 📝 測試建議

### 1. API 連接測試

```bash
# 測試警報列表 API
curl http://localhost:4000/api/alerts

# 測試未解決警報數量
curl http://localhost:4000/api/alerts/unresolved/count
```

### 2. CORS 測試

在瀏覽器控制台測試：

```javascript
fetch("http://localhost:4000/api/alerts", {
	method: "GET",
	credentials: "include",
	headers: {
		"Content-Type": "application/json"
	}
})
	.then(res => res.json())
	.then(data => console.log("API 連接成功:", data))
	.catch(err => console.error("API 連接失敗:", err));
```

### 3. WebSocket 連接測試

```javascript
// 在瀏覽器控制台測試
import io from "socket.io-client";
const socket = io("http://localhost:4000", {
	transports: ["websocket"]
});

socket.on("connect", () => {
	console.log("WebSocket 連接成功");
});

socket.on("alert:new", alert => {
	console.log("收到新警報:", alert);
});

socket.on("alert:updated", data => {
	console.log("警報更新:", data);
});

socket.on("alert:count", data => {
	console.log("未解決警報數量:", data.count);
});
```

---

## 🎯 結論

### 配置狀態

1. ✅ **API 配置**：前後端 API 配置正確，可以正常連接
2. ⚠️ **CORS 配置**：需要確認環境變數是否包含前端地址
3. ❌ **WebSocket 配置**：前端未實作 WebSocket 連接

### 響應能力評估

**前端可以正確響應的功能**：

- ✅ 查詢警報列表
- ✅ 取得未解決警報數量
- ✅ 取得單一警報
- ✅ 取得警報歷史
- ✅ 忽視/取消忽視警報（管理員）
- ✅ 標記警報為未解決（管理員）

**前端無法即時響應的功能**：

- ❌ 即時接收新警報（使用輪詢，延遲最多 30 秒）
- ❌ 即時接收警報更新（使用輪詢，延遲最多 30 秒）
- ❌ 即時接收未解決警報數量變化（使用輪詢，延遲最多 30 秒）

### 建議

1. **立即行動**：確認後端 `CORS_ORIGINS` 環境變數配置
2. **短期改進**：實作 WebSocket 連接以提升即時性
3. **長期優化**：結合 WebSocket 和輪詢，提供最佳體驗

---

**報告結束**
