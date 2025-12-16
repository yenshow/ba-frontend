# 多系統架構設計方案

## 概述

本文件說明如何設計一個可擴展的多系統架構，以支援 `system-modules.ts` 中定義的 29 個系統模組。

---

## 系統模組分類

根據 `system-modules.ts`，系統分為兩大類：

### 主要系統（Primary Systems）

1. 區域平面圖
2. 影像監視系統
3. 環境品質系統
4. 車輛進出管理
5. 人流統計管理
6. **照明系統** ⭐
7. 衛生排水系統
8. 設備管理
9. 消防系統
10. 門禁保全系統
11. 電力系統
12. 空調系統
13. 電梯系統
14. 環境感測器

### 擴充系統（Extended Systems）

15. 全區點位圖
16. 緊急求救系統
17. 使用者管理
18. 機電維護
19. 設備運轉可靠度
20. 設施管理系統
21. 寄物管理
22. 訪客系統
23. 檔案系統
24. 空間管理
25. 電視牆模組
26. 多媒體伺服器
27. 警示紀錄
28. 資訊平台
29. Modbus 資料

---

## 架構設計原則

### 1. 統一設計模式

每個系統都遵循相同的設計模式：

```
系統模組
  ├─ 核心資料表（system_{module_name}）
  ├─ 配置資料表（system_{module_name}_config，如需要）
  ├─ 歷史記錄表（system_{module_name}_history，如需要）
  └─ API 路由（/api/{module_name}/*）
```

### 2. 命名規範

- **資料表名稱**：`{system_name}_{entity_name}`
  - 例如：`lighting_categories`、`hvac_zones`、`fire_alarms`
- **API 路由**：`/api/{system_name}/{entity_name}`
  - 例如：`/api/lighting/categories`、`/api/hvac/zones`
- **前端 Composable**：`use{SystemName}Api`
  - 例如：`useLightingApi`、`useHvacApi`

### 3. 資料表設計模式

每個系統的核心資料表都包含：

```sql
CREATE TABLE {system_name}_{entity_name} (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  system_config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- 系統特定配置
  device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,  -- 關聯設備（如需要）
  floor_id VARCHAR(50),  -- 樓層（如需要）
  location_x DECIMAL(5,2),  -- 位置 X（如需要）
  location_y DECIMAL(5,2),  -- 位置 Y（如需要）
  status VARCHAR(50) DEFAULT 'active',  -- 狀態
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 架構方案

### 方案一：獨立資料表（推薦）⭐

每個系統建立獨立的資料表，結構清晰，易於維護。

#### 優點

- ✅ **資料隔離**：每個系統的資料獨立管理
- ✅ **結構清晰**：每個系統的資料結構可以完全客製化
- ✅ **查詢效能**：可針對每個系統進行索引優化
- ✅ **擴展性佳**：新增系統不影響現有系統
- ✅ **維護容易**：每個系統的資料結構獨立，易於理解和維護

#### 缺點

- ⚠️ 需要為每個系統建立資料表
- ⚠️ 跨系統查詢需要 JOIN 多張表

#### 實作範例

**照明系統：**

```sql
CREATE TABLE lighting_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  floor_id VARCHAR(50) NOT NULL,
  location_x DECIMAL(5,2) NOT NULL,
  location_y DECIMAL(5,2) NOT NULL,
  device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  modbus_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'active',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**空調系統：**

```sql
CREATE TABLE hvac_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  floor_id VARCHAR(50) NOT NULL,
  location_x DECIMAL(5,2),
  location_y DECIMAL(5,2),
  device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  hvac_config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- 溫度設定、風速等
  status VARCHAR(50) DEFAULT 'active',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**消防系統：**

```sql
CREATE TABLE fire_alarms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  floor_id VARCHAR(50) NOT NULL,
  location_x DECIMAL(5,2),
  location_y DECIMAL(5,2),
  device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  alarm_config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- 警報設定、感應器類型等
  status VARCHAR(50) DEFAULT 'active',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 方案二：統一資料表 + 系統類型欄位

