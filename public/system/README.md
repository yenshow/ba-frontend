# BA 系統圖標說明

## 📁 圖標目錄結構

所有圖標存放在 `/public/system/` 目錄下，使用 PNG 格式。

## 🏷️ 圖標命名規則

### 中文名稱 → 英文檔名對照表

#### 核心基礎系統

| 中文名稱     | 英文檔名                  | 模組 ID | 路由                          |
| ------------ | ------------------------- | ------- | ----------------------------- |
| 設備管理     | `equipment-management.png` | 1       | `/core/equipment-management`  |
| 使用者管理   | `user-management.png`     | 2       | `/core/users`                 |
| 警示紀錄     | `alert-log.png`           | 3       | `/core/alert-log`             |
| 區域點位圖   | `map.png`                 | 4       | `/core/area-point-map`        |

#### 工地監控系統

| 中文名稱     | 英文檔名                | 模組 ID | 路由                                    |
| ------------ | ----------------------- | ------- | --------------------------------------- |
| 環境品質系統 | `environment.png`       | 5       | `/construction-monitoring/environment`   |
| 人流統計管理 | `people-counting.png`   | 6       | `/construction-monitoring/people-counting` |
| 車輛進出管理 | `vehicle-access.png`    | 7       | `/construction-monitoring/vehicle-access` |
| 影像監視系統 | `surveillance.png`      | 8       | `/construction-monitoring/surveillance`  |

#### 基礎設施系統

| 中文名稱     | 英文檔名          | 模組 ID | 路由                      |
| ------------ | ----------------- | ------- | ------------------------- |
| 照明系統     | `lighting.png`    | 9       | `/infrastructure/lighting` |
| 空調系統     | `hvac.png`        | 10      | `/infrastructure/hvac`     |
| 電力系統     | `power.png`       | 11      | `/infrastructure/power`   |
| 電梯系統     | `elevator.png`    | 12      | `/infrastructure/elevator` |
| 衛生排水系統 | `drainage.png`    | 13      | `/infrastructure/drainage` |

#### 安全相關系統

| 中文名稱     | 英文檔名          | 模組 ID | 路由                    |
| ------------ | ----------------- | ------- | ----------------------- |
| 消防系統     | `fire.png`        | 14      | `/security/fire`        |
| 門禁保全系統 | `security.png`    | 15      | `/security/access-control` |
| 緊急求救系統 | `emergency.png`   | 16      | `/security/emergency`   |

#### 維護管理系統

| 中文名稱         | 英文檔名            | 模組 ID | 路由                        |
| ---------------- | ------------------- | ------- | --------------------------- |
| 設備維護管理系統 | `maintenance.png`   | 18      | `/maintenance/equipment`     |

#### 業務管理系統

| 中文名稱 | 英文檔名              | 模組 ID | 路由                      |
| -------- | --------------------- | ------- | --------------------------- |
| 訪客系統 | `visitor.png`         | 19      | `/business/visitor`         |
| 寄物管理 | `locker-management.png` | 20    | `/business/locker-management` |

#### 多媒體系統

| 中文名稱         | 英文檔名            | 模組 ID | 路由                    |
| ---------------- | ------------------- | ------- | ----------------------- |
| 多媒體資訊系統   | `video-wall.png`    | 21      | `/multimedia/info`       |

#### 備用圖標（未使用，可擴充）

| 中文名稱       | 英文檔名                  | 建議用途           |
| -------------- | ------------------------- | ------------------ |
| 全區點位圖     | `all-points.png`         | 全區設備點位展示   |
| 設備運轉可靠度 | `reliability.png`         | 設備運轉可靠度監控 |
| 設施管理系統   | `facility-management.png` | 設施管理系統       |
| 檔案系統       | `file-system.png`         | 文件檔案管理       |
| 空間管理       | `space-management.png`    | 空間使用管理       |
| 多媒體伺服器   | `multimedia-server.png`   | 多媒體伺服器管理   |
| 資訊平台       | `info-platform.png`       | 資訊發布平台       |

