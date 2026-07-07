<template>
	<div class="mx-auto grid w-full max-w-6xl grid-cols-3 gap-6 rounded-lg text-white xl:gap-8">
		<div class="flex flex-col items-center justify-center gap-4 monitoring-chip-bg py-4">
			<div class="whitespace-nowrap text-[24px] font-semibold leading-none 2xl:text-[36px]">
				進場車輛
			</div>
			<div
				class="vehicle-stats-value flex min-w-[120px] items-center justify-center bg-black/20 text-[48px] leading-none 2xl:min-w-[200px] 2xl:text-[96px]"
			>
				{{ entryCount ?? 0 }}
			</div>
		</div>

		<div class="flex flex-col items-center justify-center gap-4 monitoring-chip-bg py-4">
			<div class="whitespace-nowrap text-[24px] font-semibold leading-none 2xl:text-[36px]">
				出場車輛
			</div>
			<div
				class="vehicle-stats-value flex min-w-[120px] items-center justify-center bg-black/20 text-[48px] leading-none 2xl:min-w-[200px] 2xl:text-[96px]"
			>
				{{ exitCount ?? 0 }}
			</div>
		</div>

		<div class="flex flex-col items-center justify-center gap-4 monitoring-chip-bg py-4">
			<div class="whitespace-nowrap text-[24px] font-semibold leading-none 2xl:text-[36px]">
				{{ thirdColumnLabel }}
			</div>
			<div
				class="vehicle-stats-value flex min-w-[120px] items-center justify-center bg-black/20 text-[48px] leading-none 2xl:min-w-[200px] 2xl:text-[96px]"
				:class="isAtOrOverCapacity ? 'text-amber-200' : ''"
			>
				{{ thirdColumnDisplay }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
	entryCount: number;
	exitCount: number;
	currentCount: number;
	onSiteCapacity?: number | null;
}

const props = defineProps<Props>();

const hasParkingCapacity = computed(() => {
	const cap = props.onSiteCapacity;
	return cap != null && cap > 0;
});

const thirdColumnLabel = computed(() =>
	hasParkingCapacity.value ? "剩餘車位" : "在場車輛",
);

/** 停車場：顯示剩餘車位；其餘模式：顯示在場車輛數（統計仍由 currentCount 計算） */
const thirdColumnDisplay = computed(() => {
	const onSite = props.currentCount ?? 0;
	const cap = props.onSiteCapacity;
	if (cap != null && cap > 0) return String(Math.max(0, cap - onSite));
	return String(onSite);
});

const isAtOrOverCapacity = computed(() => {
	const cap = props.onSiteCapacity;
	if (cap == null || cap < 1) return false;
	return (props.currentCount ?? 0) >= cap;
});
</script>
