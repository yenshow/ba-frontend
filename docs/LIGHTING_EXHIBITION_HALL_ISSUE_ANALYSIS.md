# 照明系統「展廳燈組」狀態顯示與開關控制問題分析

## 一、問題描述

- **現象**：前端畫面「展廳燈組」對應的 DI 點位  
  - 未正確顯示狀態（Modbus 掃描顯示 Coils 地址 9 為 ON，但畫面顯示「已關閉」）  
  - 無法正確發送開關控制  
- **環境**：設備 `192.168.2.205:502`，Unit ID 1，Coils 掃描結果為地址 9 = ON。

---

## 二、根因分析

### 2.1 前端：狀態中心 Props 名稱不一致（導致狀態永遠為預設值）

| 位置 | 傳遞的 Prop（lighting.vue） | 子組件定義（StatusCenter.vue） |
|------|-----------------------------|---------------------------------|
| 狀態 | `:location-statuses="locationStatuses"` | `areaStatuses` |
| 禁用 | `:location-disabled-map="locationDisabledMap"` | `areaDisabledMap` |
| 切換中 | `:location-toggling="locationToggling"` | `areaToggling` |

Vue 會將 `location-statuses` 轉成子組件的 `locationStatuses`，但子組件只定義了 `areaStatuses`，因此**子組件從未收到狀態資料**，`props.areaStatuses` 為 `undefined`（或預設 `{}`）。  
結果是 `getLocationStatus()` 永遠回傳預設值：

- `isRunning: false` → 畫面固定顯示「已關閉」
- `healthLabel: "正常"` → 健康狀態固定為「正常」

**結論**：不論後端或 Modbus 實際狀態為何，狀態中心都會顯示「已關閉」與「正常」，屬於前端 bug。

---

### 2.2 點位類型與 Modbus 協定對應

| Modbus 類型 | 功能碼 | 讀取 | 寫入 | 前端用途 |
|-------------|--------|------|------|----------|
| **Coils (DO)** | FC01 讀 / FC05、FC15 寫 | ✅ | ✅ | 顯示狀態 + 發送開關 |
| **Discrete Inputs (DI)** | FC02 | ✅ | ❌ 唯讀 | 僅顯示狀態 |

- 掃描指令為 **Coils**（FC01），地址 9 = ON 表示**線圈（Coil）** 狀態為 ON。  
- 若「展廳燈組」在系統中僅配置為 **DI 點**：  
  - **讀取**：前端會呼叫 `GET /api/modbus/discrete-inputs`（FC02），不會讀 Coils。  
  - **寫入**：前端只對 **DO（Coils）** 寫入；若沒有 DO 點位，`extractWritePoints` 為空，開關會被禁用或寫入邏輯不執行。

因此可能出現：

1. **狀態不對**：實際狀態在 Coils 地址 9，但前端只讀 DI，顯示與實際不符或讀取失敗後顯示預設「已關閉」。  
2. **開關無效**：僅配置 DI、未配置 DO 時，無法寫入，開關無法正確發送。

---

### 2.3 前端讀寫邏輯摘要

**讀取狀態（`extractReadPoint`，`lighting.vue`）**

- 有 `points` 時：**優先 DI**（`type === "DI"`），取第一個 DI 的 `address`，讀取方式為 `discrete-inputs`（FC02）。  
- 僅當沒有 DI 時，才用 DO（Coils）讀取，呼叫 `GET /api/modbus/coils`（FC01）。

**寫入開關（`extractWritePoints`、`executeToggle`）**

- 僅處理 **DO 點位**（`type === "DO"` 或相容的 `method`）。  
- 寫入一律透過 `PUT /api/modbus/coils`（FC05/FC15）。  
- 若某地點**只有 DI、沒有 DO**：  
  - `extractWritePoints` 為空 → `locationDisabledMap` 會將該地點開關設為禁用，或  
  - `executeToggle` 中 `writeAddresses.length === 0` 直接 return，不發送寫入。

**結論**：  
- 狀態顯示依賴「讀取點位類型」與「實際設備是否把狀態放在 Coils 或 DI」。  
- 開關能否發送依賴「是否有 DO 點位」；僅 DI 無法寫入。

---

### 2.4 後端行為摘要

- **照明監控**（`lightingMonitor.js`）：僅用每個地點的 **第一個 DI 或 DO 地址** 做**連線檢測**（讀一次以判斷設備是否在線），**不負責**回傳「開/關」狀態給前端。  
- **前端狀態**：由前端輪詢 `GET /api/modbus/coils` 或 `GET /api/modbus/discrete-inputs`，再更新 `locationStatuses`。  
- **寫入**：前端呼叫 `PUT /api/modbus/coils`，後端 `modbusRoutes.js` 與 `modbusClient.writeCoil/writeCoils` 處理寫入。

因此，展廳燈組「狀態不對、開關無效」的關鍵在前端邏輯與點位配置（DI/DO 與地址），而非後端監控任務本身。

---

## 三、資料流簡圖

