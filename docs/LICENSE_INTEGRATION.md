# 智慧管理平台授權機制與鎖頭

本文件說明智慧管理平台（ba-frontend-central）的授權整合方式，設計與 ba-backend、ba-frontend-construction 一致。

## 與後端／工地前端的對齊

| 項目 | 後端 (ba-backend) | 工地前端 (construction) | 智慧管理平台 (central) |
|------|-------------------|-------------------------|-------------------------|
| 授權 API | `GET /api/license`、`POST /api/license/activate` | `GET {apiBase}/license` | 同左，`GET /license` |
| 功能 key | `people_counting`, `lighting`, `environment`, `surveillance`, `vehicle_access` | 同上 | 同上 |
| 路由守衛 | 無（API 用 `requireFeature` 回 403） | `license.global.ts` | `license.global.ts` |
| 鎖頭顯示 | — | BottomNavigation 圖標鎖頭 | SystemModule 卡片鎖頭 |
| 登出清除 | — | — | `useAuth.logout` 內呼叫 `clearLicense()` |

## 新增／修改的檔案

- **型別**：`app/types/license.ts` — `FeatureKey`、`LicenseState`、`LICENSE_FEATURE_KEYS`
- **工具**：`app/utils/licenseUtils.ts` — `getFeatureKeyByRoute`、`LICENSE_MESSAGE_LOCKED` / `LICENSE_MESSAGE_REDIRECT` 文案常數
- **Composable**：`app/composables/core/useLicense.ts` — `fetchLicense`、`hasFeature`、`canLoadFeature`、`isModuleLocked(module)`、`clearLicense`
- **元件**：`app/components/common/LicenseLockIcon.vue` — 共用鎖頭圖示（依 class 控制大小／顏色）
- **中介層**：`app/middleware/license.global.ts` — 進入需授權路徑時檢查 `hasFeature`，未授權則 toast 並導回首頁
- **插件**：`app/plugins/auth.client.ts` — 啟動時 `init()` + `fetchLicense({ force: true })`；登出時 `useAuth.logout` 內呼叫 `clearLicense()`
- **首頁模組**：`app/components/home/SystemModule.vue` — 使用 `useLicense().isModuleLocked`、`LicenseLockIcon`，未授權點擊 toast 後不導向
- **導航**：`app/components/common/AppHeader.vue` — 更多功能選單同上，未授權項顯示鎖頭且點擊僅 toast
- **設定**：`nuxt.config.ts` — `runtimeConfig.public.licenseOpenAllFeatures`（環境變數 `NUXT_PUBLIC_LICENSE_OPEN_ALL_FEATURES`）

## 授權控管的路由（會顯示鎖頭＋路由守衛）

- `/construction-monitoring/environment` → `environment`
- `/construction-monitoring/people-counting` → `people_counting`
- `/construction-monitoring/surveillance` → `surveillance`
- `/construction-monitoring/vehicle-access` → `vehicle_access`
- `/infrastructure/lighting` → `lighting`

其餘路徑（如 `/core/*`）不經授權檢查，僅依角色權限。

## 環境變數（選用）

- **NUXT_PUBLIC_LICENSE_OPEN_ALL_FEATURES** = `"true"`：開發用；`hasFeature` 一律為 true（不顯示鎖頭、不擋路由），`canLoadFeature` 仍依後端授權。

## 後續可選擴充

- 首頁 AQI／環境等區塊依 `canLoadFeature("environment")` 決定是否載入資料（與 construction 首頁一致）。
- 管理端授權啟用頁：僅 `canActivate === true`（admin）可開啟，呼叫 `POST /api/license/activate`。
