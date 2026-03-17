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

// 全局設備類型快取
const deviceTypesCache = ref<DeviceType[] | null>(null);
const isLoadingDeviceTypesCache = ref(false);
let loadDeviceTypesPromise: Promise<{ device_types: DeviceType[] }> | null = null;

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

		// 取得設備列表（支援按類型、群組篩選）
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
			// 構建篩選參數
			const filterParams: Record<string, unknown> = {};
			if (params?.type_id) filterParams.type_id = params.type_id;
			if (params?.type_code) filterParams.type_code = params.type_code;
			if (params?.status) filterParams.status = params.status;
			if (params?.group != null && params.group !== "") filterParams.group = params.group;

			// 構建分頁參數
			const paginationParams = buildPaginationParams({
				limit: params?.limit,
				offset: params?.offset,
				orderBy: params?.orderBy,
				order: params?.order
			});

			// 合併參數
			const allParams = mergeQueryParams(filterParams, paginationParams);

			const path = buildPathWithQuery("/devices", allParams);
			return request<{ devices: Device[]; total: number; limit: number; offset: number }>(path);
		},

		// 取得攝影機群組列表（供篩選下拉）
		getCameraGroups: () => {
			return request<{ groups: string[] }>(buildPathWithQuery("/devices/groups", { type_code: "camera" }));
		},

		// 取得單一設備
		getDevice: (id: number) => {
			return request<{ device: Device }>(`/devices/${id}`);
		},

		// 啟動攝影機串流（MediaMTX path），回傳 webrtcUrl
		startStream: (id: number) => {
			return request<DeviceStreamStartResponse>(`/devices/${id}/stream/start`, {
				method: "POST"
			});
		},

		// 停止攝影機串流
		stopStream: (id: number) => {
			return request<{ message?: string }>(`/devices/${id}/stream/stop`, {
				method: "POST"
			});
		},

		// 查詢攝影機串流狀態
		getStreamStatus: (id: number) => {
			return request<DeviceStreamStatusResponse>(`/devices/${id}/stream/status`);
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

		// 取得所有設備類型（帶快取）
		getDeviceTypes: async (force = false): Promise<DeviceType[]> => {
			// 如果有快取且不是強制刷新，直接返回
			if (!force && deviceTypesCache.value !== null) {
				return deviceTypesCache.value;
			}

			// 如果正在載入，等待現有的請求完成
			if (isLoadingDeviceTypesCache.value && loadDeviceTypesPromise) {
				const result = await loadDeviceTypesPromise;
				return Array.isArray(result?.device_types) ? result.device_types : [];
			}

			// 開始新的載入
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
				// 載入失敗時清除快取
				deviceTypesCache.value = null;
				throw error;
			} finally {
				isLoadingDeviceTypesCache.value = false;
				loadDeviceTypesPromise = null;
			}
		},

		// 清除設備類型快取
		clearDeviceTypesCache: () => {
			deviceTypesCache.value = null;
		},

		// 取得快取的設備類型
		getCachedDeviceTypes: (): DeviceType[] | null => {
			return deviceTypesCache.value;
		},

		// 設備類型載入狀態
		isLoadingDeviceTypes: readonly(isLoadingDeviceTypesCache),

		// 取得單一設備類型
		getDeviceType: (id: number) => {
			return request<{ device_type: DeviceType }>(`/devices/types/${id}`);
		},

		// 根據代碼取得設備類型
		getDeviceTypeByCode: (code: DeviceTypeCode) => {
			return request<{ device_type: DeviceType }>(`/devices/types/code/${code}`);
		},

		// 建立設備類型（管理員）
		createDeviceType: (data: { name: string; code: string; description?: string }) => {
			return request<{ message: string; device_type: DeviceType }>("/devices/types", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		// 更新設備類型（管理員）
		updateDeviceType: (id: number, data: { name?: string; code?: string; description?: string }) => {
			return request<{ message: string; device_type: DeviceType }>(`/devices/types/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		// 刪除設備類型（管理員）
		deleteDeviceType: (id: number) => {
			return request<{ message: string }>(`/devices/types/${id}`, {
				method: "DELETE"
			});
		},

		// 取得所有設備型號（支援按類型篩選）
		getDeviceModels: (params?: { type_id?: number; type_code?: DeviceTypeCode; _t?: string }) => {
			const filterParams: Record<string, unknown> = {};
			if (params?.type_id) filterParams.type_id = params.type_id;
			if (params?.type_code) filterParams.type_code = params.type_code;
			if (params?._t) filterParams._t = params._t; // 時間戳用於強制刷新

			const path = buildPathWithQuery("/devices/models", filterParams);
			return request<{ device_models: DeviceModel[] }>(path);
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
