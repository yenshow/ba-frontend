# RTSP 串流功能重構總結

## 🎯 重構目標

重構 RTSP 串流功能，主要目標是測試 RTSP 串流能否在網頁上正確顯示。

## 🔧 修復的問題

### 1. **後端 HLS 文件路徑配置錯誤** ✅

**問題：**
- `server.js` 中靜態文件服務路徑配置錯誤
- 原路徑：`path.join(__dirname, "../public/hls")` → 指向 `public/hls`
- 實際文件位置：`src/public/hls/`

**修復：**
- 修改為：`path.join(__dirname, "public/hls")` → 正確指向 `src/public/hls`
- 增加路徑日誌輸出，方便調試
- 改進 MIME 類型和緩存控制設定

```javascript
// 修復後的配置
const hlsStaticPath = path.join(__dirname, "public/hls");
console.log(`[Server] HLS 靜態文件路徑: ${hlsStaticPath}`);

app.use("/hls", express.static(hlsStaticPath, {
  // 正確的 MIME 類型和緩存控制
}));
```

### 2. **後端日誌和錯誤處理改進** ✅

**改進內容：**
- 增加詳細的串流啟動日誌
- 改進 HLS playlist 文件驗證邏輯
- 增加文件格式檢查（檢查 `#EXTM3U` 標記）
- 更清晰的錯誤訊息和進度顯示

```javascript
// 增加文件驗證
if (content.includes("#EXTM3U")) {
  console.log(`[RTSP Stream] ✓ HLS playlist 文件已生成並驗證`);
  // ...
}
```

### 3. **前端錯誤顯示改進** ✅

**改進內容：**
- 更詳細的錯誤訊息顯示（多行支援）
- 增加串流資訊面板（Stream ID、HLS URL、狀態、啟動時間）
- 改進日誌記錄（使用 `[RTSP Test]` 前綴）
- 增加 RTSP URL 格式驗證

**新增功能：**
- 串流資訊實時顯示
- 錯誤診斷提示
- 更好的視覺化反饋

### 4. **前端 API 層改進** ✅

**改進內容：**
- 增加詳細的 API 日誌記錄
- 自動隱藏 RTSP URL 中的密碼（日誌中顯示為 `****`）
- 改進錯誤訊息格式

## 📝 修改的檔案

### 後端檔案

1. **`src/server.js`**
   - 修復 HLS 靜態文件路徑
   - 改進 MIME 類型和緩存控制
   - 增加路徑日誌輸出

2. **`src/services/communication/rtspStreamService.js`**
   - 增加 HLS 輸出目錄日誌
   - 改進 playlist 文件驗證邏輯
   - 增加文件格式檢查
   - 更詳細的進度日誌

3. **`src/routes/rtspRoutes.js`**
   - 增加 RTSP URL 格式驗證
   - 增加詳細的日誌記錄
   - 改進錯誤處理

### 前端檔案

1. **`app/pages/rtsp.vue`**
   - 改進 UI 設計（串流資訊面板）
   - 增加錯誤訊息顯示區域
   - 改進日誌記錄和錯誤處理
   - 增加時間格式化函數
   - RTSP URL 格式驗證

2. **`app/components/rtsp/VideoPlayer.vue`**
   - 改進錯誤訊息顯示（多行支援）
   - 增加「停止」按鈕
   - 更詳細的診斷資訊

3. **`app/composables/useRtsp.ts`**
   - 增加詳細的 API 日誌記錄
   - 自動隱藏密碼資訊

## 🔍 診斷功能

### 後端診斷

- ✅ HLS 文件路徑日誌輸出
- ✅ FFmpeg 進程啟動日誌
- ✅ Playlist 文件生成驗證
- ✅ 詳細的錯誤訊息分類

### 前端診斷

- ✅ 串流資訊實時顯示
- ✅ 錯誤訊息詳細提示
- ✅ 控制台日誌追蹤（`[RTSP Test]` 前綴）
- ✅ RTSP URL 格式驗證

## 🧪 測試建議

