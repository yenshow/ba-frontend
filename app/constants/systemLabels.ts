import type { SystemType } from "~/types/location"

/** 與 central 同源；construction 僅啟用下列 SystemType */
export const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
	environment: "環境監測",
	people_counting: "人流統計",
	vehicle_access: "車輛進出",
}

export const getSystemTypeLabel = (systemType: SystemType): string =>
	SYSTEM_TYPE_LABELS[systemType] || String(systemType)
