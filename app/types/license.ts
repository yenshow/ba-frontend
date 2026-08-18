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
	| "access_security"

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
	"access_security",
]

/** 授權頁／配額列表顯示名（與 LICENSE_FEATURE_KEYS 對齊） */
export const FEATURE_KEY_LABELS: Record<FeatureKey, string> = {
	people_counting: "門禁管理",
	elevator: "電梯管理",
	lighting: "照明系統",
	hvac: "空調系統",
	air_circulation: "空氣循環",
	drainage: "排水系統",
	power: "電力系統",
	energy: "能源管理",
	fire: "消防系統",
	emergency_rescue: "緊急求救",
	smoke_alarm: "煙霧警報",
	environment: "環境品質",
	surveillance: "影像監控",
	vehicle_access: "車輛進出",
	multimedia: "多媒體資訊",
	access_security: "門禁保全",
}

export const getFeatureKeyLabel = (key: FeatureKey | string): string =>
	FEATURE_KEY_LABELS[key as FeatureKey] ?? String(key)

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