```
┌─────────────────────────────────────────────────────────────────────────┐
│  lighting.vue                                                            │
│  locationStatuses (ref) ← loadAllLocationStatuses() 輪詢                 │
│       ↓                                                                  │
│  依據 extractReadPoint(location.modbus)：                                │
│    若為 DI → GET /api/modbus/discrete-inputs → 更新 isRunning             │
│    若為 DO → GET /api/modbus/coils          → 更新 isRunning             │
│       ↓                                                                  │
│  傳給 StatusCenter：:location-statuses="locationStatuses"                │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  StatusCenter.vue（問題點）                                              │
│  定義 props: areaStatuses → 與父組件傳入的 locationStatuses 不符         │
│  → props.areaStatuses 為 undefined → 永遠顯示預設「已關閉」「正常」      │
└─────────────────────────────────────────────────────────────────────────┘

開關發送：
  StatusCenter emit("toggle") → lighting.vue handleLocationToggle
  → executeToggle → extractWritePoints（僅 DO）→ PUT /api/modbus/coils
  若展廳燈組僅配 DI、無 DO → writeAddresses 為空 → 不發送或開關被禁用
```

---

## 四、修復建議

### 4.1 必須修復：狀態中心 Props 對齊

- 在 **StatusCenter.vue** 中，將 props 改為與父組件傳入一致：  
  - `areaStatuses` → `locationStatuses`  
  - `areaDisabledMap` → `locationDisabledMap`  
  - `areaToggling` → `locationToggling`  
- 模板與 script 中所有使用 `props.areaStatuses`、`props.areaDisabledMap`、`props.areaToggling` 的地方，改為使用上述新名稱。  

修復後，父組件的 `locationStatuses` 會正確傳入，狀態中心才能顯示輪詢得到的真實開/關與健康狀態。

### 4.2 點位配置建議（展廳燈組）

若實際設備狀態與控制都在 **Coils 地址 9**（與掃描結果一致）：

- **方案 A（建議）**：將該點位配置為 **DO**（Coils）：  
  - 讀取狀態：`GET /api/modbus/coils`（與掃描一致）  
  - 寫入開關：`PUT /api/modbus/coils`  
  - 前端會用同一 DO 點位做「顯示狀態」與「發送開關」。
- **方案 B**：若設備同時提供 DI（狀態回饋）與 DO（控制）：  
  - 可配置一個 DI 用於顯示、一個 DO 用於寫入；  
  - 需確保地址與設備接線/規劃一致（例如狀態在 Coils 9，則讀取應使用 Coils 9，或設備另有 DI 對應同一邏輯）。

### 4.3 後端無需改動

- 照明監控僅做連線檢測，不需改動。  
- Modbus 讀寫 API（coils / discrete-inputs）與寫入邏輯已正確，問題在於前端使用的點位類型與 Props 傳遞。

---

## 五、總結

| 問題 | 原因 | 處理方式 |
|------|------|----------|
| 狀態未正常顯示 | 1) StatusCenter 使用 `areaStatuses`，父組件傳的是 `locationStatuses`，狀態未傳入<br>2) 若僅配 DI 而實際狀態在 Coils 9，讀取來源錯誤 | 1) 修正 StatusCenter props 與父組件一致<br>2) 展廳燈組改為用 Coils（DO）讀寫，或確認 DI 與設備實際接線一致 |
| 無法正確發送開關 | 展廳燈組僅配置 DI、無 DO，前端只對 DO 寫入 | 為展廳燈組配置 DO 點位（Coils 地址 9），或依設備規劃同時配置 DI（顯示）+ DO（控制） |

完成上述 Props 修正與點位配置後，展廳燈組的狀態顯示與開關控制應可與 Modbus 掃描結果（Coils 9 = ON）及實際設備一致。

---

## 六、按鈕狀態即時響應優化（延遲與流程）

### 6.1 問題

- 點擊開關後，畫面更新有明顯延遲或與預期不符。
- 可能原因：樂觀更新在防抖之後才執行、輪詢結果覆蓋剛切換的狀態、loading 時間過長。

### 6.2 優化措施（已實作）

| 項目 | 說明 |
|------|------|
| **即時樂觀更新** | 在 `handleLocationToggle` 內，點擊當下就更新 `locationStatuses[locationId].isRunning`，並記錄 `lastToggledAt`。防抖只延遲「發送寫入」，不延遲畫面。 |
| **防抖縮短** | `TOGGLE_DEBOUNCE_DELAY` 由 300ms 改為 150ms，兼顧即時感與防止連點。 |
| **輪詢不覆蓋剛切換** | `updateLocationStatuses` 增加選項 `fromToggledRead`。輪詢呼叫時不傳（視為來自輪詢），若該地點在 `TOGGLE_GUARD_MS`（3 秒）內有切換記錄，不覆蓋其 `isRunning`，避免設備延遲導致畫面被舊值蓋回。 |
| **提早結束 loading** | 寫入成功後立即 `locationToggling.delete(locationId)`，按鈕馬上可再操作；延遲 200ms 的重讀改為背景執行，並以 `fromToggledRead: true` 呼叫 `processBatchRequests`，重讀結果會寫回狀態，並清除該地點的 `lastToggledAt`。 |

### 6.3 流程簡圖（優化後）

```
使用者點擊
  → 立即：locationStatuses[id].isRunning = targetValue、lastToggledAt.set(id)
  → 150ms 防抖後：executeToggle（加入 locationToggling、寫入 Modbus）
  → 寫入成功：locationToggling.delete(id)（loading 結束）
  → 200ms 後背景：重讀狀態並 processBatchRequests(..., { fromToggledRead: true })、lastToggledAt.delete(id)
輪詢（每 5s）
  → processBatchRequests(...) 不傳 fromToggledRead
  → updateLocationStatuses 時，若 id 在 3 秒內曾切換則不覆蓋 isRunning
```
