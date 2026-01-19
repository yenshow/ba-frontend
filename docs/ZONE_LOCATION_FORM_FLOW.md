# 區域與地點表單流程文檔

**更新日期**：2024-01-XX  
**狀態**：✅ 已完成

---

## 📋 概述

本文檔詳細說明新增區域（Zone）與地點（Location）的完整表單流程、驗證規則、API 調用流程以及系統特定設定。

---

## 🏗️ 架構概覽

### 組件層級

```
ZoneManagementDialog.vue（統一管理對話框）
├── ZoneFormFields.vue（區域表單欄位）
└── LocationFormFields/
    ├── LightingLocationFields.vue（照明系統地點欄位）
    ├── EnvironmentLocationFields.vue（環境監測系統地點欄位）
    └── PeopleCountingLocationFields.vue（人流統計系統地點欄位）
```

### Composables 層級

```
useZoneManagement（區域管理邏輯）
├── useZoneSystemAdapter（系統適配器）
├── useZoneValidation（區域驗證）
└── location/
    ├── useLocationApi（統一地點 API）
    ├── useLocationValidation（地點基礎驗證）
    └── use*LocationValidation（系統特定驗證）
```

---

## 📝 表單流程

### 1. 新增區域流程

#### 1.1 觸發新增

```typescript
// 用戶點擊「新增區域」按鈕
const addNewZone = () => {
	// 生成不重複的臨時名稱
	let tempName = `${zones.length + 1}F`;
	let counter = 1;
	while (zones.some(z => z.name.trim() === tempName.trim())) {
		tempName = `${zones.length + 1 + counter}F`;
		counter++;
	}

	// 使用適配器建立新區域
	const newZone = adapter.createNewZone(tempName);
	const tempId = `temp-${Date.now()}-${Math.random()}`;

	// 加入待保存列表並展開
	pendingChanges.value.set(tempId, newZone);
	expandedZones.value.add(tempId);

	// 直接觸發保存以創建新區域
	emit("save", newZone);
};
```

#### 1.2 區域表單欄位

**組件**：`ZoneFormFields.vue`

**欄位**：

| 欄位     | 類型              | 必填 | 驗證規則                    | 說明           |
| -------- | ----------------- | ---- | --------------------------- | -------------- |
| 區域名稱 | `string`          | ✅   | 1-100 字元                  | 例如：1F、2F   |
| 示意圖   | `string` (Base64) | ⚠️   | 10MB 以內，PNG/JPG/GIF/WEBP | 僅照明系統必填 |
| 描述     | `string`          | ❌   | ≤ 500 字元                  | 選填           |

**驗證邏輯**：

```typescript
// 使用 useZoneValidation
const { validateZone } = useZoneValidation();

const result = validateZone({
	name: zone.name,
	imageUrl: zone.imageUrl,
	description: zone.description
});

if (!result.isValid) {
	errorMessage.value = result.errors.join(", ");
	return;
}
```

#### 1.3 儲存區域

**流程**：

```typescript
// 1. 驗證區域
const validation = validateZone(zone);
if (!validation.isValid) {
	errorMessage.value = validation.errors.join(", ");
	return;
}

// 2. 過濾空地點
const cleanedZone = adapter.filterEmptyLocations(zone);

// 3. 調用 API（透過 useZoneManagement）
await handleSaveZone(
	cleanedZone,
	zonesRef,
	async z => {
		return z.id
			? await api.updateZone(z.id, { name: z.name, imageUrl: z.imageUrl, locations: z.locations })
			: await api.createZone({ name: z.name, imageUrl: z.imageUrl, locations: z.locations });
	},
	{
		onAfterSave: () => {
			/* 後續處理 */
		}
	}
);
```

**API 調用**：

```typescript
// 統一地點 API
POST /api/locations/zones
{
  "name": "1F",
  "imageUrl": "data:image/png;base64,...",
  "locations": []
}

// 或系統特定 API（照明系統）
POST /api/lighting/zones
{
  "name": "1F",
  "imageUrl": "data:image/png;base64,...",
  "locations": []
}
```

---

### 2. 新增地點流程

#### 2.1 觸發新增

