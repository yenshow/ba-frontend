<template>
	<div>
		<!-- 照明系統頁面內容 - 自定義排版 -->
		<div class="flex justify-center gap-4 xl:gap-6 2xl:gap-8">
			<!-- 主要內容 -->
			<section class="relative flex-[1.3]">
				<div
					class="flex overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-4 xl:p-6 2xl:p-8"
				>
					<!-- 樓層選擇 -->
					<div class="z-10 flex flex-col justify-between py-4 text-center text-white">
						<div class="space-y-4">
							<!-- 樓層顯示 -->
							<div class="w-[60px] py-4 2xl:w-[100px]">
								<span
									class="inline-flex border-b-2 border-white/70 pb-1 text-2xl tracking-widest xl:text-3xl 2xl:text-5xl"
								>
									{{ selectedFloorName }}
								</span>
							</div>
							<!-- 樓層管理按鈕 -->
							<button
								type="button"
								@click="showFloorManagementDialog = true"
								:class="[
									'whitespace-nowrap rounded-2xl p-3 text-xs font-light text-white transition-all 2xl:text-lg',
									'border-2 border-white/30 bg-transparent hover:bg-white/10'
								]"
								title="樓層管理"
							>
								樓層管理
							</button>
							<!-- 編輯模式切換按鈕與下拉選單 -->
							<div class="relative">
								<button
									type="button"
									@click="isEditMode = !isEditMode"
									:class="[
										'whitespace-nowrap rounded-2xl p-3 text-xs font-light text-white transition-all 2xl:text-lg',
										isEditMode
											? 'border-2 border-white bg-white/10'
											: 'border-2 border-white/30 bg-transparent'
									]"
								>
									{{ isEditMode ? "完成編輯" : "編輯定位" }}
								</button>
								<!-- 區域列表下拉選單 -->
								<Transition name="dropdown">
									<CategoryList
										v-if="isEditMode"
										:categories="
											currentFloorAreas.map((area, index) => ({
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
										@delete="handleDeleteCategory"
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
							:src="floorPlanImage"
							alt="樓層平面圖"
							class="image-blur-load pointer-events-none h-full w-full object-contain"
							:class="{ 'image-loaded': isFloorPlanLoaded }"
							width="auto"
							height="full"
							@load="isFloorPlanLoaded = true"
						/>
						<!-- 區域點位 -->
						<template
							v-for="(area, index) in currentFloorAreas"
							:key="getAreaId(selectedFloorData || ({} as LightingFloor), area, index)"
						>
							<div
								class="category-dot-wrapper"
								:class="{
									'is-dragging':
										draggingCategoryId ===
										getAreaId(selectedFloorData || ({} as LightingFloor), area, index)
								}"
								:style="{
									left: `${area.location.x}%`,
									top: `${area.location.y}%`
								}"
								:draggable="isEditMode"
								@dragstart="handleDotDragStart($event, area, index)"
								@dragend="handleDotDragEnd"
							>
								<div
									class="category-dot"
									:class="[
										{
											'is-active':
												selectedCategory ===
												getAreaId(selectedFloorData || ({} as LightingFloor), area, index)
										},
										{ 'is-editing': isEditMode }
									]"
									role="button"
									tabindex="0"
									:data-status="
										isAreaNormal(getAreaId(selectedFloorData || ({} as LightingFloor), area, index))
											? 'normal'
											: 'abnormal'
									"
									:title="`${area.name}：${isAreaNormal(getAreaId(selectedFloorData || ({} as LightingFloor), area, index)) ? '正常' : '異常'}`"
									:aria-label="`${area.name}：${isAreaNormal(getAreaId(selectedFloorData || ({} as LightingFloor), area, index)) ? '正常' : '異常'}`"
									@click.stop="!isEditMode && selectAreaByIndex(index)"
								></div>
								<!-- Tooltip：顯示區域名稱和狀態 -->
								<CategoryTooltip
									:show="true"
									:category-name="area.name"
									:is-normal="
										isAreaNormal(getAreaId(selectedFloorData || ({} as LightingFloor), area, index))
									"
								/>
							</div>
						</template>
					</div>
				</div>
			</section>

			<!-- 右側狀態中心 -->
			<aside class="flex-[0.7]">
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
import { onMounted, onBeforeUnmount, watch } from "vue";
import StatusCenter from "~/components/lighting/StatusCenter.vue";
import CategoryTooltip from "~/components/lighting/CategoryTooltip.vue";
import CategoryList from "~/components/lighting/CategoryList.vue";
import FloorManagementDialog from "~/components/lighting/FloorManagementDialog.vue";
import type { CategoryModbusConfig, LightingFloor, LightingArea } from "~/types/lighting";
import { useModbusApi } from "~/composables/useModbus";
import { useDeviceApi } from "~/composables/useDeviceApi";
import type { Device, ControllerDeviceConfig } from "~/types/device";

