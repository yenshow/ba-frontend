import { useAuth } from "~/composables/core/useAuth";
import { useLicense } from "~/composables/core/useLicense";
import { useModuleRegistry } from "~/composables/core/useModuleRegistry";
import {
	LICENSE_MESSAGE_REDIRECT,
	PERMISSION_MESSAGE_REDIRECT,
} from "~/utils/licenseUtils";
import { useToast } from "~/composables/core/useToast";

export default defineNuxtRouteMiddleware(async (to) => {
	if (to.path === "/login") return;

	// 優先使用後端 module registry（SSOT）
	const moduleRegistry = useModuleRegistry();
	await moduleRegistry.ensureLoaded();
	const permissionCode = moduleRegistry.getPermissionCodeByRoute(to.path);

	// 1. 系統權限檢查：若該路由需權限且用戶無權限則導回首頁
	if (permissionCode) {
		const { hasPermission } = useAuth();
		if (!hasPermission(permissionCode)) {
			if (process.client) useToast().warning(PERMISSION_MESSAGE_REDIRECT);
			return navigateTo("/");
		}
	}

	const featureKey = moduleRegistry.getFeatureKeyByRoute(to.path);
	if (!featureKey) return;

	const { hasFeature, fetchLicense, isLoaded } = useLicense();
	if (!isLoaded.value) await fetchLicense();
	if (hasFeature(featureKey)) return;

	if (process.client) useToast().warning(LICENSE_MESSAGE_REDIRECT);
	return navigateTo("/");
});

