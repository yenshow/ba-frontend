# 區域/地點表單設計與流程統一方案

## 📋 現況分析

### 1. 照明系統 (Lighting)

**組件**: `app/components/lighting/FloorManagementDialog.vue` (應改名為 `ZoneManagementDialog.vue`)

**表單結構**:

- **區域欄位**:
  - `name` (必填): 區域名稱（如：1F、2F）
  - `imageUrl` (選填): 區域示意圖（Base64 或 URL）
  - `description` (選填): 區域描述

- **地點欄位** (每個區域可有多個地點):
  - `name` (必填): 點位名稱
  - `deviceId` (選填): 控制器設備 ID
  - `modbus.points[0].type` (必填，當有 deviceId 時): DI 或 DO
  - `modbus.points[0].address` (必填，當有 deviceId 時): Modbus 地址
  - `modbus.points[0].note` (選填): 備註
  - `location` (選填): 座標 { x, y }（百分比）

**流程**:

1. 批次編輯模式：所有區域展開/收起，統一儲存
2. 即時驗證：檢查同一區域內相同設備的地址是否重複
3. 自動過濾：儲存時過濾掉名稱為空的地點

**API 設計**:

- `POST /api/locations/zones` - 建立區域（含地點）
- `PUT /api/locations/zones/:id` - 更新區域（含地點）
- `DELETE /api/locations/zones/:id` - 刪除區域

---

### 2. 環境監測系統 (Environment)

**組件**: `app/components/environment/LocationManagementDialog.vue`

**表單結構**:

- **區域欄位**:
  - `name` (必填): 區域名稱（如：1F、2F）

- **地點欄位** (每個區域只有一個地點):
  - `name` (必填): 地點名稱
  - `deviceId` (選填): 感測器設備 ID
  - `parameters[]` (動態): 感測器參數列表
    - `type`: 參數類型（pm25, pm10, tvoc, hcho, humidity, temperature, co2, noise, wind）
    - `enabled`: 是否啟用

**流程**:

1. 批次編輯模式：所有區域展開/收起，統一儲存
2. 動態參數載入：選擇設備後，從設備型號配置讀取可用參數
3. 限制：每個區域只能有一個地點（`ensureSingleLocation`）

**API 設計**:

- `POST /api/locations/zones` - 建立區域（含地點）
- `PUT /api/locations/zones/:id` - 更新區域（含地點）
- `DELETE /api/locations/zones/:id` - 刪除區域

---

### 3. 人流統計系統 (People Counting)

**組件**: 目前沒有專門的 LocationManagementDialog（已被註解）

**表單結構**:

- **區域欄位**:
  - `name` (必填): 區域名稱（如：1F、2F）

- **地點欄位** (每個區域可有多個地點):
  - `name` (必填): 地點名稱（工地名稱）
  - `personGroupIds[]` (必填): 對應的 person_group.id 列表
  - `entryDoorId` (選填): 入口設備 ID
  - `exitDoorId` (選填): 出口設備 ID

**流程**:

- 目前通過獨立 API `/api/people-counting/locations` 管理
- 或通過統一 API `/api/locations/zones` 管理

**API 設計**:

- `POST /api/locations/zones` - 建立區域（含地點）
- `PUT /api/locations/zones/:id` - 更新區域（含地點）
- `DELETE /api/locations/zones/:id` - 刪除區域
- 獨立 API: `/api/people-counting/locations` (用於直接管理地點)

---

### 4. 統一地點管理 (area-point-map)

**組件**: `app/components/location/LocationManagementDialog.vue`

**表單結構**:

- **區域欄位**:
  - `name` (必填): 區域名稱
  - `imageUrl` (選填): 區域示意圖

- **地點欄位** (每個區域可有多個地點):
  - `name` (必填): 地點名稱
  - `description` (選填): 地點描述

**流程**:

- 單一區域編輯模式
- 即時儲存或統一儲存

**API 設計**:

- `PUT /api/locations/zones/:id` - 更新區域（含地點）

---

## 🎯 統一設計方案

### 核心原則

