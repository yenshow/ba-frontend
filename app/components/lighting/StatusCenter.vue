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
	selectedFloor?: string;
}

const props = withDefaults(defineProps<Props>(), {
	categoryStatuses: () => ({}),
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

const displayedFloors = computed(() => {
	const floorsWithCategories = props.floors.filter((floor) => {
		return getFloorCategories(floor.id).length > 0;
	});
	return floorsWithCategories.sort((a, b) => a.level - b.level);
});

// 獲取指定樓層的分類點
const getFloorCategories = (floorId: string): LightingCategory[] => {
	return props.categories.filter((category) => category.floorId === floorId);
};

const getCategoryStatus = (categoryId: string) => {
	const status = props.categoryStatuses[categoryId];
	if (status) {
		return {
			isRunning: status.isRunning,
			status: status.status,
			healthLabel: statusLabels[status.status]
		};
	}
	return {
		isRunning: false,
		status: "normal" as const,
		healthLabel: "正常"
	};
};

const isCategoryNormal = (categoryId: string): boolean => {
	const status = props.categoryStatuses[categoryId];
	return !status || status.status === "normal";
};

const isCategoryDisabled = (category: LightingCategory): boolean => {
	// 1F 為假資料，不禁用
	if (category.floorId === "1F") {
		return false;
	}
	
	// 如果沒有 Modbus 配置，禁用
	if (!category.modbus) {
		return true;
	}
	
	// 如果有 points 配置，檢查是否有可寫入的點位
	if (category.modbus.points && category.modbus.points.length > 0) {
		const hasWritePoints = category.modbus.points.some(
			(p) => p.method === "writeCoil" || p.method === "writeCoils"
		);
		return !hasWritePoints;
	}
	
	// 向後兼容：檢查舊格式
	if (category.modbus.deviceId) {
		// 如果有設備 ID 但沒有點位配置，禁用
		return !category.modbus.doAddresses && !category.modbus.doAddress && !category.modbus.address;
	}
	
	// 如果沒有設備配置，禁用
	return !category.modbus.host || !category.modbus.port;
};

const handleToggle = (categoryId: string, isRunning: boolean) => {
	emit("toggle", categoryId, !isRunning);
};

const handleFloorClick = (floorId: string) => {
	emit("floor-selected", floorId);
};
</script>
