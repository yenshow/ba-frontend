<template>
	<div
		class="relative h-full space-y-4 overflow-hidden overflow-y-auto rounded-2xl border-2 border-white/80 bg-white/30 px-2 py-4 xl:space-y-6 xl:px-3 xl:py-6 2xl:space-y-8 2xl:px-4 2xl:py-8"
	>
		<h3 class="ms-[12px] text-center text-xl tracking-[12px] text-white lg:text-2xl xl:text-3xl">
			狀態中心
		</h3>
		<!-- 樓層區塊 -->
		<div v-for="floor in displayedFloors" :key="floor.id" class="space-y-3 xl:space-y-4">
			<!-- 樓層標題 -->
			<div class="flex items-center gap-3">
				<button
					type="button"
					@click="handleFloorClick(floor.id || floor.name)"
					:class="[
						'cursor-pointer rounded-full border-2 p-2 transition-all',
						props.selectedFloor === (floor.id || floor.name)
							? 'bg-white text-black/50'
							: 'bg-transparent text-white'
					]"
				>
					<h4 class="p-2 text-lg font-semibold tracking-wider xl:text-xl 2xl:text-2xl">
						{{ floor.name }}
					</h4>
				</button>

				<!-- 該樓層的區域（點位）- 兩列布局 -->
				<div
					v-if="getFloorAreas(floor).length > 0"
					class="grid grid-cols-2 gap-x-2 gap-y-4 xl:gap-y-5 2xl:gap-y-6"
				>
					<div
						v-for="(area, areaIndex) in getFloorAreas(floor)"
						:key="getAreaId(floor, area, areaIndex)"
						class="flex items-center rounded-xl border-2 border-white py-2 pe-2 xl:py-3 xl:pe-3 2xl:py-4 2xl:pe-4"
					>
						<!-- 左側圖示 -->
						<div>
							<NuxtImg
								src="/lighting/light-bulb.png"
								alt="燈泡圖示"
								class="h-16 w-16 2xl:h-24 2xl:w-24"
								width="96"
								height="96"
							/>
						</div>

						<!-- 右側內容區域 -->
						<div class="flex flex-col gap-2">
							<!-- 名稱 -->
							<h4 class="whitespace-nowrap text-lg text-white xl:text-xl 2xl:text-2xl">{{ area.name }}</h4>
							<div class="flex items-center gap-2">
								<div class="space-y-2">
									<!-- 運轉中標籤 -->
									<div class="rounded border border-white bg-white/10 p-1">
										<span class="whitespace-nowrap ps-2 text-sm tracking-[6px] text-white 2xl:text-base">
											{{ getAreaStatus(getAreaId(floor, area, areaIndex)).isRunning ? "運轉中" : "已關閉" }}
										</span>
									</div>

									<!-- 正常狀態（綠色圓點 + 文字） -->
									<div
										class="flex items-center justify-center gap-2 rounded border border-white bg-white/10 p-1"
									>
										<div
											:class="[
												'h-5 w-5 rounded-full border border-white',
												isAreaNormal(getAreaId(floor, area, areaIndex)) ? 'bg-green-300' : 'bg-red-500'
											]"
										></div>
										<span class="text-sm text-white 2xl:text-base">{{
											getAreaStatus(getAreaId(floor, area, areaIndex)).healthLabel
										}}</span>
									</div>
								</div>
								<!-- 切換開關 -->
								<div class="relative flex justify-center">
									<!-- Loading 指示器（當正在處理切換時顯示） -->
									<div
										v-if="props.areaToggling.has(getAreaId(floor, area, areaIndex))"
										class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
									>
										<div
											class="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white"
										></div>
									</div>
									<label
										class="relative inline-flex items-center"
										:class="{
											'cursor-not-allowed': isAreaDisabled(getAreaId(floor, area, areaIndex)),
											'cursor-pointer': !isAreaDisabled(getAreaId(floor, area, areaIndex))
										}"
									>
										<input
											type="checkbox"
											:checked="getAreaStatus(getAreaId(floor, area, areaIndex)).isRunning"
											class="peer sr-only"
											:disabled="isAreaDisabled(getAreaId(floor, area, areaIndex))"
											@change="
												handleToggle(
													getAreaId(floor, area, areaIndex),
													getAreaStatus(getAreaId(floor, area, areaIndex)).isRunning
												)
											"
										/>
										<div
											:class="[
												'peer h-16 w-8 rounded-full border-2 border-white bg-transparent after:absolute after:bottom-0 after:left-0 after:h-8 after:w-8 after:rounded-full after:bg-white after:transition-all after:content-[\'\'] peer-checked:bg-[#00d1ff] peer-checked:after:-translate-y-full peer-focus:outline-none 2xl:h-20 2xl:w-10 2xl:after:h-10 2xl:after:w-10',
												isAreaDisabled(getAreaId(floor, area, areaIndex)) ? 'opacity-50' : ''
											]"
										>
											<!-- ON 文字 -->
											<span
												class="pointer-events-none absolute left-0 right-0 top-0 z-10 flex h-1/2 items-center justify-center text-xs font-light text-white opacity-100 transition-opacity duration-300 peer-checked:opacity-0 2xl:text-base"
											>
												OFF
											</span>

											<!-- OFF 文字 -->
											<span
												class="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex h-1/2 items-center justify-center text-xs font-light text-white opacity-100 transition-opacity duration-300 peer-checked:opacity-0 2xl:text-base"
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
import type { LightingFloor, LightingArea } from "~/types/lighting";