definePageMeta({
	layout: "default"
	// 認證由全局中間件處理
});

const lightingApi = useLightingApi();

// 生成區域 ID（統一的 ID 生成邏輯）
const getAreaId = (floor: LightingFloor, area: LightingArea, areaIndex: number): string => {
	return area.id || `area-${floor.id || floor.name}-${areaIndex}`;
};

// 樓層數據（從 API 載入）
const lightingFloors = ref<LightingFloor[]>([]);
const isLoadingFloors = ref(false);

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

// 當前選中樓層的區域列表
const currentFloorAreas = computed(() => {
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

// 通過索引選中區域（點擊黃點時使用）
const selectAreaByIndex = (index: number) => {
	const floor = selectedFloorData.value;
	if (floor && floor.areas[index]) {
		selectedCategory.value = getAreaId(floor, floor.areas[index], index);
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
		if (p.method === "writeCoil" || p.method === "writeCoils" || p.method === "getCoils")
			return true;
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

const modbusApi = useModbusApi();
const deviceApi = useDeviceApi();

// 設備快取（避免重複載入）
const deviceCache = ref<Map<number, Device>>(new Map());

// 載入設備資訊（如果尚未載入）
const loadDeviceInfo = async (deviceId: number): Promise<Device | null> => {
	if (deviceCache.value.has(deviceId)) {
		return deviceCache.value.get(deviceId)!;
	}

	try {
		const result = await deviceApi.getDevice(deviceId);
		const device = result.device;
		deviceCache.value.set(deviceId, device);
		return device;
	} catch (error) {
		console.error(`載入設備 ${deviceId} 失敗:`, error);
		return null;
	}
};

// 取得區域的設備配置
const getAreaDeviceConfig = async (
	area: LightingArea
): Promise<{ host: string; port: number; unitId: number } | null> => {
	if (!area.modbus) return null;

	// 如果使用新格式（有 deviceId）
	if (area.modbus.deviceId) {
		const device = await loadDeviceInfo(area.modbus.deviceId);
		if (!device) return null;

		// 從 config 中提取 Modbus 配置
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

		// 如果 config 格式不正確，返回 null
		return null;
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

// 自動刷新間隔（毫秒）- 優化：從 2 秒改為 5 秒，減少請求頻率
const AUTO_REFRESH_INTERVAL = 5000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

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

// 更新區域狀態的共用函數
const updateAreaStatuses = (areaIds: string[], value: boolean) => {
	for (const areaId of areaIds) {
		const status = ensureAreaStatus(areaId);
		status.isRunning = value;
		status.status = "normal";
	}
};

// 批量讀取請求處理（優化：智能合併相同設備和地址的請求）
const processBatchRequests = async (requests: BatchRequest[]) => {
	if (requests.length === 0) return;

	const now = Date.now();

	// 按請求鍵分組（相同設備、類型、地址的請求合併）
	const grouped = new Map<string, BatchRequest[]>();
	for (const req of requests) {
		const key = getRequestKey(req.deviceConfig, req.address, req.type);
		if (!grouped.has(key)) {
			grouped.set(key, []);
		}
		grouped.get(key)!.push(req);
	}

	// 處理每組請求
	for (const [requestKey, groupRequests] of grouped.entries()) {
		const firstReq = groupRequests[0];
		const areaIds = groupRequests.map(req => req.areaId);

		// 檢查緩存或正在進行的請求
		const cached = requestCache.get(requestKey);
		if (cached?.promise && now - cached.timestamp < REQUEST_CACHE_TTL) {
			try {
				const response = await cached.promise;
				if (response?.data?.[0] !== undefined) {
					updateAreaStatuses(areaIds, response.data[0]);
				}
				continue;
			} catch (error) {
				// 緩存請求失敗，繼續執行新請求
			}
		}

		// 發送新請求
		try {
			const requestPromise =
				firstReq.type === "coil"
					? modbusApi.getCoils(firstReq.address, 1, firstReq.deviceConfig)
					: modbusApi.getDiscreteInputs(firstReq.address, 1, firstReq.deviceConfig);

			// 更新緩存（同時追蹤正在進行的請求）
			requestCache.set(requestKey, { timestamp: now, promise: requestPromise });

			const response = await requestPromise;

			// 處理響應
			if (response?.data?.[0] !== undefined) {
				updateAreaStatuses(areaIds, response.data[0]);
			}
		} catch (error) {
			// 請求失敗，標記為錯誤並清除緩存
			requestCache.delete(requestKey);
			for (const areaId of areaIds) {
				ensureAreaStatus(areaId).status = "error";
			}
		}
	}

	// 清理過期緩存
	for (const [key, value] of requestCache.entries()) {
		if (now - value.timestamp > REQUEST_CACHE_TTL * 2) {
			requestCache.delete(key);
		}
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
	const requests: BatchRequest[] = [];

	// 使用新的 points 配置
	if (area.modbus.points && area.modbus.points.length > 0) {
		// 優先讀取 DI 點位來顯示按鈕狀態（DI 反映實際設備狀態）
		const diPoints = filterDiPoints(area.modbus.points);

		if (diPoints.length > 0) {
			// 讀取第一個 DI 點位的狀態（用於顯示按鈕狀態）
			const firstPoint = diPoints[0];
			requests.push({
				deviceConfig: deviceConfig as { host: string; port: number; unitId: number },
				address: firstPoint.address,
				type: "discrete",
				areaId: areaId
			});
		} else {
			// 如果沒有 DI 點位，才使用 DO 點位（向後兼容）
			const doPoints = filterDoPoints(area.modbus.points);
			if (doPoints.length > 0) {
				const firstPoint = doPoints[0];
				requests.push({
					deviceConfig: deviceConfig as { host: string; port: number; unitId: number },
					address: firstPoint.address,
					type: "coil",
					areaId: areaId
				});
			}
		}
	} else {
		// 向後兼容：使用舊格式
		// 優先讀取 DI 地址來顯示按鈕狀態
		const diAddresses = extractDiAddresses(area.modbus);
		if (diAddresses.length > 0) {
			const minAddress = Math.min(...diAddresses);
			requests.push({
				deviceConfig: deviceConfig as { host: string; port: number; unitId: number },
				address: minAddress,
				type: "discrete",
				areaId: areaId
			});
		} else {
			// 如果沒有 DI 配置，才使用 DO 地址（向後兼容）
			const doAddresses = extractDoAddresses(area.modbus);
			if (doAddresses.length > 0) {
				const minAddress = Math.min(...doAddresses);
				requests.push({
					deviceConfig: deviceConfig as { host: string; port: number; unitId: number },
					address: minAddress,
					type: "coil",
					areaId: areaId
				});
			}
		}
	}

	return requests;
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

	// 收集所有讀取請求
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
	// 從所有樓層的 areas 中查找
	let targetArea: LightingArea | null = null;
	let targetFloor: LightingFloor | null = null;
	let targetAreaIndex = -1;

	for (const floor of lightingFloors.value) {
		const index = floor.areas.findIndex((area, idx) => getAreaId(floor, area, idx) === areaId);
		if (index !== -1) {
			targetArea = floor.areas[index];
			targetFloor = floor;
			targetAreaIndex = index;
			break;
		}
	}

	if (!targetArea || !targetFloor) return;

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
		if (!needsModbusConnection(targetArea)) {
			areaToggling.value.delete(areaId);
			return;
		}

		if (!targetArea.modbus) {
			rollbackAreaStatus(areaId, currentValue);
			areaToggling.value.delete(areaId);
			return;
		}

		const deviceConfig = await getAreaDeviceConfig(targetArea);
		if (!deviceConfig) {
			rollbackAreaStatus(areaId, currentValue);
			areaToggling.value.delete(areaId);
			return;
		}

		// 使用新的 points 配置
		if (targetArea.modbus.points && targetArea.modbus.points.length > 0) {
			const doPoints = filterDoPoints(targetArea.modbus.points);

			if (doPoints.length === 0) {
				rollbackAreaStatus(areaId, currentValue);
				areaToggling.value.delete(areaId);
				return;
			}

			// 執行所有 DO 點位的寫入操作（統一使用 writeCoil）
			await Promise.all(
				doPoints.map(point => modbusApi.writeCoil(point.address, targetValue, deviceConfig))
			);
		} else {
			// 向後兼容：使用舊格式
			const doAddresses = extractDoAddresses(targetArea.modbus);

			if (doAddresses.length > 0) {
				// 統一使用 writeCoil 寫入每個點位
				await Promise.all(
					doAddresses.map(address => modbusApi.writeCoil(address, targetValue, deviceConfig))
				);
			}
		}

		// 寫入成功後，稍等一下再重新讀取狀態（避免與設備響應時間衝突）
		setTimeout(async () => {
			const readRequests = await collectAreaReadRequests(
				targetFloor!,
				targetArea!,
				targetAreaIndex
			);
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

		const toast = useToast();
		toast.error(
			`控制 ${targetArea.name} 失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
		);
	}
};

// 啟動自動刷新
const startAutoRefresh = () => {
	if (refreshTimer) return;

	// 立即載入一次
	void loadAllAreaStatuses({ silent: true });

	// 設置定時器
	refreshTimer = setInterval(() => {
		// 只有在頁面可見時才載入（優化：使用 Page Visibility API）
		if (document.visibilityState === "visible") {
			void loadAllAreaStatuses({ silent: true });
		}
	}, AUTO_REFRESH_INTERVAL);
};

// 停止自動刷新
const stopAutoRefresh = () => {
	if (!refreshTimer) return;
	clearInterval(refreshTimer);
	refreshTimer = null;

	// 清理請求緩存
	requestCache.clear();
};

// 監聽頁面可見性變化（優化：頁面不可見時暫停輪詢）
const handleVisibilityChange = () => {
	if (document.visibilityState === "visible") {
		// 頁面可見時，立即載入一次狀態
		if (refreshTimer) {
			void loadAllAreaStatuses({ silent: true });
		}
	}
};

// 刪除區域（通過更新樓層來刪除區域）
const handleDeleteCategory = async (areaId: string) => {
	if (!isEditMode.value) return;
	if (!confirm("確定要刪除這個點位嗎？")) return;

	try {
		// 找到要刪除的區域所屬的樓層
		let targetFloor: LightingFloor | null = null;
		let targetAreaIndex = -1;

		for (const floor of lightingFloors.value) {
			const index = floor.areas.findIndex((area, idx) => getAreaId(floor, area, idx) === areaId);
			if (index !== -1) {
				targetFloor = floor;
				targetAreaIndex = index;
				break;
			}
		}

		if (!targetFloor) {
			throw new Error("找不到要刪除的點位");
		}

		// 從樓層的 areas 中移除該區域
		const updatedAreas = targetFloor.areas.filter((_, index) => index !== targetAreaIndex);

		// 更新樓層（包含更新後的 areas）
		const result = await lightingApi.updateFloor(targetFloor.id!, {
			name: targetFloor.name,
			imageUrl: targetFloor.imageUrl,
			areas: updatedAreas
		});

		// 更新本地資料
		const index = lightingFloors.value.findIndex(f => f.id === targetFloor!.id);
		if (index > -1) {
			lightingFloors.value[index] = result.floor;
		}

		// 清理狀態
		if (selectedCategory.value === areaId) {
			selectedCategory.value = "";
		}
		delete areaStatuses.value[areaId];

		const toast = useToast();
		toast.success("點位已刪除");
	} catch (error) {
		console.error("刪除點位失敗:", error);
		const toast = useToast();
		toast.error("刪除點位失敗，請稍後再試");
	}
};


// 拖曳處理：在圖片上拖曳區域
const handleDotDragStart = (event: DragEvent, area: LightingArea, areaIndex: number) => {
	if (!isEditMode.value || !selectedFloorData.value) return;
	const areaId = getAreaId(selectedFloorData.value, area, areaIndex);
	draggingCategoryId.value = areaId;
	event.dataTransfer!.effectAllowed = "move";
	event.dataTransfer!.setData("areaId", areaId);
};

const handleDotDragEnd = () => {
	draggingCategoryId.value = "";
};

// 處理拖放（通過更新樓層來調整區域位置）
const handleDrop = async (event: DragEvent) => {
	if (!isEditMode.value || !floorPlanRef.value) return;

	event.preventDefault();
	const areaId = event.dataTransfer?.getData("areaId");

	if (!areaId) return;

	const rect = floorPlanRef.value.getBoundingClientRect();
	const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
	const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));

	// 找到要更新的區域所屬的樓層
	let targetFloor: LightingFloor | null = null;
	let targetAreaIndex = -1;

	for (const floor of lightingFloors.value) {
		const index = floor.areas.findIndex((area, idx) => getAreaId(floor, area, idx) === areaId);
		if (index !== -1) {
			targetFloor = floor;
			targetAreaIndex = index;
			break;
		}
	}

	if (!targetFloor) return;

	// 更新區域位置
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
		const index = lightingFloors.value.findIndex(f => f.id === targetFloor!.id);
		if (index > -1) {
			lightingFloors.value[index] = result.floor;
		}
	} catch (error) {
		console.error("更新點位位置失敗:", error);
		const toast = useToast();
		toast.error("更新位置失敗，請稍後再試");
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
		console.error("批次更新位置失敗:", error);
		throw error;
	}
};

// 監聽樓層資料變化，重新初始化狀態
watch(
	() => lightingFloors.value,
	() => {
		// 當樓層資料變化時，重新初始化區域狀態
		initializeAreaStatuses();
		// 重新載入所有樓層的狀態（用於 StatusCenter）
		void loadAllAreaStatuses({ loadAllFloors: true });
	},
	{ deep: true }
);

// 初始化：自動選中第一個區域
watch(
	() => currentFloorAreas.value,
	newAreas => {
		// 若目前選中的區域不存在於新的清單中，改選第一個或清空
		if (selectedFloorData.value) {
			const currentAreaId = newAreas.find(
				(area, index) => getAreaId(selectedFloorData.value!, area, index) === selectedCategory.value
			);
			if (!currentAreaId && newAreas.length > 0) {
				selectedCategory.value = getAreaId(selectedFloorData.value, newAreas[0], 0);
			} else if (newAreas.length === 0) {
				selectedCategory.value = "";
			}
		}
	},
	{ immediate: true }
);

// ========== 樓層管理功能 ==========

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
	} catch (error) {
		console.error("載入樓層列表失敗:", error);
		const toast = useToast();
		toast.error("載入樓層列表失敗，請稍後再試");
	} finally {
		isLoadingFloors.value = false;
	}
};

// 處理儲存樓層
const handleSaveFloor = async (floor: LightingFloor) => {
	try {
		if (floor.id) {
			// 更新現有樓層
			const result = await lightingApi.updateFloor(floor.id, {
				name: floor.name,
				imageUrl: floor.imageUrl,
				areas: floor.areas
			});

			// 更新本地資料
			const index = lightingFloors.value.findIndex(f => f.id === floor.id);
			if (index > -1) {
				lightingFloors.value[index] = result.floor;
			}
		} else {
			// 建立新樓層
			const result = await lightingApi.createFloor({
				name: floor.name,
				imageUrl: floor.imageUrl,
				areas: floor.areas
			});

			// 添加到本地資料
			lightingFloors.value.push(result.floor);
		}

		// 樓層資料已更新，區域會自動從 lightingFloors 的 areas 獲取
		// 重新初始化狀態以反映新的區域
		initializeAreaStatuses();

		const toast = useToast();
		toast.success("樓層儲存成功");
	} catch (error) {
		console.error("儲存樓層失敗:", error);
		const toast = useToast();
		toast.error("儲存樓層失敗，請稍後再試");
	}
};

// 處理刪除樓層
const handleDeleteFloor = async (floorId: string) => {
	try {
		await lightingApi.deleteFloor(floorId);

		// 從本地資料移除
		const index = lightingFloors.value.findIndex(f => f.id === floorId);
		if (index > -1) {
			const deletedFloor = lightingFloors.value[index];
			lightingFloors.value.splice(index, 1);

			// 如果刪除的是當前選中的樓層，切換到第一個樓層
			if (selectedFloor.value === floorId && lightingFloors.value.length > 0) {
				selectedFloor.value = lightingFloors.value[0].id || lightingFloors.value[0].name;
			} else if (lightingFloors.value.length === 0) {
				selectedFloor.value = "";
			}

			// 樓層已刪除，區域會自動從 lightingFloors 的 areas 中移除
		}

		const toast = useToast();
		toast.success("樓層刪除成功");
	} catch (error) {
		console.error("刪除樓層失敗:", error);
		const toast = useToast();
		toast.error("刪除樓層失敗，請稍後再試");
	}
};

// 初始化：載入樓層數據
onMounted(async () => {
	// 載入樓層列表（會自動選擇 1F 或第一個樓層）
	await loadFloorsFromAPI();

	// 初始化區域狀態（從樓層的 areas）
	initializeAreaStatuses();

	// 立即從後端載入所有樓層的區域實際狀態（不預設為 OFF）
	// 這樣 StatusCenter 也能正確顯示所有樓層的狀態
	await loadAllAreaStatuses({ loadAllFloors: true });

	// 啟動自動刷新
	startAutoRefresh();

	// 監聽頁面可見性變化
	document.addEventListener("visibilitychange", handleVisibilityChange);
});

// 清理：停止自動刷新
onBeforeUnmount(() => {
	stopAutoRefresh();
	document.removeEventListener("visibilitychange", handleVisibilityChange);
});
</script>

<style scoped>
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
