import type {
	Device,
	DeviceType,
	DeviceModel,
	CreateDeviceData,
	UpdateDeviceData,
	CreateDeviceModelData,
	UpdateDeviceModelData,
	DeviceTypeCode
} from "~/types/device";

export const useDeviceApi = () => {
	const { request } = useApiBase();

	return {
		// 建立設備
		createDevice: (data: CreateDeviceData) => {
			return request<{ message: string; device: Device }>("/devices", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		// 取得設備列表（支援按類型篩選）
		getDevices: (params?: {
			type_id?: number;
			type_code?: DeviceTypeCode;
			status?: string;
			limit?: number;
			offset?: number;
			orderBy?: string;
			order?: "asc" | "desc";
		}) => {
			const query = new URLSearchParams();
			if (params?.type_id) query.append("type_id", String(params.type_id));
			if (params?.type_code) query.append("type_code", params.type_code);
			if (params?.status) query.append("status", params.status);
			if (params?.limit !== undefined && params?.limit !== null) {
				query.append("limit", String(params.limit));
			}
			if (params?.offset !== undefined && params?.offset !== null) {
				query.append("offset", String(params.offset));
			}
			if (params?.orderBy) {
				query.append("orderBy", params.orderBy);
			}
			if (params?.order) {
				query.append("order", params.order);
			}

			const queryString = query.toString();
			return request<{ devices: Device[]; total: number; limit: number; offset: number }>(`/devices${queryString ? `?${queryString}` : ""}`);
		},

		// 取得單一設備
		getDevice: (id: number) => {
			return request<{ device: Device }>(`/devices/${id}`);
		},

		// 更新設備
		updateDevice: (id: number, data: UpdateDeviceData) => {
			return request<{ message: string; device: Device }>(`/devices/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		// 刪除設備
		deleteDevice: (id: number) => {
			return request<{ message: string }>(`/devices/${id}`, {
				method: "DELETE"
			});
		},

		// 取得所有設備類型
		getDeviceTypes: () => {
			return request<{ device_types: DeviceType[] }>("/devices/types");
		},

		// 取得單一設備類型
		getDeviceType: (id: number) => {
			return request<{ device_type: DeviceType }>(`/devices/types/${id}`);
		},

		// 根據代碼取得設備類型
		getDeviceTypeByCode: (code: DeviceTypeCode) => {
			return request<{ device_type: DeviceType }>(`/devices/types/code/${code}`);
		},

		// 取得所有設備型號（支援按類型篩選）
		getDeviceModels: (params?: { type_id?: number; type_code?: DeviceTypeCode }) => {
			const query = new URLSearchParams();
			if (params?.type_id) query.append("type_id", String(params.type_id));
			if (params?.type_code) query.append("type_code", params.type_code);

			const queryString = query.toString();
			return request<{ device_models: DeviceModel[] }>(`/devices/models${queryString ? `?${queryString}` : ""}`);
		},

		// 取得單一設備型號
		getDeviceModel: (id: number) => {
			return request<{ device_model: DeviceModel }>(`/devices/models/${id}`);
		},

		// 建立設備型號（管理員）
		createDeviceModel: (data: CreateDeviceModelData) => {
			return request<{ message: string; device_model: DeviceModel }>("/devices/models", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		// 更新設備型號（管理員）
		updateDeviceModel: (id: number, data: UpdateDeviceModelData) => {
			return request<{ message: string; device_model: DeviceModel }>(`/devices/models/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		// 刪除設備型號（管理員）
		deleteDeviceModel: (id: number) => {
			return request<{ message: string }>(`/devices/models/${id}`, {
				method: "DELETE"
			});
		}
	};
};
