<template>
	<div>
		<!-- 照明系統頁面內容 - 自定義排版 -->
		<div class="flex justify-center gap-4 xl:gap-6 2xl:gap-8">
			<!-- 主要內容 -->
			<section class="relative flex-[1.2] 2xl:flex-[1.3]" ref="leftSectionRef">
				<div
					class="flex overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-4 xl:p-6 2xl:p-8"
				>
					<!-- 樓層選擇 -->
					<div class="z-10 flex flex-col justify-between py-4 text-center text-white">
						<div class="space-y-4">
							<!-- 樓層顯示 -->
							<div class="w-[60px] py-4 2xl:w-[100px]">
								<span
									class="inline-flex text-nowrap border-b-2 border-white/70 pb-1 text-2xl tracking-widest xl:text-3xl 2xl:text-5xl"
								>
									{{ selectedFloorName }}
								</span>
							</div>
							<!-- 樓層管理按鈕 -->
							<Transition name="fade-in">
								<button
									v-if="!isInitialLoading"
									type="button"
									@click="handleOpenFloorDialog"
									:class="[
										'whitespace-nowrap rounded-2xl p-3 text-xs font-light text-white transition-all 2xl:text-lg',
										'border-2 border-white/30 bg-transparent hover:bg-white/10'
									]"
									title="樓層管理"
								>
									樓層管理
								</button>
							</Transition>
							<!-- 編輯模式切換按鈕與下拉選單 -->
							<div class="relative">
								<Transition name="fade-in">
									<button
										v-if="!isInitialLoading"
										type="button"
										@click="handleToggleEditMode"
										:class="[
											'whitespace-nowrap rounded-2xl p-3 text-xs font-light text-white transition-all 2xl:text-lg',
											isEditMode
												? 'border-2 border-white bg-white/10'
												: 'border-2 border-white/30 bg-transparent'
										]"
									>
										{{ isEditMode ? "完成編輯" : "編輯定位" }}
									</button>
								</Transition>
								<!-- 區域列表下拉選單 -->
								<Transition name="dropdown">
									<CategoryList
										v-if="isEditMode"
										:categories="
											allFloorAreas.map((area, index) => ({
												id: getAreaId(selectedFloorData || ({} as LightingFloor), area, index),
												name: area.name,
												floorId: selectedFloor || '',
												location: area.location,
												roomIds: [],
												modbus: area.modbus
											}))
										"
										:editing="isEditMode"
										:selected-category-id="selectedCategory"
										@select="handleSelectCategory"
										@dragstart="handleCategoryListDragStart"
										@dragend="handleDragEnd"
									/>
								</Transition>
							</div>
						</div>
					</div>

					<!-- 中央樓層平面圖 -->
					<div
						ref="floorPlanRef"
						class="relative h-[600px] w-full p-4 2xl:h-[780px]"
						:class="{ 'cursor-crosshair': isEditMode && !draggingCategoryId }"
						@drop="handleDrop"
						@dragover.prevent
					>
						<NuxtImg
							v-if="floorPlanImage"
							:src="floorPlanImage"
							alt="樓層平面圖"
							class="image-blur-load pointer-events-none h-full w-full object-contain"
							:class="{ 'image-loaded': isFloorPlanLoaded }"
							width="auto"
							height="full"
							@load="isFloorPlanLoaded = true"
						/>
						<div v-else class="flex h-full w-full items-center justify-center text-white/50">
							<span>尚未設定樓層平面圖</span>
						</div>
						<!-- 區域點位（只顯示已定位的） -->
						<template v-for="area in currentFloorAreas" :key="getAreaIdForDisplay(area)">
							<div
								v-if="selectedFloorData && area.location"
								class="category-dot-wrapper"
								:class="{
									'is-dragging': draggingCategoryId === getAreaIdForDisplay(area)
								}"
								:style="{
									left: `${area.location.x}%`,
									top: `${area.location.y}%`
								}"
								:draggable="isEditMode"
								@dragstart="
									handleDotDragStart($event, area, findAreaOriginalIndex(selectedFloorData, area))
								"
								@dragend="handleDragEnd"
							>
								<div
									class="category-dot"
									:class="[
										{ 'is-active': selectedCategory === getAreaIdForDisplay(area) },
										{ 'is-editing': isEditMode }
									]"
									role="button"
									tabindex="0"
									:data-status="isAreaNormal(getAreaIdForDisplay(area)) ? 'normal' : 'abnormal'"
									:title="`${area.name}：${isAreaNormal(getAreaIdForDisplay(area)) ? '正常' : '異常'}`"
									:aria-label="`${area.name}：${isAreaNormal(getAreaIdForDisplay(area)) ? '正常' : '異常'}`"
									@click.stop="!isEditMode && selectAreaByArea(area)"
								></div>
								<CategoryTooltip
									:show="true"
									:category-name="area.name"
									:is-normal="isAreaNormal(getAreaIdForDisplay(area))"
								/>
							</div>
						</template>
					</div>
				</div>
			</section>

			<!-- 右側狀態中心 -->
			<aside
				class="flex-[0.8] overflow-y-auto 2xl:flex-[0.7]"
				:style="{ height: leftSectionHeight ? leftSectionHeight + 'px' : 'auto' }"
			>
				<StatusCenter
					:floors="lightingFloors"
					:area-statuses="areaStatuses"
					:area-disabled-map="areaDisabledMap"
					:area-toggling="areaToggling"
					:selected-floor="selectedFloor"
					@toggle="handleAreaToggle"
					@floor-selected="handleFloorSelected"
				/>
			</aside>
		</div>
	</div>
	<FloorManagementDialog
		v-model="showFloorManagementDialog"
		:floors="lightingFloors"
		@save="handleSaveFloor"
		@delete="handleDeleteFloor"
	/>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import StatusCenter from "~/components/lighting/StatusCenter.vue";
import CategoryTooltip from "~/components/lighting/CategoryTooltip.vue";
import CategoryList from "~/components/lighting/CategoryList.vue";
import FloorManagementDialog from "~/components/lighting/FloorManagementDialog.vue";
import type { CategoryModbusConfig, LightingFloor, LightingArea } from "~/types/lighting";
import { useLightingApi } from "~/composables/systems/useLightingApi";
import { useDeviceApi } from "~/composables/systems/useDeviceApi";
import { useApiBase } from "~/composables/core/useApiBase";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { usePolling } from "~/composables/monitoring/usePolling";
import { useFloorManagement } from "~/composables/systems/useFloorManagement";
import type { Device, ControllerDeviceConfig } from "~/types/device";
import type { ModbusDataResponse, ModbusDeviceConfig } from "~/types/modbus";

