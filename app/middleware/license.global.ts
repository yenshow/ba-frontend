import { useAdminOnly, useAuth } from "~/composables/core/useAuth"
import { useLicense } from "~/composables/core/useLicense"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import type { FeatureKey } from "~/types/license"
import { matchesPlatformAdminRoute } from "~/config/platformAdminRoutes"
import { LICENSE_MESSAGE_REDIRECT, PERMISSION_MESSAGE_REDIRECT } from "~/utils/licenseUtils"
import { useToast } from "~/composables/core/useToast"
import { canAccessAccountPage } from "~/composables/systems/users/useAccountSettings"

export default defineNuxtRouteMiddleware(async (to) => {
	if (to.path === "/login") return

	if (to.path === "/core/account") {
		const { user } = useAuth()
		if (!canAccessAccountPage(user.value)) {
			if (process.client) useToast().warning("管理員請使用用戶管理重設密碼")
			return navigateTo("/")
		}
		return
	}

	if (matchesPlatformAdminRoute(to.path)) {
		const canAdmin = useAdminOnly()
		if (!canAdmin.value) {
			if (process.client) useToast().warning("僅管理員可存取此頁面")
			return navigateTo("/")
		}
		return
	}

	const moduleRegistry = useModuleRegistry()
	await moduleRegistry.ensureLoaded()
	const permissionCode = moduleRegistry.getPermissionCodeByRoute(to.path)

	if (permissionCode) {
		const { hasPermission } = useAuth()
		if (!hasPermission(permissionCode)) {
			if (process.client) useToast().warning(PERMISSION_MESSAGE_REDIRECT)
			return navigateTo("/")
		}
	}

	const featureKey = moduleRegistry.getFeatureKeyByRoute(to.path) as FeatureKey | null
	if (!featureKey) return

	const { hasFeature, fetchLicense, isLoaded } = useLicense()
	if (!isLoaded.value) await fetchLicense()
	if (hasFeature(featureKey)) return

	if (process.client) useToast().warning(LICENSE_MESSAGE_REDIRECT)
	return navigateTo("/")
})