## 🎨 使用方式

### 在 Vue 組件中使用

```vue
<template>
	<img src="/system/map.png" alt="區域點位圖" />
</template>
```

### 動態圖標路徑

```vue
<template>
	<img :src="`/system/${iconName}.png`" :alt="moduleName" />
</template>

<script setup>
const iconName = "map";
const moduleName = "區域點位圖";
</script>
```

### 使用 Nuxt Image 組件

```vue
<template>
	<NuxtImg
		:src="`/system/${module.icon}.png`"
		:alt="module.name"
		class="h-8 w-8 object-contain"
		width="200"
		height="200"
	/>
</template>
```

### 在系統模組配置中使用

在 `app/config/system-modules.ts` 中配置模組時，設定 `icon` 屬性為檔名（不含 `.png` 副檔名）：

```typescript
{
	id: 4,
	name: "區域點位圖",
	icon: "map",  // 對應 /system/map.png
	route: "/core/area-point-map",
	category: "core",
	description: "整合區域平面圖與全區點位圖的空間視覺化系統"
}
```

## 📐 圖標規格

- **格式**: PNG
- **尺寸**: 原始圖標尺寸（已優化）
- **色彩**: 全彩色
- **背景**: 透明背景
- **建議顯示尺寸**: 64x64px - 128x128px

## 🎯 組件使用範例

### SystemModule 組件

在 `app/components/home/SystemModule.vue` 中，圖標會自動根據 `module.icon` 屬性載入：

```vue
<img
	:src="`/system/${module.icon}.png`"
	:alt="module.name"
	class="h-full w-full object-contain"
/>
```

### AppHeader 更多功能選單

在 `app/components/common/AppHeader.vue` 中：

```vue
<NuxtImg
	:src="`/system/${module.icon}.png`"
	:alt="module.name"
	class="icon-dark h-8 w-8 object-contain"
	width="200"
	height="200"
/>
```

## 💡 新增圖標步驟

1. **準備圖標**
   - 格式: PNG
   - 建議尺寸: 至少 128x128px
   - 背景: 透明

2. **命名規則**
   - 使用小寫英文
   - 單詞間用連字符 `-` 分隔
   - 例如: `user-management.png`

3. **放置位置**
   - 將圖標放入 `/public/system/` 目錄

4. **更新模組配置**
   - 在 `app/config/system-modules.ts` 中的 `systemModules` 陣列中新增模組
   - 設定 `icon` 屬性為檔名（不含 `.png` 副檔名）

## 🔄 圖標優化建議

### 效能優化

- 使用 PNG 壓縮工具減小檔案大小
- 建議使用 TinyPNG 或 ImageOptim

### 顯示優化

- 確保圖標在深色背景下清晰可見
- 考慮提供 SVG 版本以支援任意縮放

### 命名一致性

- 保持命名風格統一
- 使用語義化的英文名稱
- 避免使用特殊字元

## 📊 統計資訊

- **已使用圖標**: 20 個
- **備用圖標**: 7 個
- **總圖標數量**: 27 個

## 📝 修改記錄

### 2025-01-XX

- ✅ 新增「區域點位圖」模組，使用 `map.png` 圖標
- ✅ 移除「空間視覺化系統」模組（已整合至區域點位圖）
- ✅ 更新系統模組配置，所有模組 ID 重新編號
- ✅ 更新 README 以反映當前配置和正確路徑

### 2025-10-28

- ✅ 將所有中文檔名重命名為英文
- ✅ 更新 SystemModule 組件使用 PNG 圖標
- ✅ 建立圖標命名對照表
- ✅ 新增圖標使用說明文件

## 🔗 相關文件

- `app/config/system-modules.ts` - 系統模組配置
- `app/components/home/SystemModule.vue` - 系統模組組件
- `app/components/common/AppHeader.vue` - 應用程式標題列組件

---

**維護者**: 開發團隊  
**最後更新**: 2025-01-XX
