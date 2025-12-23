# RTSP 處理與攝影機設備新增分析報告

## 📋 目前 RTSP 處理架構

### 1. RTSP API 層 (`app/composables/useRtsp.ts`)

**功能：**
- `startStream(rtspUrl: string)` - 啟動 RTSP 串流，接收完整 RTSP URL
- `stopStream(streamId: string)` - 停止指定串流
- `getAllStreamStatus()` - 獲取所有串流狀態
- `getStreamStatus(streamId: string)` - 獲取單一串流狀態

**API 端點：**
- `POST /api/rtsp/start` - 啟動串流
- `POST /api/rtsp/stop/:streamId` - 停止串流
- `GET /api/rtsp/status` - 所有串流狀態
- `GET /api/rtsp/status/:streamId` - 單一串流狀態

**響應結構：**
```typescript
RTSPStreamInfo {
  streamId: string;
  rtspUrl: string;
  hlsUrl: string;
  status: "running" | "stopped";
  startedAt: string;
}
```

### 2. 視訊播放器組件 (`app/components/rtsp/VideoPlayer.vue`)

**功能特性：**
- 支援兩種模式：
  1. **RTSP URL 模式**：接收 RTSP URL，自動啟動串流並轉換為 HLS
  2. **HLS URL 模式**：直接接收 HLS URL（已有串流時使用）

- **播放技術：**
  - 使用 `hls.js` 庫處理 HLS 播放
  - 支援 Safari 原生 HLS 播放（fallback）
  - 低延遲配置（maxBufferLength: 3秒）

- **錯誤處理：**
  - HLS URL 可訪問性驗證（最多重試 30 次，每次間隔 1 秒）
  - 自動重試機制（最多 10 次）
  - 詳細的錯誤日誌

**組件 Props：**
```typescript
{
  rtspUrl?: string;      // RTSP URL（自動啟動）
  autoStart?: boolean;   // 自動啟動（預設 true）
  hlsUrl?: string;       // HLS URL（已有串流）
  streamId?: string;     // 串流 ID
}
```

### 3. RTSP 頁面 (`app/pages/rtsp.vue`)

**目前功能：**
- 手動輸入 RTSP URL
- 啟動/停止串流
- 顯示所有串流狀態列表
- 每 5 秒自動更新串流狀態

**問題：**
- ❌ 與設備管理系統完全分離
- ❌ 需要手動輸入完整 RTSP URL（包含帳號密碼）
- ❌ 無法從設備列表直接啟動攝影機串流

### 4. 攝影機設備類型定義 (`app/types/device.ts`)

**CameraDeviceConfig 結構：**
```typescript
interface CameraDeviceConfig {
  type: "camera";
  ip_address: string;      // 必填：IP 位址
  rtsp_url?: string;       // 選填：完整 RTSP URL
  port?: number;           // 選填：端口（預設 554）
  username?: string;       // 選填：使用者名稱
  password?: string;       // 選填：密碼
}
```

**設備儲存結構：**
- 設備資訊儲存在 `devices` 表
- 配置以 JSON 格式儲存在 `config` 欄位
- 包含 `type_id`（關聯到設備類型）和 `model_id`（關聯到設備型號）

### 5. 設備新增對話框 (`app/components/device/DeviceDialog.vue`)

**攝影機設備表單欄位：**
1. ✅ IP 位址（必填）
2. ✅ RTSP URL（選填）
3. ✅ 端口（選填，預設 554）
4. ✅ 使用者名稱（選填）
5. ✅ 密碼（選填）

**目前問題：**
- ⚠️ RTSP URL 為選填，但新增後沒有自動生成邏輯
- ⚠️ 即使有 IP、端口、帳密，也不會自動組合成 RTSP URL
- ⚠️ 表單與 RTSP 串流系統沒有整合

## 🔍 核心問題分析

### 問題 1：系統分離
**現況：**
- 設備管理系統獨立運作
- RTSP 串流系統獨立運作
- 兩個系統之間沒有連結

**影響：**
- 使用者需要在兩個不同頁面操作
- 無法直接從設備列表啟動攝影機串流
- 需要手動記住並輸入完整的 RTSP URL

### 問題 2：RTSP URL 處理不一致
**現況：**
- 設備配置中 RTSP URL 是選填
- 啟動串流時需要完整 RTSP URL
- 沒有自動組合 RTSP URL 的邏輯

**可能的 RTSP URL 格式：**
```
rtsp://username:password@ip:port/path
rtsp://ip:port/path
rtsp://username:password@ip/path
```

### 問題 3：缺少設備與串流的關聯
**現況：**
- 串流以 `streamId` 識別
- 設備以 `device.id` 識別
- 沒有建立設備與串流的對應關係

