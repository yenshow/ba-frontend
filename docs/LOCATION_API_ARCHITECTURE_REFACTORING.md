# 地點管理 API 架構重構建議

## 問題分析

### 1. 重複的轉換邏輯

三個系統 API（`useEnvironmentApi`、`useLightingApi`、`usePeopleCountingLocationApi`）都有幾乎相同的 `updateZone` 實現：

```typescript
// 每個系統都重複這個模式
updateZone: async (id: string, data: UpdateXxxZoneData) => {
  const unifiedData: {
    name?: string;
    // ... 其他字段
    locations?: (UnifiedLocation | UnifiedLocationInput)[];
  } = {};
  
  if (data.name !== undefined) {
    unifiedData.name = data.name;
  }
  
  if (data.locations !== undefined) {
    unifiedData.locations = data.locations.map((loc) => {
      const converted = xxxLocationToUnified(loc, "xxx");
      return converted as UnifiedLocation | UnifiedLocationInput;
    });
  }
  
  const response = await locationApi.updateZone(id, unifiedData);
  // ...
}
```

**問題：**
- 代碼重複度高（DRY 原則違反）
- 維護成本高（修改邏輯需要改三個地方）
- 容易出錯（不一致的實現）

### 2. 類型斷言過多

大量使用 `as UnifiedLocation | UnifiedLocationInput` 類型斷言，說明：
- 類型系統設計不夠精確
- 轉換函數的返回類型與 API 期望的類型不匹配
- 缺少類型安全的轉換橋樑

### 3. 手動字段檢查

每個系統都在手動檢查 `data.name !== undefined`、`data.locations !== undefined` 等，這些邏輯應該被抽象化。

### 4. 轉換函數返回類型不一致

- `environmentToUnifiedZone` 返回 `Omit<UnifiedZone, "id" | "locations"> & { locations: UnifiedLocationInput[] }`
- `createZone` 期望 `{ locations?: UnifiedLocationInput[] }`
- 類型匹配，但缺少統一的轉換輔助函數

## 重構方案

### 方案一：創建統一的轉換輔助函數（推薦）

#### 1.1 創建通用的更新數據構建函數

```typescript
// app/utils/locationAdapter.ts

/**
 * 構建統一區域更新數據的輔助函數
 * 統一處理不同系統的更新邏輯
 */
export function buildUnifiedZoneUpdateData<TZone extends SystemZoneType>(
  data: Partial<TZone>,
  options: {
    systemType: SystemType;
    locationConverter: (
      location: SystemLocationType,
      systemType: SystemType
    ) => UnifiedLocationInput;
    additionalFields?: (data: Partial<TZone>) => Record<string, unknown>;
  }
): {
  name?: string;
  buildingId?: number;
  zoneNumber?: number;
  imageUrl?: string;
  description?: string;
  locations?: (UnifiedLocation | UnifiedLocationInput)[];
} {
  const unifiedData: {
    name?: string;
    buildingId?: number;
    zoneNumber?: number;
    imageUrl?: string;
    description?: string;
    locations?: (UnifiedLocation | UnifiedLocationInput)[];
  } = {};

  // 處理基本字段
  if (data.name !== undefined) unifiedData.name = data.name;
  if ("buildingId" in data && data.buildingId !== undefined) {
    unifiedData.buildingId = data.buildingId;
  }
  if ("zoneNumber" in data && data.zoneNumber !== undefined) {
    unifiedData.zoneNumber = data.zoneNumber;
  }
  if ("imageUrl" in data && data.imageUrl !== undefined) {
    unifiedData.imageUrl = data.imageUrl;
  }
  if ("description" in data && data.description !== undefined) {
    unifiedData.description = data.description;
  }

  // 處理地點轉換
  if ("locations" in data && data.locations !== undefined) {
    unifiedData.locations = data.locations.map((loc) =>
      options.locationConverter(loc as SystemLocationType, options.systemType)
    );
  }

  // 處理額外字段
  if (options.additionalFields) {
    Object.assign(unifiedData, options.additionalFields(data));
  }

  return unifiedData;
}
```

#### 1.2 簡化系統 API 的實現

```typescript
// app/composables/systems/useEnvironmentApi.ts

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
}
```

### 方案二：使用泛型工廠函數（進階）

創建一個通用的系統 API 工廠函數，統一處理所有系統的 CRUD 操作：

```typescript
// app/composables/systems/location/useSystemLocationApiFactory.ts

export function useSystemLocationApiFactory<
  TZone extends SystemZoneType,
  TLocation extends SystemLocationType
>(config: {
  systemType: SystemType;
  backendToSystemZone: (zone: UnifiedZone) => TZone;
  systemToUnifiedZone: (zone: TZone) => Omit<UnifiedZone, "id" | "locations"> & { locations: UnifiedLocationInput[] };
  locationToUnified: (location: TLocation | Omit<TLocation, "id">, systemType: SystemType) => UnifiedLocationInput;
}) {
  const locationApi = useLocationApi();

  return {
    getZones: async () => {
      const response = await locationApi.getZones(config.systemType);
      return {
        zones: response.zones.map(zone => config.backendToSystemZone(zone))
      };
    },

    createZone: async (data: { name: string; locations?: Omit<TLocation, "id">[] }) => {
      const unifiedData = config.systemToUnifiedZone({
        name: data.name,
        locations: data.locations || []
      } as TZone);
      const response = await locationApi.createZone(unifiedData);
      return {
        merged: response.merged,
        message: response.message,
        zone: config.backendToSystemZone(response.zone)
      };
    },

    updateZone: async (id: string, data: Partial<TZone>) => {
      const unifiedData = buildUnifiedZoneUpdateData(data, {
        systemType: config.systemType,
        locationConverter: config.locationToUnified
      });
      const response = await locationApi.updateZone(id, unifiedData);
      return {
        merged: response.merged,
        message: response.message,
        zone: config.backendToSystemZone(response.zone)
      };
    },

    deleteZone: locationApi.deleteZone
  };
}
```

