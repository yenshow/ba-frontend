/**
 * 人流統計系統地點驗證 Composable
 * 處理人流統計系統特定的驗證邏輯
 */

import type { PeopleCountingLocation } from "~/types/peopleCounting";
import { useLocationValidation } from "~/composables/location/validation/useBaseValidation";

export interface PeopleCountingLocationValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
}

export function usePeopleCountingLocationValidation() {
	const { validateLocationName } = useLocationValidation();

	/**
	 * 驗證 personGroupIds（YSCP 時必填至少一個；門禁設備時選填）
	 */
	const validatePersonGroupIds = (
		personGroupIds: number[] | undefined | null,
		dataSource?: "yscp" | "access_control" | "isapi_camera"
	): string | null => {
		// access_control / isapi_camera：不需要 personGroupIds（允許 undefined / null）
		if (dataSource === "access_control" || dataSource === "isapi_camera") {
			if (personGroupIds == null) return null;
		}

		if (!Array.isArray(personGroupIds)) {
			return "personGroupIds 必須是陣列";
		}

		if (dataSource === "access_control" || dataSource === "isapi_camera") {
			// 門禁設備/攝影機：選填，若有填則驗證格式
			if (personGroupIds.length === 0) return null;
		} else {
			// YSCP：至少需要一個
			if (personGroupIds.length === 0) {
				return "personGroupIds 至少需要一個元素";
			}
		}

		for (const id of personGroupIds) {
			if (typeof id !== "number" || id <= 0 || !Number.isInteger(id)) {
				return "personGroupIds 中的每個元素必須是正整數";
			}
		}
		const uniqueIds = new Set(personGroupIds);
		if (personGroupIds.length !== uniqueIds.size) {
			return "personGroupIds 中不能有重複的元素";
		}
		return null;
	};

	/**
	 * 驗證門禁設備 ID
	 */
	const validateDoorId = (doorId: number | undefined | null, fieldName: string): string | null => {
		if (doorId === undefined || doorId === null) {
			return null; // 選填欄位
		}

		if (typeof doorId !== "number") {
			return `${fieldName} 必須是數字`;
		}

		if (doorId <= 0 || !Number.isInteger(doorId)) {
			return `${fieldName} 必須是正整數`;
		}

		return null;
	};

	/**
	 * 驗證完整的地點資料（依 dataSource 分流：YSCP 驗證 personGroupIds/entryDoorId；門禁驗證 entryDeviceId）
	 */
	const validatePeopleCountingLocation = (
		location: PeopleCountingLocation
	): PeopleCountingLocationValidationResult => {
		const errors: string[] = [];
		const warnings: string[] = [];
		const dataSource = location.dataSource ?? "yscp";

		const nameError = validateLocationName(location.name);
		if (nameError) errors.push(nameError);

		const personGroupIdsError = validatePersonGroupIds(location.personGroupIds, dataSource);
		if (personGroupIdsError) errors.push(personGroupIdsError);

		if (dataSource === "access_control") {
			const entryIds = Array.isArray(location.entryDeviceIds)
				? location.entryDeviceIds.filter(id => typeof id === "number" && id > 0 && Number.isInteger(id))
				: [];
			const exitIds = Array.isArray(location.exitDeviceIds)
				? location.exitDeviceIds.filter(id => typeof id === "number" && id > 0 && Number.isInteger(id))
				: [];

			if (entryIds.length === 0) {
				errors.push("請選擇入口設備（門禁設備）");
			}
			if (exitIds.length === 0) {
				errors.push("請選擇出口設備（門禁設備）");
			}
			for (const id of [...entryIds, ...exitIds]) {
				const err = validateDoorId(id, "門禁設備 ID");
				if (err) errors.push(err);
			}
			const entrySet = new Set(entryIds);
			for (const id of exitIds) {
				if (entrySet.has(id)) errors.push("入口與出口請勿選擇同一設備");
			}
		} else if (dataSource === "isapi_camera") {
			const cameraDeviceIds = Array.isArray(location.cameraDeviceIds)
				? location.cameraDeviceIds.filter(
						id => typeof id === "number" && id > 0 && Number.isInteger(id)
					)
				: [];

			if (cameraDeviceIds.length === 0) {
				errors.push("請選擇攝影機設備（ISAPI PeopleCounting）");
			} else {
				for (const id of cameraDeviceIds) {
					const cameraDeviceError = validateDoorId(id, "攝影機設備 ID");
					if (cameraDeviceError) errors.push(cameraDeviceError);
				}
			}
			// channel 固定由後端設定為 1：不再提供/驗證 channel 欄位
		} else {
			const entryIds = Array.isArray(location.entryDoorIds)
				? location.entryDoorIds.filter(id => typeof id === "number" && id > 0 && Number.isInteger(id))
				: [];
			const exitIds = Array.isArray(location.exitDoorIds)
				? location.exitDoorIds.filter(id => typeof id === "number" && id > 0 && Number.isInteger(id))
				: [];
			if (entryIds.length === 0) errors.push("請選擇入口設備（YSCP）");
			if (exitIds.length === 0) errors.push("請選擇出口設備（YSCP）");
			for (const id of [...entryIds, ...exitIds]) {
				const err = validateDoorId(id, "門設備 ID");
				if (err) errors.push(err);
			}
			const entrySet = new Set(entryIds);
			for (const id of exitIds) {
				if (entrySet.has(id)) errors.push("入口與出口請勿選擇同一設備");
			}
		}

		// 出入口皆必填（yscp / access_control）；不再用 warnings 提示半套設定

		return {
			isValid: errors.length === 0,
			errors,
			warnings
		};
	};

	return {
		validatePersonGroupIds,
		validateDoorId,
		validatePeopleCountingLocation
	};
}
