import { useApiBase } from "~/composables/useApiBase";

/**
 * 通用樓層 CRUD API Factory
 * 用於統一管理不同系統的樓層 CRUD 操作
 */
export const useFloorApiFactory = <TFloor extends { id: string }>(
	resourcePath: string
) => {
	const { request } = useApiBase();

	return {
		/**
		 * 取得樓層列表
		 */
		getFloors: () => {
			return request<{ floors: TFloor[] }>(`${resourcePath}/floors`);
		},

		/**
		 * 取得單一樓層
		 */
		getFloor: (id: string) => {
			return request<{ floor: TFloor }>(`${resourcePath}/floors/${id}`);
		},

		/**
		 * 建立樓層
		 */
		createFloor: <TCreateData>(data: TCreateData) => {
			return request<{ message: string; floor: TFloor }>(`${resourcePath}/floors`, {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		/**
		 * 更新樓層
		 */
		updateFloor: <TUpdateData>(id: string, data: TUpdateData) => {
			return request<{ message: string; floor: TFloor }>(`${resourcePath}/floors/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		/**
		 * 刪除樓層
		 */
		deleteFloor: (id: string) => {
			return request<{ message: string }>(`${resourcePath}/floors/${id}`, {
				method: "DELETE"
			});
		}
	};
};

