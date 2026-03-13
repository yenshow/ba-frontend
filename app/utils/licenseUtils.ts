import type { FeatureKey } from "~/types/license";

/**
 * 僅對「授權控管」的 5 個模組回傳 feature key；
 * /core/*、首頁等為基本功能，僅角色控管，回傳 null（不顯示鎖頭、不擋路由）。
 */
export const getFeatureKeyByRoute = (routePath: string): FeatureKey | null => {
	if (!routePath || typeof routePath !== "string") return null;

	if (routePath.startsWith("/construction-monitoring/environment")) return "environment";
	if (routePath.startsWith("/construction-monitoring/people-counting")) return "people_counting";
	if (routePath.startsWith("/construction-monitoring/surveillance")) return "surveillance";
	if (routePath.startsWith("/construction-monitoring/vehicle-access")) return "vehicle_access";
	if (routePath.startsWith("/infrastructure/lighting")) return "lighting";

	return null;
};

