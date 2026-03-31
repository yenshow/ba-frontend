/**
 * 權限代碼（與後端 permission_definitions.code 一致），供 hasPermission() 與選單/按鈕顯示邏輯使用。
 * 需與後端同步時可在此新增常數。
 */
export const PERMISSIONS = {
	/** 人流統計（可使用的系統） */
	SYSTEM_PEOPLE_COUNTING: "system.people_counting",
	/** 影像監控（可使用的系統） */
	SYSTEM_VIDEO_SURVEILLANCE: "system.video_surveillance",
	/** 環境品質（可使用的系統） */
	SYSTEM_ENVIRONMENT: "system.environment",
	/** 車輛進出（可使用的系統） */
	SYSTEM_VEHICLE_ACCESS: "system.vehicle_access",
	/** 地點管理（全區點位圖、區域管理按鈕） */
	LOCATION_MANAGEMENT: "operation.location_management",
} as const;

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
