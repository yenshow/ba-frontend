import { useLicense } from "~/composables/core/useLicense";
import { getFeatureKeyByRoute } from "~/utils/licenseUtils";
import { useToast } from "~/composables/core/useToast";

export default defineNuxtRouteMiddleware(async (to) => {
	if (to.path === "/login") return;
	const featureKey = getFeatureKeyByRoute(to.path);
	if (!featureKey) return;

	const { hasFeature, fetchLicense, isLoaded } = useLicense();
	if (!isLoaded.value) await fetchLicense();
	if (hasFeature(featureKey)) return;

	if (process.client) useToast().warning("此功能尚未授權，已為你返回首頁");
	return navigateTo("/");
});

