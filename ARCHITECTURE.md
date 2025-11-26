# BA 系統架構文件

## 概述

本文檔說明 BA 系統的前端架構設計，旨在提供一個可擴展、易維護的系統架構，以支持多個不同的系統模組。

## 目錄結構

```
frontend/
├── app/
│   ├── components/
│   │   ├── common/              # 共用組件
│   │   │   └── AppHeader.vue    # 統一的 Header 組件
│   │   ├── systems/             # 系統相關組件
│   │   │   ├── BaseSystemPage.vue    # 系統頁面基礎佈局
│   │   │   ├── FloorSelector.vue     # 樓層選擇器
│   │   │   ├── RoomList.vue          # 房間列表
│   │   │   ├── StatusCenter.vue      # 狀態中心容器
│   │   │   └── ControlCard.vue       # 控制卡片
│   │   ├── AQICard.vue          # AQI 卡片組件
│   │   ├── BuildingCard.vue     # 建築物卡片組件
│   │   ├── EnvironmentCard.vue   # 環境卡片組件
│   │   └── SystemModule.vue     # 系統模組網格
│   ├── config/
│   │   └── system-modules.ts    # 系統模組配置（集中管理）
│   ├── composables/
│   │   └── useSystem.ts         # 系統管理 Composables
│   ├── layouts/
│   │   ├── default.vue          # 預設佈局
│   │   └── system.vue           # 系統頁面佈局
│   ├── pages/
│   │   ├── index.vue            # 首頁
│   │   ├── login.vue            # 登入頁
│   │   └── system/
│   │       └── [name].vue       # 動態系統頁面
│   ├── types/
│   │   └── system.ts            # 系統類型定義
│   └── assets/
│       └── css/
│           └── tailwind.css     # Tailwind CSS 樣式
```

## 核心架構設計

### 1. 配置管理（Config）

所有系統模組的配置集中在 `config/system-modules.ts` 中管理：

```typescript
export const systemModules: SystemModule[] = [
  { id: 1, name: '區域平面圖', icon: 'map', route: '/system/map', ... },
  { id: 5, name: '照明系統', icon: 'lighting', route: '/system/lighting', ... },
  // ...
];
```

**優點：**

- 集中管理，易於維護
- 新增系統只需在此添加配置
- 統一的配置結構

### 2. 類型定義（Types）

系統相關的 TypeScript 類型定義在 `types/system.ts` 中：

- `SystemModule` - 系統模組類型
- `SystemPageConfig` - 系統頁面配置類型
- `Floor` - 樓層類型
- `Room` - 房間類型
- `ControlPoint` - 控制點類型

### 3. Composables（可組合函數）

使用 `composables/useSystem.ts` 提供系統相關的共用邏輯：

```typescript
const { getAllModules, getModuleByRoute, getCurrentModule } = useSystem();
```

**功能：**

- 獲取所有系統模組
- 根據路由獲取模組
- 獲取當前模組
- 檢查模組是否啟用

### 4. 佈局系統（Layouts）

#### default.vue

- 預設頁面佈局
- 包含 AppHeader
- 適用於首頁等一般頁面

#### system.vue

- 系統頁面專用佈局
- 包含 AppHeader 和統一的 padding
- 適用於所有系統頁面

### 5. 共用組件（Components）

#### common/AppHeader.vue

- 統一的 Header 組件
- 包含 Logo、導航圖標、用戶選單
- 可在所有頁面中使用

#### systems/BaseSystemPage.vue

- 系統頁面基礎佈局組件
- 支持三欄、兩欄、全寬佈局
- 使用 slot 實現內容插槽

#### systems/FloorSelector.vue

- 樓層選擇器組件
- 支持 v-model 雙向綁定
- 發出 `floor-selected` 事件

#### systems/RoomList.vue

- 房間列表組件
- 支持室內/室外切換
- 支持 v-model 雙向綁定

#### systems/StatusCenter.vue

- 狀態中心容器組件
- 提供統一的樣式結構

#### systems/ControlCard.vue

- 控制卡片組件
- 支持不同狀態顯示
- 支持開關切換

## 路由系統

### 動態路由

使用 `pages/system/[name].vue` 處理所有系統路由：

- `/system/lighting` → 照明系統
- `/system/power` → 電力系統
- `/system/hvac` → 空調系統
- 等等...

**優點：**

- 單一文件處理所有系統路由
- 根據路由自動載入對應的系統模組
- 易於擴展