1. **統一 API 層**: 所有系統使用 `/api/locations/zones` 進行區域管理
2. **系統特定配置**: 地點的系統特定配置存儲在 `location_systems.system_config` 中
3. **批次編輯模式**: 所有系統統一使用批次編輯，展開/收起區域
4. **統一組件結構**: 建立統一的 `ZoneManagementDialog` 組件，通過 props 配置系統特定欄位

---

### 統一表單結構

#### 區域 (Zone) 欄位（所有系統共用）

```typescript
interface ZoneFormData {
	name: string; // 必填：區域名稱
	imageUrl?: string; // 選填：區域示意圖（照明系統專用）
	description?: string; // 選填：區域描述
	buildingId?: number; // 選填：建築物 ID
	zoneNumber?: number; // 選填：區域編號
}
```

#### 地點 (Location) 欄位（系統特定）

**統一基礎欄位**:

```typescript
interface BaseLocationFormData {
	name: string; // 必填：地點名稱
	description?: string; // 選填：地點描述
}
```

**系統特定配置** (存儲在 `system_config` 中):

1. **照明系統** (`LightingSystemConfig`):

   ```typescript
   {
     deviceId?: number;
     location?: { x: number; y: number };
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

2. **環境監測系統** (`EnvironmentSystemConfig`):

   ```typescript
   {
     deviceId?: number;
     parameters: Array<{
       type: string;
       enabled: boolean;
     }>;
   }
   ```

3. **人流統計系統** (`PeopleCountingSystemConfig`):
   ```typescript
   {
     personGroupIds: number[];
     entryDoorId?: number;
     exitDoorId?: number;
   }
   ```

---

### 統一組件設計

#### 組件結構

```
app/components/location/
├── ZoneManagementDialog.vue          # 統一區域管理對話框
├── LocationFormFields/
│   ├── LightingLocationFields.vue    # 照明系統地點欄位
│   ├── EnvironmentLocationFields.vue  # 環境監測系統地點欄位
│   └── PeopleCountingLocationFields.vue # 人流統計系統地點欄位
└── ZoneFormFields.vue                # 區域基礎欄位（共用）
```

#### 組件 Props

```typescript
interface ZoneManagementDialogProps {
	modelValue: boolean;
	zones: UnifiedZone[];
	systemType: SystemType; // 'lighting' | 'environment' | 'people_counting'
	// 系統特定配置
	allowMultipleLocations?: boolean; // 是否允許多個地點（預設：true）
	requireImageUrl?: boolean; // 是否需要示意圖（預設：false，照明系統為 true）
	locationFieldsComponent?: string; // 地點欄位組件名稱
}
```

#### 組件 Emits

```typescript
interface ZoneManagementDialogEmits {
	(e: "update:modelValue", value: boolean): void;
	(e: "save", zone: UnifiedZone): void;
	(e: "delete", zoneId: string): void;
}
```

---

### 統一流程設計

#### 1. 區域管理流程

```
用戶操作
  ↓
打開區域管理對話框
  ↓
載入區域列表（帶系統過濾）
  ↓
顯示區域列表（可展開/收起）
  ↓
編輯區域資訊
  ├─ 修改區域名稱
  ├─ 上傳/更換示意圖（照明系統）
  └─ 編輯地點列表
  ↓
批次儲存變更
  ↓
API 調用：PUT /api/locations/zones/:id
  ↓
更新本地狀態
```

#### 2. 地點管理流程

```
在區域內編輯地點
  ↓
根據系統類型顯示對應欄位
  ├─ 照明：設備、Modbus 配置、座標
  ├─ 環境：設備、參數選擇
  └─ 人流：personGroupIds、門禁設備
  ↓
即時驗證（地址重複、必填欄位等）
  ↓
儲存時轉換為 UnifiedLocation 格式
  ↓
API 調用：PUT /api/locations/zones/:id
  ↓
