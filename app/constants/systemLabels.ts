import type { SystemType } from "~/types/location"

export const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
	environment: "環境監測",
	lighting: "照明系統",
	drainage: "衛生排水",
	fire: "消防系統",
	emergency_rescue: "緊急求救",
	people_counting: "人流統計",
	vehicle_access: "車輛進出",
}

export const getSystemTypeLabel = (systemType: SystemType): string =>
	SYSTEM_TYPE_LABELS[systemType] || String(systemType)