然後各個系統 API 可以簡化為：

```typescript
// app/composables/systems/useEnvironmentApi.ts

export const useEnvironmentApi = () => {
  const baseApi = useSystemLocationApiFactory({
    systemType: "environment",
    backendToSystemZone: backendToEnvironmentZone,
    systemToUnifiedZone: (zone) => environmentToUnifiedZone(zone, "environment"),
    locationToUnified: environmentLocationToUnified
  });

  // 只保留系統特定的 API（如感測器讀數）
  return {
    ...baseApi,
    saveReading: (data: SaveReadingData) => { /* ... */ },
    getReadings: (locationId: string, options?: GetReadingsOptions) => { /* ... */ }
  };
};
```

### 方案三：改進類型定義（最小改動）

如果不想大幅重構，可以改進類型定義，讓轉換函數的返回類型更精確：

```typescript
// 定義更精確的類型
type UnifiedZoneCreateInput = Omit<UnifiedZone, "id" | "locations"> & {
  locations?: UnifiedLocationInput[];
};

type UnifiedZoneUpdateInput = Partial<Omit<UnifiedZone, "id" | "locations">> & {
  locations?: (UnifiedLocation | UnifiedLocationInput)[];
};

// 更新轉換函數的返回類型
export function environmentToUnifiedZone(
  zone: EnvironmentZone,
  systemType: SystemType = "environment"
): UnifiedZoneCreateInput {
  // ...
}
```

## 推薦方案

**建議採用方案一（統一的轉換輔助函數）**，原因：

1. **改動最小**：不需要大幅重構現有代碼
2. **向後兼容**：不影響現有功能
3. **易於維護**：統一邏輯在一個地方
4. **類型安全**：保持 TypeScript 類型檢查
5. **可擴展**：未來新增系統時可以復用

## 實施步驟

1. ✅ 已完成：導出 `UnifiedLocationInput` 和 `LocationSystemInput` 類型
2. ✅ 已完成：更新 `useLocationApi` 的類型定義
3. ✅ 已完成：創建 `buildUnifiedZoneUpdateData` 輔助函數
4. ✅ 已完成：重構三個系統 API 的 `updateZone` 方法
5. 🔄 待實施：添加單元測試確保功能正常

## 重構完成總結

### 已實施的重構

1. **創建統一的轉換輔助函數** (`buildUnifiedZoneUpdateData`)
   - 位置：`app/utils/locationAdapter.ts`
   - 功能：統一處理所有系統的區域更新數據轉換
   - 優點：減少代碼重複，提高維護性

2. **重構三個系統 API**
   - `useEnvironmentApi.updateZone`：從 ~20 行減少到 ~8 行
   - `useLightingApi.updateZone`：從 ~25 行減少到 ~8 行
   - `usePeopleCountingLocationApi.updateZone`：從 ~20 行減少到 ~8 行

3. **代碼改進**
   - 移除了所有手動字段檢查邏輯
   - 移除了類型斷言（`as UnifiedLocation | UnifiedLocationInput`）
   - 統一了轉換邏輯，確保所有系統使用相同的處理方式

### 重構前後對比

**重構前（useEnvironmentApi.ts）：**
```typescript
updateZone: async (id: string, data: UpdateEnvironmentZoneData) => {
  const unifiedData: {
    name?: string;
    locations?: (UnifiedLocation | UnifiedLocationInput)[];
  } = {};
  
  if (data.name !== undefined) {
    unifiedData.name = data.name;
  }
  
  if (data.locations !== undefined) {
    unifiedData.locations = data.locations.map((loc) => {
      const converted = environmentLocationToUnified(loc, "environment");
      return converted as UnifiedLocation | UnifiedLocationInput;
    });
  }

  const response = await locationApi.updateZone(id, unifiedData);
  // ...
}
```

**重構後：**
```typescript
updateZone: async (id: string, data: UpdateEnvironmentZoneData) => {
  const unifiedData = buildUnifiedZoneUpdateData(data, {
    systemType: "environment",
    locationConverter: environmentLocationToUnified
  });

  const response = await locationApi.updateZone(id, unifiedData);
  // ...
}
```

### 收益

- **代碼減少**：每個系統 API 的 `updateZone` 從 ~20-25 行減少到 ~8 行（減少 60-70%）
- **維護性提升**：統一邏輯修改只需改一個地方（`buildUnifiedZoneUpdateData`）
- **類型安全**：移除了類型斷言，提高類型安全性
- **一致性**：所有系統使用相同的轉換邏輯，確保行為一致

## 預期收益

- **代碼減少**：每個系統 API 的 `updateZone` 從 ~20 行減少到 ~5 行
- **維護性提升**：統一邏輯修改只需改一個地方
- **類型安全**：減少類型斷言，提高類型安全性
- **一致性**：所有系統使用相同的轉換邏輯

