import type { SyncPersonRow, SyncStepUiStatus } from "~/utils/personnelUtils"
import type { Person, LocationLicensePlateRow } from "~/types/personnel"
import {
	plateSyncStatusToUiStatus,
	aggregatePlateSyncUiStatus,
	resolvePersonPlateSyncSources,
} from "~/utils/licensePlateFormUtils"

export type SyncCredentialIndicatorItem = {
	key: string
	label: string
	status: SyncStepUiStatus
	viewBox: string
	path: Record<string, string>
}

export type LocationMemberSyncMode = "access_control" | "isapi_camera"

/** 人流／車牌地點名單同步 icon（Construction 無梯控，不含 ladderCard） */
export const SYNC_CREDENTIAL_ICONS = {
	face: {
		viewBox: "0 0 24 24",
		path: {
			fill: "currentColor",
			d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z",
		},
	},
	card: {
		viewBox: "0 0 24 24",
		path: {
			fill: "none",
			stroke: "currentColor",
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			d: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
		},
	},
	fingerprint: {
		viewBox: "0 -960 960 960",
		path: {
			fill: "currentColor",
			d: "M481-779q108 0 203.5 46T843-601q3 5 2.5 8t-3.5 6q-3 3-7.5 3t-8.5-5q-59-82-150.5-126T481-759q-103 0-193 44.5T138-589q-4 5-7.5 6t-7.5-1q-4-2-4-6.5t2-8.5q62-86 157-133t203-47Zm0 96q136 0 233.5 90T812-371q0 46-34 78t-82 32q-49 0-84-32t-35-78q0-39-28.5-65T481-462q-39 0-68 26t-29 65q0 104 63 173.5T604-100q6 2 7.5 5t.5 7q-1 5-4 7t-8 0q-103-26-169.5-103T364-371q0-47 34.5-79t82.5-32q48 0 82.5 32t34.5 79q0 38 29.5 64t68.5 26q38 0 66.5-26t28.5-64q0-123-91.5-206T481-660q-127 0-218.5 83T171-371q0 24 5.5 62.5T200-221q2 5 0 7.5t-5 4.5q-4 2-8.5 1t-6.5-6q-13-38-20.5-77.5T152-371q0-129 98-220.5T481-683Zm0-197q65 0 127.5 16T728-819q5 2 5.5 6t-1.5 7q-2 3-5.5 5t-8.5 0q-55-27-115-42.5T481-859q-62 0-121 14.5T247-801q-5 2-7.5.5T235-805q-2-2-2-6t3-6q57-31 119.5-47T481-880Zm0 298q92 0 158.5 61T706-371q0 5-2.5 7.5T696-361q-5 0-8-2.5t-3-7.5q0-81-60.5-136T481-562q-83 0-142.5 55T279-371q0 85 29.5 145T396-106q4 4 3.5 7.5T396-92q-2 2-6.5 3.5T381-92q-58-60-90.5-126T258-371q0-89 65.5-150T481-582Zm-1 200q5 0 7.5 3t2.5 8q0 81 59.5 133.5T687-185q8 0 19-1t24-3q5-1 8 1.5t4 5.5q1 4-.5 7t-6.5 4q-18 5-31.5 5.5t-16.5.5q-88 0-152.5-58.5T470-371q0-5 2.5-8t7.5-3Z",
		},
	},
	licensePlate: {
		viewBox: "0 -960 960 960",
		path: {
			fill: "currentColor",
			d: "M200-204v54q0 12.75-8.62 21.37Q182.75-120 170-120h-20q-12.75 0-21.37-8.63Q120-137.25 120-150v-324l85-256q5-14 16.5-22t26.5-8h464q15 0 26.5 8t16.5 22l85 256v324q0 12.75-8.62 21.37Q822.75-120 810-120h-21q-13 0-21-8.63-8-8.62-8-21.37v-54H200Zm3-330h554l-55-166H258l-55 166Zm-23 60v210-210Zm105.76 160q23.24 0 38.74-15.75Q340-345.5 340-368q0-23.33-15.75-39.67Q308.5-424 286-424q-23.33 0-39.67 16.26Q230-391.47 230-368.24q0 23.24 16.26 38.74 16.27 15.5 39.5 15.5ZM675-314q23.33 0 39.67-15.75Q731-345.5 731-368q0-23.33-16.26-39.67Q698.47-424 675.24-424q-23.24 0-38.74 16.26-15.5 16.27-15.5 39.5 0 23.24 15.75 38.74Q652.5-314 675-314Zm-495 50h600v-210H180v210Z",
		},
	},
} as const

const toIndicator = (
	key: keyof typeof SYNC_CREDENTIAL_ICONS,
	label: string,
	status: SyncStepUiStatus,
): SyncCredentialIndicatorItem => ({
	key,
	label,
	status,
	viewBox: SYNC_CREDENTIAL_ICONS[key].viewBox,
	path: SYNC_CREDENTIAL_ICONS[key].path as Record<string, string>,
})

type AccessCredentialStep = "face" | "card" | "fingerprint"

const ACCESS_CREDENTIAL_STEPS: Record<LocationMemberSyncMode, AccessCredentialStep[]> = {
	access_control: ["face", "card", "fingerprint"],
	isapi_camera: ["face"],
}

const ACCESS_CREDENTIAL_LABELS: Record<AccessCredentialStep, string> = {
	face: "人臉",
	card: "卡片",
	fingerprint: "指紋",
}

/** 人流／攝影機地點名單：狀態來自 buildSyncPersonStepRows（getSyncRowByEmployeeNo） */
export const buildLocationMemberSyncIndicators = (params: {
	row: SyncPersonRow | null
	mode: LocationMemberSyncMode
	isKept: boolean
}): SyncCredentialIndicatorItem[] => {
	const { row, mode, isKept } = params
	const steps = ACCESS_CREDENTIAL_STEPS[mode]
	if (row) {
		return steps.map((step) =>
			toIndicator(step, ACCESS_CREDENTIAL_LABELS[step], row[step].status),
		)
	}
	const fallbackStatus: SyncStepUiStatus = isKept ? "pending" : "no_data"
	return steps.map((step) => toIndicator(step, ACCESS_CREDENTIAL_LABELS[step], fallbackStatus))
}

export const buildPlateSyncIndicators = (status: SyncStepUiStatus): SyncCredentialIndicatorItem[] => [
	toIndicator("licensePlate", "車牌", status),
]

/** 車牌地點名單：有人員主檔或地點車牌時顯示彙整同步 icon；無車牌不顯示 */
export const buildLocationMemberPlateSyncIndicators = (
	person: Person,
	locationRows: LocationLicensePlateRow[],
): SyncCredentialIndicatorItem[] => {
	const sources = resolvePersonPlateSyncSources(person, locationRows)
	if (sources.length === 0) return []
	return buildPlateSyncIndicators(
		aggregatePlateSyncUiStatus(sources.map((p) => p.isapi_sync_status)),
	)
}

export { plateSyncStatusToUiStatus }