definePageMeta({
	layout: "default"
	// 認證由全局中間件處理
});

const lightingApi = useLightingApi();

// 左側區域參考與高度（用於使右側 StatusCenter 同高）
const leftSectionRef = ref<HTMLElement | null>(null);
const leftSectionHeight = ref<number | null>(null);

// ResizeObserver 監聽左側高度
let leftSectionResizeObserver: ResizeObserver | null = null;

const updateLeftSectionHeight = () => {
	if (leftSectionRef.value) {
		leftSectionHeight.value = leftSectionRef.value.offsetHeight;
	}
};

const initLeftSectionObserver = () => {
	if (typeof ResizeObserver === "undefined" || !leftSectionRef.value) return;
	leftSectionResizeObserver = new ResizeObserver(entries => {
		if (entries.length) {
			leftSectionHeight.value = entries[0].contentRect.height;
		}
	});
	leftSectionResizeObserver.observe(leftSectionRef.value);
};

// 生成區域 ID（統一的 ID 生成邏輯）
const getAreaId = (floor: LightingFloor, area: LightingArea, areaIndex: number): string => {
	return area.id || `area-${floor.id || floor.name}-${areaIndex}`;
};

// Toast 通知（統一在頂層定義）
const toast = useToast();
// 錯誤處理（統一在頂層定義）
const { handleError } = useErrorHandler();

// 樓層數據（從 API 載入）
const lightingFloors = ref<LightingFloor[]>([]);
const isLoadingFloors = ref(false);
const isInitialLoading = ref(true); // 追蹤初始載入狀態

// 選中的樓層與分類
const selectedFloor = ref<string>("");
const selectedCategory = ref("");

// 編輯模式相關
const isEditMode = ref(false);
const floorPlanRef = ref<HTMLElement | null>(null);
const draggingCategoryId = ref<string>("");
const isFloorPlanLoaded = ref(false);
const showFloorManagementDialog = ref(false);

// 創建 floorsById Map（避免重複查找）
const floorsById = computed(() => {
	return new Map(lightingFloors.value.map(floor => [floor.id || floor.name, floor]));
});

// 選中的樓層名稱
const selectedFloorName = computed(() => {
	const floor = floorsById.value.get(selectedFloor.value);
	return floor?.name || "";
});

// 選中的樓層資料
const selectedFloorData = computed(() => {
	return floorsById.value.get(selectedFloor.value);
});

// 樓層示意圖
const floorPlanImage = computed(() => {
	return selectedFloorData.value?.imageUrl;
});

// 檢查 location 是否有效
const isValidLocation = (location: { x: number; y: number } | undefined | null): boolean => {
	return (
		location !== undefined &&
		location !== null &&
		typeof location.x === "number" &&
		typeof location.y === "number" &&
		!isNaN(location.x) &&
		!isNaN(location.y)
	);
};

// 當前選中樓層的區域列表（過濾掉未定位的點位，只有定位的點位才會顯示在地圖上）
const currentFloorAreas = computed(() => {
	if (!selectedFloor.value) return [];
	const floor = selectedFloorData.value;
	return (floor?.areas || []).filter(area => isValidLocation(area.location));
});

// 所有區域列表（包含未定位的，用於 CategoryList）
const allFloorAreas = computed(() => {
	if (!selectedFloor.value) return [];
	const floor = selectedFloorData.value;
	return floor?.areas || [];
});

// 判斷區域是否正常（基於 areaStatuses）
const isAreaNormal = (areaId: string) => {
	const status = areaStatuses.value[areaId];
	return !status || status.status === "normal";
};

// 計算區域禁用狀態 Map（用於 StatusCenter）
const areaDisabledMap = computed(() => {
	const map: Record<string, boolean> = {};
	// 遍歷所有樓層的區域
	lightingFloors.value.forEach(floor => {
		floor.areas.forEach((area, areaIndex) => {
			const areaId = getAreaId(floor, area, areaIndex);
			const isToggling = areaToggling.value.has(areaId);

			// 如果沒有 Modbus 配置，允許控制（用於範例資料）
			if (!area.modbus) {
				map[areaId] = isToggling;
				return;
			}

			// 如果有 points 配置，檢查是否有 DO 類型的點位（只有 DO 可以控制）
			if (area.modbus.points && area.modbus.points.length > 0) {
				const hasDoPoints = filterDoPoints(area.modbus.points).length > 0;
				map[areaId] = !hasDoPoints || isToggling;
				return;
			}

			// 向後兼容：檢查舊格式
			if (area.modbus.deviceId) {
				const hasDoAddresses = !(
					!area.modbus.doAddresses &&
					!area.modbus.doAddress &&
					!area.modbus.address
				);
				map[areaId] = !hasDoAddresses || isToggling;
				return;
			}

			// 如果沒有設備配置，允許控制（可能是範例資料）
			map[areaId] = isToggling;
		});
	});
	return map;
});

// 處理樓層選擇
const handleFloorSelected = async (floorId: string) => {
	selectedFloor.value = floorId;
	selectedCategory.value = "";
};

// 選中區域
const handleSelectCategory = (areaId: string) => {
	selectedCategory.value = areaId;
};

// 找到區域在原始樓層區域列表中的索引
const findAreaOriginalIndex = (floor: LightingFloor, targetArea: LightingArea): number => {
	return floor.areas.findIndex(area => {
		if (area.id && targetArea.id) return area.id === targetArea.id;
		return area === targetArea;
	});
};

// 獲取區域的 ID（用於模板，避免重複計算）
const getAreaIdForDisplay = (area: LightingArea): string => {
	const floor = selectedFloorData.value;
	if (!floor) return "";
	const originalIndex = findAreaOriginalIndex(floor, area);
	return originalIndex !== -1 ? getAreaId(floor, area, originalIndex) : "";
};

// 直接通過區域選中
const selectAreaByArea = (area: LightingArea) => {
	const floor = selectedFloorData.value;
	if (floor && area) {
		const originalIndex = findAreaOriginalIndex(floor, area);
		if (originalIndex !== -1) {
			selectedCategory.value = getAreaId(floor, area, originalIndex);
		}
	}
};

// 區域狀態管理（每個區域對應一個開關狀態）
const areaStatuses = ref<
	Record<string, { isRunning: boolean; status: "normal" | "warning" | "error" }>
