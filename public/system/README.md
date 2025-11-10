# BA 系統圖標說明

## 📁 圖標目錄結構

所有圖標存放在 `/public/icon/` 目錄下，使用 PNG 格式。

## 🏷️ 圖標命名規則

### 中文名稱 → 英文檔名對照表

#### 主要系統模組（已使用）

| 中文名稱     | 英文檔名           | 用途             | 模組 ID |
| ------------ | ------------------ | ---------------- | ------- |
| 區域平面圖   | `map.png`          | 區域平面圖模組   | 1       |
| 門禁保全系統 | `security.png`     | 門禁保全系統模組 | 2       |
| 影像監視系統 | `surveillance.png` | 影像監視系統模組 | 3       |
| 消防系統     | `fire.png`         | 消防系統模組     | 4       |
| 照明系統     | `lighting.png`     | 照明系統模組     | 5       |
| 電力系統     | `power.png`        | 電力系統模組     | 6       |
| 衛生排水系統 | `drainage.png`     | 衛生排水系統模組 | 7       |
| 空調系統     | `hvac.png`         | 空調系統模組     | 8       |
| 環境品質系統 | `environment.png`  | 環境品質系統模組 | 9       |
| 電梯系統     | `elevator.png`     | 電梯系統模組     | 10      |

#### 備用圖標（可擴充使用）

| 中文名稱       | 英文檔名                  | 建議用途           |
| -------------- | ------------------------- | ------------------ |
| 全區點位圖     | `all-points.png`          | 全區設備點位展示   |
| 緊急求救系統   | `emergency.png`           | 緊急求救系統       |
| 使用者管理     | `user-management.png`     | 使用者權限管理     |
| 機電維護       | `maintenance.png`         | 機電設備維護管理   |
| 設備運轉可靠度 | `reliability.png`         | 設備運轉可靠度監控 |
| 設施管理系統   | `facility-management.png` | 設施管理系統       |
| 寄物管理       | `locker-management.png`   | 寄物櫃管理         |
| 訪客系統       | `visitor.png`             | 訪客登記管理       |
| 檔案系統       | `file-system.png`         | 文件檔案管理       |
| 空間管理       | `space-management.png`    | 空間使用管理       |
| 電視牆模組     | `video-wall.png`          | 監控電視牆         |
| 多媒體伺服器   | `multimedia-server.png`   | 多媒體伺服器管理   |
| 警示紀錄       | `alert-log.png`           | 警示記錄查詢       |
| 資訊平台       | `info-platform.png`       | 資訊發布平台       |

## 🎨 使用方式

### 在 Vue 組件中使用

```vue
<template>
	<img src="/icon/map.png" alt="區域平面圖" />
</template>
```

### 動態圖標路徑

```vue
<template>
	<img :src="`/icon/${iconName}.png`" :alt="moduleName" />
</template>

<script setup>
const iconName = "map";
const moduleName = "區域平面圖";
</script>
```

### 使用 Nuxt Image 組件

```vue
<template>
	<NuxtImg src="/icon/map.png" alt="區域平面圖" />
</template>
```

## 📐 圖標規格

- **格式**: PNG
- **尺寸**: 原始圖標尺寸（已優化）
- **色彩**: 全彩色
- **背景**: 透明背景
- **建議顯示尺寸**: 64x64px - 128x128px

## 🎯 SystemModule 組件使用範例

在 `SystemModule.vue` 中，圖標會自動根據 `module.icon` 屬性載入：

```vue
<!-- 組件會自動載入 /icon/map.png -->
<SystemModule
	:module="{
		id: 1,
		name: '區域平面圖',
		icon: 'map',
		route: '/map'
	}"
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
   - 將圖標放入 `/public/icon/` 目錄

4. **更新模組配置**
   - 在 `pages/index.vue` 中的 `systemModules` 陣列中新增模組
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

## 📝 修改記錄

### 2025-10-28

- ✅ 將所有中文檔名重命名為英文
- ✅ 更新 SystemModule 組件使用 PNG 圖標
- ✅ 建立圖標命名對照表
- ✅ 新增圖標使用說明文件

## 🔗 相關文件

- `app/components/SystemModule.vue` - 系統模組組件
- `app/pages/index.vue` - 首頁模組配置
- `tailwind.config.js` - 樣式配置

---

**維護者**: 開發團隊  
**最後更新**: 2025-10-28
