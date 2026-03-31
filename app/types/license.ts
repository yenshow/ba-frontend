/** 授權控管：與後端 ALL_FEATURE_KEYS 對齊 */
export type FeatureKey =
	| "people_counting"
	| "lighting"
	| "drainage"
	| "environment"
	| "surveillance"
	| "vehicle_access";

export const LICENSE_FEATURE_KEYS: readonly FeatureKey[] = [
	"people_counting",
	"lighting",
	"drainage",
	"environment",
	"surveillance",
	"vehicle_access"
];

export type LicenseState = {
	features: FeatureKey[];
	expiresAt: string | null;
	expired: boolean;
	canActivate: boolean;
	serialNumber?: string | null;
	licenseKey?: string | null;
	activationMethod?: string | null;
	deviceFingerprint?: string | null;
	extensionKeys?: string[];
};
