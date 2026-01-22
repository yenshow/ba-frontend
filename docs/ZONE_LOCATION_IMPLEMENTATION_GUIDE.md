# 區域與地點管理實作指南

> 本文檔提供完整的區域與地點管理實作指南，供後續新增系統時依循。

## 📋 目錄

1. [架構概述](#架構概述)
2. [類型定義層](#類型定義層)
3. [適配器層（Adapter）](#適配器層adapter)
4. [業務邏輯層（Composables）](#業務邏輯層composables)
5. [UI 組件層](#ui-組件層)
6. [頁面層實現](#頁面層實現)
7. [新增系統步驟指南](#新增系統步驟指南)
8. [最佳實踐](#最佳實踐)

---

## 架構概述

### 架構層級

```
┌─────────────────────────────────────────────────────────┐
│  類型定義層 (Types)                                      │
│  - UnifiedZone / UnifiedLocation (統一格式)              │
│  - SystemZoneType / SystemLocationType (系統特定格式)    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  轉換層 (Adapters)                                       │
│  - locationAdapter.ts (後端 ↔ 統一格式)                 │
│  - useZoneSystemAdapter.ts (統一格式 ↔ 系統格式)        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  業務邏輯層 (Composables)                                │
│  - useZoneManagement.ts (區域管理統一邏輯)               │
│  - useLocationApi.ts (統一 API)                          │
│  - useSystemLocationApi.ts (系統特定 API)                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  UI 組件層 (Components)                                 │
│  - ZoneManagementDialog.vue (統一對話框)                │
│  - LocationManagement/*.vue (系統特定地點管理)          │
│  - LocationFormFields/*.vue (系統特定表單欄位)          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  頁面層 (Pages)                                         │
│  - construction-monitoring/*.vue (系統頁面)              │
└─────────────────────────────────────────────────────────┘
```

### 核心概念

1. **統一格式（Unified Format）**
   - `UnifiedZone` 和 `UnifiedLocation` 是與後端 API 通信的統一格式
   - 所有系統都通過統一格式與後端交互

2. **系統格式（System Format）**
   - 每個系統有自己的類型定義（如 `EnvironmentZone`、`PeopleCountingZone`）
   - 通過適配器在統一格式和系統格式之間轉換

3. **配置驅動（Configuration-Driven）**
   - 通過 `SystemConfig` 標記系統特性（如 `singleLocationPerZone`）
   - 避免硬編碼，提高可擴展性

---

## 類型定義層

### 統一類型（Unified Types）

**文件：** `app/types/location.ts`

```typescript
// 系統類型
export type SystemType = "lighting" | "environment" | "people_counting";

// 統一區域
export interface UnifiedZone {
    id?: string;
    name: string;
    buildingId?: number;
    zoneNumber?: number;
    imageUrl?: string;
    description?: string;
    locations: UnifiedLocation[];
}

// 統一地點
export interface UnifiedLocation {
    id?: string;
    zoneId?: string;
    name: string;
    systems: LocationSystem[];
}
```

### 系統特定類型

每個系統需要定義自己的類型：

```typescript
// 範例：環境品質系統
export interface EnvironmentZone {
    id?: string;
    name: string;
    locations: EnvironmentLocation[];
}

export interface EnvironmentLocation {
    id?: string;
    name: string;
    deviceId?: number;
    parameters: SensorParameter[];
}
```

---

## 適配器層（Adapter）

### 適配器接口

**文件：** `app/composables/systems/useZoneSystemAdapter.ts`

```typescript
export interface SystemConfig {
    // 是否每個區域只允許一個地點
    singleLocationPerZone?: boolean;
    // 是否需要示意圖
    requireImageUrl?: boolean;
}

export interface ZoneSystemAdapter<TZone, TLocation> {
    // ========== 轉換方法 ==========
    unifiedToSystem: (zone: UnifiedZone) => TZone;
    systemToUnified: (zone: TZone) => Omit<UnifiedZone, "id" | "locations"> & { locations: UnifiedLocationInput[] };
    backendToSystem: (zone: UnifiedZone) => TZone;
    
    // ========== 地點管理方法 ==========
    getLocationsProperty: (zone: TZone) => TLocation[];
    setLocationsProperty: (zone: TZone, locations: TLocation[]) => TZone;
    createNewLocation: () => TLocation;
    createNewZone: (name: string) => TZone;
    filterEmptyLocations: (zone: TZone) => TZone;
    
    // ========== 系統配置 ==========
    systemConfig?: SystemConfig;
    
    // ========== 工具方法 ==========
    getLocationId?: (location: TLocation, zoneName?: string) => string;
}
```

### 實作適配器

**範例：新增系統適配器**

```typescript
export function useNewSystemZoneAdapter(): ZoneSystemAdapter<NewSystemZone, NewSystemLocation> {
    const systemConfig: SystemConfig = {
        singleLocationPerZone: true, // 根據系統需求設置
        requireImageUrl: false
    };

    return {
        // 轉換方法
        unifiedToSystem: (zone: UnifiedZone) => {
            return zone as unknown as NewSystemZone;
        },
        
        systemToUnified: (zone: NewSystemZone) => {
            return newSystemToUnifiedZone(zone, "new_system");
        },
        
        backendToSystem: (zone: UnifiedZone) => {
            if ("locations" in zone && Array.isArray(zone.locations)) {
                return zone as unknown as NewSystemZone;
            }
            return backendToNewSystemZone(zone as any);
        },
        
        // 地點管理方法
        getLocationsProperty: (zone: NewSystemZone) => zone.locations || [],
        
        setLocationsProperty: (zone: NewSystemZone, locations: NewSystemLocation[]) => {
            // 如果是單一地點系統，限制為只有一個地點
            if (systemConfig.singleLocationPerZone) {
                return {
                    ...zone,
                    locations: locations.length > 0 ? [locations[0]] : []
                };
            }
            // 否則允許多個地點
            return {
                ...zone,
                locations
            };
        },
        
        createNewLocation: (): NewSystemLocation => ({
            name: "",
            // ... 其他必要欄位
        }),
        
        createNewZone: (name: string): NewSystemZone => ({
            name,
            locations: []
        }),
        
        filterEmptyLocations: (zone: NewSystemZone): NewSystemZone => ({
            ...zone,
            locations: (zone.locations || []).filter(loc => loc.name && loc.name.trim().length > 0)
        }),
        
        // 系統配置
        systemConfig,
        
        // 工具方法
        getLocationId: (location: NewSystemLocation, zoneName?: string): string => {
            // 優先使用 id（字串格式）
            if (location.id) return location.id;
            // 如果有 locationId（數字格式），轉換為字串
            if ((location as any).locationId) {
                return String((location as any).locationId);
            }
            // 最後使用 zone 名稱和地點名稱組合
            return `${zoneName || "unknown"}-${location.name}`;
        }
    };
}
```

### 註冊適配器

在 `useZoneSystemAdapter` 函數中註冊新系統：

```typescript
export function useZoneSystemAdapter<TZone, TLocation>(
    systemType: SystemType
): ZoneSystemAdapter<TZone, TLocation> {
    switch (systemType) {
        case "lighting":
            return useLightingZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
        case "environment":
            return useEnvironmentZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
        case "people_counting":
            return usePeopleCountingZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
        case "new_system": // 新增系統
            return useNewSystemZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
        default:
            throw new Error(`不支援的系統類型: ${systemType}`);
    }
}
```

---

## 業務邏輯層（Composables）

### 區域管理 Composable

**文件：** `app/composables/systems/useZoneManagement.ts`

提供統一的區域管理邏輯：

```typescript
const { handleSaveZone, handleDeleteZone } = useZoneManagement<SystemZone>();

// 儲存區域
await handleSaveZone(
    zone,
    zonesRef,
    async (z) => {
        // API 調用邏輯
        const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id);
        return isValidId
            ? await systemApi.updateZone(z.id, { name: z.name, locations: z.locations })
            : await systemApi.createZone({ name: z.name, locations: z.locations });
    },
    {
        onAfterSave: async () => {
            // 保存後的回調
        }
    }
);

// 刪除區域
await handleDeleteZone(
    zoneId,
    zonesRef,
    systemApi.deleteZone,
    {
        selectedLocationRef: selectedLocationId, // 選中狀態管理
        getLocationId,                           // ID 獲取方法
        systemType: "new_system",
        onAfterDelete: async () => {
            // 刪除後的回調
        }
    }
);
```

### 系統特定 API Composable

**文件：** `app/composables/systems/location/useSystemLocationApi.ts`

```typescript
export const useNewSystemLocationApi = () => {
    const locationApi = useLocationApi();
    
    return {
        getZones: async () => {
            const response = await locationApi.getZones("new_system");
            return {
                zones: response.zones.map(zone => backendToNewSystemZone(zone))
            };
        },
        
        getZone: async (id: string) => {
            const response = await locationApi.getZone(id, "new_system");
            return {
                zone: backendToNewSystemZone(response.zone)
            };
        },
        
        createZone: async (data: CreateNewSystemZoneData) => {
            const unifiedData = newSystemToUnifiedZone(data, "new_system");
            const response = await locationApi.createZone(unifiedData);
            return {
                merged: response.merged,
                message: response.message,
                zone: backendToNewSystemZone(response.zone)
            };
        },
        
        updateZone: async (id: string, data: UpdateNewSystemZoneData) => {
            const unifiedData = newSystemToUnifiedZone(
                { name: data.name, locations: data.locations || [] },
                "new_system"
            );
            const response = await locationApi.updateZone(id, unifiedData);
            return {
                merged: response.merged,
                message: response.message,
                zone: backendToNewSystemZone(response.zone)
            };
        },
        
        deleteZone: async (id: string) => {
            return locationApi.deleteZone(id);
        }
    };
};
```

---

## UI 組件層

### 1. 地點管理組件

**文件：** `app/components/location/LocationManagement/NewSystemLocationManagement.vue`

```vue
<template>
    <div class="space-y-3">
        <!-- 地點列表標題 -->
        <div class="flex items-center justify-between">
            <span class="text-base font-medium 2xl:text-lg">地點</span>
        </div>

        <!-- 地點項目 -->
        <div
            v-if="getLocations(zone).length === 0"
            class="py-4 text-center text-sm text-white/60 2xl:text-base"
        >
            尚無地點，請新增地點
        </div>
        <div v-else class="space-y-2">
            <div
                v-for="(location, locationIndex) in getLocations(zone)"
                :key="getLocationId(location, locationIndex)"
                class="flex min-w-0 items-start gap-2 rounded border border-white/10 bg-white/5 p-2"
            >
                <!-- 地點欄位 -->
                <div class="min-w-0 flex-1">
                    <NewSystemLocationFields
                        :location="location"
                        @update="handleLocationUpdate(locationIndex, $event)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { NewSystemZone, NewSystemLocation } from "~/types/newSystem";
import NewSystemLocationFields from "../LocationFormFields/NewSystemLocationFields.vue";

interface Props {
    zone: NewSystemZone;
    // ... 其他 props
}

interface Emits {
    (e: "add-location"): void;
    (e: "remove-location", index: number): void;
    (e: "update-location", index: number, location: NewSystemLocation): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 取得地點列表
const getLocations = (zone: NewSystemZone): NewSystemLocation[] => {
    return zone.locations || [];
};

// 取得地點 ID（用於 Vue key）
const getLocationId = (location: NewSystemLocation, index: number): string => {
    return (location as any).id || `location-${index}`;
};

// 處理地點更新
const handleLocationUpdate = (locationIndex: number, updatedLocation: NewSystemLocation) => {
    emit("update-location", locationIndex, updatedLocation);
};
</script>
```

### 2. 地點表單欄位組件

**文件：** `app/components/location/LocationFormFields/NewSystemLocationFields.vue`

```vue
<template>
    <div class="space-y-3">
        <!-- 地點名稱 -->
        <div>
            <label class="block text-sm font-medium text-white/90 2xl:text-base">地點名稱</label>
            <input
                v-model="localLocation.name"
                type="text"
                class="form-input-small mt-1"
                placeholder="請輸入地點名稱"
                @input="handleChange"
            />
        </div>
        
        <!-- 其他欄位... -->
    </div>
</template>

<script setup lang="ts">
import type { NewSystemLocation } from "~/types/newSystem";

interface Props {
    location: NewSystemLocation;
}

interface Emits {
    (e: "update", location: NewSystemLocation): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localLocation = ref<NewSystemLocation>({ ...props.location });

watch(
    () => props.location,
    newLocation => {
        localLocation.value = { ...newLocation };
    },
    { immediate: true, deep: true }
);

const handleChange = () => {
    emit("update", localLocation.value);
};
</script>
```

### 3. 註冊組件到 ZoneManagementDialog

**文件：** `app/components/location/ZoneManagementDialog.vue`

```typescript
// 動態載入地點管理組件
const locationManagementComponent = computed(() => {
    const componentMap: Record<SystemType, any> = {
        lighting: () => import("./LocationManagement/LightingLocationManagement.vue"),
        environment: () => import("./LocationManagement/EnvironmentLocationManagement.vue"),
        people_counting: () => import("./LocationManagement/PeopleCountingLocationManagement.vue"),
        new_system: () => import("./LocationManagement/NewSystemLocationManagement.vue"), // 新增
    };
    return componentMap[props.systemType]?.();
});
```

---

## 頁面層實現

### 頁面實現範例

**文件：** `app/pages/construction-monitoring/new-system.vue`

```vue
<script setup lang="ts">
import { useZoneManagement } from "~/composables/systems/useZoneManagement";
import { useZoneSystemAdapter } from "~/composables/systems/useZoneSystemAdapter";
import { useNewSystemLocationApi } from "~/composables/systems/location/useNewSystemLocationApi";
import { useLocationApi } from "~/composables/systems/location/useLocationApi";
import { backendToNewSystemZone } from "~/utils/locationAdapter";
import type { UnifiedZone } from "~/types/location";
import type { NewSystemZone, NewSystemLocation } from "~/types/newSystem";

// 區域和地點資料
const newSystemZones = ref<NewSystemZone[]>([]);
const selectedLocation = ref<NewSystemLocation | null>(null);

// 選中地點 ID（用於刪除邏輯）
const selectedLocationId = ref<string>("");

// 取得適配器（用於獲取統一的 getLocationId 方法）
const adapter = useZoneSystemAdapter<NewSystemZone, NewSystemLocation>("new_system");

// 獲取地點所屬的區域名稱
const getLocationZone = (location: NewSystemLocation): string | null => {
    for (const zone of newSystemZones.value) {
        if (zone.locations.some(loc => loc.id === location.id || loc.name === location.name)) {
            return zone.name;
        }
    }
    return null;
};

// 從地點對象獲取 ID（用於刪除邏輯）
const getLocationId = (location: NewSystemLocation): string => {
    const zoneName = getLocationZone(location);
    return adapter.getLocationId?.(location, zoneName || undefined) || `${zoneName || "unknown"}-${location.name}`;
};

// 監聽 selectedLocation 變化，同步更新 selectedLocationId
watch(
    () => selectedLocation.value,
    newLocation => {
        selectedLocationId.value = newLocation ? getLocationId(newLocation) : "";
    },
    { immediate: true }
);

// 使用區域管理 composable
const newSystemLocationApi = useNewSystemLocationApi();
const locationApi = useLocationApi();
const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone } =
    useZoneManagement<NewSystemZone>();

// 處理儲存區域
const handleSaveZone = async (zone: NewSystemZone) => {
    await baseHandleSaveZone(
        zone,
        newSystemZones,
        async (z: NewSystemZone) => {
            const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id);
            const result = isValidId
                ? await newSystemLocationApi.updateZone(z.id, {
                        name: z.name,
                        locations: z.locations
                    })
                : await newSystemLocationApi.createZone({
                        name: z.name,
                        locations: z.locations
                    });
            return {
                merged: result.merged,
                message: result.message,
                zone: { ...result.zone, id: result.zone.id || z.id } as NewSystemZone & { id: string }
            };
        },
        {
            onAfterSave: async () => {
                // 保存後重新載入資料
                await loadZones();
            }
        }
    );
};

// 處理刪除區域
const handleDeleteZone = async (zoneId: string) => {
    await baseHandleDeleteZone(zoneId, newSystemZones, newSystemLocationApi.deleteZone, {
        // 選中狀態管理（必須）
        selectedLocationRef: selectedLocationId,
        getLocationId,
        // 系統特定的刪除選項
        systemType: "new_system",
        getFullZoneApiCall: (id: string) => locationApi.getZone(id),
        updateZoneApiCall: async (id: string, data: { locations: UnifiedZone["locations"] }) => {
            const response = await locationApi.updateZone(id, { locations: data.locations });
            const newSystemZone = backendToNewSystemZone(response.zone);
            return {
                merged: response.merged,
                message: response.message,
                zone: { ...newSystemZone, id: newSystemZone.id || id } as NewSystemZone & { id: string }
            };
        },
        // 刪除後重新載入資料
        onAfterDelete: async () => {
            await loadZones();
        }
    });
};

// 載入區域資料
const loadZones = async () => {
    try {
        const result = await newSystemLocationApi.getZones();
        newSystemZones.value = result.zones || [];
    } catch (error) {
        // 錯誤處理
    }
};
</script>
```

---

## 新增系統步驟指南

### 步驟 1：定義類型

在 `app/types/newSystem.ts` 中定義系統類型：

```typescript
export interface NewSystemZone {
    id?: string;
    name: string;
    locations: NewSystemLocation[];
}

export interface NewSystemLocation {
    id?: string;
    name: string;
    // ... 其他欄位
}
```

### 步驟 2：實作轉換函數

在 `app/utils/locationAdapter.ts` 中實作轉換函數：

```typescript
export function backendToNewSystemZone(zone: UnifiedZone): NewSystemZone {
    // 轉換邏輯
}

export function newSystemToUnifiedZone(zone: NewSystemZone, systemType: SystemType): UnifiedZone {
    // 轉換邏輯
}
```

### 步驟 3：實作適配器

在 `app/composables/systems/useZoneSystemAdapter.ts` 中實作適配器：

```typescript
export function useNewSystemZoneAdapter(): ZoneSystemAdapter<NewSystemZone, NewSystemLocation> {
    // 參考上面的範例
}
```

### 步驟 4：註冊適配器

在 `useZoneSystemAdapter` 函數中註冊新系統。

### 步驟 5：實作 API Composable

在 `app/composables/systems/location/useNewSystemLocationApi.ts` 中實作 API。

### 步驟 6：創建 UI 組件

- `app/components/location/LocationManagement/NewSystemLocationManagement.vue`
- `app/components/location/LocationFormFields/NewSystemLocationFields.vue`

### 步驟 7：註冊組件

在 `ZoneManagementDialog.vue` 中註冊新組件。

### 步驟 8：創建頁面

在 `app/pages/construction-monitoring/new-system.vue` 中實作頁面邏輯。

### 步驟 9：更新類型定義

在 `app/types/location.ts` 中添加新系統類型：

```typescript
export type SystemType = "lighting" | "environment" | "people_counting" | "new_system";
```

---

## 最佳實踐

### 1. 單一地點系統

如果系統每個區域只允許一個地點：

```typescript
const systemConfig: SystemConfig = {
    singleLocationPerZone: true,
    requireImageUrl: false
};

// setLocationsProperty 必須限制為單一地點
setLocationsProperty: (zone, locations) => {
    return {
        ...zone,
        locations: locations.length > 0 ? [locations[0]] : []
    };
}
```

### 2. 選中狀態管理

所有系統都必須實作選中狀態管理：

```typescript
// 必須的 ref
const selectedLocationId = ref<string>("");

// 必須的函數
const getLocationId = (location: SystemLocation): string => {
    const zoneName = getLocationZone(location);
    return adapter.getLocationId?.(location, zoneName || undefined) || `${zoneName || "unknown"}-${location.name}`;
};

// 必須的 watch
watch(
    () => selectedLocation.value,
    newLocation => {
        selectedLocationId.value = newLocation ? getLocationId(newLocation) : "";
    },
    { immediate: true }
);

// 必須在 handleDeleteZone 中傳入
await baseHandleDeleteZone(zoneId, zonesRef, api.deleteZone, {
    selectedLocationRef: selectedLocationId,
    getLocationId,
    // ...
});
```

### 3. ID 獲取邏輯

統一使用適配器的 `getLocationId` 方法：

```typescript
getLocationId: (location: SystemLocation, zoneName?: string): string => {
    // 優先使用 id（字串格式）
    if (location.id) return location.id;
    // 如果有 locationId（數字格式），轉換為字串
    if ((location as any).locationId) {
        return String((location as any).locationId);
    }
    // 最後使用 zone 名稱和地點名稱組合
    return `${zoneName || "unknown"}-${location.name}`;
}
```

### 4. 配置驅動

使用 `SystemConfig` 標記系統特性，避免硬編碼：

```typescript
// ✅ 正確：使用配置
const isSingleLocationSystem = adapter.systemConfig?.singleLocationPerZone;
if (isSingleLocationSystem && locations.length === 0) {
    // ...
}

// ❌ 錯誤：硬編碼
if ((props.systemType === "environment" || props.systemType === "people_counting") && locations.length === 0) {
    // ...
}
```

### 5. 錯誤處理

統一使用 `useErrorHandler`：

```typescript
const { handleError } = useErrorHandler();

try {
    // API 調用
} catch (error) {
    handleError(error, "操作失敗");
}
```

### 6. 類型安全

使用 TypeScript 類型確保類型安全：

```typescript
// ✅ 正確：使用泛型
const { handleSaveZone, handleDeleteZone } = useZoneManagement<NewSystemZone>();

// ❌ 錯誤：使用 any
const { handleSaveZone, handleDeleteZone } = useZoneManagement<any>();
```

---

## 檢查清單

新增系統時，請確認以下項目：

### 類型定義
- [ ] 定義 `SystemZone` 和 `SystemLocation` 類型
- [ ] 在 `SystemType` 中添加新系統類型

### 適配器
- [ ] 實作 `useSystemZoneAdapter` 函數
- [ ] 設置 `systemConfig`（`singleLocationPerZone`、`requireImageUrl`）
- [ ] 實作所有必需的方法
- [ ] 實作 `getLocationId` 方法
- [ ] 在 `useZoneSystemAdapter` 中註冊

### 轉換函數
- [ ] 實作 `backendToSystemZone` 函數
- [ ] 實作 `systemToUnifiedZone` 函數

### API Composable
- [ ] 實作 `useSystemLocationApi` composable
- [ ] 實作所有 CRUD 方法

### UI 組件
- [ ] 創建 `LocationManagement/SystemLocationManagement.vue`
- [ ] 創建 `LocationFormFields/SystemLocationFields.vue`
- [ ] 在 `ZoneManagementDialog.vue` 中註冊組件

### 頁面實現
- [ ] 創建系統頁面
- [ ] 實作選中狀態管理（`selectedLocationId`、`getLocationId`、`watch`）
- [ ] 實作 `handleSaveZone` 和 `handleDeleteZone`
- [ ] 傳入 `selectedLocationRef` 和 `getLocationId` 到 `handleDeleteZone`

### 測試
- [ ] 測試區域新增、更新、刪除
- [ ] 測試地點新增、更新、刪除
- [ ] 測試選中狀態管理
- [ ] 測試單一地點限制（如果適用）

---

## 相關文件

- [區域/地點/系統架構重構計劃](./ZONE_LOCATION_REFACTORING_PLAN.md)
- [區域/地點/系統處理全面分析](./ZONE_LOCATION_SYSTEM_ANALYSIS.md)
- [人流統計刪除問題修復總結](./PEOPLE_COUNTING_DELETION_FIX.md)
- [人流統計系統修復驗證報告](./PEOPLE_COUNTING_FIX_VERIFICATION.md)

---

## 範例系統參考

### 環境品質系統（單一地點）
- 適配器：`useEnvironmentZoneAdapter`
- 頁面：`app/pages/construction-monitoring/environment.vue`
- 組件：`EnvironmentLocationManagement.vue`、`EnvironmentLocationFields.vue`

### 人流統計系統（單一地點）
- 適配器：`usePeopleCountingZoneAdapter`
- 頁面：`app/pages/construction-monitoring/people-counting.vue`
- 組件：`PeopleCountingLocationManagement.vue`、`PeopleCountingLocationFields.vue`

### 照明系統（多地點）
- 適配器：`useLightingZoneAdapter`
- 頁面：`app/pages/construction-monitoring/lighting.vue`
- 組件：`LightingLocationManagement.vue`、`LightingLocationFields.vue`

---

**最後更新：** 2024年