```typescript
// 用戶點擊「新增地點」按鈕
const addLocation = (zone: TZone) => {
	// 使用適配器建立新地點
	const newLocation = adapter.createNewLocation();
	const locations = [...getLocations(zone), newLocation];
	const updatedZone = adapter.setLocationsProperty(zone, locations);

	// 更新區域（加入待保存列表）
	updateZone(updatedZone);
};
```

#### 2.2 地點表單欄位（系統特定）

##### 照明系統（LightingLocationFields.vue）

**欄位**：

| 欄位        | 類型           | 必填 | 驗證規則           | 說明                                       |
| ----------- | -------------- | ---- | ------------------ | ------------------------------------------ |
| 點位名稱    | `string`       | ✅   | 1-100 字元，不重複 | 例如：主燈開關                             |
| 控制器      | `number`       | ❌   | 有效的設備 ID      | 從設備列表選擇                             |
| Modbus 類型 | `"DO" \| "DI"` | ⚠️   | 選擇控制器時必填   | DO（數位輸出）/ DI（數位輸入）             |
| Modbus 地址 | `number`       | ⚠️   | 0-65535，不重複    | 選擇控制器時必填，同一設備同一類型不能重複 |

**驗證邏輯**：

```typescript
// 使用 useLightingLocationValidation
const { validateLightingLocation, isAddressDuplicate } = useLightingLocationValidation();

const error = validateLightingLocation(zone, location, locationIndex);
if (error) {
	// 顯示錯誤訊息
	return;
}

// 檢查地址重複
if (isAddressDuplicate(zone, deviceId, type, address, locationIndex)) {
	// 顯示重複錯誤
	return;
}
```

##### 環境監測系統（EnvironmentLocationFields.vue）

**欄位**：

| 欄位       | 類型                | 必填 | 驗證規則           | 說明                         |
| ---------- | ------------------- | ---- | ------------------ | ---------------------------- |
| 地點名稱   | `string`            | ✅   | 1-100 字元，不重複 | 例如：管理中心               |
| 感測器設備 | `number`            | ❌   | 有效的設備 ID      | 從設備列表選擇               |
| 感測器參數 | `SensorParameter[]` | ❌   | 根據設備型號配置   | 多選，從設備型號讀取可用參數 |

**驗證邏輯**：

```typescript
// 使用 useEnvironmentLocationValidation
const { validateEnvironmentLocation } = useEnvironmentLocationValidation();

const error = validateEnvironmentLocation(zone, location);
if (error) {
	// 顯示錯誤訊息
	return;
}

// 如果配置了參數但未選擇設備，顯示錯誤
if (location.parameters.length > 0 && !location.deviceId) {
	return "已配置參數，但未選擇感測器設備";
}
```

##### 人流統計系統（PeopleCountingLocationFields.vue）

**欄位**：

| 欄位        | 類型       | 必填 | 驗證規則           | 說明                  |
| ----------- | ---------- | ---- | ------------------ | --------------------- |
| 地點名稱    | `string`   | ✅   | 1-100 字元，不重複 | 例如：工地A           |
| 人員群組 ID | `number[]` | ✅   | 至少一個 ID        | 多選，從 API 取得列表 |
| 入口設備 ID | `number`   | ❌   | 有效的設備 ID      | 選填                  |
| 出口設備 ID | `number`   | ❌   | 有效的設備 ID      | 選填                  |

**驗證邏輯**：

```typescript
// 使用 usePeopleCountingLocationValidation
const { validatePeopleCountingLocation } = usePeopleCountingLocationValidation();

const error = validatePeopleCountingLocation(zone, location);
if (error) {
	// 顯示錯誤訊息
	return;
}

// 檢查人員群組 ID
if (!location.personGroupIds || location.personGroupIds.length === 0) {
	return "必須選擇至少一個人員群組 ID";
}
```

#### 2.3 儲存地點

地點的儲存是透過更新區域來完成的：

