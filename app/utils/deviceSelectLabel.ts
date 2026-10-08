import type { Device } from "~/types/device";

/** 地點／表單設備顯示名（開發環境選單另以 enabled=true 過濾） */
export const formatDeviceSelectLabel = (
	device: Pick<Device, "id" | "name">,
	fallbackPrefix = "設備",
): string => {
	return String(device.name || "").trim() || `${fallbackPrefix} ${device.id}`;
};
