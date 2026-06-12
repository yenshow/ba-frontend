import type { Device } from "~/types/device"

export const CAMERA_MODEL_CATEGORY_PEOPLE_COUNTING = "people_counting"
export const CAMERA_MODEL_CATEGORY_LICENSE_PLATE = "license_plate_recognition"

export const CAMERA_MODEL_CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
	{ value: "people_counting", label: "門禁管理" },
	{ value: "license_plate_recognition", label: "車牌辨識" },
	{ value: "surveillance_2mp", label: "影像監控 - 2MP" },
	{ value: "surveillance_4mp", label: "影像監控 - 4MP" },
	{ value: "surveillance_5mp", label: "影像監控 - 5MP" },
	{ value: "surveillance_6mp", label: "影像監控 - 6MP" },
	{ value: "surveillance_8mp", label: "影像監控 - 8MP" },
]

const UNCATEGORIZED_CODE = "__other__"

export const getCameraModelCategoryLabel = (code: string | null | undefined): string => {
	const key = String(code || "").trim()
	if (!key) return "—"
	return CAMERA_MODEL_CATEGORY_OPTIONS.find((o) => o.value === key)?.label ?? key
}

export const resolveDeviceCategoryCode = (device: Device): string =>
	String(device.model_category_code || "").trim()

const normalizeCategoryCode = (code: string): string => code.trim() || UNCATEGORIZED_CODE

export const filterCameraDevicesByCategory = (devices: Device[], categoryCode: string): Device[] =>
	devices.filter((d) => resolveDeviceCategoryCode(d) === categoryCode)

export const filterPeopleCountingCameraDevices = (devices: Device[]): Device[] =>
	filterCameraDevicesByCategory(devices, CAMERA_MODEL_CATEGORY_PEOPLE_COUNTING)

export const filterLicensePlateCameraDevices = (devices: Device[]): Device[] =>
	filterCameraDevicesByCategory(devices, CAMERA_MODEL_CATEGORY_LICENSE_PLATE)

export interface CameraModelCategoryGroup<T> {
	code: string
	label: string
	items: T[]
}

/** 依型號分類分組（不篩選；getCategoryCode 回傳空字串時歸入「未分類」） */
export const groupByCameraModelCategory = <T>(
	items: T[],
	getCategoryCode: (item: T) => string
): CameraModelCategoryGroup<T>[] => {
	const byCode = new Map<string, T[]>()
	for (const item of items) {
		const code = normalizeCategoryCode(getCategoryCode(item))
		if (!byCode.has(code)) byCode.set(code, [])
		byCode.get(code)!.push(item)
	}

	const groups: CameraModelCategoryGroup<T>[] = []
	for (const opt of CAMERA_MODEL_CATEGORY_OPTIONS) {
		const list = byCode.get(opt.value)
		if (list?.length) groups.push({ code: opt.value, label: opt.label, items: list })
		byCode.delete(opt.value)
	}

	for (const [code, list] of byCode) {
		if (!list.length) continue
		const label = code === UNCATEGORIZED_CODE ? "未分類" : getCameraModelCategoryLabel(code)
		groups.push({ code, label, items: list })
	}
	return groups
}

export const groupDevicesByModelCategory = <T extends Device>(devices: T[]): CameraModelCategoryGroup<T>[] =>
	groupByCameraModelCategory(devices, (d) => resolveDeviceCategoryCode(d))