>({});

// 追蹤正在進行切換操作的區域（避免重複點擊）
const areaToggling = ref<Set<string>>(new Set());

// 防抖計時器（避免快速重複點擊）
const toggleDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const TOGGLE_DEBOUNCE_DELAY = 300; // 300ms 防抖延遲

// 確保區域狀態物件存在
const ensureAreaStatus = (areaId: string, defaultStatus: "normal" | "error" = "normal") => {
	if (!areaStatuses.value[areaId]) {
		areaStatuses.value[areaId] = {
			isRunning: false,
			status: defaultStatus
		};
	}
	return areaStatuses.value[areaId];
};

// 回滾區域狀態
const rollbackAreaStatus = (areaId: string, isRunning: boolean) => {
	if (areaStatuses.value[areaId]) {
		areaStatuses.value[areaId].isRunning = isRunning;
	}
};

// 過濾 DO 點位（新格式和向後兼容）
const filterDoPoints = (points: any[] | undefined) => {
	if (!points || points.length === 0) return [];
	return points.filter(p => {
		if (p.type === "DO") return true;
		// 向後兼容：從 method 推斷
		if (p.method === "writeCoil" || p.method === "writeCoils" || p.method === "getCoils") return true;
		return false;
	});
};

// 過濾 DI 點位（新格式和向後兼容）
const filterDiPoints = (points: any[] | undefined) => {
	if (!points || points.length === 0) return [];
	return points.filter(p => {
		if (p.type === "DI") return true;
		// 向後兼容：從 method 推斷
		if (p.method === "getDiscreteInputs") return true;
		return false;
	});
};

// 從舊格式提取 DI 地址陣列
const extractDiAddresses = (modbus: CategoryModbusConfig): number[] => {
	if (modbus.diAddresses && modbus.diAddresses.length > 0) {
		return modbus.diAddresses;
	}
	if (modbus.diAddress !== undefined) {
		const start = modbus.diAddress;
		const length = modbus.diLength ?? 1;
		return Array.from({ length }, (_, i) => start + i);
	}
	return [];
};

// 從舊格式提取 DO 地址陣列
const extractDoAddresses = (modbus: CategoryModbusConfig): number[] => {
	if (modbus.doAddresses && modbus.doAddresses.length > 0) {
		return modbus.doAddresses;
	}
	if (modbus.doAddress !== undefined) {
		const start = modbus.doAddress;
		const length = modbus.doLength ?? 1;
		return Array.from({ length }, (_, i) => start + i);
	}
	if (modbus.address !== undefined) {
		const start = modbus.address;
		const length = modbus.length ?? 1;
		return Array.from({ length }, (_, i) => start + i);
	}
	return [];
};

// 判斷區域是否需要 Modbus 串接（有 modbus 配置的都需要）
const needsModbusConnection = (area: LightingArea): boolean => {
	return !!area.modbus;
};

// 初始化區域狀態（不設置 isRunning，等待從後端讀取）
const initializeAreaStatuses = () => {
	// 使用所有樓層的 areas 來初始化狀態
	lightingFloors.value.forEach(floor => {
		floor.areas.forEach((area, areaIndex) => {
			const areaId = getAreaId(floor, area, areaIndex);
			if (!areaStatuses.value[areaId]) {
				areaStatuses.value[areaId] = {
					isRunning: false, // 暫時設為 false，但會在 loadAllAreaStatuses 中更新
					status: "normal"
				};
			}
		});
	});

	// 清理已不存在的區域狀態
	const areaIds = new Set<string>();
	lightingFloors.value.forEach(floor => {
		floor.areas.forEach((area, areaIndex) => {
			areaIds.add(getAreaId(floor, area, areaIndex));
		});
	});
	Object.keys(areaStatuses.value).forEach(areaId => {
		if (!areaIds.has(areaId)) {
			delete areaStatuses.value[areaId];
		}
	});
};

const deviceApi = useDeviceApi();
const { request } = useApiBase();

// 構建 Modbus API 查詢參數
const buildModbusQueryParams = (
	deviceConfig: ModbusDeviceConfig,
	address: number,
	length: number
): string => {
	const params = new URLSearchParams({
		host: deviceConfig.host,
		port: String(deviceConfig.port),
		unitId: String(deviceConfig.unitId),
		address: String(address),
		length: String(length)
	});
	return params.toString();
};

// 讀取 Coils（使用較短的超時時間，快速失敗）
const getCoils = async (address: number, length: number, deviceConfig: ModbusDeviceConfig) => {
	const queryParams = buildModbusQueryParams(deviceConfig, address, length);
	return request<ModbusDataResponse<boolean>>(`/modbus/coils?${queryParams}`, {
		timeout: MODBUS_TIMEOUT
	} as any);
};

// 讀取 Discrete Inputs（使用較短的超時時間，快速失敗）
const getDiscreteInputs = async (
	address: number,
	length: number,
	deviceConfig: ModbusDeviceConfig
) => {
	const queryParams = buildModbusQueryParams(deviceConfig, address, length);
	return request<ModbusDataResponse<boolean>>(`/modbus/discrete-inputs?${queryParams}`, {
		timeout: MODBUS_TIMEOUT
	} as any);
};

// 寫入 Coil
const writeCoil = async (address: number, value: boolean, deviceConfig: ModbusDeviceConfig) => {
	const queryParams = new URLSearchParams({
		host: deviceConfig.host,
		port: String(deviceConfig.port),
		unitId: String(deviceConfig.unitId)
	});
	return request<{ address: number; value: boolean; success: boolean; device: ModbusDeviceConfig }>(
		`/modbus/coils?${queryParams.toString()}`,
		{
			method: "PUT",
			body: JSON.stringify({ address, value })
		}
	);
};

// 設備快取（避免重複載入）
const deviceCache = ref<Map<number, Device>>(new Map());
// 設備配置快取（避免重複提取配置）
const deviceConfigCache = ref<Map<number, { host: string; port: number; unitId: number }>>(
	new Map()
);

// 從設備對象提取 Modbus 配置
const extractDeviceConfig = (
	device: Device
): { host: string; port: number; unitId: number } | null => {
	const config = device.config as ControllerDeviceConfig;
	if (
		config &&
		config.type === "controller" &&
		config.host &&
		config.port &&
		config.unitId !== undefined
	) {
		return {
			host: config.host,
			port: config.port,
			unitId: config.unitId
		};
	}
	return null;
};