後端處理系統配置
```

---

### 後端 API 統一設計

#### 區域管理 API

```javascript
// POST /api/locations/zones
{
  name: string;                    // 必填
  imageUrl?: string;               // 選填
  description?: string;             // 選填
  buildingId?: number;              // 選填
  zoneNumber?: number;              // 選填
  locations?: Array<{              // 選填：建立時可同時建立地點
    name: string;                   // 必填
    description?: string;           // 選填
    systems?: Array<{               // 選填：系統配置
      systemType: SystemType;
      config: SystemConfig;
    }>;
  }>;
}

// 返回
{
  merged: boolean;                  // 是否合併到現有區域
  message: string;
  zone: UnifiedZone;
}
```

#### 地點管理 API

```javascript
// POST /api/locations
{
  zoneId: string;                   // 必填
  name: string;                     // 必填
  description?: string;             // 選填
  systems?: Array<{                 // 選填：系統配置
    systemType: SystemType;
    config: SystemConfig;
  }>;
}

// 返回
{
  message: string;
  location: UnifiedLocation;
}
```

---

### 驗證規則統一

#### 區域驗證

1. **名稱驗證**:
   - 必填
   - 不能為空字串
   - 不能只包含空白字元
   - 同一系統內名稱唯一（後端自動合併同名區域）

2. **示意圖驗證** (照明系統):
   - 檔案格式：PNG, JPG, JPEG, GIF, WEBP
   - 檔案大小：最大 10MB
   - 自動轉換為 Base64

#### 地點驗證

1. **基礎驗證**:
   - 名稱必填
   - 同一區域內名稱唯一

2. **系統特定驗證**:
   - **照明系統**:
     - 當有 `deviceId` 時，必須有 `modbus.points[0].type` 和 `modbus.points[0].address`
     - 同一區域內，相同設備的相同類型地址不能重複
   - **環境監測系統**:
     - 當有 `deviceId` 時，`parameters` 必須是有效陣列
   - **人流統計系統**:
     - `personGroupIds` 必須是有效陣列（至少一個元素）

---

### 後端服務層統一設計

#### locationService.js 結構

```javascript
// 區域管理
async function getZones(filters = {}) {
	// 支援 systemType 過濾
	// 批次查詢地點和系統，避免 N+1
	// 返回格式：{ zones: UnifiedZone[] }
}

async function getZoneById(id, systemType = null) {
	// 支援 systemType 過濾
	// 返回格式：{ zone: UnifiedZone }
}

async function createZone(zoneData, userId) {
	// 驗證：validateName(name, "區域名稱")
	// 自動合併同名區域（返回 merged: true）
	// 支援同時建立地點
	// 返回格式：{ merged: boolean, message: string, zone: UnifiedZone }
}

async function updateZone(id, zoneData, userId) {
	// 支援部分更新
	// 自動處理區域合併（當名稱改為已存在的名稱時）
	// 自動處理地點合併
	// 返回格式：{ merged: boolean, message: string, zone: UnifiedZone }
}

async function deleteZone(id) {
	// 級聯刪除地點
	// 只刪除沒有系統的地點
	// 返回格式：{ message: string }
}

// 地點管理
async function createLocation(locationData, userId) {
	// 驗證：validateName(name, "地點名稱")
	// 自動合併同名地點（同一區域內）
	// 支援多系統配置
	// 返回格式：{ message: string, location: UnifiedLocation }
}

async function updateLocation(id, locationData, userId) {
	// 支援部分更新
	// 自動處理系統配置更新
	// 返回格式：{ message: string, location: UnifiedLocation }
}

// 驗證函數
function validateName(name, fieldName = "名稱") {
	// 檢查：不能為空、不能只包含空白、長度不能超過 100 字元
	// 返回：trimmed name
}

function getValidLocations(locations) {
	// 過濾掉名稱為空的地點
	return locations.filter(loc => loc.name && loc.name.trim().length > 0);
}

