import type {
	Device,
	DeviceType,
	DeviceModel,
	CreateDeviceData,
	UpdateDeviceData,
	CreateDeviceModelData,
	UpdateDeviceModelData,
	DeviceTypeCode,
	DeviceStreamStartResponse,
	DeviceStreamStatusResponse
} from "~/types/device";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPaginationParams, buildPathWithQuery, mergeQueryParams } from "~/utils/apiUtils";

const deviceTypesCache = ref<DeviceType[] | null>(null);
const isLoadingDeviceTypesCache = ref(false);
let loadDeviceTypesPromise: Promise<{ device_types: DeviceType[] }> | null = null;

export const useDeviceApi = () => {
	const { request } = useApiBase();

	return {
		createDevice: (data: CreateDeviceData) => {
			return request<{ message: string; device: Device }>("/devices", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		getDevices: async (params?: {
			type_id?: number;
			type_code?: DeviceTypeCode;
			status?: string;
			group?: string;
			limit?: number;
			offset?: number;
			orderBy?: string;
			order?: "asc" | "desc";
		}) => {
			const filterParams: Record<string, unknown> = {};
			if (params?.type_id) filterParams.type_id = params.type_id;
			if (params?.type_code) filterParams.type_code = params.type_code;
			if (params?.status) filterParams.status = params.status;
			if (params?.group != null && params.group !== "") filterParams.group = params.group;

			const paginationParams = buildPaginationParams({
				limit: params?.limit,
				offset: params?.offset,
				orderBy: params?.orderBy,
				order: params?.order
			});

			const allParams = mergeQueryParams(filterParams, paginationParams);

			const path = buildPathWithQuery("/devices", allParams);
			return request<{ devices: Device[]; total: number; limit: number; offset: number }>(path);
		},

		getCameraGroups: () => {
			return request<{ groups: string[] }>(
				buildPathWithQuery("/devices/groups", { type_code: "camera" })
			);
		},

		getDevice: (id: number) => {
			return request<{ device: Device }>(`/devices/${id}`);
		},

		startStream: (id: number) => {
			return request<DeviceStreamStartResponse>(`/devices/${id}/stream/start`, {
				method: "POST"
			});
		},

		stopStream: (id: number) => {
			return request<{ message?: string }>(`/devices/${id}/stream/stop`, {
				method: "POST"
			});
		},

		getStreamStatus: (id: number) => {
			return request<DeviceStreamStatusResponse>(`/devices/${id}/stream/status`);
		},

		updateDevice: (id: number, data: UpdateDeviceData) => {
			return request<{ message: string; device: Device }>(`/devices/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		deleteDevice: (id: number) => {
			return request<{ message: string }>(`/devices/${id}`, {
				method: "DELETE"
			});
		},

		getDeviceTypes: async (force = false): Promise<DeviceType[]> => {
			if (!force && deviceTypesCache.value !== null) {
				return deviceTypesCache.value;
			}

			if (isLoadingDeviceTypesCache.value && loadDeviceTypesPromise) {
				const result = await loadDeviceTypesPromise;
				return Array.isArray(result?.device_types) ? result.device_types : [];
			}

			isLoadingDeviceTypesCache.value = true;
			if (force) {
				deviceTypesCache.value = null;
			}
			loadDeviceTypesPromise = request<{ device_types: DeviceType[] }>("/devices/types");

			try {
				const result = await loadDeviceTypesPromise;
				const deviceTypes = Array.isArray(result?.device_types) ? result.device_types : [];
				deviceTypesCache.value = deviceTypes;
				return deviceTypes;
			} catch (error) {
				deviceTypesCache.value = null;
				throw error;
			} finally {
				isLoadingDeviceTypesCache.value = false;
				loadDeviceTypesPromise = null;
			}
		},

		clearDeviceTypesCache: () => {
			deviceTypesCache.value = null;
		},

		getCachedDeviceTypes: (): DeviceType[] | null => {
			return deviceTypesCache.value;
		},

		isLoadingDeviceTypes: readonly(isLoadingDeviceTypesCache),

		getDeviceType: (id: number) => {
			return request<{ device_type: DeviceType }>(`/devices/types/${id}`);
		},

		getDeviceTypeByCode: (code: DeviceTypeCode) => {
			return request<{ device_type: DeviceType }>(`/devices/types/code/${code}`);
		},

		createDeviceType: (data: { name: string; code: string; description?: string }) => {
			return request<{ message: string; device_type: DeviceType }>("/devices/types", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		updateDeviceType: (id: number, data: { name?: string; code?: string; description?: string }) => {
			return request<{ message: string; device_type: DeviceType }>(`/devices/types/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		deleteDeviceType: (id: number) => {
			return request<{ message: string }>(`/devices/types/${id}`, {
				method: "DELETE"
			});
		},

		getDeviceModels: (params?: { type_id?: number; type_code?: DeviceTypeCode; _t?: string }) => {
			const filterParams: Record<string, unknown> = {};
			if (params?.type_id) filterParams.type_id = params.type_id;
			if (params?.type_code) filterParams.type_code = params.type_code;
			if (params?._t) filterParams._t = params._t;

			const path = buildPathWithQuery("/devices/models", filterParams);
			return request<{ device_models: DeviceModel[] }>(path);
		},

		getDeviceModel: (id: number) => {
			return request<{ device_model: DeviceModel }>(`/devices/models/${id}`);
		},

		createDeviceModel: (data: CreateDeviceModelData) => {
			return request<{ message: string; device_model: DeviceModel }>("/devices/models", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		updateDeviceModel: (id: number, data: UpdateDeviceModelData) => {
			return request<{ message: string; device_model: DeviceModel }>(`/devices/models/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		deleteDeviceModel: (id: number) => {
			return request<{ message: string }>(`/devices/models/${id}`, {
				method: "DELETE"
			});
		}
	};
};

