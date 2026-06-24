/**
 * 人流統計狀態管理 Composable
 * 統一管理頁面狀態和數據載入邏輯
 *
 * 職權分離：
 * - 集中管理所有狀態
 * - 統一處理數據載入和錯誤處理
 * - 頁面組件只負責 UI 渲染和用戶交互
 */

import { ref } from "vue";
import { setupDebouncedRefetchListeners } from "~/composables/websocket/useWebSocket";
import { useModuleRegistry } from "~/composables/core/useModuleRegistry";
import type {
	PeopleCountingLocation,
	PeopleCountingPersonnel,
	PeopleCountingLog,
	PeopleCountingZone
} from "~/types/peopleCounting";
import { usePeopleCountingApi } from "~/composables/systems/peopleCounting/usePeopleCountingApi";
import { usePeopleCountingLocationApi } from "~/composables/location/api/usePeopleCountingLocationApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { logger } from "~/utils/logger";

const stateLogger = logger.createLogger("PeopleCounting State");

const YSCP_ACS_EVENT = "yscp:event:acs";
const ACCESS_CONTROL_EVENT = "people-counting:access-control:event";
const ISAPI_CAMERA_EVENT = "people-counting:isapi-camera:event";

/**
 * 人流統計狀態管理
 */
export const usePeopleCountingState = () => {
	const peopleCountingApi = usePeopleCountingApi();
	const peopleCountingLocationApi = usePeopleCountingLocationApi();
	const { handleError } = useErrorHandler();
	const { enableYscpPeopleCounting } = useModuleRegistry();

	// 狀態定義
	const locations = ref<PeopleCountingLocation[]>([]);
	const selectedLocation = ref<PeopleCountingLocation | null>(null);
	const personnel = ref<PeopleCountingPersonnel[]>([]);
	const logs = ref<PeopleCountingLog[]>([]);
	const peopleCountingZones = ref<PeopleCountingZone[]>([]);

	// 載入狀態
	const isLoadingLocations = ref(false);
	const isLoadingLocation = ref(false);
	const isLoadingZones = ref(false);
	const loadError = ref<string | null>(null);

	// 選中的單位 ID
	const selectedUnitId = ref<number | null>(null);

	/**
	 * 載入地點列表
	 * @param existingZones - 可選的現有區域列表，如果提供則直接使用，避免重複 API 調用
	 */
	const loadLocations = async (existingZones?: { zones: PeopleCountingZone[] }): Promise<void> => {
		isLoadingLocations.value = true;
		try {
			const result = await peopleCountingApi.getLocations(existingZones);
			locations.value = result.locations;

			if (result.zones && result.zones.length > 0) {
				peopleCountingZones.value = result.zones;
			}

			// 如果當前有選中的地點，同步更新 selectedLocation 的統計資料
			// 這樣可以確保總覽卡片和詳情面板的資料保持一致
			if (selectedLocation.value?.locationId) {
				const updatedLocation = locations.value.find(
					loc => loc.locationId === selectedLocation.value?.locationId
				);
				if (updatedLocation) {
					selectedLocation.value = {
						...selectedLocation.value,
						dataSource: updatedLocation.dataSource,
						logDisplayColumns: updatedLocation.logDisplayColumns,
						entryCount: updatedLocation.entryCount,
						exitCount: updatedLocation.exitCount,
						currentCount: updatedLocation.currentCount,
						// 門禁名單變更後可能新增/移除群組，須以 API 回傳的完整 units 為準
						units: updatedLocation.units ?? [],
					};
				}
			}

			if (process.dev) {
				stateLogger.log("載入地點列表成功", { count: locations.value.length });
			}
		} catch (error) {
			handleError(error, "載入地點列表失敗");
			throw error;
		} finally {
			isLoadingLocations.value = false;
		}
	};

	/**
	 * 載入地點詳情
	 */
	const loadLocationDetail = async (locationId: number): Promise<void> => {
		isLoadingLocation.value = true;
		loadError.value = null;
		selectedUnitId.value = null; // 重置選中的單位

		try {
			// 使用現有的 locations 列表，避免重複 API 調用
			selectedLocation.value = await peopleCountingApi.getLocationDetail(locationId, locations.value);

			const isCamera = selectedLocation.value.dataSource === "isapi_camera";
			if (isCamera) {
				selectedUnitId.value = null;
				personnel.value = [];
				await loadLocationLogs(locationId);
			} else {
				const firstUnit = selectedLocation.value.units?.[0];
				if (firstUnit) {
					selectedUnitId.value = firstUnit.id;
					await Promise.all([loadUnitPersonnel(firstUnit.id), loadLocationLogs(locationId)]);
				} else {
					personnel.value = [];
					await loadLocationLogs(locationId);
				}
			}
		} catch (error) {
			const errorMsg = handleError(error, "載入地點詳情失敗");
			loadError.value = errorMsg || "載入地點詳情失敗";
			throw error;
		} finally {
			isLoadingLocation.value = false;
		}
	};

	/**
	 * 載入單位人員
	 */
	const loadUnitPersonnel = async (unitId: number): Promise<void> => {
		try {
			const locationId = selectedLocation.value?.locationId;
			personnel.value = await peopleCountingApi.getUnitPersonnel(unitId, locationId);
		} catch (error) {
			handleError(error, "載入單位人員失敗");
			throw error;
		}
	};

	/**
	 * 載入地點進出場記錄
	 */
	const loadLocationLogs = async (locationId: number, unitId?: number): Promise<void> => {
		try {
			logs.value = await peopleCountingApi.getLocationLogs(locationId, {
				limit: 5,
				...(unitId && { unitId })
			});
		} catch (error) {
			handleError(error, "載入進出場記錄失敗");
			throw error;
		}
	};

	/**
	 * 載入區域列表
	 */
	const loadZones = async (): Promise<void> => {
		if (isLoadingZones.value) return;
		isLoadingZones.value = true;
		try {
			const result = await peopleCountingLocationApi.getZones();
			peopleCountingZones.value = result.zones || [];
		} catch (error) {
			handleError(error, "載入區域列表失敗");
			throw error;
		} finally {
			isLoadingZones.value = false;
		}
	};

	/**
	 * 處理單位選擇
	 */
	const handleUnitSelect = async (unitId: number | null): Promise<void> => {
		selectedUnitId.value = unitId;
		if (unitId) {
			await loadUnitPersonnel(unitId);
		} else {
			personnel.value = [];
		}
	};

	/**
	 * 獲取地點所屬的區域名稱
	 */
	const getLocationZone = (location: PeopleCountingLocation): string | null => {
		const zone = peopleCountingZones.value.find(zone =>
			zone.locations?.some(loc => {
				if (!loc.id) return false;
				const locationId = Number(loc.id);
				return !isNaN(locationId) && locationId === location.locationId;
			})
		);
		return zone?.name || null;
	};

	/**
	 * WS 事件後輕量刷新：進出記錄與單位人員（統計由前置 loadLocations 同步）
	 */
	const refreshSelectedLocationLive = async (): Promise<void> => {
		const locationId = selectedLocation.value?.locationId;
		if (locationId == null) return;

		const unitId = selectedUnitId.value;
		if (selectedLocation.value?.dataSource === "isapi_camera") {
			await loadLocationLogs(locationId);
			return;
		}
		if (unitId) {
			await Promise.all([loadUnitPersonnel(unitId), loadLocationLogs(locationId, unitId)]);
			return;
		}
		await loadLocationLogs(locationId);
	};

	const resetStatsForSelectedSite = async (): Promise<void> => {
		const locationId = selectedLocation.value?.locationId;
		if (locationId == null) return;
		await peopleCountingApi.resetSiteStats(locationId);
		await loadLocations();
		await loadLocationDetail(locationId);
	};

	const setupEventListeners = (onRefetch: () => void | Promise<void>, debounceMs = 500) =>
		setupDebouncedRefetchListeners(
			onRefetch,
			[
				{ event: YSCP_ACS_EVENT, enabled: enableYscpPeopleCounting },
				{ event: ACCESS_CONTROL_EVENT },
				{ event: ISAPI_CAMERA_EVENT }
			],
			debounceMs,
			"PeopleCounting WebSocket"
		);

	return {
		// 狀態
		locations,
		selectedLocation,
		personnel,
		logs,
		peopleCountingZones,
		isLoadingLocations,
		isLoadingLocation,
		isLoadingZones,
		loadError,
		selectedUnitId,

		// 方法
		loadLocations,
		loadLocationDetail,
		loadUnitPersonnel,
		loadLocationLogs,
		loadZones,
		handleUnitSelect,
		getLocationZone,
		refreshSelectedLocationLive,
		setupEventListeners,
		resetStatsForSelectedSite,
	};
};
