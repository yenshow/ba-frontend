<template>
	<div
		class="flex cursor-pointer gap-2 rounded-xl bg-white/10 py-1 transition-all hover:bg-white/15"
		tabindex="0"
		role="button"
		:aria-label="`查看 ${location.name} 人流統計`"
		@click="handleClick"
		@keydown.enter="handleClick"
		@keydown.space.prevent="handleClick"
	>
		<!-- 左側：區域（斜切標籤） -->
		<div class="overview-zone-tag">
			{{ regionText }}
		</div>

		<!-- 右側：內容 -->
		<div class="flex flex-1 flex-col items-center pr-2">
			<!-- 標題 -->
			<div class="mb-2 flex w-[160px] items-center justify-center border-b border-white/80 pb-px">
				<h3 class="text-base text-white 2xl:text-lg">{{ location.name }}</h3>
			</div>

			<div class="flex items-center gap-8 py-2">
				<!-- 三種人數統計 -->
				<div
					class="flex min-w-[140px] flex-col gap-3 border-r-2 border-white/50 pr-8 text-white 2xl:min-w-[160px]"
				>
					<div class="flex items-center justify-center gap-3 monitoring-chip-bg p-2">
						<div class="overview-stat-label">進場人數</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ location.entryCount ?? 0 }}
						</div>
					</div>

					<div class="flex items-center justify-center gap-3 monitoring-chip-bg p-2">
						<div class="overview-stat-label">出場人數</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ location.exitCount ?? 0 }}
						</div>
					</div>

					<div class="flex items-center justify-center gap-3 monitoring-chip-bg p-2">
						<div class="overview-stat-label">在場人數</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ currentCount }}
						</div>
					</div>
				</div>

				<!-- 單位格（3x4） -->
				<div class="grid grid-cols-3 gap-2 overflow-hidden">
					<div
						v-for="(unit, index) in displayUnits"
						:key="unit ? unit.id : `empty-${index}`"
						class="flex min-h-[36px] min-w-[64px] items-center justify-center p-2 text-center transition-all"
						:class="{
							'monitoring-chip-bg': unit && (unit.currentCount || 0) > 0,
							'bg-black/20': !unit || (unit.currentCount || 0) === 0,
							'text-white/90': unit,
							'text-white/30': !unit
						}"
						:title="unit ? unit.name : ''"
					>
						<span v-if="unit" class="line-clamp-2 text-[11px] font-semibold text-white 2xl:text-xs">
							{{ unit.name }}
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingLocation } from "~/types/peopleCounting";
import { computed, toRefs } from "vue";
import { computeCumulativePresence } from "~/utils/entryExitStats";

interface Props {
	location: PeopleCountingLocation & { overviewZoneName?: string | null };
}

const props = defineProps<Props>();
const { location } = toRefs(props);

const emit = defineEmits<{
	click: [locationId: number];
}>();

const handleClick = () => {
	emit("click", location.value.locationId || Number(location.value.id || 0));
};

const regionText = computed(() => location.value.overviewZoneName || "未分類");

const isIsapiCamera = computed(() => location.value.dataSource === "isapi_camera");

const currentCount = computed(() => {
	if (isIsapiCamera.value) {
		return computeCumulativePresence(
			location.value.entryCount ?? 0,
			location.value.exitCount ?? 0
		);
	}
	if (location.value.currentCount != null) {
		return location.value.currentCount;
	}
	if (!location.value.units) return 0;
	return location.value.units.reduce((sum, unit) => sum + (unit.currentCount || 0), 0);
});

const TOTAL_GRID_CELLS = 12; // 3x4 網格

const displayUnits = computed(() => {
	const units = (location.value.units ?? []).slice(0, TOTAL_GRID_CELLS);
	const emptyCells = Array(TOTAL_GRID_CELLS - units.length).fill(null);
	return [...units, ...emptyCells];
});
</script>