// 載入設備資訊（如果尚未載入）
const loadDeviceInfo = async (deviceId: number): Promise<Device | null> => {
	if (deviceCache.value.has(deviceId)) {
		return deviceCache.value.get(deviceId)!;
	}

	try {
		const result = await deviceApi.getDevice(deviceId);
		const device = result.device;
		deviceCache.value.set(deviceId, device);

		// 同時快取設備配置
		const config = extractDeviceConfig(device);
		if (config) {
			deviceConfigCache.value.set(deviceId, config);
		}

		return device;
	} catch (error) {
		handleError(error, `載入設備 ${deviceId} 失敗`);
		return null;
	}
};

// 批量預載入所有需要的設備資訊（優化：在載入樓層數據後立即預載入，避免在讀取狀態時才逐一請求）
const preloadDeviceInfos = async () => {
	// 收集所有需要的設備 ID（去重）
	const deviceIds = new Set<number>();
	lightingFloors.value.forEach(floor => {
		floor.areas.forEach(area => {
			if (area.modbus?.deviceId) {
				deviceIds.add(area.modbus.deviceId);
			}
		});
	});

	// 過濾掉已經快取的設備
	const uncachedDeviceIds = Array.from(deviceIds).filter(id => !deviceCache.value.has(id));

	if (uncachedDeviceIds.length === 0) return;

	// 並行載入所有設備資訊
	await Promise.allSettled(uncachedDeviceIds.map(deviceId => loadDeviceInfo(deviceId)));
};

// 取得區域的設備配置（優化：使用快取，避免重複提取）
const getAreaDeviceConfig = async (
	area: LightingArea
): Promise<{ host: string; port: number; unitId: number } | null> => {
	if (!area.modbus) return null;

	// 如果使用新格式（有 deviceId）
	if (area.modbus.deviceId) {
		// 先檢查配置快取
		if (deviceConfigCache.value.has(area.modbus.deviceId)) {
			return deviceConfigCache.value.get(area.modbus.deviceId)!;
		}

		// 如果沒有快取，載入設備資訊（會自動快取配置）
		const device = await loadDeviceInfo(area.modbus.deviceId);
		if (!device) return null;

		// 從快取中獲取配置
		return deviceConfigCache.value.get(area.modbus.deviceId) || null;
	}

	// 向後兼容：使用舊格式
	if (area.modbus.host && area.modbus.port && area.modbus.unitId !== undefined) {
		return {
			host: area.modbus.host,
			port: area.modbus.port,
			unitId: area.modbus.unitId
		};
	}

	return null;
};

// Modbus 請求超時時間（3 秒，快速失敗）
const MODBUS_TIMEOUT = 3000;

// 請求去重：記錄最近發送的請求，避免重複請求（同時追蹤正在進行的請求）
const requestCache = new Map<string, { timestamp: number; promise?: Promise<any> }>();
const REQUEST_CACHE_TTL = 4500; // 4.5 秒內相同請求會被去重（略小於輪詢間隔）

// 生成請求緩存鍵（設備 + 地址）
const getRequestKey = (
	deviceConfig: { host: string; port: number; unitId: number },
	address: number,
	type: "coil" | "discrete" = "coil"
) => {
	return `${deviceConfig.host}:${deviceConfig.port}:${deviceConfig.unitId}:${type}:${address}`;
};

// 批量讀取請求的結構
interface BatchRequest {
	deviceConfig: { host: string; port: number; unitId: number };
	address: number;
	type: "coil" | "discrete";
	areaId: string;
}

// ========== 共用工具函數 ==========

/**
 * 根據 areaId 查找對應的 area 物件和索引（統一查找邏輯）
 */
const findAreaById = (
	areaId: string,
	requireDbId = false
): { area: LightingArea; floor: LightingFloor; areaIndex: number } | null => {
	for (const floor of lightingFloors.value) {
		for (let i = 0; i < floor.areas.length; i++) {
			const area = floor.areas[i];
			const computedAreaId = getAreaId(floor, area, i);
			if (computedAreaId === areaId) {
				// 如果需要資料庫 ID，則檢查 area.id 是否存在
				if (requireDbId && !area.id) continue;
				return { area, floor, areaIndex: i };
			}
		}
	}
	return null;
};

/**
 * 報告照明區域錯誤（靜默處理，不影響主要流程）
 */
const reportAreaError = async (areaId: string, errorMessage: string) => {
	const found = findAreaById(areaId, true);
	if (!found?.area.systemId) return;

	try {
		await lightingApi.reportError(found.area.systemId, errorMessage);
	} catch (error) {
		// 靜默處理，不影響主要流程
		if (process.dev) {
			console.warn("[lighting] 報告錯誤失敗:", error);
		}
	}
};

/**
 * 清除照明區域錯誤狀態（靜默處理，不影響主要流程）
 */
const clearAreaError = async (areaId: string) => {
	const found = findAreaById(areaId, true);
	if (!found?.area.systemId) return;

	try {
		await lightingApi.clearError(found.area.systemId);
	} catch (error) {
		// 靜默處理，不影響主要流程
		if (process.dev) {
			console.warn("[lighting] 清除錯誤失敗:", error);
		}
	}
};

// 更新區域狀態的共用函數
const updateAreaStatuses = async (areaIds: string[], value: boolean) => {
	for (const areaId of areaIds) {
		const status = ensureAreaStatus(areaId);
		const wasError = status.status === "error";
		status.isRunning = value;
		status.status = "normal";

		// 如果區域從錯誤狀態恢復正常，清除錯誤狀態
		if (wasError && status.status === "normal") {
			await clearAreaError(areaId);
		}
	}
};

// 記錄失敗的設備（快速失敗機制，避免重複請求離線設備）
// 使用 Map 同時存儲時間戳，避免使用 Set + Map 兩個數據結構
const failedDevices = new Map<string, number>();
const FAILED_DEVICE_TTL = 30000; // 30 秒後重試失敗的設備

