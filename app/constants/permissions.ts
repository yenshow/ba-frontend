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