interface Props {
	floors: LightingFloor[];
	areaStatuses?: Record<string, { isRunning: boolean; status: "normal" | "warning" | "error" }>;
	areaDisabledMap?: Record<string, boolean>;
	areaToggling?: Set<string>; // 正在處理切換操作的區域
	selectedFloor?: string;
}

const props = withDefaults(defineProps<Props>(), {
	floors: () => [],
	areaStatuses: () => ({}),
	areaDisabledMap: () => ({}),
	areaToggling: () => new Set(),
	selectedFloor: ""
});

const emit = defineEmits<{
	toggle: [areaId: string, isRunning: boolean];
	"floor-selected": [floorId: string];
}>();

const statusLabels: Record<"normal" | "warning" | "error", string> = {
	normal: "正常",
	warning: "警告",
	error: "異常"
};

// 生成區域 ID（與 lighting.vue 中的邏輯一致）
const getAreaId = (floor: LightingFloor, area: LightingArea, areaIndex: number): string => {
	return area.id || `area-${floor.id || floor.name}-${areaIndex}`;
};

// 獲取指定樓層的區域
const getFloorAreas = (floor: LightingFloor): LightingArea[] => {
	return floor.areas || [];
};

// 顯示的樓層（只顯示有區域的樓層）
const displayedFloors = computed(() => {
	if (!props.floors || !Array.isArray(props.floors)) {
		return [];
	}

	// 過濾出有區域的樓層
	const floorsWithAreas = props.floors.filter(floor => {
		return getFloorAreas(floor).length > 0;
	});

	// 如果沒有有區域的樓層，返回所有樓層（用於顯示空狀態）
	const floorsToShow = floorsWithAreas.length > 0 ? floorsWithAreas : props.floors;

	// 排序：1F 在前面，2F 在後面（按樓層名稱的自然排序）
	return floorsToShow.sort((a, b) => {
		const nameA = a.name || "";
		const nameB = b.name || "";
		// 提取數字部分進行比較（例如 "1F" -> 1, "2F" -> 2）
		const numA = parseInt(nameA.match(/\d+/)?.[0] || "999") || 999;
		const numB = parseInt(nameB.match(/\d+/)?.[0] || "999") || 999;
		return numA - numB;
	});
});

// 取得區域狀態
const getAreaStatus = (areaId: string) => {
	const status = props.areaStatuses[areaId];
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

// 判斷區域是否正常
const isAreaNormal = (areaId: string): boolean => {
	const status = props.areaStatuses[areaId];
	return !status || status.status === "normal";
};

const isAreaDisabled = (areaId: string): boolean => {
	return props.areaDisabledMap[areaId] ?? false;
};

const handleToggle = (areaId: string, isRunning: boolean) => {
	emit("toggle", areaId, !isRunning);
};

const handleFloorClick = (floorId: string) => {
	emit("floor-selected", floorId);
};
</script>
