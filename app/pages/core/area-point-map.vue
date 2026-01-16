<template>
	<div>
		<!-- 主要內容區域：左右排版 -->
		<div class="flex justify-center gap-4 xl:gap-6 2xl:gap-8">
			<!-- 左側面板：樓層選擇與編輯功能 -->
			<section class="flex-[1.2] 2xl:flex-[1.3]" ref="leftSectionRef">
				<div
					class="flex overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-4 xl:p-6 2xl:p-8"
				>
					<!-- 樓層選擇 -->
					<div class="relative z-10 flex flex-col justify-between py-4 text-center text-white">
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
									v-if="!isInitialLoading && isAdmin"
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
							<!-- 系統列表（篩選該樓層的系統顯示） -->
							<Transition name="fade-in">
								<div v-if="selectedFloorData && !isInitialLoading" class="absolute bottom-1/4 left-0 mt-6 space-y-2">
									<template v-if="floorSystemTypes.length > 0">
										<button
											v-for="systemType in floorSystemTypes"
											:key="systemType"
											type="button"
											@click="handleSystemTypeToggle(systemType)"
											:class="[
												'w-full rounded-xl border-2 p-3 text-left text-xs text-white transition-all 2xl:text-lg',
												selectedSystemType === systemType
													? 'border-white bg-white/20'
													: 'border-white/20 bg-white/5 hover:bg-white/10'
											]"
										>
											<div class="font-medium">
												{{ getLocationTypeLabel(systemType) }}
											</div>
										</button>
									</template>
									<div
										v-else
										class="rounded-xl border-2 border-white/30 bg-white/5 p-2 text-center text-xs text-white/60 2xl:text-base"
									>
										無系統
									</div>
								</div>
							</Transition>
						</div>
					</div>

					<!-- 中央樓層平面圖 -->
					<div class="relative h-[600px] w-full p-4 2xl:h-[780px]">
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
						<!-- 地點點位（只顯示已定位的） -->
						<template v-for="location in currentFloorLocations" :key="location.id">
							<div class="location-dot-wrapper" :style="getLightingLocationStyle(location)">
								<div
									class="location-dot"
									:class="{ 'is-active': selectedLocation === location.id }"
									role="button"
									tabindex="0"
									:data-status="isLocationNormal(location) ? 'normal' : 'abnormal'"
									:title="`${location.name}：${isLocationNormal(location) ? '正常' : '異常'}`"
									:aria-label="`${location.name}：${isLocationNormal(location) ? '正常' : '異常'}`"
									@click.stop="selectLocation(location)"
								></div>
								<CategoryTooltip
									:show="true"
									:category-name="location.name"
									:is-normal="isLocationNormal(location)"
								/>
							</div>
						</template>
					</div>
				</div>
			</section>

			<!-- 右側總覽面板 -->
			<aside class="flex-[0.8] overflow-y-auto 2xl:flex-[0.7]">
				<div
					class="rounded-2xl border-2 border-white/80 bg-white/30 p-4 xl:p-6 2xl:p-8"
					:style="leftSectionHeight ? { minHeight: leftSectionHeight + 'px' } : undefined"
				>
					<!-- 總覽標題 -->
					<h2
						class="mb-4 text-center text-xl font-semibold tracking-[12px] text-white xl:text-2xl 2xl:text-3xl"
					>
						總覽
					</h2>

					<!-- 載入狀態 -->
					<div v-if="isLoading" class="flex min-h-[200px] items-center justify-center">
						<div class="text-center text-white/60">
							<p class="text-sm 2xl:text-base">載入中...</p>
						</div>
					</div>

					<!-- 樓層列表 -->
					<div v-else-if="floors.length > 0" class="space-y-2">
						<button
							v-for="floor in sortedFloors"
							:key="floor.id"
							type="button"
							class="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-left transition-all"
							:class="{
								'border-white/40 bg-white/20': selectedFloor === floor.id
							}"
							@click="handleFloorSelected(floor.id)"
						>
							<div class="flex items-center gap-3">
								<div
									class="flex h-12 min-w-[60px] items-center justify-center rounded-lg border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30"
								>
									<span class="text-base font-bold text-white 2xl:text-lg">
										{{ floor.name }}
									</span>
								</div>
								<div class="flex-1">
									<div class="text-sm text-white/80 2xl:text-base">
										<template v-if="getFloorSystemTypes(floor).length > 0">
											{{
												getFloorSystemTypes(floor)
													.map(type => getLocationTypeLabel(type))
													.join("、")
											}}
										</template>
										<span v-else class="text-white/50">無系統</span>
									</div>
								</div>
							</div>
						</button>
					</div>

					<!-- 空狀態 -->
					<div v-else class="flex min-h-[200px] items-center justify-center">
						<div class="text-center text-white/60">
							<p class="text-sm 2xl:text-base">尚無樓層資料</p>
						</div>
					</div>
				</div>
			</aside>
		</div>
	</div>

	<!-- 地點管理對話框 -->
	<LocationManagementDialog
		v-model="showLocationManagementDialog"
		:floor="selectedFloorData"
		@save="handleSaveFloor"
	/>
