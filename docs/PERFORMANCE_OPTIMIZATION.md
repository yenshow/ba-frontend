# 首頁性能優化分析與建議

## 📊 當前問題分析

### 1. 串行載入問題
**問題位置**: `app/pages/index.vue` 的 `onMounted` 鉤子

**當前流程**:
```
loadZones() 
  ↓ (等待完成)
nextTick() 
  ↓ (等待完成)
initializeLocationData() 
  ↓ (等待完成)
startPolling() 
  ↓ (等待完成)
loadPeopleCountingLocations() 
  ↓ (等待完成)
loadAllLocationLogs()
```

**問題**: 總等待時間 = 所有操作時間的總和，造成畫面長時間空白

### 2. 圖片載入問題
**問題位置**: `app/components/home/EntryExitLog.vue`

**當前實現**: 圖片逐個載入（串行）
```typescript
props.logs.forEach((log) => {
  if (log.deviceScreenshotUrl && !imageUrls.value[log.id] && !imageLoadingStates.value[log.id]) {
    loadImage(log); // 逐個執行
  }
});
```

**問題**: 8 張圖片串行載入，每張約 100-150ms，總耗時約 800-1200ms

### 3. 重複 API 調用
**問題**: 
- `loadZones()` 調用 `/locations/zones`
- `loadPeopleCountingLocations()` 內部可能也調用 `/locations/zones?locationType=people_counting`
- 兩個請求可能獲取相同的數據

### 4. 輪詢啟動時機
**問題**: 輪詢在 `initializeLocationData()` 完成後才啟動，但可以更早啟動（使用 `immediate: true`）

### 5. 感測器數據載入順序
**問題**: 
- `loadLocationSensorDevice()` 需要等待設備配置
- `loadSensorData()` 需要等待設備配置完成
- 但這些操作可以與其他獨立操作並行

## 🚀 優化方案

### 優化 1: 並行載入獨立數據
**目標**: 將獨立的數據載入操作並行執行

**實施**:
```typescript
onMounted(async () => {
  // 1. 並行載入基礎數據（不互相依賴）
  const [zonesResult, peopleCountingResult] = await Promise.allSettled([
    loadZones(),
    loadPeopleCountingLocations()
  ]);

  // 2. 等待 zones 完成後初始化地點數據（有依賴關係）
  await nextTick();
  if (zonesResult.status === 'fulfilled') {
    await initializeLocationData();
  }

  // 3. 啟動輪詢（立即執行一次）
  startPolling();

  // 4. 載入進出記錄（可以與感測器數據並行）
  if (peopleCountingResult.status === 'fulfilled') {
    await loadAllLocationLogs();
  }
});
```

**預期效果**: 減少約 500-800ms 的等待時間

### 優化 2: 並行載入圖片
**目標**: 同時載入多張圖片，而非逐個載入

**實施**: 修改 `EntryExitLog.vue` 的 `loadAllImages` 函數
```typescript
const loadAllImages = async () => {
  const imagePromises = props.logs
    .filter(log => 
      log.deviceScreenshotUrl && 
      !imageUrls.value[log.id] && 
      !imageLoadingStates.value[log.id]
    )
    .map(log => loadImage(log));
  
  await Promise.allSettled(imagePromises);
};
```

**預期效果**: 圖片載入時間從 800-1200ms 減少到 150-200ms（最慢的圖片時間）

### 優化 3: 共享 Zones 數據
**目標**: 避免重複調用相同的 API

**實施**: 
- 在 `loadPeopleCountingLocations()` 時，如果已經有 `unifiedZones`，直接傳入
- 修改 `usePeopleCountingApi.getLocations()` 接受現有 zones

**預期效果**: 減少一個 API 請求，節省約 30-70ms

### 優化 4: 提前啟動輪詢
**目標**: 使用 `immediate: true` 讓輪詢立即執行一次

**實施**: 
```typescript
const { start: startPolling } = usePolling({
  callback: async () => {
    await loadSensorData();
  },
  interval: SENSOR_POLLING_INTERVAL,
  immediate: true, // 立即執行一次
  onError: err => {
    handleError(err, "載入感測器資料失敗");
  }
});
```

**預期效果**: 感測器數據可以更早顯示

### 優化 5: 優化感測器數據載入
**目標**: 在設備配置載入的同時，可以開始其他操作

**實施**: 
- 將 `loadLocationSensorDevice` 和 `loadSensorData` 的等待改為非阻塞
- 使用 `Promise.allSettled` 並行執行多個操作

## 📈 預期優化效果

| 優化項目 | 當前耗時 | 優化後耗時 | 改善幅度 |
|---------|---------|-----------|---------|
| 初始化載入 | ~2000-3000ms | ~800-1200ms | **60-70%** |
| 圖片載入 | ~800-1200ms | ~150-200ms | **80-85%** |
| API 請求數 | 8-10 個 | 7-9 個 | **10-15%** |
| 首屏渲染時間 | ~3000-4000ms | ~1200-1800ms | **60-65%** |

## 🔧 實施優先級

1. **高優先級** (立即實施):
   - ✅ 優化 1: 並行載入獨立數據
   - ✅ 優化 2: 並行載入圖片
   - ✅ 優化 4: 提前啟動輪詢

2. **中優先級** (後續優化):
   - ⚠️ 優化 3: 共享 Zones 數據
   - ⚠️ 優化 5: 優化感測器數據載入

3. **低優先級** (可選):
   - 💡 添加數據緩存機制
   - 💡 實現虛擬滾動（如果記錄很多）
   - 💡 圖片懶加載優化

## 📝 注意事項

1. **錯誤處理**: 使用 `Promise.allSettled` 確保部分失敗不影響整體
2. **依賴關係**: 確保有依賴關係的操作按順序執行
3. **用戶體驗**: 即使數據未完全載入，也要顯示骨架屏或載入狀態
4. **測試**: 優化後需要測試各種網絡條件下的表現

