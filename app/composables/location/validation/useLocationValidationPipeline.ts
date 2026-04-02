import type { SystemType, UnifiedLocation, UnifiedZone } from "~/types/location"
import type { EnvironmentLocation } from "~/types/environment"
import type { PeopleCountingLocation } from "~/types/peopleCounting"
import type { VehicleAccessLocation } from "~/types/vehicleAccess"
import { useZoneValidation, useLocationValidation } from "~/composables/location/validation/useBaseValidation"
import { useEnvironmentLocationValidation } from "~/composables/location/validation/useEnvironmentLocationValidation"
import { usePeopleCountingLocationValidation } from "~/composables/location/validation/usePeopleCountingLocationValidation"
import { getSystemTypeLabel } from "~/constants/systemLabels"

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

export function useLocationValidationPipeline() {
	const { validateZone } = useZoneValidation()
	const { validateLocationName } = useLocationValidation()

	const env = useEnvironmentLocationValidation()
	const pc = usePeopleCountingLocationValidation()

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
				errors.push(`${labelForSystemType(args.systemType)}地點「${loc?.name || `第 ${i + 1} 筆`}」：${nameError}`)
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
					// 目前無專用 validation composable：先以名稱必填為硬規則，其餘留給欄位層
					break
				}
				default:
					break
			}
		}

		return { isValid: errors.length === 0, errors, warnings }
	}

	/**
	 * 地點管理（UnifiedZone）：驗證 locations[] 與 systems[]
	 * - 統一規則：location.name 必填；location.systems 至少一個
	 */
	const validateUnifiedZoneForSave = (args: {
		zone: UnifiedZone
	}): ValidationPipelineResult => {
		const base = validateZoneBase({
			zone: { name: args.zone?.name, imageUrl: args.zone?.imageUrl, description: args.zone?.description },
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

