<template>
	<!-- 三個統計數字 -->
	<div class="mb-8 grid grid-cols-3 gap-1">
		<div class="bg-white/20 text-center">
			<div class="text-lg text-white tracking-[4px] ps-[4px] font-semibold 2xl:text-3xl bg-white/25 w-full py-2">進場人數</div>
			<div class="text-3xl text-white xl:text-4xl 2xl:text-8xl flex items-center justify-center h-[160px]">
				{{ totalEntryCount }}
			</div>
		</div>

		<div class="bg-white/20 text-center">
			<div class="text-xl text-white tracking-[4px] ps-[4px] font-semibold 2xl:text-3xl bg-white/25 w-full py-2">出場人數</div>
			<div class="text-3xl text-white xl:text-4xl 2xl:text-8xl flex items-center justify-center h-[160px]">
				{{ totalExitCount }}
			</div>
		</div>

		<div class="bg-white/20 text-center">
			<div class="text-xl text-white tracking-[4px] ps-[4px] font-semibold 2xl:text-3xl bg-white/25 w-full py-2">在場人數</div>
			<div class="text-3xl text-white xl:text-4xl 2xl:text-8xl flex items-center justify-center h-[160px]">
				{{ totalOnSiteCount }}
			</div>
		</div>
	</div>

	<!-- 進場單位列表 -->
	<div>
		<h3 class="font-semibold tracking-[4px] ps-[4px] text-xl bg-white/20 text-white text-center 2xl:text-3xl py-1 mb-2">進場單位</h3>
		
		<div v-if="aggregatedUnits.length === 0" class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center">
			<p class="text-sm text-white/60 xl:text-base">尚無單位資料</p>
		</div>

		<div v-else class="grid grid-cols-4 gap-1">
			<template v-for="(unit, index) in displayUnits" :key="`${unit?.name || 'empty'}-${index}`">
				<div
					v-if="unit"
					class="flex flex-col justify-center items-center transition-all p-3"
					:class="{
						'bg-white/20': (unit.currentCount || 0) > 0,
						'bg-black/20': (unit.currentCount || 0) === 0
					}"
				>
					<div class="text-lg text-white font-semibold text-center 2xl:text-xl tracking-wide">
						{{ unit.name }}
					</div>
					<div class="text-base text-white 2xl:text-lg space-x-0.5">
						<span class="text-green-400">{{ unit.currentCount || 0 }}</span>
						<span>/</span>
						<span>{{ unit.capacity || 0 }}</span>
					</div>
				</div>
				<div
					v-else
					class="flex flex-col justify-center items-center transition-all bg-black/20 p-3"
				>
					<div class="text-lg text-white/30 font-semibold text-center 2xl:text-xl tracking-wide">
						-
					</div>
					<div class="text-base text-white/30 2xl:text-lg space-x-0.5">
						<span>-</span>
						<span>/</span>
						<span>-</span>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingLocation, PeopleCountingUnit } from "~/types/peopleCounting";

interface Props {
	locations: PeopleCountingLocation[];
}

const props = defineProps<Props>();

// 計算總計的進場人數、出場人數、在場人數
const totalEntryCount = computed(() => {
	return props.locations.reduce((sum, location) => sum + (location.entryCount || 0), 0);
});

const totalExitCount = computed(() => {
	return props.locations.reduce((sum, location) => sum + (location.exitCount || 0), 0);
});

const totalOnSiteCount = computed(() => {
	// 計算所有單位的在場人數加總
	return aggregatedUnits.value.reduce((sum, unit) => sum + (unit.currentCount || 0), 0);
});

// 聚合所有地點的單位數據（相同名稱的單位合併）
const aggregatedUnits = computed(() => {
	const unitMap = new Map<string, PeopleCountingUnit & { currentCount: number; capacity: number }>();

	props.locations.forEach(location => {
		location.units?.forEach(unit => {
			const key = unit.name;
			if (unitMap.has(key)) {
				const existing = unitMap.get(key)!;
				existing.currentCount = (existing.currentCount || 0) + (unit.currentCount || 0);
				existing.capacity = (existing.capacity || 0) + (unit.capacity || 0);
			} else {
				unitMap.set(key, {
					...unit,
					currentCount: unit.currentCount || 0,
					capacity: unit.capacity || 0
				});
			}
		});
	});

	return Array.from(unitMap.values());
});

// 確保顯示 16 個項目（4x4），不足的用 null 填充
const displayUnits = computed(() => {
	const units = aggregatedUnits.value;
	const displayCount = 16; // 4x4 = 16
	const result: (typeof units[0] | null)[] = [...units];
	
	// 如果不足 16 個，用 null 填充
	while (result.length < displayCount) {
		result.push(null);
	}
	
	// 只取前 16 個
	return result.slice(0, displayCount);
});
</script>