// 批量讀取請求處理（優化：智能合併相同設備和地址的請求，並發處理）
const processBatchRequests = async (requests: BatchRequest[]) => {
	if (requests.length === 0) return;

	const now = Date.now();

	// 清理過期的失敗設備記錄
	for (const [deviceKey, timestamp] of failedDevices.entries()) {
		if (now - timestamp > FAILED_DEVICE_TTL) {
			failedDevices.delete(deviceKey);
		}
	}

	// 按請求鍵分組（相同設備、類型、地址的請求合併）
	const grouped = new Map<string, BatchRequest[]>();
	for (const req of requests) {
		const key = getRequestKey(req.deviceConfig, req.address, req.type);
		if (!grouped.has(key)) {
			grouped.set(key, []);
		}
		grouped.get(key)!.push(req);
	}

	// 處理每組請求（並發處理，避免順序阻塞）
	await Promise.allSettled(
		Array.from(grouped.entries()).map(async ([requestKey, groupRequests]) => {
			const firstReq = groupRequests[0];
			const areaIds = groupRequests.map(req => req.areaId);

			// 檢查設備是否在失敗列表中（快速失敗）
			if (failedDevices.has(requestKey)) {
				areaIds.forEach(areaId => {
					ensureAreaStatus(areaId).status = "error";
				});
				return;
			}

			// 檢查緩存或正在進行的請求
			const cached = requestCache.get(requestKey);
			if (cached?.promise && now - cached.timestamp < REQUEST_CACHE_TTL) {
				try {
					const response = await cached.promise;
					if (response?.data?.[0] !== undefined) {
						await updateAreaStatuses(areaIds, response.data[0]);
					}
					return;
				} catch (error) {
					// 緩存請求失敗，繼續執行新請求
				}
			}

			// 發送新請求
			try {
				const requestPromise =
					firstReq.type === "coil"
						? getCoils(firstReq.address, 1, firstReq.deviceConfig)
						: getDiscreteInputs(firstReq.address, 1, firstReq.deviceConfig);

				// 更新緩存（同時追蹤正在進行的請求）
				requestCache.set(requestKey, { timestamp: now, promise: requestPromise });

				const response = await requestPromise;

				// 處理響應
				if (response?.data?.[0] !== undefined) {
					await updateAreaStatuses(areaIds, response.data[0]);
				}

				// 請求成功，從失敗列表中移除（設備已恢復）
				failedDevices.delete(requestKey);
			} catch (error) {
				// 請求失敗，標記為錯誤並清除緩存
				requestCache.delete(requestKey);
				const errorMessage = error instanceof Error ? error.message : String(error);

				// 如果是 503 錯誤（設備離線），添加到失敗列表（快速失敗）
				if (
					errorMessage.includes("503") ||
					errorMessage.includes("Service Unavailable") ||
					errorMessage.includes("設備離線")
				) {
					failedDevices.set(requestKey, now);
				}

				// 標記所有相關區域為錯誤狀態
				areaIds.forEach(areaId => {
					ensureAreaStatus(areaId).status = "error";
				});
				// 並行報告錯誤（不阻塞）
				await Promise.allSettled(
					areaIds.map(areaId => reportAreaError(areaId, errorMessage || "無法讀取照明設備資料"))
				);
			}
		})
	);

	// 清理過期緩存
	for (const [key, value] of requestCache.entries()) {
		if (now - value.timestamp > REQUEST_CACHE_TTL * 2) {
			requestCache.delete(key);
		}
	}
};

// 提取區域的讀取點位配置（共用邏輯）
const extractReadPoint = (
	modbus: CategoryModbusConfig
): { address: number; type: "coil" | "discrete" } | null => {
	// 使用新的 points 配置
	if (modbus.points && modbus.points.length > 0) {
		// 優先讀取 DI 點位來顯示按鈕狀態（DI 反映實際設備狀態）
		const diPoints = filterDiPoints(modbus.points);
		if (diPoints.length > 0) {
			return { address: diPoints[0].address, type: "discrete" };
		}
		// 如果沒有 DI 點位，才使用 DO 點位
		const doPoints = filterDoPoints(modbus.points);
		if (doPoints.length > 0) {
			return { address: doPoints[0].address, type: "coil" };
		}
	} else {
		// 向後兼容：使用舊格式
		const diAddresses = extractDiAddresses(modbus);
		if (diAddresses.length > 0) {
			return { address: Math.min(...diAddresses), type: "discrete" };
		}
		const doAddresses = extractDoAddresses(modbus);
		if (doAddresses.length > 0) {
			return { address: Math.min(...doAddresses), type: "coil" };
		}
	}
	return null;
};

// 提取區域的寫入點位配置（共用邏輯）
const extractWritePoints = (modbus: CategoryModbusConfig): number[] => {
	if (modbus.points && modbus.points.length > 0) {
		const doPoints = filterDoPoints(modbus.points);
		return doPoints.map(p => p.address);
	} else {
		// 向後兼容：使用舊格式
		return extractDoAddresses(modbus);
	}
};

// 收集區域的讀取請求（用於批量處理）
const collectAreaReadRequests = async (
	floor: LightingFloor,
	area: LightingArea,
	areaIndex: number
): Promise<BatchRequest[]> => {
	if (!needsModbusConnection(area) || !area.modbus) return [];

	const deviceConfig = await getAreaDeviceConfig(area);
	if (!deviceConfig) return [];

	const areaId = getAreaId(floor, area, areaIndex);
	const readPoint = extractReadPoint(area.modbus);

	if (!readPoint) return [];

	return [
		{
			deviceConfig: deviceConfig as { host: string; port: number; unitId: number },
			address: readPoint.address,
			type: readPoint.type,
			areaId: areaId
		}
	];
};

// 載入所有區域的狀態（優化：批量讀取，減少請求數）
const loadAllAreaStatuses = async (options?: { silent?: boolean; loadAllFloors?: boolean }) => {
	// 如果 loadAllFloors 為 true，載入所有樓層的區域狀態（用於 StatusCenter 顯示）
	// 否則只載入當前選中樓層的區域狀態
	const currentFloorName = selectedFloorName.value;

	// 收集需要 Modbus 連接的區域
	const areasNeedingModbus: Array<{ floor: LightingFloor; area: LightingArea; areaIndex: number }> =
		[];
	lightingFloors.value.forEach(floor => {
		floor.areas.forEach((area, areaIndex) => {
			if (needsModbusConnection(area)) {
				if (
					options?.loadAllFloors ||
					(currentFloorName && (floor.id || floor.name) === currentFloorName)
				) {
					areasNeedingModbus.push({ floor, area, areaIndex });
				}
			}
		});
	});

	if (areasNeedingModbus.length === 0) return;

	// 優化：批量預載入所有需要的設備配置（避免在 collectAreaReadRequests 中逐一請求）
	const deviceIds = new Set<number>();
	areasNeedingModbus.forEach(({ area }) => {
		if (area.modbus?.deviceId) {
			deviceIds.add(area.modbus.deviceId);
		}
	});
	if (deviceIds.size > 0) {
		const uncachedDeviceIds = Array.from(deviceIds).filter(id => !deviceCache.value.has(id));
		if (uncachedDeviceIds.length > 0) {
			await Promise.allSettled(uncachedDeviceIds.map(deviceId => loadDeviceInfo(deviceId)));
		}
	}

	// 收集所有讀取請求（現在設備配置已經預載入，不會再有異步等待）
	const allRequests: BatchRequest[] = [];
	const results = await Promise.allSettled(
		areasNeedingModbus.map(({ floor, area, areaIndex }) =>
			collectAreaReadRequests(floor, area, areaIndex)
		)
	);

	// 合併所有請求
	for (const result of results) {
		if (result.status === "fulfilled") {
			allRequests.push(...result.value);
		}
	}

	if (allRequests.length === 0) return;

	// 批量處理請求（自動合併相同設備和類型的請求）
	await processBatchRequests(allRequests);
};