</template>

<script setup lang="ts">
import type { UnifiedFloor, UnifiedLocation, SystemType } from "~/types/location";
import { useLocationApi } from "~/composables/systems/useLocationApi";
import { useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { useFloorManagement } from "~/composables/systems/useFloorManagement";
import { hasLightingCoordinates, getLightingLocationStyle } from "~/utils/locationAdapter";
import LocationManagementDialog from "~/components/location/LocationManagementDialog.vue";
import CategoryTooltip from "~/components/lighting/CategoryTooltip.vue";

definePageMeta({
	layout: "default"
});

const { isAdmin } = useAuth();
const locationApi = useLocationApi();
const toast = useToast();
const { handleError } = useErrorHandler();

// 左側區域參考與高度（用於使右側面板同高）
const leftSectionRef = ref<HTMLElement | null>(null);
const leftSectionHeight = ref<number | null>(null);

// ResizeObserver 監聽左側高度
let leftSectionResizeObserver: ResizeObserver | null = null;

const updateLeftSectionHeight = () => {
	if (!leftSectionRef.value) return;
	leftSectionHeight.value = leftSectionRef.value.offsetHeight;
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

// 樓層資料
const floors = ref<UnifiedFloor[]>([]);
const isLoading = ref(false);
const isInitialLoading = ref(true);

// 選中的樓層與地點
const selectedFloor = ref<string>("");
const selectedLocation = ref<string>("");
// 選中的系統類型（用於篩選）
const selectedSystemType = ref<SystemType | null>(null);

// 其他狀態
const isFloorPlanLoaded = ref(false);
const showLocationManagementDialog = ref(false);

// 選中的樓層資料
const selectedFloorData = computed(() => {
	if (!selectedFloor.value) return undefined;
	return floors.value.find(floor => floor.id === selectedFloor.value);
});

// 選中的樓層名稱
const selectedFloorName = computed(() => {
	return selectedFloorData.value?.name || "";
});

// 提取樓層的所有系統類型（共用函數）
const extractSystemTypes = (locations: UnifiedLocation[]): SystemType[] => {
	if (!locations || locations.length === 0) return [];

	const systemTypes = new Set<SystemType>();
	locations.forEach(location => {
		location.systems?.forEach(system => {
			systemTypes.add(system.systemType);
		});
	});
	return Array.from(systemTypes);
};

// 選中樓層的所有系統類型（去重）
const floorSystemTypes = computed(() => {
	if (!selectedFloorData.value?.locations) return [];
	return extractSystemTypes(selectedFloorData.value.locations);
});

// 取得指定樓層的所有系統類型（用於總覽顯示）
const getFloorSystemTypes = (floor: UnifiedFloor): SystemType[] => {
	if (!floor?.locations) return [];
	return extractSystemTypes(floor.locations);
};

// 排序的樓層列表
const sortedFloors = computed(() => sortFloors(floors.value));

// 樓層示意圖
const floorPlanImage = computed(() => selectedFloorData.value?.imageUrl);


// 判斷地點是否正常（暫時都返回正常，未來可以根據系統狀態判斷）
const isLocationNormal = (location: UnifiedLocation): boolean => {
	// 未來可以根據系統狀態判斷
	return true;
};

// 當前選中樓層的地點列表（過濾掉未定位的點位，只有定位的點位才會顯示在地圖上）
// 並根據選中的系統類型進行篩選
const currentFloorLocations = computed(() => {
	if (!selectedFloor.value) return [];
	const floor = selectedFloorData.value;
	if (!floor) return [];

	// 先過濾有座標的地點（目前只有照明系統支援座標）
	let locations = (floor.locations || []).filter(loc => hasLightingCoordinates(loc));

	// 如果選中了系統類型，進一步篩選
	if (selectedSystemType.value) {
		locations = locations.filter(loc =>
			loc.systems?.some(system => system.systemType === selectedSystemType.value)
		);
	}

	return locations;
});

// 使用樓層管理 composable
const { handleSaveFloor: baseHandleSaveFloor, handleDeleteFloor: baseHandleDeleteFloor, findEarliestFloor, sortFloors } =
	useFloorManagement<UnifiedFloor>();

// 載入樓層列表
const loadFloors = async () => {
	isLoading.value = true;
	try {
		const response = await locationApi.getFloors();
		floors.value = response.floors;

		// 如果沒有選中的樓層且有樓層資料，優先選擇最先創建的
		if (!selectedFloor.value && floors.value.length > 0) {
			const earliestFloor = findEarliestFloor(floors.value);
			if (earliestFloor) {
				selectedFloor.value = earliestFloor.id;
			} else {
				// 如果無法判斷，選擇第一個
				selectedFloor.value = floors.value[0].id;
			}
		}
	} catch (error) {
		handleError(error, "載入樓層列表失敗");
	} finally {
		isLoading.value = false;
	}
};

// 處理樓層選擇
const handleFloorSelected = (floorId: string) => {
	selectedFloor.value = floorId;
	selectedLocation.value = "";
	// 切換樓層時重置系統篩選
	selectedSystemType.value = null;
};

// 處理系統類型切換（點擊已選中的系統類型則取消選中，回到全部）
const handleSystemTypeToggle = (systemType: SystemType) => {
	if (selectedSystemType.value === systemType) {
		// 如果點擊的是已選中的系統類型，取消選中（顯示全部）
		selectedSystemType.value = null;
	} else {
		// 否則選中該系統類型
		selectedSystemType.value = systemType;
	}
};

// 選中地點
const selectLocation = (location: UnifiedLocation) => {
	selectedLocation.value = location.id;
};

// 系統類型標籤映射（提取為常數，避免重複定義）
const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
	environment: "環境監測",
	lighting: "照明系統",
	people_counting: "人流統計"
};

// 取得系統類型標籤
const getLocationTypeLabel = (systemType: SystemType): string => {
	return SYSTEM_TYPE_LABELS[systemType] || systemType;
};

// 處理打開樓層管理對話框
const handleOpenFloorDialog = async () => {
	if (floors.value.length === 0) {
		await loadFloors();
	}
	showLocationManagementDialog.value = true;
};

// 處理儲存樓層
const handleSaveFloor = async (floor: UnifiedFloor) => {
	await baseHandleSaveFloor(
		floor,
		floors,
		async (f: UnifiedFloor) => {
			return f.id
				? await locationApi.updateFloor(f.id, {
						name: f.name,
						imageUrl: f.imageUrl,
						locations: f.locations
					})
				: await locationApi.createFloor({
						name: f.name,
						imageUrl: f.imageUrl,
						locations: f.locations
					});
		},
		{
			selectedFloorRef: selectedFloor,
			closeDialogRef: showLocationManagementDialog
		}
	);
};

// 處理刪除樓層（當其他系統刪除樓層時，區域點位圖需要重新載入資料）
const handleDeleteFloor = async (floorId: string) => {
	await baseHandleDeleteFloor(floorId, floors, locationApi.deleteFloor, {
		selectedFloorRef: selectedFloor,
		findEarliestFloor,
		reloadFloors: loadFloors // 刪除後重新載入所有系統的樓層資料
	});
};

// 監聽頁面可見性變化，當頁面重新可見時重新載入資料
const handleVisibilityChange = () => {
	if (document.visibilityState === "visible") {
		// 頁面可見時，重新載入樓層資料以確保資料同步
		void loadFloors();
	}
};

// 初始化載入
onMounted(async () => {
	// 初始化左側 ResizeObserver
	initLeftSectionObserver();
	
	try {
		// 載入樓層列表
		await loadFloors();
		
		// 同步右側高度
		await nextTick();
		updateLeftSectionHeight();
	} catch (error) {
		handleError(error, "初始化失敗");
	} finally {
		// 初始載入完成，顯示按鈕和系統列表（使用淡入動畫）
		isInitialLoading.value = false;
	}

	// 監聽頁面可見性變化
	document.addEventListener("visibilitychange", handleVisibilityChange);
});

// 清理
onBeforeUnmount(() => {
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

/* 圖片載入動畫 */
.image-blur-load {
	transition:
		filter 0.6s ease-in-out,
		opacity 0.6s ease-in-out;
	filter: blur(20px);
	opacity: 0.6;
}

.image-blur-load.image-loaded {
	filter: blur(0);
	opacity: 1;
}

/* 地點點位樣式 */
.location-dot-wrapper {
	position: absolute;
	z-index: 10;
}

.location-dot {
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

.location-dot::before {
	content: "";
	position: absolute;
	inset: 6px;
	border-radius: inherit;
	transition: background 0.2s ease;
}

.location-dot::after {
	position: relative;
	content: "";
	font-size: 16px;
	font-weight: 600;
	color: #ffffff;
}

/* 正常狀態 */
.location-dot[data-status="normal"] {
	background: rgba(28, 200, 138, 0.28);
	border-color: rgba(28, 200, 138, 0.6);
}

.location-dot[data-status="normal"]::before {
	background: #1cc88a;
}

.location-dot[data-status="normal"]::after {
	content: "✓";
}

/* 異常狀態 */
.location-dot[data-status="abnormal"] {
	background: rgba(245, 101, 101, 0.32);
	border-color: rgba(245, 101, 101, 0.72);
	animation: dot-alert 1.6s ease-in-out infinite;
}

.location-dot[data-status="abnormal"]::before {
	background: #f56565;
}

.location-dot[data-status="abnormal"]::after {
	content: "!";
}

/* 選中狀態 */
.location-dot.is-active {
	box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
	border-color: rgba(255, 255, 255, 0.8);
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
</style>
