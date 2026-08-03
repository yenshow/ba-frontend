/** 授權控管：與後端 `LICENSE_DEPLOYMENT_PROFILE=central` 時之 FEATURE_KEYS_CENTRAL 對齊 */
export type FeatureKey =
	| "people_counting"
	| "elevator"
	| "lighting"
	| "hvac"
	| "air_circulation"
	| "drainage"
	| "power"
	| "energy"
	| "fire"
	| "emergency_rescue"
	| "smoke_alarm"
	| "environment"
	| "surveillance"
	| "vehicle_access"
	| "multimedia"

export const LICENSE_FEATURE_KEYS: readonly FeatureKey[] = [
	"people_counting",
	"elevator",
	"lighting",
	"hvac",
	"air_circulation",
	"drainage",
	"power",
	"energy",
	"fire",
	"emergency_rescue",
	"smoke_alarm",
	"environment",
	"surveillance",
	"vehicle_access",
	"multimedia",
]

export type LicenseEntitlementEntry = {
	licenseKey: string
	features: FeatureKey[]
	quotas?: Partial<Record<FeatureKey, { maxDevices: number }>>
}

export type LicenseState = {
	features: FeatureKey[]
	expiresAt: string | null
	expired: boolean
	canActivate: boolean
	quotas?: Partial<Record<FeatureKey, { maxDevices: number }>>
	usage?: Partial<Record<FeatureKey, { usedDevices: number }>>
	serialNumber?: string | null
	licenseKey?: string | null
	activationMethod?: string | null
	deviceFingerprint?: string | null
	extensionKeys?: string[]
	licenseEntitlements?: LicenseEntitlementEntry[]
}
