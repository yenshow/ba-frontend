/** 授權控管：僅此五項會顯示鎖頭並在後端做授權檢查；其餘由角色管理 */
export type FeatureKey =
	| "people_counting"
	| "lighting"
	| "environment"
	| "surveillance"
	| "vehicle_access";

export const LICENSE_FEATURE_KEYS: readonly FeatureKey[] = [
	"people_counting",
	"lighting",
	"environment",
	"surveillance",
	"vehicle_access"
];

export type LicenseState = {
	features: FeatureKey[];
	expiresAt: string | null;
	expired: boolean;
	canActivate: boolean;
};

