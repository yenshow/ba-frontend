import type { FeatureKey } from "~/types/license";

/** 僅對授權控管 5 模組回傳 feature key；其餘回傳 null（不顯示鎖頭、不擋路由）。 */
export const getFeatureKeyByRoute = (routePath: string): FeatureKey | null => {
	if (!routePath || typeof routePath !== "string") return null;
	if (routePath.startsWith("/construction-monitoring/environment")) return "environment";
	if (routePath.startsWith("/construction-monitoring/people-counting")) return "people_counting";
	if (routePath.startsWith("/construction-monitoring/surveillance")) return "surveillance";
	if (routePath.startsWith("/construction-monitoring/vehicle-access")) return "vehicle_access";
	if (routePath.startsWith("/infrastructure/lighting")) return "lighting";
	return null;
};

/** 未授權點擊模組時的提示（首頁／導航選單） */
export const LICENSE_MESSAGE_LOCKED = "此功能尚未授權，請聯絡管理員";
/** 路由守衛導回首頁時的提示 */
export const LICENSE_MESSAGE_REDIRECT = "此功能尚未授權，已為你返回首頁";