### 1. 測試 RTSP URL 連接

```bash
# 測試 RTSP URL 是否可訪問
# 使用 FFmpeg 測試連接（在後端伺服器上執行）
ffmpeg -rtsp_transport tcp -i "rtsp://admin:password@192.168.2.103:554/Streaming/Channels/101" -t 5 -f null -
```

### 2. 檢查後端日誌

啟動串流時，應該看到以下日誌：

```
[RTSP Stream Service] HLS 輸出目錄: /path/to/src/public/hls
[Server] HLS 靜態文件路徑: /path/to/src/public/hls
[RTSP Routes] 收到啟動串流請求: rtsp://admin:****@192.168.2.103:554/...
[RTSP Stream] 使用編碼器: libx264 (軟體編碼)
[RTSP Stream] 啟動串流: <streamId>
[RTSP Stream] ✓ HLS playlist 文件已生成並驗證: <size> bytes
[RTSP Stream] ✓ 文件路徑: /path/to/src/public/hls/<streamId>/playlist.m3u8
[RTSP Stream] ✓ 訪問 URL: /hls/<streamId>/playlist.m3u8
```

### 3. 檢查 HLS 文件

確認以下文件存在：
```
src/public/hls/<streamId>/
  ├── playlist.m3u8
  ├── segment_000.ts
  ├── segment_001.ts
  └── ...
```

### 4. 測試 HLS URL 訪問

在瀏覽器中直接訪問：
```
http://192.168.2.8:4000/hls/<streamId>/playlist.m3u8
```

應該能看到 M3U8 文件內容。

## ⚠️ 常見問題排查

### 問題 1：HLS URL 404 錯誤

**可能原因：**
1. 後端路徑配置錯誤 → ✅ 已修復
2. FFmpeg 進程未正常啟動
3. RTSP URL 無法連接
4. 權限問題

**排查步驟：**
1. 檢查後端日誌中的 HLS 路徑輸出
2. 確認 `src/public/hls/<streamId>/playlist.m3u8` 文件是否存在
3. 檢查 FFmpeg 進程是否運行（`ps aux | grep ffmpeg` 或 Windows 任務管理器）
4. 測試 RTSP URL 連接

### 問題 2：RTSP 連接失敗

**可能原因：**
1. 攝影機 IP 無法訪問
2. 帳號密碼錯誤
3. RTSP 路徑錯誤
4. 防火牆阻止連接

**排查步驟：**
1. Ping 攝影機 IP：`ping 192.168.2.103`
2. 檢查 RTSP URL 格式
3. 使用 VLC 或其他 RTSP 播放器測試連接
4. 檢查後端錯誤日誌

### 問題 3：HLS 文件生成延遲

**正常情況：**
- FFmpeg 啟動需要 1-3 秒
- 第一個 TS 片段生成需要額外 1-2 秒
- 總共可能需要 3-5 秒

**如果超過 30 秒仍未生成：**
- 檢查 FFmpeg 進程狀態
- 查看後端錯誤日誌
- 確認 RTSP 串流是否正常

## 📊 改進成果

### 修復前
- ❌ HLS 文件路徑配置錯誤，導致 404
- ❌ 錯誤訊息不夠詳細
- ❌ 缺少診斷工具

### 修復後
- ✅ HLS 文件路徑正確配置
- ✅ 詳細的日誌和錯誤訊息
- ✅ 完整的診斷工具和資訊顯示
- ✅ 更好的使用者體驗

## 🚀 下一步建議

1. **整合設備管理系統**
   - 從設備列表直接啟動攝影機串流
   - 自動從設備配置生成 RTSP URL

2. **增加連接測試功能**
   - 在啟動串流前測試 RTSP 連接
   - 驗證帳號密碼是否正確

3. **性能優化**
   - 監控 FFmpeg 進程資源使用
   - 自動清理過期的 HLS 文件

4. **錯誤恢復機制**
   - 自動重試失敗的連接
   - 串流中斷自動恢復

---

**最後更新：** 2024年

