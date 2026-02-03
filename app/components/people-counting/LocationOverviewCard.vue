<template>
	<div class="flex cursor-pointer gap-2 rounded-xl py-1 bg-white/10 transition-all" @click="$emit('click', location.locationId || Number(location.id || 0))">
		<!-- 左側：區域（斜切標籤） -->
		<div
			class="my-4 flex items-center justify-center bg-white px-2 text-xl 2xl:text-xl w-[36px]"
			style="clip-path: polygon(0 0, 100% calc(0% + 24px), 100% calc(100% - 24px), 0 100%)"
		>
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
				<div class="flex min-w-[140px] flex-col gap-3 2xl:min-w-[160px] text-white border-r-2 border-white/50 pr-8">
					<div class="flex items-center justify-center gap-3 bg-white/20 p-2">
						<div class="text-sm 2xl:text-base font-semibold">進場人數</div>
						<div class="text-xl 2xl:text-2xl bg-black/20 w-[80px] 2xl:w-[100px] text-center">
							{{ location.entryCount ?? 0 }}
						</div>
					</div>

					<div class="flex items-center justify-center gap-3 bg-white/20 p-2">
						<div class="text-sm 2xl:text-base font-semibold">出場人數</div>
						<div class="text-xl 2xl:text-2xl bg-black/20 w-[80px] 2xl:w-[100px] text-center">
							{{ location.exitCount ?? 0 }}
						</div>
					</div>

					<div class="flex items-center justify-center gap-3 bg-white/20 p-2">
						<div class="text-sm 2xl:text-base font-semibold">在場人數</div>
						<div class="text-xl 2xl:text-2xl bg-black/20 w-[80px] 2xl:w-[100px] text-center">
							{{ currentCount }}
						</div>
					</div>
				</div>

				<!-- 單位格（3x4） -->
				<div class="grid grid-cols-3 gap-2 overflow-hidden">
					<div
						v-for="(unit, index) in displayUnits"
						:key="unit ? unit.id : `empty-${index}`"
						class="flex items-center justify-center p-2 text-center min-h-[36px] min-w-[64px] transition-all"
						:class="{
							'bg-white/20': unit && (unit.currentCount || 0) > 0,
							'bg-black/20': !unit || (unit.currentCount || 0) === 0,
							'text-white/90': unit,
							'text-white/30': !unit
						}"
						:title="unit ? unit.name : ''"
					>
						<span v-if="unit" class="text-[11px] font-semibold text-white line-clamp-2 2xl:text-xs">
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

interface Props {
	location: PeopleCountingLocation & { overviewZoneName?: string | null };
}

const props = defineProps<Props>();
const { location } = toRefs(props);

defineEmits<{
	click: [locationId: number];
}>();

const regionText = computed(() => location.value.overviewZoneName || "未分類");

// 計算在場人數：所有單位的 currentCount 總和
const currentCount = computed(() => {
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

<style scoped>

@keyframes blink {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
}

.blink-slow {
	animation: blink 2s ease-in-out infinite;
}

.blink-fast {
	animation: blink 1s ease-in-out infinite;
}
</style>

