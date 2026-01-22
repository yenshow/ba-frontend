import type { LightingZone, LightingLocation } from "~/types/lighting";
import { useErrorTrackingApiFactory } from "~/composables/factories/useErrorTrackingApiFactory";
import { useSystemLocationApiFactory } from "~/composables/systems/location/useSystemLocationApiFactory";
import {
	backendToLightingZone,
	lightingToUnifiedZone,
	lightingLocationToUnified
} from "~/utils/locationAdapter";

export interface CreateLightingZoneData {
	name: string;
	imageUrl?: string;
	locations?: Omit<LightingLocation, "id">[];
}

export interface UpdateLightingZoneData {
	name?: string;
	imageUrl?: string;
	locations?: (LightingLocation | Omit<LightingLocation, "id">)[];
}


export const useLightingApi = () => {
	// 使用通用 Factory 創建區域管理 API
	const zoneApi = useSystemLocationApiFactory<LightingZone, LightingLocation>({
		systemType: "lighting",
		backendToSystemZone: backendToLightingZone,
		systemToUnifiedZone: (zone) => lightingToUnifiedZone(zone, "lighting"),
		locationToUnified: lightingLocationToUnified
	});

	// 使用通用 Factory 創建錯誤追蹤 API
	const errorTrackingApi = useErrorTrackingApiFactory("/lighting/locations", "無法讀取照明設備資料");

	return {
		// ========== 區域管理 API ==========
		// 注意：地點（locations，即點位）統一通過區域的 locations 來管理
		// 所有操作都通過統一地點管理 API 進行

		// 取得區域列表
		getZones: zoneApi.getZones,

		// 取得單一區域
		getZone: zoneApi.getZone,

		// 建立區域
		createZone: zoneApi.createZone,

		// 更新區域
		updateZone: zoneApi.updateZone,

		// 刪除區域
		deleteZone: zoneApi.deleteZone,

		// ========== 錯誤追蹤 API ==========

		// 記錄照明區域錯誤
		reportError: errorTrackingApi.reportError,

		// 清除照明區域錯誤
		clearError: errorTrackingApi.clearError
	};
};
