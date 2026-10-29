/** 授權控管：與後端 `LICENSE_DEPLOYMENT_PROFILE=construction` 時之 FEATURE_KEYS_CONSTRUCTION 對齊 */
export type FeatureKey =
	| "people_counting"
	| "roll_call"
	| "environment"
	| "surveillance"
	| "vehicle_access";

export const LICENSE_FEATURE_KEYS: readonly FeatureKey[] = [
	"people_counting",
	"roll_call",
	"environment",
	"surveillance",
	"vehicle_access"
];

export type FeatureQuotaKind = "devices" | "points" | "none";

export const FEATURE_QUOTA_KIND: Record<FeatureKey, FeatureQuotaKind> = {
	people_counting: "devices",
	roll_call: "devices",
	environment: "points",
	surveillance: "devices",
	vehicle_access: "devices"
};

export const getFeatureQuotaKind = (key: FeatureKey | string): FeatureQuotaKind =>
	FEATURE_QUOTA_KIND[key as FeatureKey] ?? "devices";

export type LicenseQuotaEntry = {
	maxDevices?: number;
	maxPoints?: number;
};

export type LicenseUsageEntry = {
	usedDevices: number;
	usedPoints?: number;
};

export type LicenseEntitlementEntry = {
	licenseKey: string;
	features: FeatureKey[];
	quotas?: Partial<Record<FeatureKey, LicenseQuotaEntry>>;
};

export type LicenseState = {
	features: FeatureKey[];
	expiresAt: string | null;
	expired: boolean;
	canActivate: boolean;
	quotas?: Partial<Record<FeatureKey, LicenseQuotaEntry>>;
	usage?: Partial<Record<FeatureKey, LicenseUsageEntry>>;
	serialNumber?: string | null;
	licenseKey?: string | null;
	activationMethod?: string | null;
	deviceFingerprint?: string | null;
	extensionKeys?: string[];
	licenseEntitlements?: LicenseEntitlementEntry[];
};
