/** 授權控管：對齊後端 `getActiveFeatureKeys()`／FEATURE_KEYS_CENTRAL（gate 全量；與 deployment profile 無關） */
export type FeatureKey =
	| "people_counting"
	| "roll_call"
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
	| "intercom"
	| "security"

export const LICENSE_FEATURE_KEYS: readonly FeatureKey[] = [
	"people_counting",
	"roll_call",
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
	"intercom",
	"security",
]

/** 授權頁／配額列表顯示名（與 LICENSE_FEATURE_KEYS 對齊） */
export const FEATURE_KEY_LABELS: Record<FeatureKey, string> = {
	people_counting: "門禁管理",
	roll_call: "時段簽到",
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
	intercom: "對講系統",
	security: "保全系統",
}

export const getFeatureKeyLabel = (key: FeatureKey | string): string =>
	FEATURE_KEY_LABELS[key as FeatureKey] ?? String(key)

export type FeatureQuotaKind = "devices" | "points" | "elevator" | "none"

export const FEATURE_QUOTA_KIND: Record<FeatureKey, FeatureQuotaKind> = {
	people_counting: "devices",
	roll_call: "devices",
	elevator: "elevator",
	lighting: "points",
	hvac: "points",
	air_circulation: "points",
	drainage: "points",
	power: "points",
	energy: "points",
	fire: "points",
	emergency_rescue: "points",
	smoke_alarm: "points",
	environment: "points",
	surveillance: "devices",
	vehicle_access: "devices",
	multimedia: "devices",
	intercom: "devices",
	security: "points",
}

export const getFeatureQuotaKind = (key: FeatureKey | string): FeatureQuotaKind =>
	FEATURE_QUOTA_KIND[key as FeatureKey] ?? "devices"

export type LicenseQuotaEntry = {
	maxDevices?: number
	maxPoints?: number
}

export type LicenseUsageEntry = {
	usedDevices: number
	usedPoints?: number
}

export type LicenseEntitlementEntry = {
	licenseKey: string
	features: FeatureKey[]
	quotas?: Partial<Record<FeatureKey, LicenseQuotaEntry>>
}

export type LicenseState = {
	features: FeatureKey[]
	/** 預留：買斷制目前後端固定未設定到期 */
	expiresAt: string | null
	/** 預留：買斷制目前後端固定 `false` */
	expired: boolean
	canActivate: boolean
	quotas?: Partial<Record<FeatureKey, LicenseQuotaEntry>>
	usage?: Partial<Record<FeatureKey, LicenseUsageEntry>>
	serialNumber?: string | null
	licenseKey?: string | null
	activationMethod?: string | null
	deviceFingerprint?: string | null
	extensionKeys?: string[]
	licenseEntitlements?: LicenseEntitlementEntry[]
}
