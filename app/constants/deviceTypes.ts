import type { DeviceTypeCode } from "~/types/device"

export type FixedDeviceTab = { name: string; code: DeviceTypeCode }

export const FIXED_DEVICE_TABS: FixedDeviceTab[] = [
	{ name: "攝影機", code: "camera" },
	{ name: "感測器", code: "sensor" },
	{ name: "控制器", code: "controller" },
	{ name: "門禁設備", code: "access_control" },
]

export const getFixedDeviceTypeName = (code: DeviceTypeCode): string => {
	const found = FIXED_DEVICE_TABS.find((t) => t.code === code)
	return found?.name ?? String(code)
}

