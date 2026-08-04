/**
 * 能源用途系統（負載分類）— 與後端 energyUsageSystemCatalog.js 鏡像
 * 電表設備：devices.config.energy_usage_system
 */

export type EnergyUsageSystemKey = "hvac" | "lighting" | "elevator" | "other"

export type EnergyUsageSystemDef = {
	key: EnergyUsageSystemKey
	label: string
	sortOrder: number
}

export const ENERGY_USAGE_SYSTEMS: EnergyUsageSystemDef[] = [
	{ key: "hvac", label: "空調", sortOrder: 10 },
	{ key: "lighting", label: "照明", sortOrder: 20 },
	{ key: "elevator", label: "電梯", sortOrder: 30 },
	{ key: "other", label: "其他", sortOrder: 90 },
]

export const DEFAULT_ENERGY_USAGE_SYSTEM_KEY: EnergyUsageSystemKey = "other"

export const ENERGY_USAGE_SYSTEM_OPTIONS: Array<{
	value: EnergyUsageSystemKey | ""
	label: string
}> = [
	{ value: "", label: "請選擇用途系統" },
	...ENERGY_USAGE_SYSTEMS.map((s) => ({ value: s.key, label: s.label })),
]

const KEY_SET = new Set<string>(ENERGY_USAGE_SYSTEMS.map((s) => s.key))

export const normalizeEnergyUsageSystemKey = (
	key: string | null | undefined
): EnergyUsageSystemKey => {
	const k = String(key || "").trim()
	if (KEY_SET.has(k)) return k as EnergyUsageSystemKey
	return DEFAULT_ENERGY_USAGE_SYSTEM_KEY
}

export const getEnergyUsageSystemLabel = (
	key: string | null | undefined
): string => {
	const normalized = normalizeEnergyUsageSystemKey(key)
	return ENERGY_USAGE_SYSTEMS.find((s) => s.key === normalized)?.label || "其他"
}