// 系統配置構建
function buildSystemConfig(systemType, config) {
	// 根據系統類型構建配置物件
	// environment: { device_id, parameters }
	// lighting: { device_id, location_x, location_y, modbus_config }
	// people_counting: { person_group_ids, entry_door_id, exit_door_id }
}
```

#### 後端驗證規則

**區域驗證**:

- `name`: 必填，不能為空，不能只包含空白，長度 ≤ 100 字元
- `imageUrl`: 選填，字串格式
- `description`: 選填，字串格式
- `buildingId`: 選填，整數
- `zoneNumber`: 選填，整數

**地點驗證**:

- `name`: 必填，不能為空，不能只包含空白，長度 ≤ 100 字元
- `description`: 選填，字串格式
- `zoneId`: 必填（建立時），整數
- `systems`: 選填，陣列格式
  - `systemType`: 必填，必須是有效的系統類型
  - `config`: 選填，系統特定配置物件

**系統特定配置驗證** (建議增強):

1. **照明系統** (`lighting`):

   ```javascript
   {
     deviceId?: number;        // 選填，必須是有效的設備 ID
     location?: {              // 選填
       x: number;              // 0-100
       y: number;              // 0-100
     };
     modbus?: {                // 選填
       deviceId?: number;       // 選填
       points?: Array<{        // 選填
         address: number;      // 必填，≥ 0
         type: "DI" | "DO";    // 必填
         note?: string;        // 選填
       }>;
     };
   }
   ```

   - 當有 `deviceId` 時，建議驗證設備是否存在
   - 當有 `modbus.points` 時，建議驗證地址不重複（同一區域內，相同設備，相同類型）

2. **環境監測系統** (`environment`):

   ```javascript
   {
     deviceId?: number;        // 選填，必須是有效的設備 ID
     parameters: Array<{       // 必填，陣列
       type: string;           // 必填，必須是有效的參數類型
       enabled: boolean;       // 必填
     }>;
   }
   ```

   - 當有 `deviceId` 時，建議驗證設備是否存在
   - 建議驗證 `parameters` 中的 `type` 是否在設備型號配置中定義

3. **人流統計系統** (`people_counting`):
   ```javascript
   {
     personGroupIds: number[]; // 必填，至少一個元素
     entryDoorId?: number;     // 選填，必須是有效的設備 ID
     exitDoorId?: number;      // 選填，必須是有效的設備 ID
   }
   ```

   - 建議驗證 `personGroupIds` 中的 ID 是否存在
   - 建議驗證 `entryDoorId` 和 `exitDoorId` 是否存在（如果提供）

---

### 前端組件統一設計

#### ZoneManagementDialog.vue 結構

```vue
<template>
	<Teleport to="body">
		<Dialog>
			<Header>區域管理</Header>

			<Content>
				<!-- 區域列表 -->
				<ZoneList>
					<ZoneItem
						v-for="zone in sortedZones"
						:key="zone.id"
						:zone="zone"
						:expanded="expandedZones.has(zone.id)"
						@toggle="toggleZone"
						@delete="handleDeleteZone"
					>
						<!-- 區域基本資訊 -->
						<ZoneFormFields
							:zone="zone"
							:require-image-url="systemType === 'lighting'"
							@update="updateZone"
						/>

						<!-- 地點列表 -->
						<LocationList>
							<LocationItem
								v-for="(location, index) in zone.locations"
								:key="location.id || index"
								:location="location"
								:system-type="systemType"
							>
								<!-- 系統特定的地點欄位 -->
								<component
									:is="locationFieldsComponent"
									:location="location"
									:zone="zone"
									@update="updateLocation"
								/>
							</LocationItem>
						</LocationList>

						<!-- 新增地點按鈕 -->
						<button @click="addLocation(zone)">新增地點</button>
					</ZoneItem>
				</ZoneList>
			</Content>

			<Footer>
				<button @click="handleClose">關閉</button>
				<button @click="saveAllChanges" :disabled="!hasUnsavedChanges">儲存變更</button>
				<button @click="addNewZone">新增區域</button>
			</Footer>
		</Dialog>
	</Teleport>
