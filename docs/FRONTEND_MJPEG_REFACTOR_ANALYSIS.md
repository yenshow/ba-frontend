# 前端影像監視重構：RTSP/HLS → 設備 MJPEG 預覽

## 1. 現況分析

### 1.1 現有流程（已棄用）

- 攝影機列表：`useSurveillanceApi.getCameraDevices()` / `getCamerasWithStreamInfo()`（含後端 RTSP 串流狀態）
- 啟動串流：`POST /api/rtsp/start`（傳 rtspUrl），後端 FFmpeg/MediaMTX 轉 HLS
- 停止串流：`POST /api/rtsp/stop/:streamId`
- 狀態查詢：`GET /api/rtsp/status`、`GET /api/rtsp/status/:streamId`
- 前端播放：HLS.js 播放 `hlsUrl`（VideoPlayer.vue）
- WebSocket：監聽 `rtsp:stream:started`、`rtsp:stream:stopped`、`rtsp:stream:error` 同步狀態
- 設備設定：攝影機 config 含 `rtsp_url`、`ip_address`、`port` 等，用於組 RTSP URL

### 1.2 涉及檔案

| 類別 | 檔案 | 說明 |
|------|------|------|
| API | `useRtsp.ts` | RTSP start/stop/status/refresh，**移除** |
| API | `useSurveillanceApi.ts` | buildRtspUrl、start/stopCameraStream、getCameraStreamStatus，**改為僅設備列表 + getPreviewUrl** |
| API | `useDeviceApi.ts` | **新增** getPreviewUrl(deviceId) → GET /devices/:id/preview-url |
| 狀態 | `useStreamStatus.ts` | 協調 camera + monitorViews + batch + 測試串流，**精簡為僅攝影機列表 + 監控畫面（previewUrl）** |
| 狀態 | `useCameraStreamStatus.ts` | 串流狀態、WebSocket、測試串流，**改為僅 loadCameras + 無 start/stop** |
| 狀態 | `useMonitorViews.ts` | hlsUrl/streamId、sync 串流狀態、測試串流，**改為 previewUrl，移除測試串流與 sync** |
| 狀態 | `useStreamBatchOperations.ts` | 批量啟動/停止串流，**移除** |
| 類型 | `types/rtsp.ts` | RTSPStreamInfo 等，**移除或僅留預覽回傳型別** |
| 類型 | `types/device.ts` | CameraDeviceConfig 含 rtsp_url，**改為 host + isapi_preview_path** |
| 類型 | `types/surveillance.ts` | streamInfo、MonitorView.hlsUrl/streamId，**改為 MonitorView.previewUrl** |
| 組件 | `VideoPlayer.vue` | HLS 播放、start/stop，**改為 MJPEG 預覽（img 或專用 MjpegPlayer）** |
| 組件 | `SurveillanceCameraGrid.vue` | 依 hlsUrl/streamId 顯示播放器、啟動/停止，**改為 previewUrl、移除啟動/停止** |
| 組件 | `SurveillanceCameraCard.vue` | 顯示 isStreaming，**改為僅顯示可加入預覽** |
| 組件 | `SurveillanceControlPanel.vue` | 串流數、啟動全部/停止全部，**改為僅攝影機數與版面** |
| 頁面 | `surveillance.vue` | RTSP 測試區、handleStartStream/handleStopStream、批量操作，**移除 RTSP 測試與啟動/停止，改為加入即顯示 MJPEG** |
| 設備 | `DeviceDialog.vue` | 攝影機 rtsp_url、ip_address，**改為 host + isapi_preview_path** |
| 設備 | `equipment-management.vue` | 顯示 ip_address/rtsp_url，**改為 host + isapi_preview_path** |
| WebSocket | `useWebSocket.ts` | RTSP 事件型別與監聽，**移除 RTSP 相關** |
| 設定 | `nuxt.config.ts` | mediamtxHlsUrl、mediamtxWebrtcUrl，**移除** |
| 工具 | `hlsInstanceManager`、`streamErrorUtils` | **已移除**（HLS 與串流錯誤處理不再使用） |

---

## 2. 新流程（MJPEG）

1. **攝影機列表**：`GET /api/devices?type_code=camera`，不再查 RTSP 狀態。
2. **預覽 URL**：使用者將攝影機「加入監控畫面」時，呼叫 `GET /api/devices/:id/preview-url`，取得 `{ url, streamType: "mjpeg", deviceId, deviceName }`。
3. **顯示**：監控格內以 `<img :src="previewUrl">` 或 MJPEG 組件顯示，無需啟動/停止串流。
4. **設備設定**：攝影機 config 為 `host`（或 ip_address）、`isapi_preview_path`（必填）、`port`、`username`、`password`。

---

## 3. 重構對照表

| 項目 | 移除 | 新增／修改 |
|------|------|------------|
| 設備 config | rtsp_url 必填/主要 | host + isapi_preview_path（必填） |
| API | POST /api/rtsp/*、GET /api/rtsp/status* | GET /api/devices/:id/preview-url |
| 播放 | HLS.js + hlsUrl | MJPEG img + previewUrl |
| 狀態 | streamId、hlsUrl、isStreaming、串流狀態同步 | 僅 monitorViews[].previewUrl |
| 操作 | 啟動串流、停止串流、批量啟動/停止、RTSP 測試 | 僅「加入畫面」（取得 previewUrl）、「移除畫面」 |
| WebSocket | rtsp:stream:* | 無（不需串流生命週期） |
| 設定 | mediamtxHlsUrl、mediamtxWebrtcUrl | 無 |

---

**最後更新**：2025-03-05  
**對應後端**：`ba-backend/docs/DEVICE_MJPEG_REFACTOR_RETAIN.md`
