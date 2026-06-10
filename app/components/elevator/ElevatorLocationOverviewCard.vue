<template>
	<div
		class="flex cursor-pointer gap-2 rounded-xl bg-white/10 py-1 transition-all"
		@click="$emit('click', location.locationId || Number(location.id || 0))"
	>
		<div
			class="my-4 flex w-[36px] items-center justify-center bg-white px-2 text-xl 2xl:text-xl"
			style="clip-path: polygon(0 0, 100% calc(0% + 24px), 100% calc(100% - 24px), 0 100%)"
		>
			{{ regionText }}
		</div>

		<div class="flex flex-1 flex-col items-center pr-2">
			<div class="mb-2 flex w-[160px] items-center justify-center border-b border-white/80 pb-px">
				<h3 class="text-base text-white 2xl:text-lg">{{ location.name }}</h3>
			</div>

			<div class="flex items-center gap-8 py-2">
				<div class="flex items-center justify-center gap-3 bg-white/20 p-2">
					<div class="text-sm font-semibold text-white 2xl:text-base">今日事件數</div>
					<div
						class="w-[80px] bg-black/20 text-white text-center text-xl 2xl:w-[100px] 2xl:text-2xl"
					>
						{{ location.todayEventCount ?? 0 }}
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { ElevatorLocation } from "~/types/elevator"

interface Props {
	location: ElevatorLocation & { overviewZoneName?: string | null }
}

const props = defineProps<Props>()
defineEmits<{ click: [locationId: number] }>()

const regionText = computed(() => props.location.overviewZoneName || "未分類")
</script>