// 處理區域開關切換（添加防抖和 loading 狀態）
const handleAreaToggle = async (areaId: string, targetValue: boolean) => {
	// 如果正在處理此區域的切換，忽略重複請求
	if (areaToggling.value.has(areaId)) {
		return;
	}

	// 清除之前的防抖計時器
	const existingTimer = toggleDebounceTimers.get(areaId);
	if (existingTimer) {
		clearTimeout(existingTimer);
	}

	// 設置防抖計時器
	const timer = setTimeout(async () => {
		await executeToggle(areaId, targetValue);
		toggleDebounceTimers.delete(areaId);
	}, TOGGLE_DEBOUNCE_DELAY);

	toggleDebounceTimers.set(areaId, timer);
};

// 執行實際的切換操作
const executeToggle = async (areaId: string, targetValue: boolean) => {
	const found = findAreaById(areaId);
	if (!found) return;

	const { area: targetArea, floor: targetFloor, areaIndex: targetAreaIndex } = found;

	// 如果正在處理，忽略
	if (areaToggling.value.has(areaId)) {
		return;
	}

	// 標記為正在處理
	areaToggling.value.add(areaId);

	// 取得當前狀態
	const currentStatus = areaStatuses.value[areaId];
	const currentValue = currentStatus?.isRunning ?? false;

	try {
		// 更新本地狀態（樂觀更新）
		if (areaStatuses.value[areaId]) {
			areaStatuses.value[areaId].isRunning = targetValue;
		}

		// 如果沒有 Modbus 配置，只更新本地狀態
		if (!needsModbusConnection(targetArea) || !targetArea.modbus) {
			areaToggling.value.delete(areaId);
			return;
		}

		const deviceConfig = await getAreaDeviceConfig(targetArea);
		if (!deviceConfig) {
			rollbackAreaStatus(areaId, currentValue);
			areaToggling.value.delete(areaId);
			return;
		}

		// 提取寫入點位（統一處理新舊格式）
		const writeAddresses = extractWritePoints(targetArea.modbus);
		if (writeAddresses.length === 0) {
			rollbackAreaStatus(areaId, currentValue);
			areaToggling.value.delete(areaId);
			return;
		}

		// 執行所有 DO 點位的寫入操作（統一使用 writeCoil）
		await Promise.all(writeAddresses.map(address => writeCoil(address, targetValue, deviceConfig)));

		// 寫入成功後，稍等一下再重新讀取狀態（避免與設備響應時間衝突）
		setTimeout(async () => {
			const readRequests = await collectAreaReadRequests(targetFloor, targetArea, targetAreaIndex);
			if (readRequests.length > 0) {
				await processBatchRequests(readRequests);
			}
			areaToggling.value.delete(areaId);
		}, 200); // 200ms 後讀取狀態
	} catch (error) {
		// 回滾狀態並標記為錯誤
		rollbackAreaStatus(areaId, currentValue);
		ensureAreaStatus(areaId, "error").status = "error";
		areaToggling.value.delete(areaId);

		handleError(error, `控制 ${targetArea.name} 失敗`);
	}
};

// 使用 usePolling 統一管理輪詢（支持頁面可見性檢查）
const { start: startPolling, stop: stopPolling } = usePolling({
	callback: async () => {
		// 只有在頁面可見時才載入（優化：使用 Page Visibility API）
		if (document.visibilityState === "visible") {
			await loadAllAreaStatuses({ silent: true });
		}
	},
	interval: 5000, // 每 5 秒執行一次
	immediate: true, // 立即執行一次
	enabled: () => document.visibilityState === "visible", // 只在頁面可見時執行
	onError: err => {
		handleError(err, "載入區域狀態失敗");
	}
});

// 啟動自動刷新
const startAutoRefresh = () => {
	startPolling();
};

// 停止自動刷新
const stopAutoRefresh = () => {
	stopPolling();
	// 清理請求緩存
	requestCache.clear();
};

// 監聽頁面可見性變化（優化：頁面不可見時暫停輪詢）
const handleVisibilityChange = () => {
	if (document.visibilityState === "visible") {
		// 頁面可見時，立即載入一次狀態
		void loadAllAreaStatuses({ silent: true });
	}
};

// 刪除區域（通過更新樓層來刪除區域）
const handleDeleteCategory = async (areaId: string) => {
	if (!isEditMode.value) return;
	if (!confirm("確定要刪除這個點位嗎？")) return;

	try {
		const found = findAreaById(areaId);
		if (!found) {
			throw new Error("找不到要刪除的點位");
		}

		const { floor: targetFloor, areaIndex: targetAreaIndex } = found;

		// 從樓層的 areas 中移除該區域
		const updatedAreas = targetFloor.areas.filter((_, index) => index !== targetAreaIndex);

		// 更新樓層（包含更新後的 areas）
		const result = await lightingApi.updateFloor(targetFloor.id!, {
			name: targetFloor.name,
			imageUrl: targetFloor.imageUrl,
			areas: updatedAreas
		});

		// 更新本地資料
		const index = lightingFloors.value.findIndex(f => f.id === targetFloor.id);
		if (index > -1) {
			lightingFloors.value[index] = result.floor;
		}

		// 清理狀態
		if (selectedCategory.value === areaId) {
			selectedCategory.value = "";
		}
		delete areaStatuses.value[areaId];

		toast.success("點位已刪除");
	} catch (error) {
		handleError(error, "刪除點位失敗");
	}
};