## 新增系統的步驟

### 1. 在配置文件中添加系統

編輯 `config/system-modules.ts`：

```typescript
export const systemModules: SystemModule[] = [
	// ... 現有系統
	{
		id: 25,
		name: "新系統",
		icon: "new-system",
		route: "/system/new-system",
		category: "primary",
		description: "新系統描述",
		enabled: true
	}
];
```

### 2. 添加系統圖標

將圖標文件放置在 `public/icon/new-system.png`

### 3. 自定義系統頁面（可選）

如果需要特殊的系統頁面，可以：

#### 選項 A：使用預設動態路由

- 系統會自動使用 `pages/system/[name].vue`
- 通過 `pageConfig` 自定義佈局

#### 選項 B：建立專用頁面

建立 `pages/system/new-system.vue`：

```vue
<template>
	<BaseSystemPage>
		<!-- 自定義內容 -->
	</BaseSystemPage>
</template>

<script setup lang="ts">
definePageMeta({
	layout: "system"
});
</script>
```

## 設計模式

### 1. 組件化設計

- 將功能拆分為可重用組件
- 使用 slot 實現內容插槽
- 組件之間通過 props 和 events 通信

### 2. 配置驅動

- 系統配置集中管理
- 通過配置控制系統行為
- 易於擴展和維護

### 3. 類型安全

- 使用 TypeScript 確保類型安全
- 統一的類型定義
- 更好的開發體驗

### 4. 響應式設計

- 使用 Tailwind CSS 響應式類
- 支持多種螢幕尺寸
- 統一的 breakpoints

## 樣式系統

### 色彩系統

- 主色調：`#13A6A9`（青綠色）、`#002247`（深藍色）
- 背景漸層：`linear-gradient(155deg, #13a6a9 0%, #002247 100%)`
- 卡片背景：`bg-white/30`（白色 30% 透明度）
- 邊框：`border-white/80`（白色 80% 透明度）

### Glass Morphism 效果

- 使用 `backdrop-filter: blur()`
- 半透明背景
- 多層次陰影

### 字體系統

- 無襯線字體
- 輕量字重（`font-light`、`font-extralight`）
- 響應式字級

## 最佳實踐

### 1. 組件命名

- 使用 PascalCase
- 描述性命名
- 遵循 Vue 3 規範

### 2. 文件組織

- 相關文件放在同一目錄
- 共用組件放在 `common/`
- 系統組件放在 `systems/`

### 3. 類型定義

- 所有類型定義放在 `types/`
- 使用 interface 定義類型
- 導出類型供其他文件使用

### 4. 配置管理

- 集中管理配置
- 使用常數和枚舉
- 提供配置函數

## 未來擴展方向

### 1. 狀態管理

- 可考慮使用 Pinia 進行狀態管理
- 統一管理系統數據
- 支持數據持久化

### 2. API 整合

- 建立 API 服務層
- 使用 composables 處理 API 調用
- 統一的錯誤處理

### 3. 權限管理

- 基於角色的權限控制
- 系統級別的權限檢查
- 組件級別的權限控制

### 4. 國際化

- 支持多語言
- 使用 i18n 庫
- 統一的文字管理

## 總結

這個架構設計提供了：

1. **可擴展性** - 新增系統只需添加配置
2. **可維護性** - 集中管理，結構清晰
3. **可重用性** - 共用組件和 composables
4. **類型安全** - TypeScript 類型定義
5. **一致性** - 統一的設計風格和佈局

通過這個架構，可以輕鬆地添加新的系統模組，同時保持代碼的一致性和可維護性。

## Modbus 即時資料整合

- 在 `config/system-modules.ts` 新增 `Modbus 資料` 模組，路由為 `/system/modbus`。
- 前端透過 `useModbus` composable 讀取後端 API，環境變數 `NUXT_PUBLIC_MODBUS_API` 決定 base URL（預設 `http://localhost:4000/api/modbus`）。
- `pages/system/modbus.vue` 提供離散輸入與 Holding Registers 的查詢、重新整理與錯誤提示，可當成 BA 系統的資料檢視模板。
- 開發流程：
  1. 在 `ba-backend` 啟動 `npm run dev` 並確認健康檢查 OK。
  2. 在 `ba-frontend` 複製 `env.example` 為 `.env`，必要時修改 `NUXT_PUBLIC_MODBUS_API`。
  3. 執行 `npm run dev`，於首頁選擇「Modbus 資料」模組即可看到即時數據。