## 💡 改進建議

### 建議 1：整合設備與 RTSP 串流
1. **在設備列表頁面增加「啟動串流」按鈕**（僅攝影機設備）
2. **自動從設備配置生成 RTSP URL**
3. **建立設備與串流的關聯**（在後端或前端快取）

### 建議 2：優化 RTSP URL 生成邏輯
1. **實作 RTSP URL 組合函數：**
   ```typescript
   function buildRtspUrl(config: CameraDeviceConfig, path?: string): string
   ```

2. **支援多種組合方式：**
   - 如果已有 `rtsp_url`，直接使用
   - 如果有 IP + 帳密 + 端口，自動組合
   - 提供預設路徑（如 `/Streaming/Channels/101`）

### 建議 3：增強 RTSP 頁面功能
1. **從設備列表載入攝影機**
2. **顯示設備資訊與串流狀態**
3. **一鍵啟動/停止串流**

### 建議 4：改進設備新增流程
1. **RTSP URL 自動生成預覽**
2. **測試連接功能**（可選）
3. **更清晰的欄位說明**

## 🎯 重新定義攝影機設備新增流程

### 新流程設計：

#### 步驟 1：基本資訊
- 設備名稱（必填）
- 設備型號（必填，從下拉選單選擇）

#### 步驟 2：連線資訊
- IP 位址（必填）
- 端口（選填，預設 554）
- 使用者名稱（選填）
- 密碼（選填）

#### 步驟 3：RTSP 配置
- **選項 A：使用完整 RTSP URL**
  - 直接輸入完整 RTSP URL
  - 系統自動解析 IP、端口、帳密（可選）

- **選項 B：自動生成 RTSP URL**
  - 從 IP + 端口 + 帳密自動組合
  - 提供常見路徑模板選擇：
    - `/Streaming/Channels/101` (Hikvision)
    - `/Streaming/Channels/001` (Dahua)
    - `/live/main_stream` (通用)
    - 自訂路徑

#### 步驟 4：RTSP URL 預覽與驗證
- 顯示生成的 RTSP URL
- 提供「測試連接」按鈕（可選，需要後端支援）

### 實作重點：

1. **RTSP URL 組合邏輯：**
   ```typescript
   function buildRtspUrl(config: CameraDeviceConfig, streamPath?: string): string {
     const { ip_address, port = 554, username, password } = config;
     const path = streamPath || config.rtsp_url?.split('/').slice(3).join('/') || '/Streaming/Channels/101';
     
     let url = `rtsp://${ip_address}`;
     if (port && port !== 554) {
       url += `:${port}`;
     }
     url += path;
     
     if (username || password) {
       const auth = `${username || ''}:${password || ''}`;
       url = url.replace('rtsp://', `rtsp://${auth}@`);
     }
     
     return url;
   }
   ```

2. **設備與串流關聯：**
   - 前端：使用 Map 或物件儲存 `deviceId -> streamId` 對應
   - 後端：可考慮在串流資訊中加入 `deviceId` 欄位

3. **UI 改進：**
   - 在設備列表增加「播放」按鈕（攝影機設備）
   - 點擊後自動啟動串流並顯示播放視窗
   - 顯示當前串流狀態

## 📝 實作優先順序

### Phase 1：核心功能整合
1. ✅ 實作 RTSP URL 組合函數
2. ✅ 改進設備新增表單（RTSP URL 自動生成）
3. ✅ 在設備列表增加「啟動串流」功能

### Phase 2：使用者體驗優化
1. ⚠️ 串流狀態顯示（設備列表）
2. ⚠️ RTSP 頁面整合設備列表
3. ⚠️ 測試連接功能

### Phase 3：進階功能
1. ⏳ 批量啟動/停止
2. ⏳ 串流錄製功能
3. ⏳ 串流品質設定

## 🔧 技術實作細節

### 需要修改的檔案：

1. **`app/composables/useRtsp.ts`**
   - 新增 `startStreamFromDevice(device: Device)` 方法
   - 自動從設備配置生成 RTSP URL

2. **`app/components/device/DeviceDialog.vue`**
   - 改進攝影機設備表單
   - 增加 RTSP URL 預覽
   - 增加路徑模板選擇

3. **`app/pages/system/devices.vue`**
   - 在攝影機設備列表增加「播放」按鈕
   - 整合串流狀態顯示

4. **`app/pages/rtsp.vue`**
   - 從設備 API 載入攝影機列表
   - 顯示設備資訊

5. **`app/utils/camera.ts`**（新建）
   - RTSP URL 組合函數
   - RTSP URL 解析函數

---

**最後更新：** 2024年