使用單一資料表，透過 `system_type` 欄位區分不同系統。

#### 資料表結構

```sql
CREATE TABLE system_entities (
  id SERIAL PRIMARY KEY,
  system_type VARCHAR(50) NOT NULL,  -- 'lighting', 'hvac', 'fire', etc.
  name VARCHAR(100) NOT NULL,
  floor_id VARCHAR(50),
  location_x DECIMAL(5,2),
  location_y DECIMAL(5,2),
  device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  system_config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- 系統特定配置
  status VARCHAR(50) DEFAULT 'active',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_entities_system_type ON system_entities(system_type);
CREATE INDEX idx_system_entities_floor_id ON system_entities(floor_id);
```

#### 優點

- ✅ **統一管理**：所有系統資料在同一張表
- ✅ **跨系統查詢**：容易查詢所有系統的資料
- ✅ **實作簡單**：只需建立一張表

#### 缺點

- ❌ **結構混亂**：不同系統的資料結構差異大，難以統一
- ❌ **查詢複雜**：需要大量使用 JSONB 查詢
- ❌ **擴展性差**：新增系統特定欄位困難
- ❌ **效能問題**：單一表會變得很大，影響查詢效能
- ❌ **資料完整性**：無法針對不同系統建立不同的約束

#### 不推薦原因

不同系統的資料結構差異很大，強行統一會導致：
- JSONB 欄位過於複雜
- 查詢效能下降
- 維護困難

---

### 方案三：混合方案（核心表 + 系統特定表）

建立核心資料表，各系統可擴展自己的特定表。

#### 資料表結構

**核心表（所有系統共用）：**

