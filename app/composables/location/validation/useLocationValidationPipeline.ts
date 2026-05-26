import type { SystemType, UnifiedLocation, UnifiedZone } from "~/types/location"
import type { EnvironmentLocation } from "~/types/environment"
import type { LightingLocation } from "~/types/lighting"
import type { PeopleCountingLocation } from "~/types/peopleCounting"
import type { DrainageLocation } from "~/types/drainage"
import type { FireLocation } from "~/types/fire"
import type { PowerLocation } from "~/types/power"
import {
	useZoneValidation,
	useLocationValidation,
} from "~/composables/location/validation/useBaseValidation"
import { useEnvironmentLocationValidation } from "~/composables/location/validation/useEnvironmentLocationValidation"
import { useLightingLocationValidation } from "~/composables/location/validation/useLightingLocationValidation"
import { usePeopleCountingLocationValidation } from "~/composables/location/validation/usePeopleCountingLocationValidation"
import { useVehicleAccessLocationValidation } from "~/composables/location/validation/useVehicleAccessLocationValidation"
import type { VehicleAccessLocation } from "~/types/vehicleAccess"
import { getSystemTypeLabel } from "~/types/location"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import { shouldHideVehicleAccessWhenYscpOff } from "~/utils/vehicleAccessDataSource"

export type ValidationPipelineResult = {
	isValid: boolean
	errors: string[]
	warnings: string[]
}

const ok = (): ValidationPipelineResult => ({ isValid: true, errors: [], warnings: [] })

const merge = (...results: ValidationPipelineResult[]): ValidationPipelineResult => {
	const errors = results.flatMap((r) => r.errors)
	const warnings = results.flatMap((r) => r.warnings)
	return { isValid: errors.length === 0, errors, warnings }
}

const labelForSystemType = getSystemTypeLabel

const validateStatusPointKeys = (args: {
	systemType: SystemType
	locationName: string
	equipmentKind: string
	statusPoints: Record<string, unknown> | null | undefined
}): ValidationPipelineResult => {
	const sys = args.systemType
	if (sys !== "drainage" && sys !== "fire" && sys !== "power") return ok()

	const sp = args.statusPoints && typeof args.statusPoints === "object" ? args.statusPoints : {}
	const keys = Object.keys(sp)
	if (keys.length === 0) return ok()

	const kind = String(args.equipmentKind || "").trim()

	let allowed: string[] = []
	if (sys === "drainage" || sys === "fire") {
		allowed = kind === "tank" ? ["coverAlarm", "highLevel", "lowLevel"] : ["running"]
	} else if (sys === "power") {
		allowed = kind === "oil_level" ? ["running"] : ["fault", "highOil", "lowOil"]
	}
	const allowSet = new Set(allowed)
	const invalid = keys.filter((k) => !allowSet.has(k))
	if (invalid.length === 0) return ok()

	return {
		isValid: false,
		errors: [
			`地點「${args.locationName}」：statusPoints 鍵不符合規範，不允許 [${invalid.join(
				"，"
			)}]；此設備類型僅允許 [${allowed.join("，")}]`,
		],
		warnings: [],
	}
}

