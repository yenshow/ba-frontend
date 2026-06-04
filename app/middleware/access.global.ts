import { useAccessGate } from "~/composables/core/useAccessGate";
import { useToast } from "~/composables/core/useToast";

export default defineNuxtRouteMiddleware(async to => {
	if (to.path === "/login") return;

	const { checkRouteAccess } = useAccessGate();
	const result = await checkRouteAccess(to.path);

	if (result.ok) return;

	if (result.reason === "account") {
		if (process.client) useToast().warning("管理員請使用用戶管理重設密碼");
		return navigateTo("/");
	}

	if (result.reason === "admin") {
		if (process.client) useToast().warning("僅管理員可存取此頁面");
		return navigateTo("/");
	}

	if (result.redirectMessage && process.client) {
		useToast().warning(result.redirectMessage);
	}

	return navigateTo("/");
});
