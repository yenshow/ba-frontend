/**
 * 人流統計系統地點驗證 Composable
 * 處理人流統計系統特定的驗證邏輯
 */

import type { PeopleCountingLocation } from "~/types/peopleCounting"
import { useLocationValidation } from "~/composables/location/validation/useBaseValidation"

export interface PeopleCountingLocationValidationResult {
	isValid: boolean
	errors: string[]
	warnings: string[]
}

export function usePeopleCountingLocationValidation() {
	const { validateLocationName } = useLocationValidation()

	/**
	 * 驗證 personGroupIds（YSCP 時必填至少一個；門禁設備時選填）
	 */
	const validatePersonGroupIds = (
		personGroupIds: number[] | undefined | null,
		dataSource?: "yscp" | "access_control" | "isapi_camera"
	): string | null => {
		// access_control / isapi_camera：不需要 personGroupIds（允許 undefined / null）
		if (dataSource === "access_control" || dataSource === "isapi_camera") {
			if (personGroupIds == null) return null
		}

		if (!Array.isArray(personGroupIds)) {
			return "personGroupIds 必須是陣列"
		}

		if (dataSource === "access_control" || dataSource === "isapi_camera") {
			// 門禁設備/攝影機：選填，若有填則驗證格式
			if (personGroupIds.length === 0) return null
		} else {
			// YSCP：至少需要一個
			if (personGroupIds.length === 0) {
				return "personGroupIds 至少需要一個元素"
			}
		}

		for (const id of personGroupIds) {
			if (typeof id !== "number" || id <= 0 || !Number.isInteger(id)) {
				return "personGroupIds 中的每個元素必須是正整數"
			}
		}
		const uniqueIds = new Set(personGroupIds)
		if (personGroupIds.length !== uniqueIds.size) {
			return "personGroupIds 中不能有重複的元素"
		}
		return null
	}

	/**
	 * 驗證門禁設備 ID
	 */
	const validateDoorId = (doorId: number | undefined | null, fieldName: string): string | null => {
		if (doorId === undefined || doorId === null) {
			return null // 選填欄位
		}

		if (typeof doorId !== "number") {
			return `${fieldName} 必須是數字`
		}

		if (doorId <= 0 || !Number.isInteger(doorId)) {
			return `${fieldName} 必須是正整數`
		}

		return null
	}

	/**
	 * 驗證完整的地點資料（依 dataSource 分流：YSCP 驗證 personGroupIds/entryDoorId；門禁驗證 entryDeviceId）
	 */
	const validatePeopleCountingLocation = (
		location: PeopleCountingLocation
	): PeopleCountingLocationValidationResult => {
		const errors: string[] = []
		const warnings: string[] = []
		const dataSource = location.dataSource ?? "yscp"

		const nameError = validateLocationName(location.name)
		if (nameError) errors.push(nameError)

		const personGroupIdsError = validatePersonGroupIds(location.personGroupIds, dataSource)
		if (personGroupIdsError) errors.push(personGroupIdsError)

		if (dataSource === "access_control") {
			if (location.entryDeviceId == null || location.entryDeviceId === 0) {
				errors.push("請選擇入口設備（門禁設備）")
			} else {
				const entryDeviceError = validateDoorId(location.entryDeviceId, "入口設備 ID")
				if (entryDeviceError) errors.push(entryDeviceError)
			}
			if (location.exitDeviceId != null && location.exitDeviceId !== 0) {
				const exitDeviceError = validateDoorId(location.exitDeviceId, "出口設備 ID")
				if (exitDeviceError) errors.push(exitDeviceError)
			}
		} else if (dataSource === "isapi_camera") {
			const cameraDeviceIds = Array.isArray(location.cameraDeviceIds)
				? location.cameraDeviceIds.filter((id) => typeof id === "number" && id > 0 && Number.isInteger(id))
				: []
			const fallbackSingle = location.cameraDeviceId != null ? [location.cameraDeviceId] : []
			const effectiveIds = cameraDeviceIds.length ? cameraDeviceIds : fallbackSingle

			if (effectiveIds.length === 0) {
				errors.push("請選擇攝影機設備（ISAPI PeopleCounting）")
			} else {
				for (const id of effectiveIds) {
					const cameraDeviceError = validateDoorId(id, "攝影機設備 ID")
					if (cameraDeviceError) errors.push(cameraDeviceError)
				}
			}
			if (location.cameraChannelId != null && location.cameraChannelId !== 0) {
				const channelError = validateDoorId(location.cameraChannelId, "Channel")
				if (channelError) errors.push(channelError)
			}
		} else {
			const entryDoorError = validateDoorId(location.entryDoorId, "入口設備 ID")
			if (entryDoorError) errors.push(entryDoorError)
			const exitDoorError = validateDoorId(location.exitDoorId, "出口設備 ID")
			if (exitDoorError) errors.push(exitDoorError)
		}

		const hasEntry =
			dataSource === "yscp"
				? !!location.entryDoorId
				: dataSource === "access_control"
					? !!location.entryDeviceId
					: Array.isArray(location.cameraDeviceIds)
						? location.cameraDeviceIds.length > 0
						: !!location.cameraDeviceId
		const hasExit =
			dataSource === "yscp"
				? !!location.exitDoorId
				: dataSource === "access_control"
					? !!location.exitDeviceId
					: false
		if (hasEntry && !hasExit) warnings.push("已設定入口設備，但未設定出口設備")
		if (hasExit && !hasEntry) warnings.push("已設定出口設備，但未設定入口設備")

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		}
	}

	return {
		validatePersonGroupIds,
		validateDoorId,
		validatePeopleCountingLocation,
	}
}
