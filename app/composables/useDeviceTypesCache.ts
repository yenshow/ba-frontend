import type { DeviceType } from "~/types/device";

// 全局設備類型快取
const deviceTypesCache = ref<DeviceType[] | null>(null);
const isLoadingCache = ref(false);
let loadPromise: Promise<{ device_types: DeviceType[] }> | null = null;

/**
 * 共享的設備類型快取 composable
 * 避免多個組件同時請求設備類型
 */
export const useDeviceTypesCache = () => {
	const deviceApi = useDeviceApi();

	const loadDeviceTypes = async (force = false): Promise<DeviceType[]> => {
		// 如果有快取且不是強制刷新，直接返回
		if (!force && deviceTypesCache.value !== null) {
			return deviceTypesCache.value;
		}

		// 如果正在載入，等待現有的請求完成
		if (isLoadingCache.value && loadPromise) {
			const result = await loadPromise;
			return result.device_types;
		}

		// 開始新的載入
		isLoadingCache.value = true;
		// 如果強制刷新，清除快取
		if (force) {
			deviceTypesCache.value = null;
		}
		// 發送新請求（強制刷新時會繞過瀏覽器快取，因為 useApiBase 已設置 no-cache headers）
		loadPromise = deviceApi.getDeviceTypes();

		try {
			const result = await loadPromise;
			deviceTypesCache.value = result.device_types;
			return result.device_types;
		} catch (error) {
			// 載入失敗時清除快取
			deviceTypesCache.value = null;
			throw error;
		} finally {
			isLoadingCache.value = false;
			loadPromise = null;
		}
	};

	const clearCache = () => {
		deviceTypesCache.value = null;
	};

	const getCachedTypes = (): DeviceType[] | null => {
		return deviceTypesCache.value;
	};

	return {
		loadDeviceTypes,
		clearCache,
		getCachedTypes,
		isLoading: readonly(isLoadingCache)
	};
};

