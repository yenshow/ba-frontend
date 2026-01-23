# 區域/地點管理系統架構與實現說明

**更新日期**：2025-01-09  
**狀態**：✅ 系統運行中  
**版本**：v1.0

---

## 📋 目錄

1. [系統概述](#系統概述)
2. [系統架構](#系統架構)
3. [後端實現](#後端實現)
4. [前端實現](#前端實現)
5. [數據流與交互](#數據流與交互)
6. [核心機制](#核心機制)
7. [技術細節](#技術細節)
8. [測試與驗證](#測試與驗證)

---

## 系統概述

### 核心目標

區域/地點管理系統是一個**統一的多系統架構**，負責：

1. **區域管理**：管理區域（Zone），如樓層、區域等
2. **地點管理**：管理地點（Location），如房間、位置等
3. **系統關聯**：一個地點可以關聯多個系統（environment、lighting、people_counting）
4. **跨系統共用**：同一地點可以被多個系統共用，避免重複配置
5. **統一 API**：提供統一的 API 接口，支援所有系統類型

### 設計原則

- ✅ **統一架構**：所有系統使用相同的地點管理架構
- ✅ **多系統支援**：一個地點可以關聯多個系統
- ✅ **跨系統共用**：同一地點可以被多個系統共用
- ✅ **自動合併**：同名區域/地點自動合併，避免重複
- ✅ **類型安全**：使用 TypeScript 確保類型安全

---

## 系統架構

### 整體架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                        資料庫                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │    zones     │    │  locations   │    │ location_    │  │
│  │              │    │              │    │ systems      │  │
│  │ - id         │    │ - id         │    │              │  │
│  │ - name       │    │ - zone_id    │    │ - id         │  │
│  │ - building_id│    │ - name       │    │ - location_id│  │
│  │ - image_url  │    │ - description│    │ - system_type│  │
│  │ - description│    │              │    │ - system_    │  │
│  └──────────────┘    └──────────────┘    │   config     │  │
│         │                    │            │   (JSONB)    │  │
│         │                    │            └──────────────┘  │
│         │                    │                    │          │
│         └────────────────────┴────────────────────┘          │
│                          FOREIGN KEY                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 查詢/更新
                              │
┌─────────────────────────────────────────────────────────────┐
│                        後端系統                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  地點服務     │    │  系統配置     │    │  格式化函數   │  │
│  │              │    │              │    │              │  │
│  │ location     │    │ buildSystem  │    │ formatZone   │  │
│  │ Service      │    │ Config       │    │ formatLocation│  │
│  │              │    │              │    │ formatSystem  │  │
│  │ - getZones   │    │ - environment│    │              │  │
│  │ - getZone    │    │ - lighting   │    │              │  │
│  │ - createZone │    │ - people_    │    │              │  │
│  │ - updateZone │    │   counting   │    │              │  │
│  │ - deleteZone │    │              │    │              │  │
│  │ - getLocation│    │              │    │              │  │
│  │ - create     │    │              │    │              │  │
│  │   Location   │    │              │    │              │  │
│  │ - update     │    │              │    │              │  │
│  │   Location   │    │              │    │              │  │
│  │ - delete     │    │              │    │              │  │
│  │   Location   │    │              │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP API
                              │
┌─────────────────────────────────────────────────────────────┐
│                        前端系統                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  統一 API     │    │  系統適配器   │    │  區域管理     │  │
│  │              │    │              │    │              │  │
│  │ useLocation  │    │ useZone      │    │ useZone      │  │
│  │ Api          │    │ System       │    │ Management   │  │
│  │              │    │ Adapter      │    │              │  │
│  │ - getZones   │    │              │    │ - handleSave │  │
│  │ - getZone    │    │ - unifiedTo  │    │   Zone       │  │
│  │ - createZone │    │   System     │    │ - handleDelete│ │
│  │ - updateZone │    │ - systemTo   │    │   Zone       │  │
│  │ - deleteZone │    │   Unified    │    │ - findEarliest│ │
│  │ - getLocation│    │ - backendTo  │    │ - sortZones  │  │
│  │ - create     │    │   System     │    │              │  │
│  │   Location   │    │              │    │              │  │
│  │ - update     │    │              │    │              │  │
│  │   Location   │    │              │    │              │  │
│  │ - delete     │    │              │    │              │  │
│  │   Location   │    │              │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  系統特定 API │    │  類型轉換     │    │  UI 組件      │  │
│  │              │    │              │    │              │  │
│  │ useEnvironment│    │ location    │    │ ZoneManagement│  │
│  │ LocationApi   │    │ Adapter     │    │ Dialog       │  │
│  │ useLighting   │    │              │    │ Location     │  │
│  │ LocationApi   │    │ - backendTo │    │ Management   │  │
│  │ usePeople     │    │   Unified   │    │              │  │
│  │ Counting      │    │ - unifiedTo │    │              │  │
│  │ LocationApi   │    │   System    │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 模組劃分

#### 後端模組

| 模組 | 文件 | 職責 |
|------|------|------|
| **地點服務** | `locationService.js` | 區域/地點 CRUD、系統管理、自動合併 |
| **API 路由** | `locationRoutes.js` | REST API 端點 |

#### 前端模組

| 模組 | 文件 | 職責 |
|------|------|------|
| **統一 API** | `useLocationApi.ts` | 統一的地點管理 API |
| **系統適配器** | `useZoneSystemAdapter.ts` | 系統特定類型轉換 |
| **系統 API 工廠** | `useSystemLocationApiFactory.ts` | 生成系統特定的 API |
| **區域管理** | `useZoneManagement.ts` | 統一的區域管理邏輯 |
| **系統特定 API** | `useEnvironmentLocationApi.ts` 等 | 系統特定的 API 封裝 |
| **UI 組件** | `ZoneManagementDialog.vue` | 區域管理對話框 |

---

## 後端實現

### 1. 資料庫架構

#### 表結構

**zones 表**：

```sql
CREATE TABLE zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  building_id INTEGER,
  image_url TEXT,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**locations 表**：

```sql
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(zone_id, name)  -- 同一區域內地點名稱唯一
);
```

**location_systems 表**：

```sql
CREATE TABLE location_systems (
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  system_type VARCHAR(50) NOT NULL CHECK (system_type IN ('environment', 'lighting', 'people_counting')),
  system_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(location_id, system_type)  -- 同一地點同一系統類型唯一
);
```

#### 關聯關係

```
zones (1) ──< (N) locations (1) ──< (N) location_systems
```

- 一個區域可以有多個地點
- 一個地點可以有多個系統
- 一個地點的同一系統類型只能有一個配置

### 2. 地點服務 (`locationService.js`)

#### 核心功能

**區域管理**：

- `getZones(filters)`: 取得區域列表（支援系統類型篩選）
- `getZoneById(id, systemType)`: 取得單一區域
- `createZone(zoneData, userId)`: 建立區域（自動合併同名區域）
- `updateZone(id, zoneData, userId)`: 更新區域（支援區域合併）
- `deleteZone(id)`: 刪除區域

**地點管理**：

- `getLocationById(id)`: 取得單一地點（含所有系統）
- `createLocation(locationData, userId)`: 建立地點（自動合併同名地點）
- `updateLocation(id, locationData, userId)`: 更新地點
- `deleteLocation(id)`: 刪除地點

**系統管理**：

- `createLocationWithSystems()`: 建立地點和系統（支援跨系統共用）
- `updateLocationWithSystems()`: 更新地點和系統
- `buildSystemConfig()`: 構建系統配置物件

#### 自動合併機制

**區域合併**：

```javascript
// 建立區域時
if (existingZone.length > 0) {
  // 區域名稱已存在，使用現有區域（自動合併）
  zoneId = existingZone[0].id;
  isMerged = true;
  // 將新地點添加到現有區域
}

// 更新區域時
if (trimmedName !== currentZoneName) {
  const nameCheck = await db.query(
    "SELECT id FROM zones WHERE name = $1 AND id != $2",
    [trimmedName, id]
  );
  if (nameCheck.length > 0) {
    // 需要合併到目標區域
    targetZoneId = nameCheck[0].id;
  }
}
```

**地點合併**：

```javascript
// 建立地點時
const existingLocation = await query(
  "SELECT id FROM locations WHERE zone_id = $1 AND name = $2",
  [zoneId, trimmedName]
);

if (existingLocation.length > 0) {
  // 地點已存在，使用現有地點並添加系統（支援跨系統共用）
  locationId = existingLocation[0].id;
  // 為現有地點添加新系統
}
```

#### 批次查詢優化

**取得區域列表**：

```javascript
// 批次查詢所有區域的地點和系統，避免 N+1 問題
const zoneIds = zones.map((z) => z.id);

const locationsSql = `
  SELECT 
    l.id, l.zone_id, l.name, l.description,
    ls.id as system_id, ls.system_type, ls.system_config
  FROM locations l
  LEFT JOIN location_systems ls ON l.id = ls.location_id
  WHERE l.zone_id = ANY($1::int[])
  ORDER BY l.zone_id, l.created_at ASC, ls.created_at ASC
`;

const locationRows = await db.query(locationsSql, [zoneIds]);
// 將地點按區域分組
const locationsByZoneId = groupLocationRowsByLocation(locationRows);
```

### 3. 系統配置格式化

**格式化系統配置** (`formatSystem`)：

```javascript
switch (system.system_type) {
  case "environment":
    return {
      id: String(system.id),
      systemType: "environment",
      config: {
        deviceId: config.device_id || undefined,
        parameters: config.parameters || [],
      },
    };
  
  case "lighting":
    return {
      id: String(system.id),
      systemType: "lighting",
      config: {
        deviceId: config.device_id || undefined,
        location: {
          x: config.location_x || 50.0,
          y: config.location_y || 50.0,
        },
        modbus: config.modbus_config || undefined,
      },
    };
  
  case "people_counting":
    return {
      id: String(system.id),
      systemType: "people_counting",
      config: {
        personGroupIds: config.person_group_ids || [],
        entryDoorId: config.entry_door_id || undefined,
        exitDoorId: config.exit_door_id || undefined,
      },
    };
}
```

---

## 前端實現

### 1. 統一 API (`useLocationApi.ts`)

#### 核心方法

**區域管理**：

```typescript
getZones(systemType?: SystemType): Promise<{ zones: UnifiedZone[] }>
getZone(id: string, systemType?: SystemType): Promise<{ zone: UnifiedZone }>
createZone(data): Promise<{ merged: boolean; message: string; zone: UnifiedZone }>
updateZone(id, data): Promise<{ merged: boolean; message: string; zone: UnifiedZone }>
deleteZone(id): Promise<{ message: string }>
```

**地點管理**：

```typescript
getLocation(id: string): Promise<{ location: UnifiedLocation }>
createLocation(data): Promise<{ message: string; location: UnifiedLocation }>
updateLocation(id, data): Promise<{ message: string; location: UnifiedLocation }>
deleteLocation(id): Promise<{ message: string }>
```

### 2. 系統適配器 (`useZoneSystemAdapter.ts`)

#### 適配器接口

```typescript
interface ZoneSystemAdapter<TZone, TLocation> {
  // 轉換方法
  unifiedToSystem: (zone: UnifiedZone) => TZone;
  systemToUnified: (zone: TZone) => UnifiedZone;
  backendToSystem: (zone: UnifiedZone) => TZone;
  
  // 地點管理方法
  getLocationsProperty: (zone: TZone) => TLocation[];
  setLocationsProperty: (zone: TZone, locations: TLocation[]) => TZone;
  createNewLocation: () => TLocation;
  createNewZone: (name: string) => TZone;
  filterEmptyLocations: (zone: TZone) => TZone;
  
  // 系統配置
  systemConfig?: SystemConfig;
  
  // 工具方法
  getLocationId?: (location: TLocation, zoneName?: string) => string;
}
```

#### 系統適配器實例

**照明系統適配器**：

```typescript
useLightingZoneAdapter(): ZoneSystemAdapter<LightingZone, LightingLocation> {
  return {
    unifiedToSystem: (zone) => unifiedToLightingZone(zone),
    systemToUnified: (zone) => lightingToUnifiedZone(zone, "lighting"),
    backendToSystem: (zone) => backendToLightingZone(zone),
    getLocationsProperty: (zone) => zone.areas || [],
    setLocationsProperty: (zone, areas) => ({ ...zone, areas }),
    // ...
    systemConfig: { requireImageUrl: true } // 照明系統需要示意圖
  };
}
```

**環境監測系統適配器**：

```typescript
useEnvironmentZoneAdapter(): ZoneSystemAdapter<EnvironmentZone, EnvironmentLocation> {
  return {
    unifiedToSystem: (zone) => zone as EnvironmentZone,
    systemToUnified: (zone) => environmentToUnifiedZone(zone, "environment"),
    backendToSystem: (zone) => backendToEnvironmentZone(zone),
    getLocationsProperty: (zone) => zone.locations || [],
    setLocationsProperty: (zone, locations) => ({ ...zone, locations }),
    // ...
    systemConfig: { requireImageUrl: false } // 環境監測系統不需要示意圖
  };
}
```

**人流統計系統適配器**：

```typescript
usePeopleCountingZoneAdapter(): ZoneSystemAdapter<PeopleCountingZone, PeopleCountingLocation> {
  return {
    unifiedToSystem: (zone) => zone as PeopleCountingZone,
    systemToUnified: (zone) => peopleCountingToUnifiedZone(zone, "people_counting"),
    backendToSystem: (zone) => backendToPeopleCountingZone(zone),
    getLocationsProperty: (zone) => zone.locations || [],
    setLocationsProperty: (zone, locations) => ({ ...zone, locations }),
    // ...
    systemConfig: { requireImageUrl: false } // 人流統計系統不需要示意圖
  };
}
```

### 3. 系統 API 工廠 (`useSystemLocationApiFactory.ts`)

#### 工廠函數

```typescript
function useSystemLocationApiFactory<TZone, TLocation>(
  config: SystemApiConfig<TZone, TLocation>
) {
  const locationApi = useLocationApi();
  
  return {
    getZones: async () => {
      const response = await locationApi.getZones(config.systemType);
      return {
        zones: response.zones.map(zone => 
          config.backendToSystemZone(zone)
        )
      };
    },
    
    createZone: async (data) => {
      const unifiedData = config.systemToUnifiedZone(data);
      const response = await locationApi.createZone(unifiedData);
      return {
        merged: response.merged,
        message: response.message,
        zone: config.backendToSystemZone(response.zone)
      };
    },
    // ...
  };
}
```

**使用範例**：

```typescript
// 環境監測系統 API
const environmentApi = useSystemLocationApiFactory({
  systemType: "environment",
  backendToSystemZone: backendToEnvironmentZone,
  systemToUnifiedZone: (zone) => environmentToUnifiedZone(zone, "environment"),
  locationToUnified: environmentLocationToUnified
});

// 使用
const zones = await environmentApi.getZones();
```

### 4. 區域管理 (`useZoneManagement.ts`)

#### 核心方法

**儲存區域** (`handleSaveZone`)：

```typescript
1. 清理區域資料（過濾空地點）
2. 調用 API（根據 zone.id 決定 create 或 update）
3. 處理合併結果（如果 merged = true，移除舊區域）
4. 更新本地狀態
5. 更新選中狀態
6. 執行回調
7. 關閉對話框
```

**刪除區域** (`handleDeleteZone`)：

```typescript
1. 檢查是否為系統頁面的刪除操作
2. 如果是系統頁面：
   a. 取得完整區域資料（不帶 systemType 過濾）
   b. 檢查區域是否被其他系統使用
   c. 如果只有當前系統使用，刪除整個區域
   d. 如果被其他系統使用，只刪除該系統的地點
3. 如果不是系統頁面，直接刪除整個區域
4. 處理選中狀態
5. 執行回調
```

**工具方法**：

- `findEarliestZone()`: 找到最先創建的區域
- `sortZones()`: 排序區域（按名稱的自然排序，如 1F, 2F, 3F）

### 5. UI 組件 (`ZoneManagementDialog.vue`)

#### 組件特性

- **通用組件**：使用泛型支援不同系統類型
- **動態組件**：根據系統類型載入不同的地點管理組件
- **變更追蹤**：追蹤未儲存的變更
- **自動合併提示**：顯示合併結果訊息

**地點管理組件**：

- `EnvironmentLocationManagement.vue`: 環境監測地點管理
- `LightingLocationManagement.vue`: 照明地點管理
- `PeopleCountingLocationManagement.vue`: 人流統計地點管理

---

## 數據流與交互

### 1. 區域列表載入流程

```
┌─────────────┐
│  頁面載入    │
│ (各系統頁面) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ getZones    │
│ (systemType)│
└──────┬──────┘
       │
       ├─► GET /api/locations/zones?locationType=:systemType
       │
       ▼
┌─────────────┐
│ 後端處理     │
│ getZones    │
└──────┬──────┘
       │
       ├─► 查詢 zones 表（根據 systemType 篩選）
       ├─► 批次查詢所有區域的地點和系統（JOIN）
       ├─► 將地點按區域分組
       ├─► 格式化系統配置
       └─► 返回區域列表
       │
       ▼
┌─────────────┐
│ 前端轉換     │
│ 系統適配器   │
└──────┬──────┘
       │
       ├─► backendToSystemZone
       └─► 轉換為系統特定類型
       │
       ▼
┌─────────────┐
│ 更新狀態     │
│ zones       │
└─────────────┘
```

### 2. 建立區域流程

```
┌─────────────┐
│  用戶操作    │
│ 新增區域     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ createZone  │
│ (系統類型)  │
└──────┬──────┘
       │
       ├─► systemToUnifiedZone（轉換為統一格式）
       │
       ▼
┌─────────────┐
│ POST /api/  │
│ locations/  │
│ zones       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 後端處理     │
│ createZone  │
└──────┬──────┘
       │
       ├─► 驗證區域名稱
       ├─► 檢查區域名稱是否已存在
       │   └─► [存在] 使用現有區域（merged = true）
       │   └─► [不存在] 建立新區域（merged = false）
       │
       ├─► 建立地點和系統（事務）
       │   └─► createLocationWithSystems
       │       ├─► 檢查地點是否已存在
       │       │   └─► [存在] 使用現有地點並添加系統
       │       │   └─► [不存在] 建立新地點
       │       └─► 建立系統配置
       │
       └─► 返回結果 { merged, message, zone }
       │
       ▼
┌─────────────┐
│ 前端處理     │
│ handleSave  │
│ Zone        │
└──────┬──────┘
       │
       ├─► 如果 merged = true，移除舊區域
       ├─► 更新或添加目標區域
       ├─► 更新選中狀態
       └─► 顯示成功訊息
```

### 3. 更新區域流程

```
┌─────────────┐
│  用戶操作    │
│ 更新區域     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ updateZone  │
│ (系統類型)  │
└──────┬──────┘
       │
       ├─► buildUnifiedZoneUpdateData（構建更新數據）
       │
       ▼
┌─────────────┐
│ PUT /api/   │
│ locations/  │
│ zones/:id   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 後端處理     │
│ updateZone  │
└──────┬──────┘
       │
       ├─► 檢查區域是否存在
       ├─► 檢查是否需要合併區域（名稱改為已存在的名稱）
       │   └─► [需要合併] 執行合併邏輯
       │       ├─► 將當前區域的地點移動到目標區域
       │       ├─► 刪除當前區域中沒有系統的地點
       │       └─► 如果當前區域沒有地點了，刪除它
       │
       └─► [不需要合併] 正常更新
           ├─► 更新區域基本資訊
           ├─► 處理地點更新
           │   ├─► 更新現有地點
           │   ├─► 建立新地點
           │   └─► 刪除不在更新列表中的地點
           └─► 返回結果
       │
       ▼
┌─────────────┐
│ 前端處理     │
│ handleSave  │
│ Zone        │
└─────────────┘
```

### 4. 刪除區域流程（系統頁面）

```
┌─────────────┐
│  用戶操作    │
│ 刪除區域     │
│ (系統頁面)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ handleDelete│
│ Zone        │
└──────┬──────┘
       │
       ├─► 取得完整區域資料（不帶 systemType 過濾）
       │
       ▼
┌─────────────┐
│ 檢查系統使用 │
│ 情況        │
└──────┬──────┘
       │
       ├─► 提取所有系統類型
       ├─► 檢查是否只有當前系統使用
       │
       ├─► [只有當前系統] 刪除整個區域
       │   └─► DELETE /api/locations/zones/:id
       │
       └─► [被其他系統使用] 只刪除該系統的地點
           ├─► 過濾掉當前系統，構建更新後的地點列表
           ├─► 移除那些過濾後沒有系統的地點
           ├─► 如果過濾後沒有地點了，刪除整個區域
           └─► 否則更新區域，移除該系統的地點
           │
           ▼
       ┌─────────────┐
       │ PUT /api/   │
       │ locations/  │
       │ zones/:id   │
       └─────────────┘
```

---

## 核心機制

### 1. 自動合併機制

**目的**：避免重複的區域/地點，支援跨系統共用

**區域合併**：

- **建立時**：如果區域名稱已存在，使用現有區域並添加地點
- **更新時**：如果區域名稱改為已存在的名稱，執行合併邏輯

**地點合併**：

- **建立時**：如果同一區域內地點名稱已存在，使用現有地點並添加系統
- **效果**：支援跨系統共用同一地點

### 2. 跨系統共用機制

**實現**：

```javascript
// 建立地點時
const existingLocation = await query(
  "SELECT id FROM locations WHERE zone_id = $1 AND name = $2",
  [zoneId, trimmedName]
);

if (existingLocation.length > 0) {
  // 地點已存在，使用現有地點並添加系統
  locationId = existingLocation[0].id;
  
  // 檢查系統是否已存在
  const existingSystem = await query(
    "SELECT id FROM location_systems WHERE location_id = $1 AND system_type = $2",
    [locationId, systemType]
  );
  
  if (existingSystem.length > 0) {
    // 系統已存在，更新配置
    await updateSystem(query, existingSystem[0].id, system);
  } else {
    // 系統不存在，建立新系統
    await createSystem(query, locationId, system);
  }
}
```

**效果**：

- ✅ 同一地點可以被多個系統共用
- ✅ 避免重複配置
- ✅ 簡化地點管理

### 3. 類型轉換機制

**轉換鏈**：

```
系統特定類型 → UnifiedZone → 後端格式 → 資料庫
     ↑                                              ↓
     └──────────────────────────────────────────────┘
```

**轉換函數**：

- `systemToUnifiedZone()`: 系統特定類型 → 統一格式
- `unifiedToSystemZone()`: 統一格式 → 系統特定類型
- `backendToSystemZone()`: 後端格式 → 系統特定類型

### 4. 批次查詢優化

**目的**：避免 N+1 問題，提高查詢效率

**實現**：

```javascript
// 批次查詢所有區域的地點和系統
const zoneIds = zones.map((z) => z.id);

const locationsSql = `
  SELECT 
    l.id, l.zone_id, l.name, l.description,
    ls.id as system_id, ls.system_type, ls.system_config
  FROM locations l
  LEFT JOIN location_systems ls ON l.id = ls.location_id
  WHERE l.zone_id = ANY($1::int[])
  ORDER BY l.zone_id, l.created_at ASC, ls.created_at ASC
`;

const locationRows = await db.query(locationsSql, [zoneIds]);

// 將地點按區域分組
const locationsByZoneId = groupLocationRowsByLocation(locationRows);
```

**效果**：

- ✅ 減少資料庫查詢次數
- ✅ 提高查詢速度
- ✅ 降低資料庫負載

---

## 技術細節

### 1. 數據結構

**統一區域** (`UnifiedZone`)：

```typescript
interface UnifiedZone {
  id: string;
  name: string;
  buildingId?: number;
  zoneNumber?: number;
  imageUrl?: string;        // 照明系統專用
  description?: string;
  locations: UnifiedLocation[];
}
```

**統一地點** (`UnifiedLocation`)：

```typescript
interface UnifiedLocation {
  id: string;
  zoneId: string;
  name: string;
  description?: string;
  systems: LocationSystem[];  // 支援多個系統
}
```

**地點系統** (`LocationSystem`)：

```typescript
interface LocationSystem {
  id: string;
  systemType: SystemType;  // "environment" | "lighting" | "people_counting"
  config: SystemConfig;    // 根據系統類型不同
}
```

### 2. API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/locations/zones` | GET | 取得區域列表（支援 `locationType` 篩選） |
| `/api/locations/zones/:id` | GET | 取得單一區域（支援 `locationType` 篩選） |
| `/api/locations/zones` | POST | 建立區域 |
| `/api/locations/zones/:id` | PUT | 更新區域 |
| `/api/locations/zones/:id` | DELETE | 刪除區域 |
| `/api/locations/:id` | GET | 取得單一地點（含所有系統） |
| `/api/locations` | POST | 建立地點（含系統） |
| `/api/locations/:id` | PUT | 更新地點（含系統） |
| `/api/locations/:id` | DELETE | 刪除地點 |

### 3. 系統配置格式

**環境監測系統配置**：

```typescript
interface EnvironmentSystemConfig {
  deviceId?: number;
  parameters: Array<{
    type: string;
    enabled: boolean;
  }>;
}
```

**照明系統配置**：

```typescript
interface LightingSystemConfig {
  deviceId?: number;
  location?: {
    x: number;
    y: number;
  };
  modbus?: {
    deviceId?: number;
    points?: Array<{
      address: number;
      type: "DI" | "DO";
      note?: string;
    }>;
  };
}
```

**人流統計系統配置**：

```typescript
interface PeopleCountingSystemConfig {
  personGroupIds: number[];
  entryDoorId?: number;
  exitDoorId?: number;
}
```

### 4. 唯一性約束

**資料庫約束**：

- `zones.name`: UNIQUE（區域名稱唯一）
- `locations(zone_id, name)`: UNIQUE（同一區域內地點名稱唯一）
- `location_systems(location_id, system_type)`: UNIQUE（同一地點同一系統類型唯一）

**約束處理**：

```javascript
function handleUniqueConstraintError(error, constraintName, errorMessage) {
  if (error.code === "23505" && error.constraint === constraintName) {
    const duplicateError = new Error(errorMessage);
    duplicateError.statusCode = 400;
    throw duplicateError;
  }
}
```

---

## 測試與驗證

### 1. 後端測試

**區域管理測試**：

- ✅ 建立區域（新區域）
- ✅ 建立區域（自動合併同名區域）
- ✅ 更新區域（正常更新）
- ✅ 更新區域（區域合併）
- ✅ 刪除區域
- ✅ 系統類型篩選

**地點管理測試**：

- ✅ 建立地點（新地點）
- ✅ 建立地點（自動合併同名地點）
- ✅ 建立地點（跨系統共用）
- ✅ 更新地點
- ✅ 刪除地點
- ✅ 多系統支援

**系統管理測試**：

- ✅ 建立系統配置
- ✅ 更新系統配置
- ✅ 刪除系統配置
- ✅ 系統配置格式化

### 2. 前端測試

**API 調用測試**：

- ✅ 統一 API 調用
- ✅ 系統特定 API 調用
- ✅ 類型轉換

**適配器測試**：

- ✅ 系統適配器轉換
- ✅ 後端格式轉換
- ✅ 統一格式轉換

**區域管理測試**：

- ✅ 儲存區域
- ✅ 刪除區域（全區點位圖）
- ✅ 刪除區域（系統頁面）
- ✅ 區域合併處理

### 3. 整合測試

**端到端測試**：

1. 建立區域 → 建立地點 → 添加系統 → 查詢區域列表
2. 更新區域名稱 → 自動合併 → 地點移動
3. 在系統頁面刪除區域 → 檢查其他系統 → 只刪除該系統的地點
4. 跨系統共用地點 → 添加不同系統 → 驗證共用

**性能測試**：

- ✅ 批次查詢效果
- ✅ JOIN 查詢效果
- ✅ 類型轉換性能

---

## 總結

### 系統優勢

1. **統一架構**：所有系統使用相同的地點管理架構，降低維護成本
2. **跨系統共用**：同一地點可以被多個系統共用，避免重複配置
3. **自動合併**：同名區域/地點自動合併，提高用戶體驗
4. **類型安全**：使用 TypeScript 確保類型安全
5. **性能優化**：批次查詢、JOIN 優化，提高查詢效率

### 未來改進方向

1. **批量操作**：支援批量導入/導出區域和地點
2. **權限管理**：支援區域/地點的權限控制
3. **歷史記錄**：記錄區域/地點的變更歷史
4. **搜索功能**：支援區域/地點的全文搜索

---

**文檔結束**