</template>
```

---

### 實施步驟

#### 階段一：後端統一（已完成 ✅）

- [x] 統一 API 路由：`/api/locations/zones`
- [x] 統一服務層：`locationService.js`
- [x] 系統配置存儲：`location_systems.system_config`

#### 階段二：前端組件統一（待實施）

1. **建立統一組件結構**
   - [ ] 建立 `ZoneManagementDialog.vue` 統一組件
   - [ ] 建立 `LocationFormFields/` 目錄結構
   - [ ] 建立各系統的地點欄位組件

2. **重構現有組件**
   - [ ] 將 `FloorManagementDialog.vue` 重構為使用統一組件
   - [ ] 將 `environment/LocationManagementDialog.vue` 重構為使用統一組件
   - [ ] 為人流統計系統建立組件

3. **統一驗證邏輯**
   - [ ] 建立統一的驗證 composable
   - [ ] 系統特定的驗證規則

#### 階段三：優化與測試

- [ ] 統一錯誤處理
- [ ] 統一載入狀態
- [ ] 統一提示訊息
- [ ] 測試所有系統的表單流程

#### 階段四：後端驗證增強（建議）

- [ ] 建立系統特定配置驗證中間件
- [ ] 驗證設備 ID 是否存在
- [ ] 驗證 Modbus 地址不重複（照明系統）
- [ ] 驗證參數類型有效性（環境監測系統）
- [ ] 驗證 personGroupIds 有效性（人流統計系統）

---

## 📝 建議的改進點

### 1. 組件命名統一

- `FloorManagementDialog.vue` → `ZoneManagementDialog.vue`
- 所有組件使用 `Zone` 和 `Location` 命名

### 2. 表單欄位統一

- 所有系統共用區域基礎欄位組件
- 系統特定欄位通過插槽或動態組件注入

### 3. 驗證邏輯統一

- 建立 `useZoneValidation` composable
- 建立 `useLocationValidation` composable（系統特定）

### 4. 批次操作優化

- 統一使用批次儲存模式
- 統一變更追蹤機制

### 5. 後端驗證增強

- 統一驗證中間件
- 系統特定配置驗證

---

## 🔄 遷移計劃

### 步驟 1: 建立統一組件基礎結構

1. 建立 `ZoneManagementDialog.vue`
2. 建立 `LocationFormFields/` 目錄
3. 建立基礎欄位組件

### 步驟 2: 遷移照明系統

1. 更新 `FloorManagementDialog.vue` 使用統一組件
2. 建立 `LightingLocationFields.vue`
3. 測試照明系統流程

### 步驟 3: 遷移環境監測系統

1. 更新 `environment/LocationManagementDialog.vue`
2. 建立 `EnvironmentLocationFields.vue`
3. 測試環境監測系統流程

### 步驟 4: 遷移人流統計系統

1. 建立人流統計專用組件
2. 建立 `PeopleCountingLocationFields.vue`
3. 測試人流統計系統流程

### 步驟 5: 清理舊組件

1. 移除重複的組件
2. 統一命名
3. 更新所有引用

---

## 📊 對比表

| 項目     | 照明系統                   | 環境監測系統           | 人流統計系統                            | 統一後                        |
| -------- | -------------------------- | ---------------------- | --------------------------------------- | ----------------------------- |
| 區域欄位 | name, imageUrl             | name                   | name                                    | name, imageUrl?, description? |
| 地點數量 | 多個                       | 1個                    | 多個                                    | 可配置                        |
| 地點欄位 | deviceId, modbus, location | deviceId, parameters   | personGroupIds, entryDoorId, exitDoorId | 系統特定配置                  |
| 編輯模式 | 批次                       | 批次                   | 無                                      | 批次                          |
| 驗證規則 | 地址重複檢查               | 參數有效性             | 無                                      | 統一驗證框架                  |
| API      | `/api/locations/zones`     | `/api/locations/zones` | `/api/locations/zones`                  | `/api/locations/zones`        |

---

## ✅ 統一後的優勢

1. **代碼重用**: 統一組件減少重複代碼
2. **維護性**: 統一結構易於維護和擴展
3. **一致性**: 所有系統使用相同的 UI/UX
4. **可擴展性**: 新增系統只需建立對應的地點欄位組件
5. **類型安全**: 統一的類型定義確保類型安全
