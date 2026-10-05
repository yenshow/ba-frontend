import type { Device } from "~/types/device";

/** 地點／表單設備下拉顯示名；停用機標示「已停用」但仍可選 */
export const formatDeviceSelectLabel = (
	device: Pick<Device, "id" | "name" | "enabled">,
	fallbackPrefix = "設備",
): string => {
	const base = String(device.name || "").trim() || `${fallbackPrefix} ${device.id}`;
	return device.enabled === false ? `${base}（已停用）` : base;
};
