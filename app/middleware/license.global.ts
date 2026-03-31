import { useAuth } from "~/composables/core/useAuth";
import { useLicense } from "~/composables/core/useLicense";
import { getPermissionCodeByRoute } from "~/constants/permissions";
import {
	getFeatureKeyByRoute,
	LICENSE_MESSAGE_REDIRECT,
	PERMISSION_MESSAGE_REDIRECT,
} from "~/utils/licenseUtils";
import { useToast } from "~/composables/core/useToast";

export default defineNuxtRouteMiddleware(async (to) => {
	if (to.path === "/login") return;

	// 1. 系統權限檢查：若該路由需權限且用戶無權限則導回首頁
	const permissionCode = getPermissionCodeByRoute(to.path);
	if (permissionCode) {
		const { hasPermission } = useAuth();
		if (!hasPermission(permissionCode)) {
			if (process.client) useToast().warning(PERMISSION_MESSAGE_REDIRECT);
			return navigateTo("/");
		}
	}

	const featureKey = getFeatureKeyByRoute(to.path);
	if (!featureKey) return;

	const { hasFeature, fetchLicense, isLoaded } = useLicense();
	if (!isLoaded.value) await fetchLicense();
	if (hasFeature(featureKey)) return;

	if (process.client) useToast().warning(LICENSE_MESSAGE_REDIRECT);
	return navigateTo("/");
});

