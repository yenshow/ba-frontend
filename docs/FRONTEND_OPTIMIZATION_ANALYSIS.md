# 前端代碼優化分析

## 發現的重複模式

### 1. 三個系統 API 的完全相同的模式

**useEnvironmentApi, useLightingApi, usePeopleCountingLocationApi** 都有相同的結構：

```typescript
// 模式 1: getZones
getZones: async () => {
  const response = await locationApi.getZones("systemType");
  return {
    zones: response.zones.map(zone => backendToXxxZone(zone))
  };
}

// 模式 2: getZone
getZone: async (id: string) => {
  const response = await locationApi.getZone(id, "systemType");
  return {
    zone: backendToXxxZone(response.zone)
  };
}

// 模式 3: createZone
createZone: async (data: CreateXxxZoneData) => {
  const unifiedData = xxxToUnifiedZone(data, "systemType");
  const response = await locationApi.createZone(unifiedData);
  return {
    merged: response.merged,
    message: response.message,
    zone: backendToXxxZone(response.zone)
  };
}

// 模式 4: updateZone
updateZone: async (id: string, data: UpdateXxxZoneData) => {
  const unifiedData = buildUnifiedZoneUpdateData(data, {
    systemType: "systemType",
    locationConverter: xxxLocationToUnified
  });
  const response = await locationApi.updateZone(id, unifiedData);
  return {
    merged: response.merged,
    message: response.message,
    zone: backendToXxxZone(response.zone)
  };
}

// 模式 5: deleteZone
deleteZone: locationApi.deleteZone
```

### 2. 可以優化的地方

1. **創建通用的系統 API 工廠函數**：統一處理所有系統的 CRUD 操作
2. **簡化 buildUnifiedZoneUpdateData 的類型定義**
3. **統一 createZone 的處理邏輯**

## 優化方案

### 方案：創建通用的系統 API 工廠函數

創建 `useSystemLocationApiFactory` 來統一處理所有系統的區域管理 API。

## 優化實施結果

### ✅ 已完成的優化

1. **創建通用的系統 API 工廠函數**
   - 文件：`app/composables/systems/location/useSystemLocationApiFactory.ts`
   - 統一處理所有系統的區域管理 API（getZones, getZone, createZone, updateZone, deleteZone）

2. **重構三個系統 API**
   - `useEnvironmentApi`: 從 ~110 行減少到 ~110 行（區域管理部分從 ~50 行減少到 ~15 行）
   - `useLightingApi`: 從 ~94 行減少到 ~64 行（區域管理部分從 ~50 行減少到 ~15 行）
   - `usePeopleCountingLocationApi`: 從 ~209 行減少到 ~180 行（區域管理部分從 ~50 行減少到 ~15 行）

### 優化前後對比

**優化前（useEnvironmentApi.ts）：**
```typescript
export const useEnvironmentApi = () => {
  const locationApi = useLocationApi();
  
  return {
    getZones: async () => {
      const response = await locationApi.getZones("environment");
      return {
        zones: response.zones.map((zone) => backendToEnvironmentZone(zone))
      };
    },
    getZone: async (id: string) => {
      const response = await locationApi.getZone(id, "environment");
      return {
        zone: backendToEnvironmentZone(response.zone)
      };
    },
    createZone: async (data: CreateEnvironmentZoneData) => {
      const unifiedData = environmentToUnifiedZone(
        { name: data.name, locations: data.locations || [] },
        "environment"
      );
      const response = await locationApi.createZone(unifiedData);
      return {
        merged: response.merged,
        message: response.message,
        zone: backendToEnvironmentZone(response.zone)
      };
    },
    updateZone: async (id: string, data: UpdateEnvironmentZoneData) => {
      const unifiedData = buildUnifiedZoneUpdateData(data, {
        systemType: "environment",
        locationConverter: environmentLocationToUnified
      });
      const response = await locationApi.updateZone(id, unifiedData);
      return {
        merged: response.merged,
        message: response.message,
        zone: backendToEnvironmentZone(response.zone)
      };
    },
    deleteZone: locationApi.deleteZone,
    // ... 其他 API
  };
};
```

**優化後：**
```typescript
export const useEnvironmentApi = () => {
  // 使用通用 Factory 創建區域管理 API
  const zoneApi = useSystemLocationApiFactory<EnvironmentZone, EnvironmentLocation>({
    systemType: "environment",
    backendToSystemZone: backendToEnvironmentZone,
    systemToUnifiedZone: (zone) => environmentToUnifiedZone(zone, "environment"),
    locationToUnified: environmentLocationToUnified
  });

  return {
    // 區域管理 API（直接委派給工廠函數）
    getZones: zoneApi.getZones,
    getZone: zoneApi.getZone,
    createZone: zoneApi.createZone,
    updateZone: zoneApi.updateZone,
    deleteZone: zoneApi.deleteZone,
    // ... 其他 API
  };
};
```

### 優化收益

1. **代碼減少**
   - 每個系統 API 的區域管理部分從 ~50 行減少到 ~15 行（減少 70%）
   - 三個系統 API 總共減少 ~105 行重複代碼

2. **維護性提升**
   - 統一邏輯在一個地方（`useSystemLocationApiFactory`）
   - 修改區域管理邏輯只需改一個地方
   - 新增系統時只需配置工廠函數

3. **類型安全**
   - 保持完整的 TypeScript 類型檢查
   - 使用泛型確保類型安全

4. **一致性**
   - 所有系統使用相同的區域管理邏輯
   - 確保行為一致

### 保留的設計

1. **系統特定類型**：前端組件仍使用系統特定類型（`EnvironmentLocation`, `LightingLocation`）
2. **轉換函數**：仍需要轉換函數來橋接系統特定類型和統一格式
3. **系統特定 API**：每個系統仍保留自己的 API 文件，只統一區域管理部分

### 未優化的部分（有意保留）

1. **系統特定的 API**：如 `saveReading`, `getReadings` 等，這些是系統特定的，不需要統一
2. **轉換函數**：`environmentLocationToUnified` 等轉換函數是必要的，因為需要橋接不同格式
3. **類型定義**：系統特定類型定義是必要的，提供類型安全

## 總結

通過創建通用的系統 API 工廠函數，我們成功地：
- ✅ 減少了 70% 的重複代碼
- ✅ 提高了維護性
- ✅ 保持了類型安全
- ✅ 確保了行為一致性

這個優化是最佳平衡點，既減少了重複代碼，又保持了必要的靈活性和類型安全。