```typescript
// 1. 更新地點
const handleLocationUpdate = (
	zoneId: string,
	locationIndex: number,
	updatedLocation: SystemLocationType
) => {
	const zone = sortedZones.value.find(z => getZoneId(z) === zoneId);
	if (!zone) return;

	const locations = [...getLocations(zone)];
	locations[locationIndex] = updatedLocation;

	const updatedZone = adapter.setLocationsProperty(zone, locations);
	updateZone(updatedZone); // 加入待保存列表
};

// 2. 批次儲存所有變更
const saveAllChanges = async () => {
	if (pendingChanges.value.size === 0) return;

	// 驗證所有待保存的區域
	for (const [zoneId, zone] of pendingChanges.value.entries()) {
		const validation = validateZone({
			name: zone.name,
			imageUrl: zone.imageUrl,
			description: zone.description
		});
		if (!validation.isValid) {
			errorMessage.value = validation.errors.join("\n");
			return;
		}
	}

	// 逐一儲存
	const zonesToSave = Array.from(pendingChanges.value.values());
	pendingChanges.value.clear();

	for (const zone of zonesToSave) {
		const cleanedZone = adapter.filterEmptyLocations(zone);
		emit("save", cleanedZone); // 觸發保存事件
	}
};
```

---

## ✅ 驗證規則

### 區域驗證（useZoneValidation）

| 驗證項目     | 規則                       | 錯誤訊息                                         |
| ------------ | -------------------------- | ------------------------------------------------ |
| 區域名稱必填 | `name.trim().length > 0`   | "區域名稱不能為空"                               |
| 區域名稱長度 | `name.length ≤ 100`        | "區域名稱長度不能超過 100 字元"                  |
| 示意圖格式   | PNG/JPG/GIF/WEBP           | "不支援的圖片格式，請使用 PNG、JPG、GIF 或 WEBP" |
| 示意圖大小   | ≤ 10MB                     | "圖片大小不能超過 10MB"                          |
| 描述長度     | `description.length ≤ 500` | "區域描述長度不能超過 500 字元"                  |

### 地點基礎驗證（useLocationValidation）

| 驗證項目     | 規則                       | 錯誤訊息                                   |
| ------------ | -------------------------- | ------------------------------------------ |
| 地點名稱必填 | `name.trim().length > 0`   | "地點名稱不能為空"                         |
| 地點名稱長度 | `name.length ≤ 100`        | "地點名稱長度不能超過 100 字元"            |
| 名稱重複檢查 | 同一區域內不重複           | 自動檢查，不顯示錯誤（由系統特定驗證處理） |
| 描述長度     | `description.length ≤ 500` | "地點描述長度不能超過 500 字元"            |

### 照明系統地點驗證（useLightingLocationValidation）

| 驗證項目        | 規則                     | 錯誤訊息                                                           |
| --------------- | ------------------------ | ------------------------------------------------------------------ |
| Modbus 類型必填 | 選擇控制器時必填         | "Modbus 類型不能為空"                                              |
| Modbus 地址必填 | 選擇控制器時必填         | "Modbus 地址不能為空"                                              |
| Modbus 地址範圍 | `0 ≤ address ≤ 65535`    | "Modbus 地址不能為負數" / "Modbus 地址不能超過 65535"              |
| 地址重複檢查    | 同一設備、同一類型不重複 | "地址 ${address} 與其他點位重複（設備 ${deviceId}，類型 ${type}）" |

### 環境監測系統地點驗證（useEnvironmentLocationValidation）

| 驗證項目         | 規則                   | 錯誤訊息                         |
| ---------------- | ---------------------- | -------------------------------- |
| 設備與參數一致性 | 配置參數時必須選擇設備 | "已配置參數，但未選擇感測器設備" |

### 人流統計系統地點驗證（usePeopleCountingLocationValidation）

| 驗證項目         | 規則                        | 錯誤訊息                      |
| ---------------- | --------------------------- | ----------------------------- |
| 人員群組 ID 必填 | `personGroupIds.length > 0` | "必須選擇至少一個人員群組 ID" |

---

## 🔄 API 調用流程

### 1. 建立區域

```typescript
// 統一 API
POST /api/locations/zones
Request Body:
{
  "name": "1F",
  "imageUrl": "data:image/png;base64,...",
  "locations": []
}

Response:
{
  "merged": false,
  "message": "區域建立成功",
  "zone": {
    "id": "zone-123",
    "name": "1F",
    "imageUrl": "data:image/png;base64,...",
    "locations": []
  }
}
```

### 2. 更新區域

