/**
 * 車輛進出系統地點驗證
 */

import type { VehicleAccessLocation } from "~/types/vehicleAccess"
import { useLocationValidation } from "~/composables/location/validation/useBaseValidation"
import { storedVehicleAccessDataSource } from "~/utils/vehicleAccessDataSource"

export interface VehicleAccessLocationValidationResult {
	isValid: boolean
	errors: string[]
	warnings: string[]
}

export function useVehicleAccessLocationValidation() {
	const { validateLocationName } = useLocationValidation()

	const validateGroupIds = (
		ids: number[] | undefined | null,
		fieldLabel: string,
		required: boolean
	): string | null => {
		if (!required && (ids == null || ids.length === 0)) return null
		if (!Array.isArray(ids)) return `${fieldLabel} 必須是陣列`
		if (ids.length === 0) return `至少需要選擇一個${fieldLabel}`
		for (const id of ids) {
			if (typeof id !== "number" || id <= 0 || !Number.isInteger(id)) {
				return `${fieldLabel} 中的每個元素必須是正整數`
			}
		}
		if (new Set(ids).size !== ids.length) {
			return `${fieldLabel} 中不能有重複的元素`
		}
		return null
	}

	const validateVehicleAccessLocation = (
		location: VehicleAccessLocation
	): VehicleAccessLocationValidationResult => {
		const errors: string[] = []
		const warnings: string[] = []

		const nameError = validateLocationName(location.name)
		if (nameError) errors.push(nameError)

		const dataSource = storedVehicleAccessDataSource(location.dataSource)

		if (dataSource === "yscp") {
			const groupError = validateGroupIds(location.vehicleGroupIds, "車輛群組", false)
			if (groupError) errors.push(groupError)
		} else {
			const groupError = validateGroupIds(location.personGroupIds, "人員群組", true)
			if (groupError) errors.push(groupError)
			if ((location.entryCameraDeviceIds ?? []).length === 0) {
				errors.push("至少需要選擇一台入口攝影機")
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		}
	}

	return { validateVehicleAccessLocation }
}
