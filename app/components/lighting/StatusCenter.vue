<template>
	<div
		class="relative bg-white/30 rounded-2xl overflow-hidden border-2 border-white/80 px-2 xl:px-3 2xl:px-4 py-4 xl:py-6 2xl:py-8 h-full overflow-y-auto space-y-4 xl:space-y-6 2xl:space-y-8"
	>
		<h3 class="text-white text-center text-xl lg:text-2xl xl:text-3xl tracking-[12px] ms-[12px]">狀態中心</h3>
		<!-- 樓層區塊 -->
		<div v-for="floor in displayedFloors" :key="floor.id" class="space-y-3 xl:space-y-4">
			<!-- 樓層標題 -->
			<div class="flex items-center gap-3">
				<button
					type="button"
					@click="handleFloorClick(floor.id)"
					:class="[
						'rounded-full p-2 border-2 transition-all cursor-pointer',
						props.selectedFloor === floor.id ? 'bg-white text-black/50' : 'text-white bg-transparent'
					]"
				>
					<h4 class="text-lg xl:text-xl 2xl:text-2xl p-2 font-semibold tracking-wider">
						{{ floor.name }}
					</h4>
				</button>

				<!-- 該樓層的分類點（區域）- 兩列布局 -->
				<div v-if="getFloorCategories(floor.id).length > 0" class="grid grid-cols-2 gap-x-2 gap-y-4 xl:gap-y-5 2xl:gap-y-6">
					<div
						v-for="category in getFloorCategories(floor.id)"
						:key="category.id"
						class="flex items-center rounded-xl py-2 xl:py-3 2xl:py-4 pe-2 xl:pe-3 2xl:pe-4 border-2 border-white"
					>
						<!-- 左側圖示 -->
						<div>
							<NuxtImg src="/lighting/light-bulb.png" alt="燈泡圖示" class="w-12 h-12 lg:w-16 lg:h-16 2xl:w-24 2xl:h-24" width="96" height="96" />
						</div>

						<!-- 右側內容區域 -->
						<div class="flex flex-col gap-2">
							<!-- 名稱 -->
							<h4 class="text-white text-lg xl:text-xl 2xl:text-2xl whitespace-nowrap">{{ category.name }}</h4>
							<div class="flex items-center gap-2">
								<div class="space-y-2">
									<!-- 運轉中標籤 -->
									<div class="border border-white rounded p-1 bg-white/10">
										<span class="ps-2 text-sm 2xl:text-base tracking-[6px] whitespace-nowrap text-white">
											{{ getCategoryStatus(category.id).isRunning ? "運轉中" : "已關閉" }}
										</span>
									</div>

									<!-- 正常狀態（綠色圓點 + 文字） -->
									<div class="flex items-center justify-center gap-2 border border-white rounded p-1 bg-white/10">
										<div :class="['w-5 h-5 rounded-full border border-white', isCategoryNormal(category.id) ? 'bg-green-300' : 'bg-red-500']"></div>
										<span class="text-white text-sm 2xl:text-base">{{ getCategoryStatus(category.id).healthLabel }}</span>
									</div>
								</div>
								<!-- 切換開關 -->
								<div class="flex justify-center">
									<label class="relative inline-flex items-center cursor-pointer">
										<input
											type="checkbox"
											:checked="getCategoryStatus(category.id).isRunning"
											class="sr-only peer"
											:disabled="isCategoryDisabled(category)"
											@change="handleToggle(category.id, getCategoryStatus(category.id).isRunning)"
										/>
										<div
											:class="[
												'w-8 h-16 2xl:w-10 2xl:h-20 border-2 border-white bg-transparent peer-focus:outline-none rounded-full peer peer-checked:after:-translate-y-full after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:bg-white after:rounded-full after:w-8 after:h-8 2xl:after:w-10 2xl:after:h-10 after:transition-all peer-checked:bg-[#00d1ff]',
												isCategoryDisabled(category) ? 'opacity-50 cursor-not-allowed' : ''
											]"
										>
											<!-- ON 文字 -->
											<span
												class="absolute top-0 left-0 right-0 h-1/2 flex items-center justify-center text-white text-xs 2xl:text-base font-light pointer-events-none z-10 transition-opacity duration-300 opacity-100 peer-checked:opacity-0"
											>
												OFF
											</span>

											<!-- OFF 文字 -->
											<span
												class="absolute bottom-0 left-0 right-0 h-1/2 flex items-center justify-center text-white text-xs 2xl:text-base font-light pointer-events-none z-10 transition-opacity duration-300 opacity-100 peer-checked:opacity-0"
											>
												ON
											</span>
										</div>
									</label>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Floor } from "~/types/system";
import type { LightingCategory } from "~/types/lighting";

interface Props {
	floors: Floor[];
	categories: LightingCategory[];
	categoryStatuses?: Record<string, { isRunning: boolean; status: "normal" | "warning" | "error" }>;
	categoryDisabledMap?: Record<string, boolean>;
	selectedFloor?: string;
}

const props = withDefaults(defineProps<Props>(), {
	categoryStatuses: () => ({}),
	categoryDisabledMap: () => ({}),
	selectedFloor: ""
});

const emit = defineEmits<{
	toggle: [categoryId: string, isRunning: boolean];
	"floor-selected": [floorId: string];
}>();

const statusLabels: Record<"normal" | "warning" | "error", string> = {
	normal: "正常",
	warning: "警告",
	error: "異常"
};

// 按樓層分組分類點（緩存計算結果）
const categoriesByFloor = computed(() => {
	const map = new Map<string, LightingCategory[]>();
	props.categories.forEach((category) => {
		if (!map.has(category.floorId)) {
			map.set(category.floorId, []);
		}
		map.get(category.floorId)!.push(category);
	});
	return map;
});

// 獲取指定樓層的分類點
const getFloorCategories = (floorId: string): LightingCategory[] => {
	return categoriesByFloor.value.get(floorId) || [];
};

// 顯示的樓層（只顯示有分類點的樓層）
const displayedFloors = computed(() => {
	return props.floors
		.filter((floor) => getFloorCategories(floor.id).length > 0)
		.sort((a, b) => a.level - b.level);
});

// 所有分類點的狀態 Map（包含格式化後的標籤）
const categoryStatusMap = computed(() => {
	const map: Record<string, { isRunning: boolean; status: "normal" | "warning" | "error"; healthLabel: string }> = {};
	props.categories.forEach((category) => {
		const status = props.categoryStatuses[category.id];
		if (status) {
			map[category.id] = {
				isRunning: status.isRunning,
				status: status.status,
				healthLabel: statusLabels[status.status]
			};
		} else {
			map[category.id] = {
				isRunning: false,
				status: "normal",
				healthLabel: "正常"
			};
		}
	});
	return map;
});

// 取得分類點狀態（從緩存的 Map 中取得）
const getCategoryStatus = (categoryId: string) => {
	return categoryStatusMap.value[categoryId] || {
		isRunning: false,
		status: "normal" as const,
		healthLabel: "正常"
	};
};

// 判斷分類點是否正常
const isCategoryNormal = (categoryId: string): boolean => {
	const status = categoryStatusMap.value[categoryId];
	return !status || status.status === "normal";
};

const isCategoryDisabled = (category: LightingCategory): boolean => {
	// 從父組件傳入的禁用狀態 Map 中取得
	return props.categoryDisabledMap[category.id] ?? false;
};

const handleToggle = (categoryId: string, isRunning: boolean) => {
	emit("toggle", categoryId, !isRunning);
};

const handleFloorClick = (floorId: string) => {
	emit("floor-selected", floorId);
};
</script>
