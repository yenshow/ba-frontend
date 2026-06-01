<template>
	<div class="mx-auto grid max-w-[90%] grid-cols-3 gap-8 rounded-lg text-white">
		<div class="flex flex-col items-center justify-center gap-4 bg-white/20 py-4">
			<div class="whitespace-nowrap text-[24px] font-semibold leading-none 2xl:text-[36px]">
				進場車輛
			</div>
			<div
				class="flex min-w-[120px] items-center justify-center bg-black/20 text-[48px] leading-none 2xl:min-w-[200px] 2xl:text-[96px]"
			>
				{{ entryCount ?? 0 }}
			</div>
		</div>

		<div class="flex flex-col items-center justify-center gap-4 bg-white/20 py-4">
			<div class="whitespace-nowrap text-[24px] font-semibold leading-none 2xl:text-[36px]">
				出場車輛
			</div>
			<div
				class="flex min-w-[120px] items-center justify-center bg-black/20 text-[48px] leading-none 2xl:min-w-[200px] 2xl:text-[96px]"
			>
				{{ exitCount ?? 0 }}
			</div>
		</div>

		<div class="flex flex-col items-center justify-center gap-4 bg-white/20 py-4">
			<div class="whitespace-nowrap text-[24px] font-semibold leading-none 2xl:text-[36px]">
				在場車輛
			</div>
			<div
				class="flex min-w-[120px] items-center justify-center bg-black/20 text-[48px] leading-none 2xl:min-w-[200px] 2xl:text-[96px]"
				:class="isAtOrOverCapacity ? 'text-amber-200' : ''"
			>
				{{ onSiteDisplay }}
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
	/** 停車場模式：在場上限，顯示為「目前/上限」 */
	onSiteCapacity?: number | null;
}

const props = defineProps<Props>();

const onSiteDisplay = computed(() => {
	const n = props.currentCount ?? 0;
	const cap = props.onSiteCapacity;
	if (cap != null && cap > 0) return `${n}/${cap}`;
	return String(n);
});

const isAtOrOverCapacity = computed(() => {
	const cap = props.onSiteCapacity;
	if (cap == null || cap < 1) return false;
	return (props.currentCount ?? 0) >= cap;
});
</script>