```typescript
// 統一 API
PUT /api/locations/zones/:zoneId
Request Body:
{
  "name": "1F",
  "imageUrl": "data:image/png;base64,...",
  "locations": [
    {
      "name": "主燈開關",
      "systems": [
        {
          "systemType": "lighting",
          "config": {
            "deviceId": 1,
            "modbus": {
              "points": [
                {
                  "type": "DO",
                  "address": 1
                }
              ]
            }
          }
        }
      ]
    }
  ]
}

Response:
{
  "merged": false,
  "message": "區域更新成功",
  "zone": { /* 更新後的區域資料 */ }
}
```

### 3. 刪除區域

```typescript
// 統一 API
DELETE /api/locations/zones/:zoneId?systemType=lighting

// 方案一：只刪除該系統的地點
// 如果區域還有其他系統的地點，只移除該系統的地點
// 如果區域只有該系統的地點，則刪除整個區域

Response:
{
  "message": "區域刪除成功"
}
```

---

## ⚙️ 系統特定設定

### 照明系統

**設定**：

```typescript
<ZoneManagementDialog
  system-type="lighting"
  :require-image-url="true"        // 示意圖必填
  :allow-multiple-locations="true" // 允許多個地點
  location-label="點位"
  location-list-label="點位列表"
  device-hint="請先在「設備管理」中建立控制器設備"
/>
```

**特點**：

- ✅ 示意圖必填
- ✅ 允許多個地點
- ✅ 需要 Modbus 配置（類型、地址）
- ✅ 地址重複檢查（同一設備、同一類型）

### 環境監測系統

**設定**：

```typescript
<ZoneManagementDialog
  system-type="environment"
  :require-image-url="false"       // 示意圖選填
  :allow-multiple-locations="false" // 每個區域只有一個地點
  location-label="地點"
  location-list-label="地點"
  device-hint="請先在「設備管理」中建立感測器設備"
/>
```

**特點**：

- ❌ 示意圖選填
- ❌ 每個區域只有一個地點
- ✅ 需要感測器參數配置
- ✅ 參數從設備型號讀取

### 人流統計系統

**設定**：

```typescript
<ZoneManagementDialog
  system-type="people_counting"
  :require-image-url="false"       // 示意圖選填
  :allow-multiple-locations="true" // 允許多個地點
  location-label="地點"
  location-list-label="地點列表"
/>
```

**特點**：

- ❌ 示意圖選填
- ✅ 允許多個地點
- ✅ 需要人員群組 ID（必填，多選）
- ✅ 入口/出口設備 ID（選填）

---

## 🔧 系統適配器（useZoneSystemAdapter）

系統適配器負責處理不同系統類型的轉換：

```typescript
// 取得適配器
const adapter = useZoneSystemAdapter<LightingZone, LightingLocation>("lighting");

// 主要方法
adapter.getLocationsProperty(zone); // 取得地點列表
adapter.setLocationsProperty(zone, locations); // 設定地點列表
adapter.createNewLocation(); // 建立新地點
adapter.createNewZone(name); // 建立新區域
adapter.filterEmptyLocations(zone); // 過濾空地點
adapter.systemToUnified(zone); // 轉換為統一格式
adapter.backendToSystem(zone); // 從後端格式轉換
```

---

## 📊 狀態管理

### 本地狀態

```typescript
// ZoneManagementDialog.vue 內部狀態
const pendingChanges = ref<Map<string, TZone>>(new Map()); // 待保存的變更
const expandedZones = ref<Set<string>>(new Set()); // 展開的區域
const errorMessage = ref(""); // 錯誤訊息
```

### 合併顯示

```typescript
// 合併原始 zones 和待保存的變更
const mergedZones = computed(() => {
	const zonesMap = new Map<string, TZone>();

	// 先添加所有原始 zones
	props.zones.forEach(zone => {
		const zoneId = getZoneId(zone);
		if (zoneId) {
			zonesMap.set(zoneId, { ...zone });
		}
	});

	// 然後用待保存的變更覆蓋
	pendingChanges.value.forEach((zone, zoneId) => {
		zonesMap.set(zoneId, { ...zone });
	});

	return Array.from(zonesMap.values());
});
```

### 排序

```typescript
// 按區域名稱的自然排序（1F, 2F, 3F...）
const sortedZones = computed(() => {
	return [...mergedZones.value].sort((a, b) => {
		const nameA = a.name || "";
		const nameB = b.name || "";
		const numA = parseInt(nameA.match(/\d+/)?.[0] || "999") || 999;
		const numB = parseInt(nameB.match(/\d+/)?.[0] || "999") || 999;
		return numA - numB;
	});
});
```

