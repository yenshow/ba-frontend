import type { LightingFloor, LightingArea } from "~/types/lighting";
import { useFloorApiFactory } from "~/composables/useFloorApiFactory";
import { useErrorTrackingApiFactory } from "~/composables/useErrorTrackingApiFactory";

export interface CreateLightingFloorData {
	name: string;
	imageUrl?: string;
	areas?: Omit<LightingArea, "id">[];
}

export interface UpdateLightingFloorData {
	name?: string;
	imageUrl?: string;
	areas?: (LightingArea | Omit<LightingArea, "id">)[];
}

export const useLightingApi = () => {
	// 使用通用 Factory 創建樓層 CRUD API
	const floorApi = useFloorApiFactory<LightingFloor>("/lighting");

	// 使用通用 Factory 創建錯誤追蹤 API
	const errorTrackingApi = useErrorTrackingApiFactory(
		"/lighting/areas",
		"無法讀取照明設備資料"
	);

	return {
		// ========== 樓層管理 API ==========
		// 注意：區域（areas，即點位）統一通過樓層的 areas 來管理
		// 所有操作都通過樓層管理 API 進行

		// 取得樓層列表
		getFloors: floorApi.getFloors,

		// 取得單一樓層
		getFloor: floorApi.getFloor,

		// 建立樓層
		createFloor: floorApi.createFloor<CreateLightingFloorData>,

		// 更新樓層
		updateFloor: floorApi.updateFloor<UpdateLightingFloorData>,

		// 刪除樓層
		deleteFloor: floorApi.deleteFloor,

		// ========== 錯誤追蹤 API ==========

		// 記錄照明區域錯誤
		reportError: errorTrackingApi.reportError,

		// 清除照明區域錯誤
		clearError: errorTrackingApi.clearError
	};
};
