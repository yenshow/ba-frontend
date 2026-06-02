<template>
	<div class="mx-auto grid max-w-[90%] grid-cols-3 gap-8 rounded-lg text-white">
		<div class="flex flex-col items-center justify-center gap-4 bg-white/20 py-4">
			<div class="whitespace-nowrap text-[24px] font-semibold leading-none 2xl:text-[36px]">
				進場人數
			</div>
			<div
				class="flex min-w-[120px] items-center justify-center bg-black/20 text-[48px] leading-none 2xl:min-w-[200px] 2xl:text-[96px]"
			>
				{{ entryCount ?? 0 }}
			</div>
		</div>

		<div class="flex flex-col items-center justify-center gap-4 bg-white/20 py-4">
			<div class="whitespace-nowrap text-[24px] font-semibold leading-none 2xl:text-[36px]">
				出場人數
			</div>
			<div
				class="flex min-w-[120px] items-center justify-center bg-black/20 text-[48px] leading-none 2xl:min-w-[200px] 2xl:text-[96px]"
			>
				{{ exitCount ?? 0 }}
			</div>
		</div>

		<div class="flex flex-col items-center justify-center gap-4 bg-white/20 py-4">
			<div class="whitespace-nowrap text-[24px] font-semibold leading-none 2xl:text-[36px]">
				在場人數
			</div>
			<div
				class="flex min-w-[120px] items-center justify-center bg-black/20 text-[48px] leading-none 2xl:min-w-[200px] 2xl:text-[96px]"
			>
				{{ currentCount ?? 0 }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	entryCount: number;
	exitCount: number;
	currentCount: number;
}

defineProps<Props>();
</script>
