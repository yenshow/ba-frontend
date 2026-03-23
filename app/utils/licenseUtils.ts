import type { FeatureKey } from "~/types/license";
import { PERMISSIONS } from "~/constants/permissions";

/** 點擊鎖定模組時的 Toast 文案（與 central 一致） */
export const LICENSE_MESSAGE_LOCKED = "此功能尚未授權，請聯絡管理員";

/** 用戶無該系統權限時的 Toast 文案（與 central 一致） */
export const PERMISSION_MESSAGE_LOCKED = "您沒有此系統的存取權限";

/** 路由守衛導回首頁時的 Toast 文案（與 central 一致） */
export const LICENSE_MESSAGE_REDIRECT = "此功能尚未授權，已為你返回首頁";

/** 路由守衛因權限不足導回首頁時的 Toast 文案（與 central 一致） */
export const PERMISSION_MESSAGE_REDIRECT = "您沒有此系統的存取權限，已為你返回首頁";

/** 路由前綴 → 系統權限代碼（僅需權限控管的系統） */
const ROUTE_TO_SYSTEM_PERMISSION: Record<string, string> = {
	"/construction-monitoring/environment": PERMISSIONS.SYSTEM_ENVIRONMENT,
	"/construction-monitoring/people-counting": PERMISSIONS.SYSTEM_PEOPLE_COUNTING,
	"/construction-monitoring/surveillance": PERMISSIONS.SYSTEM_VIDEO_SURVEILLANCE,
	"/construction-monitoring/vehicle-access": PERMISSIONS.SYSTEM_VEHICLE_ACCESS,
};

/**
 * 依路由取得該系統所需權限代碼；若該路由不需權限控管則回傳 null。
 */
export const getPermissionCodeByRoute = (routePath: string): string | null => {
	if (!routePath || typeof routePath !== "string") return null;
	for (const [prefix, code] of Object.entries(ROUTE_TO_SYSTEM_PERMISSION)) {
		if (routePath === prefix || routePath.startsWith(prefix + "/")) return code;
	}
	return null;
};

/**
 * 僅對「授權控管」模組回傳 feature key；
 * /core/*、首頁等為基本功能，僅角色控管，回傳 null（不顯示鎖頭、不擋路由）。
 */
export const getFeatureKeyByRoute = (routePath: string): FeatureKey | null => {
	if (!routePath || typeof routePath !== "string") return null;

	if (routePath.startsWith("/construction-monitoring/environment")) return "environment";
	if (routePath.startsWith("/construction-monitoring/people-counting")) return "people_counting";
	if (routePath.startsWith("/construction-monitoring/surveillance")) return "surveillance";
	if (routePath.startsWith("/construction-monitoring/vehicle-access")) return "vehicle_access";
	if (routePath.startsWith("/infrastructure/lighting")) return "lighting";
	if (routePath.startsWith("/infrastructure/drainage")) return "drainage";

	return null;
};