---

## 🎯 使用範例

### 完整流程範例（照明系統）

```typescript
// 1. 在頁面中使用
<ZoneManagementDialog
  v-model="showZoneManagementDialog"
  :zones="lightingZones"
  system-type="lighting"
  :require-image-url="true"
  :allow-multiple-locations="true"
  location-label="點位"
  location-list-label="點位列表"
  device-hint="請先在「設備管理」中建立控制器設備"
  @save="handleSaveZone"
  @delete="handleDeleteZone"
/>

// 2. 處理儲存
const handleSaveZone = async (zone: LightingZone) => {
  await baseHandleSaveZone(
    zone as LightingZone & { id: string },
    lightingZones as Ref<(LightingZone & { id: string })[]>,
    async (z: LightingZone & { id: string }) => {
      const result = z.id
        ? await lightingApi.updateZone(z.id, {
              name: z.name,
              imageUrl: z.imageUrl,
              locations: z.locations
          })
        : await lightingApi.createZone({
              name: z.name,
              imageUrl: z.imageUrl,
              locations: z.locations
          });
      return {
          merged: result.merged,
          message: result.message,
          zone: result.zone
      };
    },
    {
        selectedZoneRef: selectedZone,
        onAfterSave: () => {
            initializeLocationStatuses();
        }
    }
  );
};

// 3. 處理刪除
const handleDeleteZone = async (zoneId: string) => {
  await baseHandleDeleteZone(
    zoneId,
    lightingZones as Ref<(LightingZone & { id: string })[]>,
    lightingApi.deleteZone,
    {
        selectedZoneRef: selectedZone,
        systemType: "lighting",
        getFullZoneApiCall: async (id: string) => {
            const response = await locationApi.getZone(id);
            return { zone: response.zone };
        },
        updateZoneApiCall: async (id: string, data: { locations: UnifiedZone["locations"] }) => {
            const response = await locationApi.updateZone(id, { locations: data.locations });
            return {
                merged: response.merged,
                message: response.message,
                zone: backendToLightingZone(response.zone)
            };
        }
    }
  );
};
```

---

## 📋 檢查清單

### 新增區域時

- [ ] 區域名稱已填寫（1-100 字元）
- [ ] 照明系統：示意圖已上傳（≤ 10MB，PNG/JPG/GIF/WEBP）
- [ ] 其他系統：示意圖選填
- [ ] 描述選填（≤ 500 字元）
- [ ] 點擊「儲存變更」後驗證通過
- [ ] API 調用成功
- [ ] 區域列表更新

### 新增地點時

- [ ] 地點名稱已填寫（1-100 字元，不重複）
- [ ] 照明系統：Modbus 配置完整（類型、地址）
- [ ] 照明系統：地址不重複（同一設備、同一類型）
- [ ] 環境監測系統：感測器參數配置（選填）
- [ ] 人流統計系統：人員群組 ID 已選擇（至少一個）
- [ ] 點擊「儲存變更」後驗證通過
- [ ] API 調用成功
- [ ] 區域資料更新

---

## 🔍 錯誤處理

### 驗證錯誤

```typescript
// 區域驗證錯誤
const validation = validateZone(zone);
if (!validation.isValid) {
	errorMessage.value = validation.errors.join(", ");
	return; // 阻止保存
}

// 地點驗證錯誤（系統特定）
const error = validateLightingLocation(zone, location, index);
if (error) {
	// 在表單欄位下方顯示錯誤訊息
	return;
}
```

### API 錯誤

```typescript
// 使用 useErrorHandler 統一處理
const { handleError } = useErrorHandler();

try {
	await api.createZone(data);
} catch (error) {
	handleError(error, "建立區域失敗");
}
```

---

## 📚 相關文檔

- [Composables Systems 架構文檔](./COMPOSABLES_SYSTEMS_ARCHITECTURE.md)
- [前端重構完成報告](./FRONTEND_REFACTORING_COMPLETE.md)
- [區域地點表單設計](./ZONE_LOCATION_FORM_DESIGN.md)

---

**維護者**：開發團隊  
**最後更新**：2024-01-XX
