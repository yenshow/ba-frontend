/** 授權控管：與後端 `LICENSE_DEPLOYMENT_PROFILE=construction` 時之 FEATURE_KEYS_CONSTRUCTION 對齊 */
export type FeatureKey = "people_counting" | "environment" | "surveillance" | "vehicle_access";

export const LICENSE_FEATURE_KEYS: readonly FeatureKey[] = [
	"people_counting",
	"environment",
	"surveillance",
	"vehicle_access"
];

export type LicenseEntitlementEntry = {
	licenseKey: string;
	features: FeatureKey[];
};

export type LicenseState = {
	features: FeatureKey[];
	expiresAt: string | null;
	expired: boolean;
	canActivate: boolean;
	quotas?: Partial<Record<FeatureKey, { maxDevices: number }>>;
	usage?: Partial<Record<FeatureKey, { usedDevices: number }>>;
	serialNumber?: string | null;
	licenseKey?: string | null;
	activationMethod?: string | null;
	deviceFingerprint?: string | null;
	extensionKeys?: string[];
	licenseEntitlements?: LicenseEntitlementEntry[];
};
