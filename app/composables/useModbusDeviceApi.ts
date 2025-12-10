import type {
	ModbusDevice,
	CreateModbusDeviceData,
	UpdateModbusDeviceData,
	ModbusDeviceType,
	ModbusDeviceModel,
	CreateModbusDeviceModelData,
	UpdateModbusDeviceModelData
} from "~/types/modbus";

export const useModbusDeviceApi = () => {
	const { request } = useApiBase();

	return {
		// 建立 Modbus 設備
		createDevice: (data: CreateModbusDeviceData) => {
			return request<{ message: string; device: ModbusDevice }>("/modbus/devices", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		// 取得 Modbus 設備列表
		getDevices: (params?: { status?: string; limit?: number; offset?: number; orderBy?: string; order?: "asc" | "desc" }) => {
			const query = new URLSearchParams();
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
			return request<{ devices: ModbusDevice[]; total: number; limit: number; offset: number }>(`/modbus/devices${queryString ? `?${queryString}` : ""}`);
		},

		// 取得單一 Modbus 設備
		getDevice: (id: number) => {
			return request<ModbusDevice>(`/modbus/devices/${id}`);
		},

		// 更新 Modbus 設備
		updateDevice: (id: number, data: UpdateModbusDeviceData) => {
			return request<{ message: string; device: ModbusDevice }>(`/modbus/devices/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		// 刪除 Modbus 設備
		deleteDevice: (id: number) => {
			return request<{ message: string }>(`/modbus/devices/${id}`, {
				method: "DELETE"
			});
		},

		// 取得所有設備類型（僅供讀取，用於設備型號管理選擇類型）
		getDeviceTypes: () => {
			return request<{ device_types: ModbusDeviceType[] }>("/modbus/device-types");
		},

		// 取得單一設備類型（僅供讀取）
		getDeviceType: (id: number) => {
			return request<{ device_type: ModbusDeviceType }>(`/modbus/device-types/${id}`);
		},

		// 取得所有設備型號
		getDeviceModels: () => {
			return request<{ device_models: ModbusDeviceModel[] }>("/modbus/device-models");
		},

		// 取得單一設備型號
		getDeviceModel: (id: number) => {
			return request<{ device_model: ModbusDeviceModel }>(`/modbus/device-models/${id}`);
		},

		// 建立設備型號（管理員）
		createDeviceModel: (data: CreateModbusDeviceModelData) => {
			return request<{ message: string; device_model: ModbusDeviceModel }>("/modbus/device-models", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		// 更新設備型號（管理員）
		updateDeviceModel: (id: number, data: UpdateModbusDeviceModelData) => {
			return request<{ message: string; device_model: ModbusDeviceModel }>(`/modbus/device-models/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		// 刪除設備型號（管理員）
		deleteDeviceModel: (id: number) => {
			return request<{ message: string }>(`/modbus/device-models/${id}`, {
				method: "DELETE"
			});
		}
	};
};
