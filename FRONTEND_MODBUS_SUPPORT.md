# 前端 Modbus 功能支援清單

## 📊 總覽

前端目前透過 `/system/modbus` 頁面提供 Modbus 資料的讀取、顯示和控制功能。

---

## ✅ 已實作並在頁面顯示的功能

### 1. 健康檢查與連線狀態

- **API**: `getHealth()`
- **UI 顯示**:
  - 連線狀態（已連線/未連線）
  - 目標裝置（IP:Port）
  - Unit ID
  - 最後連線時間
- **自動更新**: 每 2 秒自動刷新

### 2. 離散輸入 (DI) - Function 02

- **API**: `getDiscreteInputs(address, length)`
- **UI 顯示**:
  - 表格顯示每個 DI 的位址和狀態（啟動/關閉）
  - 可手動刷新此區塊
- **功能**: 僅讀取，無寫入功能
- **自動更新**: 每 2 秒自動刷新

### 3. Holding Registers - Function 03

- **API**: `getHoldingRegisters(address, length)`
- **UI 顯示**:
  - 表格顯示每個暫存器的位址和數值
  - 可手動刷新此區塊
- **功能**: 僅讀取，無寫入功能
- **自動更新**: 每 2 秒自動刷新

### 4. 數位輸出 (DO) - Function 01/05 ⭐

- **API**:
  - `getCoils(address, length)` - 讀取
  - `writeCoil(address, value)` - 寫入單個
  - `writeCoils(address, values)` - 寫入多個（API 有，但 UI 未使用）
- **UI 顯示**:
  - 表格顯示每個 DO 的編號、Modbus 位址、狀態
  - 每個 DO 有「啟動/關閉」按鈕
  - 可手動刷新此區塊
- **功能**:
  - ✅ 讀取 DO 狀態
  - ✅ 寫入單個 DO（點擊按鈕切換狀態）
  - ❌ 寫入多個 DO（API 支援但 UI 未實作）
- **自動更新**: 每 2 秒自動刷新，寫入後立即重新讀取

---

## 🔧 API Composable 支援（但頁面未使用）

### 輸入暫存器 (Input Registers) - Function 04

- **API**: `getInputRegisters(address, length)`
- **狀態**: API 已實作，但頁面未顯示
- **說明**: 保留供未來使用

---

## 🎨 UI 功能

### 表單控制

- **開始位址輸入**: 可設定讀取起始位址（預設 0）
- **筆數輸入**: 可設定讀取筆數（1-125，預設 20）
- **立即讀取按鈕**: 手動觸發所有資料讀取

### 自動刷新機制

- **間隔**: 每 2 秒自動刷新一次
- **範圍**: 包含健康檢查、DI、Holding Registers、DO
- **靜默模式**: 自動刷新時不顯示錯誤訊息

### 手動刷新

- **全站刷新**: 右上角「重新整理」按鈕
- **區塊刷新**: 每個資料區塊都有「只更新此區塊」按鈕

### 錯誤處理

- **表單驗證**: 自動驗證位址和筆數範圍
- **錯誤顯示**: 在表單下方顯示錯誤訊息
- **連線狀態**: 未連線時 DO 控制按鈕會 disabled

---

## 📋 功能對照表

| 功能                       | API 支援 | UI 顯示 | 可控制 | 自動刷新 |
| -------------------------- | -------- | ------- | ------ | -------- |
| 健康檢查                   | ✅       | ✅      | ❌     | ✅       |
| 離散輸入 (DI)              | ✅       | ✅      | ❌     | ✅       |
| Holding Registers          | ✅       | ✅      | ❌     | ✅       |
| 數位輸出 (DO) 讀取         | ✅       | ✅      | ❌     | ✅       |
| 數位輸出 (DO) 寫入（單個） | ✅       | ✅      | ✅     | ✅       |
| 數位輸出 (DO) 寫入（多個） | ✅       | ❌      | ❌     | -        |
| Input Registers            | ✅       | ❌      | ❌     | -        |

---

## 🚀 使用方式

### 基本操作流程

1. **進入頁面**: 訪問 `/system/modbus`
2. **自動載入**: 頁面載入時自動讀取所有資料
3. **設定範圍**: 在表單中設定開始位址和筆數
4. **讀取資料**: 點擊「立即讀取」或等待自動刷新
5. **控制 DO**: 在 DO 表格中點擊「啟動/關閉」按鈕

### DO 控制範例

```typescript
// 在頁面中，點擊 DO 按鈕會觸發：
handleToggleCoil(address, value)
  ↓
modbusApi.writeCoil(address, value)  // 寫入
  ↓
loadCoils({ suppressError: true })   // 重新讀取確認
```

---

## 📝 待擴充功能（建議）

### 1. Input Registers 顯示

- 目前 API 已支援，但頁面未顯示
- 建議：新增 Input Registers 表格區塊

### 2. 多個 DO 批量寫入

- 目前 API 已支援 `writeCoils()`
- 建議：新增批量選擇和寫入功能

### 3. Holding Registers 寫入

- 目前僅支援讀取
- 建議：新增寫入功能（Function 06/16）

### 4. 資料歷史記錄

- 目前僅顯示即時資料
- 建議：記錄歷史變化，提供趨勢圖表

### 5. 自訂刷新間隔

- 目前固定 2 秒
- 建議：允許使用者自訂刷新間隔

---

## 🔍 技術細節

### 資料流

```
頁面載入
  ↓
loadData() → 並行讀取
  ├─ getHealth()
  ├─ getDiscreteInputs()
  ├─ getHoldingRegisters()
  └─ getCoils()
  ↓
更新 UI
  ↓
自動刷新（每 2 秒）
```

### 狀態管理

- 使用 Vue 3 Composition API
- 響應式資料：`ref()` 和 `reactive()`
- 計算屬性：`computed()`
- 生命週期：`onMounted()`, `onBeforeUnmount()`

### 錯誤處理

- 表單驗證：`validateForm()`
- API 錯誤：try-catch + 錯誤訊息顯示
- 連線檢查：`isConnected` computed 屬性

---

## 📌 總結

**目前前端完整支援：**

- ✅ 3 種讀取功能（DI、Holding Registers、DO）
- ✅ 1 種寫入功能（DO 單個寫入）
- ✅ 健康檢查與連線狀態
- ✅ 自動刷新機制（2 秒間隔）
- ✅ 手動刷新功能
- ✅ 錯誤處理與表單驗證

**API 支援但 UI 未使用：**

- ⚠️ Input Registers 讀取
- ⚠️ DO 多個寫入

**完全未支援：**

- ❌ Holding Registers 寫入
- ❌ Input Registers 寫入
