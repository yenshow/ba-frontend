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

			<div v-if="floors.length > 0" class="flex flex-wrap justify-center gap-2 px-2 py-2">
				<span
					v-for="floor in floors"
					:key="floor.index"
					class="rounded-md bg-white/20 px-2.5 py-1 text-sm text-white 2xl:text-base"
				>
					{{ floor.label }}
				</span>
			</div>
			<p v-else class="py-2 text-sm text-white/50 2xl:text-base">尚未設定樓層</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { ElevatorLocation } from "~/types/elevator"
import { defaultElevatorFloorLabel } from "~/utils/ladderFloorFormUtils"

interface Props {
	location: ElevatorLocation & { overviewZoneName?: string | null }
}

const props = defineProps<Props>()
defineEmits<{ click: [locationId: number] }>()

const regionText = computed(() => props.location.overviewZoneName || "未分類")

const floors = computed(() => {
	const count = Number(props.location.floorCount) || 0
	const names = props.location.floorNames ?? []
	if (count < 1) return []
	return Array.from({ length: count }, (_, i) => {
		const index = i + 1
		return {
			index,
			label: defaultElevatorFloorLabel(index, names),
		}
	})
})
</script>