export function useLocationValidationPipeline() {
	const { validateZone } = useZoneValidation()
	const { validateLocationName } = useLocationValidation()

	const env = useEnvironmentLocationValidation()
	const lighting = useLightingLocationValidation()
	const pc = usePeopleCountingLocationValidation()
	const va = useVehicleAccessLocationValidation()
	const { enableYscpVehicleAccess } = useModuleRegistry()

	const validateZoneBase = (args: {
		zone: { name?: string | null; imageUrl?: string | null; description?: string | null }
		requireImageUrl?: boolean
	}): ValidationPipelineResult => {
		const res = validateZone(args.zone)
		const errors = [...(res.errors || [])]
		if (args.requireImageUrl && !args.zone.imageUrl) {
			errors.push("此系統必須上傳區域示意圖")
		}
		return { isValid: errors.length === 0, errors, warnings: [] }
	}

	/**
	 * 系統頁：驗證「系統特定 Zone」（TZone + locations[]）
	 * - 會驗證 zone 基本欄位 + 每筆 location 的系統特定規則
	 */
	const validateSystemZoneForSave = (args: {
		systemType: SystemType
		requireImageUrl?: boolean
		zone: any
		locations: any[]
	}): ValidationPipelineResult => {
		const base = validateZoneBase({
			zone: {
				name: args.zone?.name,
				imageUrl: args.zone?.imageUrl,
				description: args.zone?.description,
			},
			requireImageUrl: args.requireImageUrl,
		})

		const errors: string[] = [...base.errors]
		const warnings: string[] = [...base.warnings]

		const locations = Array.isArray(args.locations) ? args.locations : []
		for (let i = 0; i < locations.length; i++) {
			const loc = locations[i]
			const nameError = validateLocationName(loc?.name)
			if (nameError) {
				errors.push(
					`${labelForSystemType(args.systemType)}地點「${loc?.name || `第 ${i + 1} 筆`}」：${nameError}`
				)
				continue
			}

			switch (args.systemType) {
				case "environment": {
					const r = env.validateEnvironmentLocation(loc as EnvironmentLocation)
					if (!r.isValid) {
						errors.push(...r.errors.map((e) => `地點「${loc.name}」：${e}`))
					}
					if (r.warnings?.length) {
						warnings.push(...r.warnings.map((w) => `地點「${loc.name}」：${w}`))
					}
					break
				}
				case "lighting":
				case "hvac": {
					break
				}
				case "people_counting": {
					const r = pc.validatePeopleCountingLocation(loc as PeopleCountingLocation)
					if (!r.isValid) {
						errors.push(...r.errors.map((e) => `地點「${loc.name}」：${e}`))
					}
					if (r.warnings?.length) {
						warnings.push(...r.warnings.map((w) => `地點「${loc.name}」：${w}`))
					}
					break
				}
				case "vehicle_access": {
					if (
						shouldHideVehicleAccessWhenYscpOff(
							(loc as VehicleAccessLocation).dataSource,
							enableYscpVehicleAccess.value
						)
					) {
						break
					}
					const r = va.validateVehicleAccessLocation(loc as VehicleAccessLocation)
					if (!r.isValid) {
						errors.push(...r.errors.map((e) => `地點「${loc.name}」：${e}`))
					}
					if (r.warnings?.length) {
						warnings.push(...r.warnings.map((w) => `地點「${loc.name}」：${w}`))
					}
					break
				}
				case "drainage":
				case "fire": {
					const drainageLike = loc as DrainageLocation | FireLocation
					const r = validateStatusPointKeys({
						systemType: args.systemType,
						locationName: drainageLike?.name || `第 ${i + 1} 筆`,
						equipmentKind:
							String((drainageLike as any)?.equipmentKind ?? "").trim() === "tank"
								? "tank"
								: "pump",
						statusPoints: (drainageLike as any)?.statusPoints,
					})
					if (!r.isValid) errors.push(...r.errors)
					break
				}
				case "power": {
					const p = loc as PowerLocation
					const r = validateStatusPointKeys({
						systemType: "power",
						locationName: p?.name || `第 ${i + 1} 筆`,
						equipmentKind:
							String((p as any)?.equipmentKind ?? "").trim() === "oil_level"
								? "oil_level"
								: "generator",
						statusPoints: (p as any)?.statusPoints,
					})
					if (!r.isValid) errors.push(...r.errors)
					break
				}
				case "emergency_rescue": {
					break
				}
				default:
					break
			}
		}

		// lighting / HVAC：整區 Modbus 檢查（結構與照明點位相同）放在最後一次做，避免重複 O(n^2)
		if (args.systemType === "lighting" || args.systemType === "hvac") {
			const r = lighting.validateZoneLocations(locations as LightingLocation[])
			if (!r.isValid) errors.push(...r.errors)
			if (r.warnings?.length) warnings.push(...r.warnings)
		}

		return { isValid: errors.length === 0, errors, warnings }
	}

	/**
	 * 全區點位圖：驗證 UnifiedZone（包含 locations[] 與 systems[]）
	 * - 統一規則：location.name 必填；location.systems 至少一個
	 */
	const validateUnifiedZoneForSave = (args: { zone: UnifiedZone }): ValidationPipelineResult => {
		const base = validateZoneBase({
			zone: {
				name: args.zone?.name,
				imageUrl: args.zone?.imageUrl,
				description: args.zone?.description,
			},
			requireImageUrl: false,
		})

		const errors: string[] = [...base.errors]
		const warnings: string[] = [...base.warnings]

		const locations = Array.isArray(args.zone?.locations) ? args.zone.locations : []
		for (let i = 0; i < locations.length; i++) {
			const loc = locations[i] as UnifiedLocation
			const nameError = validateLocationName(loc?.name)
			if (nameError) {
				errors.push(`地點「${loc?.name || `第 ${i + 1} 筆`}」：${nameError}`)
				continue
			}
			const systems = Array.isArray(loc.systems) ? loc.systems : []
			if (systems.length === 0) {
				errors.push(`地點「${loc.name}」：所屬系統不能為空`)
			}
		}

		return { isValid: errors.length === 0, errors, warnings }
	}

	return {
		validateZoneBase,
		validateSystemZoneForSave,
		validateUnifiedZoneForSave,
	}
}
