<template>
	<!-- 三個統計數字 -->
	<div class="mb-4 grid grid-cols-3 gap-1 2xl:mb-6">
		<div class="bg-white/20 text-center">
			<div
				class="w-full bg-white/25 py-2 ps-[4px] text-xl font-semibold tracking-[4px] text-white 2xl:text-3xl"
			>
				進場人數
			</div>
			<div
				class="flex h-[100px] items-center justify-center text-6xl text-white 2xl:h-[150px] 2xl:text-8xl"
			>
				{{ totalEntryCount }}
			</div>
		</div>

		<div class="bg-white/20 text-center">
			<div
				class="w-full bg-white/25 py-2 ps-[4px] text-xl font-semibold tracking-[4px] text-white 2xl:text-3xl"
			>
				出場人數
			</div>
			<div
				class="flex h-[100px] items-center justify-center text-6xl text-white 2xl:h-[150px] 2xl:text-8xl"
			>
				{{ totalExitCount }}
			</div>
		</div>

		<div class="bg-white/20 text-center">
			<div
				class="w-full bg-white/25 py-2 ps-[4px] text-xl font-semibold tracking-[4px] text-white 2xl:text-3xl"
			>
				在場人數
			</div>
			<div
				class="flex h-[100px] items-center justify-center text-6xl text-white 2xl:h-[150px] 2xl:text-8xl"
			>
				{{ totalOnSiteCount }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingLocation } from "~/types/peopleCounting";

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
	return props.locations.reduce(
		(sum, location) =>
			sum + (location.units?.reduce((s, unit) => s + (unit.currentCount || 0), 0) || 0),
		0
	);
});
</script>
