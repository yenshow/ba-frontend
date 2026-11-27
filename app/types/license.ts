/**
 * Construction 導覽／型別子集（對齊後端 FEATURE_KEYS_CONSTRUCTION 文件常數）。
 * 後端 Feature Gate 仍為 central 全量 18 鍵；UI 子集 ≠ gate 子集。
 */
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
	/** 預留：買斷制目前後端固定未設定到期 */
	expiresAt: string | null;
	/** 預留：買斷制目前後端固定 `false` */
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
