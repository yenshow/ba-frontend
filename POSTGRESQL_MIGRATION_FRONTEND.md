# 前端 PostgreSQL 遷移說明

## 概述

前端專案**不需要直接修改**，因為前端不直接連接資料庫，只通過 API 與後端通信。後端已從 MySQL 遷移到 PostgreSQL，API 接口保持不變。

## 檢查項目

### ✅ 已確認無需修改的部分

1. **API 接口** - 所有 API 端點保持不變
2. **資料格式** - API 請求/回應格式沒有變化
3. **認證機制** - JWT 認證方式不變
4. **前端代碼** - 無需修改任何代碼

### 📝 需要確認的配置

#### 1. 環境變數設定

確保 `.env` 檔案中的後端 API 地址正確：

```env
NUXT_PUBLIC_API_BASE=http://localhost:4000/api
# 或您的後端服務地址
# NUXT_PUBLIC_API_BASE=http://192.168.10.124:4000/api
```

#### 2. 後端 CORS 設定

確保後端的 `.env` 檔案中 `CORS_ORIGINS` 包含前端地址：

```env
# 後端 .env
CORS_ORIGINS=http://localhost:3000,http://192.168.2.7:3000,http://192.168.10.124:3000,http://192.168.1.172:3000
```

#### 3. 後端服務狀態

確保後端服務正常運行，並且 PostgreSQL 已啟動：

```bash
# 在後端目錄
cd ../ba-backend

# 啟動 PostgreSQL（如果使用可攜式）
npm run postgres:start

# 啟動後端服務
npm run dev
```

## 測試步驟

1. **確認後端運行**

   ```bash
   # 在後端目錄
   npm run db:test  # 測試資料庫連線
   ```

2. **啟動前端**

   ```bash
   # 在前端目錄
   npm run dev
   ```

3. **測試 API 連線**
   - 打開瀏覽器開發者工具
   - 檢查 Network 標籤
   - 確認 API 請求成功（狀態碼 200）

## 注意事項

### ⚠️ 未使用的依賴

`package.json` 中包含 `better-sqlite3`，但代碼中未使用。可以考慮移除：

```bash
npm uninstall better-sqlite3
```

### 📋 環境變數範例

已建立 `.env.example` 檔案，包含所有必要的環境變數設定。

## 總結

**前端無需任何代碼修改**，只需要：

1. ✅ 確認 `.env` 中的 API 地址正確
2. ✅ 確認後端服務正常運行
3. ✅ 確認後端 CORS 設定包含前端地址

所有資料庫相關的變更都在後端完成，前端通過 API 與後端通信，完全不受影響。
