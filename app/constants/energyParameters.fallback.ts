/**
 * 能源參數 catalog（前端 fallback + API）
 * SSOT：後端 energyParameterCatalog.js；GET /energy/parameters
 */

export type EnergyMeterKind = "electricity" | "water"
export type EnergyModbusDataType = "uint16" | "uint32_be" | "uint32_le"

export type EnergyParameterDef = {
	key: string
	label: string
	unit: string
	semantics: "cumulative" | "instantaneous"
	meterKinds: EnergyMeterKind[]
	fractionDigits: number
	sortOrder: number
}

export const ENERGY_PARAMETERS_FALLBACK: EnergyParameterDef[] = [
	{
		key: "active_energy",
		label: "累積電能",
		unit: "kWh",
		semantics: "cumulative",
		meterKinds: ["electricity"],
		fractionDigits: 2,
		sortOrder: 10,
	},
	{
		key: "water_volume",
		label: "累積水量",
		unit: "m³",
		semantics: "cumulative",
		meterKinds: ["water"],
		fractionDigits: 3,
		sortOrder: 20,
	},
	{
		key: "active_power",
		label: "即時功率",
		unit: "kW",
		semantics: "instantaneous",
		meterKinds: ["electricity"],
		fractionDigits: 2,
		sortOrder: 30,
	},
	{
		key: "demand",
		label: "需量",
		unit: "kW",
		semantics: "instantaneous",
		meterKinds: ["electricity"],
		fractionDigits: 2,
		sortOrder: 40,
	},
]

export const ENERGY_DATA_TYPE_OPTIONS: Array<{ value: EnergyModbusDataType; label: string }> = [
	{ value: "uint16", label: "uint16（1 暫存器）" },
	{ value: "uint32_be", label: "uint32 大端（2 暫存器）" },
	{ value: "uint32_le", label: "uint32 小端（2 暫存器）" },
]

export const ENERGY_METER_KIND_OPTIONS: Array<{ value: EnergyMeterKind | ""; label: string }> = [
	{ value: "", label: "一般感測器（無表計種類）" },
	{ value: "electricity", label: "數位電表" },
	{ value: "water", label: "數位水表" },
]