```sql
CREATE TABLE system_entities (
  id SERIAL PRIMARY KEY,
  system_type VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  floor_id VARCHAR(50),
  location_x DECIMAL(5,2),
  location_y DECIMAL(5,2),
  device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**系統特定表（各系統擴展）：**

```sql
-- 照明系統擴展
CREATE TABLE lighting_categories (
  entity_id INTEGER PRIMARY KEY REFERENCES system_entities(id) ON DELETE CASCADE,
  modbus_config JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 空調系統擴展
CREATE TABLE hvac_zones (
  entity_id INTEGER PRIMARY KEY REFERENCES system_entities(id) ON DELETE CASCADE,
  hvac_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  temperature_setpoint DECIMAL(4,2),
  fan_speed INTEGER
);
```

#### 優點

- ✅ **統一核心**：核心欄位統一管理
- ✅ **系統擴展**：各系統可擴展自己的欄位
- ✅ **跨系統查詢**：可查詢所有系統的核心資料

#### 缺點

- ⚠️ **查詢複雜**：需要 JOIN 多張表
- ⚠️ **實作複雜**：需要維護核心表和擴展表的關係

---

## 推薦方案：方案一（獨立資料表）

### 理由

1. **資料結構清晰**：每個系統的資料結構可以完全客製化
2. **查詢效能佳**：可針對每個系統進行索引優化
3. **擴展性最佳**：新增系統不影響現有系統
4. **維護容易**：每個系統的資料結構獨立，易於理解和維護

### 實作架構

```
資料庫結構
├── 核心表（所有系統共用）
│   ├── devices（設備）
│   ├── device_types（設備類型）
│   ├── device_models（設備型號）
│   └── users（使用者）
│
└── 系統特定表（各系統獨立）
    ├── lighting_categories（照明系統）
    ├── hvac_zones（空調系統）
    ├── fire_alarms（消防系統）
    ├── security_access_points（門禁系統）
    ├── power_meters（電力系統）
    ├── elevator_cars（電梯系統）
    ├── surveillance_cameras（影像監視系統）
    ├── environment_sensors（環境感測器）
    └── ...（其他系統）
```

---

## 實作指南

### 1. 建立照明系統資料表

```sql
-- 照明系統分類點表
CREATE TABLE lighting_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  floor_id VARCHAR(50) NOT NULL,
  location_x DECIMAL(5,2) NOT NULL,
  location_y DECIMAL(5,2) NOT NULL,
  description TEXT,
  device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  modbus_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  room_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  status VARCHAR(50) DEFAULT 'active',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_lighting_categories_floor_id ON lighting_categories(floor_id);
CREATE INDEX idx_lighting_categories_device_id ON lighting_categories(device_id);
CREATE INDEX idx_lighting_categories_modbus_config ON lighting_categories USING GIN(modbus_config);
CREATE INDEX idx_lighting_categories_status ON lighting_categories(status);

-- 更新時間觸發器
CREATE OR REPLACE FUNCTION update_lighting_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lighting_categories_updated_at
  BEFORE UPDATE ON lighting_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_lighting_categories_updated_at();
```

### 2. 建立 API 路由結構

```
後端 API 結構
├── /api/devices/*（設備管理，已存在）
├── /api/lighting/*
│   ├── GET    /api/lighting/categories
│   ├── GET    /api/lighting/categories/:id
│   ├── POST   /api/lighting/categories
│   ├── PUT    /api/lighting/categories/:id
│   └── DELETE /api/lighting/categories/:id
├── /api/hvac/*
│   └── ...（空調系統 API）
├── /api/fire/*
│   └── ...（消防系統 API）
└── ...（其他系統 API）
```

### 3. 建立前端 Composable 結構

```
前端 Composable 結構
├── useDeviceApi.ts（設備管理，已存在）
├── useLightingApi.ts（照明系統）
├── useHvacApi.ts（空調系統）
├── useFireApi.ts（消防系統）
└── ...（其他系統）
```

### 4. 統一錯誤處理

```typescript
// app/composables/useSystemApiBase.ts
export const useSystemApiBase = () => {
  const { request } = useApiBase();

  return {
    // 統一的 CRUD 操作模板
    createEntity: <T>(systemName: string, entityName: string, data: any) => {
      return request<{ message: string; [entityName]: T }>(
        `/${systemName}/${entityName}`,
        {
          method: "POST",
          body: JSON.stringify(data)
        }
      );
    },

    getEntities: <T>(systemName: string, entityName: string, params?: Record<string, any>) => {
      const query = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query.append(key, String(value));
          }
        });
      }
      const queryString = query.toString();
      return request<{ [entityName + "s"]: T[] }>(
        `/${systemName}/${entityName}${queryString ? `?${queryString}` : ""}`
      );
    },

    // ... 其他 CRUD 操作
  };
};
```

---

## 系統分類與資料表設計建議

### 需要設備關聯的系統

這些系統需要關聯 `devices` 表：

| 系統 | 資料表名稱 | 主要實體 | 說明 |
|------|-----------|---------|------|
| 照明系統 | `lighting_categories` | 分類點 | 控制點位配置 |
| 空調系統 | `hvac_zones` | 區域 | 溫度、風速控制 |
| 消防系統 | `fire_alarms` | 警報器 | 感應器、警報器 |
| 門禁系統 | `security_access_points` | 門禁點 | 讀卡機、門鎖 |
| 電力系統 | `power_meters` | 電表 | 電力監控 |
| 電梯系統 | `elevator_cars` | 電梯廂 | 電梯控制 |
| 影像監視 | `surveillance_cameras` | 攝影機 | 攝影機配置 |
| 環境感測器 | `environment_sensors` | 感測器 | PM2.5、溫濕度等 |

### 不需要設備關聯的系統

這些系統可能不需要直接關聯設備：

| 系統 | 資料表名稱 | 主要實體 | 說明 |
|------|-----------|---------|------|
| 區域平面圖 | `map_floors` | 樓層 | 平面圖配置 |
| 車輛進出管理 | `vehicle_access_logs` | 進出記錄 | 車輛進出記錄 |
| 人流統計管理 | `people_counting_logs` | 統計記錄 | 人流統計 |
| 訪客系統 | `visitor_registrations` | 訪客登記 | 訪客管理 |
| 寄物管理 | `locker_units` | 寄物櫃 | 寄物櫃管理 |

---

## 資料表命名規範

### 命名規則

1. **使用小寫字母和底線**
2. **表名格式**：`{system_name}_{entity_name}`
3. **複數形式**：實體名稱使用複數（如 `categories`、`zones`）

### 範例

```
lighting_categories          ✅ 正確
lighting_category            ❌ 錯誤（應使用複數）
lightingCategories           ❌ 錯誤（應使用底線）
Lighting_Categories          ❌ 錯誤（應使用小寫）

hvac_zones                   ✅ 正確
fire_alarms                  ✅ 正確
security_access_points       ✅ 正確
```

---

## API 路由命名規範

### 命名規則

1. **使用小寫字母和連字號**
2. **路由格式**：`/api/{system-name}/{entity-name}`
3. **複數形式**：實體名稱使用複數

### 範例

```
/api/lighting/categories           ✅ 正確
/api/lighting/category              ❌ 錯誤（應使用複數）
/api/lighting_categories            ❌ 錯誤（應使用連字號）

/api/hvac/zones                     ✅ 正確
/api/fire/alarms                    ✅ 正確
/api/security/access-points         ✅ 正確
```

---

## 前端 Composable 命名規範

### 命名規則

1. **使用 PascalCase**
2. **格式**：`use{SystemName}Api`
3. **系統名稱首字母大寫**

### 範例

```typescript
useLightingApi      ✅ 正確
useHvacApi          ✅ 正確
useFireApi          ✅ 正確
useSecurityApi      ✅ 正確

useLighting         ❌ 錯誤（缺少 Api 後綴）
use_lighting_api    ❌ 錯誤（應使用 PascalCase）
```

---

## 遷移策略

### 階段一：建立照明系統（當前）

1. ✅ 建立 `lighting_categories` 資料表
2. ✅ 建立 `/api/lighting/*` API 路由
3. ✅ 建立 `useLightingApi` composable
4. ✅ 修改前端程式碼，從 localStorage 遷移到 API
5. ✅ 執行資料遷移腳本

### 階段二：建立其他主要系統

按照優先順序，逐步建立：

1. **空調系統**（HVAC）
2. **消防系統**（Fire）
3. **門禁系統**（Security）
4. **電力系統**（Power）
5. **電梯系統**（Elevator）

### 階段三：建立擴充系統

根據需求，逐步建立擴充系統的資料表。

---

## 資料庫結構總覽

### 完整資料表列表（建議）

```sql
-- 核心表
devices
device_types
device_models
users

-- 照明系統
lighting_categories

-- 空調系統
hvac_zones
hvac_schedules

-- 消防系統
fire_alarms
fire_sensors

-- 門禁系統
security_access_points
security_cards

-- 電力系統
power_meters
power_circuits

-- 電梯系統
elevator_cars
elevator_floors

-- 影像監視系統
surveillance_cameras
surveillance_recordings

-- 環境感測器
environment_sensors
environment_readings

-- 車輛進出管理
vehicle_access_logs
vehicle_registrations

-- 人流統計
people_counting_logs
people_counting_zones

-- 訪客系統
visitor_registrations

-- 寄物管理
locker_units
locker_rentals
```

---

## 總結

### 推薦架構

**採用方案一（獨立資料表）**，原因：

1. ✅ **資料結構清晰**：每個系統的資料結構可以完全客製化
2. ✅ **查詢效能佳**：可針對每個系統進行索引優化
3. ✅ **擴展性最佳**：新增系統不影響現有系統
4. ✅ **維護容易**：每個系統的資料結構獨立，易於理解和維護

### 實作優先順序

1. **照明系統**（當前進行中）
2. **空調系統**（HVAC）
3. **消防系統**（Fire）
4. **門禁系統**（Security）
5. **其他系統**（根據需求逐步建立）

### 統一設計模式

所有系統都遵循相同的設計模式：
- 資料表命名：`{system_name}_{entity_name}`
- API 路由：`/api/{system-name}/{entity-name}`
- Composable：`use{SystemName}Api`
- 核心欄位：`id`、`name`、`status`、`created_at`、`updated_at`

---

**最後更新：** 2025-01-XX  
**文件版本：** 1.0

