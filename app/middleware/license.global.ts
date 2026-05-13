import { useAuth } from "~/composables/core/useAuth"
import { useLicense } from "~/composables/core/useLicense"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import type { FeatureKey } from "~/types/license"
import { LICENSE_MESSAGE_REDIRECT, PERMISSION_MESSAGE_REDIRECT } from "~/utils/licenseUtils"
import { useToast } from "~/composables/core/useToast"

export default defineNuxtRouteMiddleware(async (to) => {
	if (to.path === "/login") return

	// 環境設定：不在 module registry，必須僅 admin 可進入（與後端 requireAdmin 對齊）
	if (to.path === "/core/env") {
		const { isAdmin } = useAuth()
		if (!isAdmin.value) {
			if (process.client) useToast().warning("僅管理員（admin）可存取環境設定")
			return navigateTo("/")
		}
		return
	}

	// 優先使用後端 module registry（SSOT），若尚未可用則 fallback 到本地 mapping
	const moduleRegistry = useModuleRegistry()
	await moduleRegistry.ensureLoaded()
	const permissionCode = moduleRegistry.getPermissionCodeByRoute(to.path)

	// 1. 系統權限檢查：若該路由需權限且用戶無權限則導回首頁
	if (permissionCode) {
		const { hasPermission } = useAuth()
		if (!hasPermission(permissionCode)) {
			if (process.client) useToast().warning(PERMISSION_MESSAGE_REDIRECT)
			return navigateTo("/")
		}
	}

	// 2. 授權（License）檢查
	const featureKey = moduleRegistry.getFeatureKeyByRoute(to.path) as FeatureKey | null
	if (!featureKey) return

	const { hasFeature, fetchLicense, isLoaded } = useLicense()
	if (!isLoaded.value) await fetchLicense()
	if (hasFeature(featureKey)) return

	if (process.client) useToast().warning(LICENSE_MESSAGE_REDIRECT)
	return navigateTo("/")
})