// 拖曳處理：在圖片上拖曳區域
const handleDotDragStart = (event: DragEvent, area: LightingArea, areaIndex: number) => {
	if (!isEditMode.value || !selectedFloorData.value) return;
	const areaId = getAreaId(selectedFloorData.value, area, areaIndex);
	startDrag(event, areaId);
};

// 處理從 CategoryList 開始的拖曳
const handleCategoryListDragStart = (event: DragEvent, category: any) => {
	if (!isEditMode.value || !selectedFloorData.value) return;
	startDrag(event, category.id, true);
};

// 統一的拖曳開始處理
const startDrag = (event: DragEvent, areaId: string, fromCategoryList = false) => {
	draggingCategoryId.value = areaId;
	event.dataTransfer!.effectAllowed = "move";
	event.dataTransfer!.setData("areaId", areaId);
	if (fromCategoryList) {
		event.dataTransfer!.setData("fromCategoryList", "true");
	}
};

// 統一的拖曳結束處理
const handleDragEnd = () => {
	draggingCategoryId.value = "";
};

// 處理拖放（通過更新樓層來調整區域位置）
const handleDrop = async (event: DragEvent) => {
	if (!isEditMode.value || !floorPlanRef.value) return;

	event.preventDefault();
	const areaId = event.dataTransfer?.getData("areaId");
	if (!areaId) return;

	const found = findAreaById(areaId);
	if (!found) return;

	const { floor: targetFloor, areaIndex: targetAreaIndex } = found;

	const rect = floorPlanRef.value.getBoundingClientRect();
	const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
	const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));

	// 更新區域位置（如果是從 CategoryList 拖曳過來的未定位點位，現在設定位置）
	const updatedAreas = targetFloor.areas.map((area, index) => {
		if (index === targetAreaIndex) {
			return { ...area, location: { x, y } };
		}
		return area;
	});

	try {
		// 更新樓層（包含更新後的 areas）
		const result = await lightingApi.updateFloor(targetFloor.id!, {
			name: targetFloor.name,
			imageUrl: targetFloor.imageUrl,
			areas: updatedAreas
		});

		// 更新本地資料
		const index = lightingFloors.value.findIndex(f => f.id === targetFloor.id);
		if (index > -1) {
			lightingFloors.value[index] = result.floor;
		}
	} catch (error) {
		handleError(error, "更新位置失敗");
	}

	draggingCategoryId.value = "";
};

// 批次更新位置（通過更新樓層來實現）
const saveBatchPositions = async (
	updates: Array<{ id: string; location: { x: number; y: number } }>
) => {
	try {
		// 按樓層分組更新
		const updatesByFloor = new Map<string, typeof updates>();
		for (const update of updates) {
			// 找到區域所屬的樓層
			for (const floor of lightingFloors.value) {
				const areaIndex = floor.areas.findIndex(
					(area, idx) => getAreaId(floor, area, idx) === update.id
				);
				if (areaIndex !== -1) {
					const floorId = floor.id || floor.name;
					if (!updatesByFloor.has(floorId)) {
						updatesByFloor.set(floorId, []);
					}
					updatesByFloor.get(floorId)!.push(update);
					break;
				}
			}
		}

		// 更新每個樓層
		for (const [floorId, floorUpdates] of updatesByFloor.entries()) {
			const floor = lightingFloors.value.find(f => (f.id || f.name) === floorId);
			if (!floor) continue;

			// 更新區域位置
			const updatedAreas = floor.areas.map((area, index) => {
				const areaId = getAreaId(floor, area, index);
				const update = floorUpdates.find(u => u.id === areaId);
				if (update) {
					return { ...area, location: update.location };
				}
				return area;
			});

			// 更新樓層
			const result = await lightingApi.updateFloor(floor.id!, {
				name: floor.name,
				imageUrl: floor.imageUrl,
				areas: updatedAreas
			});

			// 更新本地資料
			const index = lightingFloors.value.findIndex(f => f.id === floor.id);
			if (index > -1) {
				lightingFloors.value[index] = result.floor;
			}
		}
	} catch (error) {
		handleError(error, "批次更新位置失敗");
		throw error; // 重新拋出以便調用者處理
	}
};

// 監聽樓層資料變化，重新初始化狀態
watch(
	() => lightingFloors.value,
	async () => {
		// 當樓層資料變化時，重新初始化區域狀態
		initializeAreaStatuses();
		// 優化：批量預載入所有需要的設備資訊
		await preloadDeviceInfos();
		// 重新載入所有樓層的狀態（用於 StatusCenter）
		// 注意：loadAllAreaStatuses 內部已經會批量預載入設備配置，這裡不需要重複
		void loadAllAreaStatuses({ loadAllFloors: true });
	},
	{ deep: true }
);

// 初始化：自動選中第一個區域
watch(
	() => currentFloorAreas.value,
	newAreas => {
		if (!selectedFloorData.value) return;

		// 檢查當前選中的區域是否還存在於新清單中
		const currentAreaExists = newAreas.some(
			area => getAreaIdForDisplay(area) === selectedCategory.value
		);

		if (!currentAreaExists) {
			// 如果不存在，選中第一個或清空
			if (newAreas.length > 0) {
				selectedCategory.value = getAreaIdForDisplay(newAreas[0]);
			} else {
				selectedCategory.value = "";
			}
		}
	},
	{ immediate: true }
);

// ========== 樓層管理功能 ==========

// 處理打開樓層管理對話框
const handleOpenFloorDialog = async () => {
	// 如果還沒有載入樓層數據，先載入
	if (lightingFloors.value.length === 0) {
		await loadFloorsFromAPI();
	}
	// 打開對話框
	showFloorManagementDialog.value = true;
};

// 處理編輯模式切換
const handleToggleEditMode = () => {
	// 如果切換到編輯模式，確保數據已載入
	if (!isEditMode.value && lightingFloors.value.length === 0) {
		loadFloorsFromAPI();
	}
	// 切換編輯模式
	isEditMode.value = !isEditMode.value;
};

