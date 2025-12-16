import type { LightingFloor, LightingArea } from "~/types/lighting";

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
	const { request } = useApiBase();

	return {
		// ========== 樓層管理 API ==========
		// 注意：區域（areas，即點位）統一通過樓層的 areas 來管理
		// 所有操作都通過樓層管理 API 進行

		// 取得樓層列表
		getFloors: () => {
			return request<{ floors: LightingFloor[] }>("/lighting/floors");
		},

		// 取得單一樓層
		getFloor: (id: string) => {
			return request<{ floor: LightingFloor }>(`/lighting/floors/${id}`);
		},

		// 建立樓層
		createFloor: (data: CreateLightingFloorData) => {
			return request<{ message: string; floor: LightingFloor }>("/lighting/floors", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		// 更新樓層
		updateFloor: (id: string, data: UpdateLightingFloorData) => {
			return request<{ message: string; floor: LightingFloor }>(`/lighting/floors/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		// 刪除樓層
		deleteFloor: (id: string) => {
			return request<{ message: string }>(`/lighting/floors/${id}`, {
				method: "DELETE"
			});
		}
	};
};