// 從 API 載入樓層列表
const loadFloorsFromAPI = async () => {
	if (isLoadingFloors.value) return;
	isLoadingFloors.value = true;
	try {
		const result = await lightingApi.getFloors();
		lightingFloors.value = result.floors || [];

		// 如果沒有選中的樓層且有樓層資料，優先選擇 1F
		if (!selectedFloor.value && lightingFloors.value.length > 0) {
			// 優先查找 1F
			const floor1F = lightingFloors.value.find(
				floor => floor.name === "1F" || floor.name.toLowerCase().includes("1f")
			);
			if (floor1F) {
				selectedFloor.value = floor1F.id || floor1F.name;
			} else {
				// 如果沒有 1F，選中第一個
				selectedFloor.value = lightingFloors.value[0].id || lightingFloors.value[0].name;
			}
		}

		// 優化：批量預載入所有需要的設備資訊，避免在讀取狀態時才逐一請求
		await preloadDeviceInfos();
	} catch (error) {
		handleError(error, "載入樓層列表失敗");
	} finally {
		isLoadingFloors.value = false;
	}
};

// 使用樓層管理 composable
const { handleSaveFloor: baseHandleSaveFloor, handleDeleteFloor: baseHandleDeleteFloor } =
	useFloorManagement<LightingFloor>();

// 處理儲存樓層
const handleSaveFloor = async (floor: LightingFloor) => {
	await baseHandleSaveFloor(
		floor,
		lightingFloors,
		async (f: LightingFloor) => {
			return f.id
				? await lightingApi.updateFloor(f.id, {
						name: f.name,
						imageUrl: f.imageUrl,
						areas: f.areas
					})
				: await lightingApi.createFloor({
						name: f.name,
						imageUrl: f.imageUrl,
						areas: f.areas
					});
		},
		{
			selectedFloorRef: selectedFloor,
			onAfterSave: () => {
				initializeAreaStatuses();
			}
		}
	);
};

// 處理刪除樓層
const handleDeleteFloor = async (floorId: string) => {
	await baseHandleDeleteFloor(floorId, lightingFloors, lightingApi.deleteFloor, {
		selectedFloorRef: selectedFloor
	});
};

// 初始化：載入樓層數據
onMounted(async () => {
	// 初始化左側 ResizeObserver
	initLeftSectionObserver();
	try {
		// 載入樓層列表（會自動選擇 1F 或第一個樓層）
		await loadFloorsFromAPI();

		// 初始化區域狀態（從樓層的 areas）
		initializeAreaStatuses();

		// 同步右側高度
		nextTick(() => {
			updateLeftSectionHeight();
		});

		// 立即從後端載入所有樓層的區域實際狀態（不預設為 OFF）
		// 注意：loadAllAreaStatuses 內部已經會批量預載入設備配置，避免重複請求
		// 這樣 StatusCenter 也能正確顯示所有樓層的狀態
		await loadAllAreaStatuses({ loadAllFloors: true });
	} finally {
		// 初始載入完成，顯示按鈕（使用淡入動畫）
		isInitialLoading.value = false;
	}

	// 啟動自動刷新
	startAutoRefresh();

	// 監聽頁面可見性變化
	document.addEventListener("visibilitychange", handleVisibilityChange);
});

// 清理：停止自動刷新
onBeforeUnmount(() => {
	stopAutoRefresh();
	document.removeEventListener("visibilitychange", handleVisibilityChange);
	if (leftSectionResizeObserver && leftSectionRef.value) {
		leftSectionResizeObserver.unobserve(leftSectionRef.value);
		leftSectionResizeObserver.disconnect();
		leftSectionResizeObserver = null;
	}
});
</script>

<style scoped>
/* 按鈕進場動畫 */
.fade-in-enter-active {
	transition:
		opacity 0.4s ease-in,
		transform 0.4s ease-out;
}

.fade-in-enter-from {
	opacity: 0;
	transform: translateY(-10px);
}

.fade-in-enter-to {
	opacity: 1;
	transform: translateY(0);
}

.image-blur-load {
	transition:
		filter 0.6s ease-in-out,
		opacity 0.6s ease-in-out,
		transform 0.6s ease-in-out;
	filter: blur(20px);
	opacity: 0.6;
}

.image-blur-load.image-loaded {
	filter: blur(0);
	opacity: 1;
}

.category-dot-wrapper {
	position: absolute;
	z-index: 10;
}

.category-dot {
	position: absolute;
	width: 48px;
	height: 48px;
	border-radius: 9999px;
	transform: translate(-50%, -50%);
	border: 2px solid transparent;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	backdrop-filter: blur(3px);
	transition:
		box-shadow 0.2s ease,
		border-color 0.2s ease,
		background 0.2s ease;
}

.category-dot::before {
	content: "";
	position: absolute;
	inset: 6px;
	border-radius: inherit;
	transition: background 0.2s ease;
}

.category-dot::after {
	position: relative;
	content: "";
	font-size: 16px;
	font-weight: 600;
	color: #ffffff;
	transition: transform 0.2s ease;
}

.category-dot[data-status="normal"] {
	background: rgba(28, 200, 138, 0.28);
	border-color: rgba(28, 200, 138, 0.6);
}

.category-dot[data-status="normal"]::before {
	background: #1cc88a;
}

.category-dot[data-status="normal"]::after {
	content: "✓";
}

.category-dot[data-status="abnormal"] {
	background: rgba(245, 101, 101, 0.32);
	border-color: rgba(245, 101, 101, 0.72);
	animation: dot-alert 1.6s ease-in-out infinite;
}

.category-dot[data-status="abnormal"]::before {
	background: #f56565;
}

.category-dot[data-status="abnormal"]::after {
	content: "!";
}

.category-dot:focus-visible {
	outline: 2px solid #ffffff;
	outline-offset: 2px;
}

.category-dot.is-editing {
	cursor: move;
}

.category-dot-wrapper.is-dragging {
	opacity: 0.5;
	z-index: 100;
}

.category-dot-wrapper[draggable="true"] {
	cursor: move;
}

@keyframes dot-alert {
	0%,
	100% {
		box-shadow: 0 0 18px rgba(245, 101, 101, 0.6);
	}
	50% {
		box-shadow: 0 0 28px rgba(245, 101, 101, 0.95);
	}
}

/* 下拉選單動畫 */
.dropdown-enter-active,
.dropdown-leave-active {
	transition: all 0.2s ease;
}

.dropdown-enter-from {
	opacity: 0;
	transform: translateY(-8px);
}

.dropdown-enter-to {
	opacity: 1;
	transform: translateY(0);
}

.dropdown-leave-from {
	opacity: 1;
	transform: translateY(0);
}

.dropdown-leave-to {
	opacity: 0;
	transform: translateY(-8px);
}
</style>
