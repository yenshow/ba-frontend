<template>
	<div
		class="flex min-w-[10rem] max-w-[14rem] flex-col gap-0.5"
		:class="{ 'pointer-events-none opacity-50': disabled || loading }"
		role="group"
		aria-label="選擇樓層"
	>
		<span class="text-sm text-white/70 2xl:text-base">目前樓層</span>
		<FilterDropdown
			:model-value="selectedValue"
			:options="floorOptions"
			:placeholder="loading ? '載入樓層…' : '請選擇樓層'"
			text-size="text-sm 2xl:text-base"
			@update:model-value="handleSelect"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import type { ElevatorFloorAccessSlot } from "~/types/elevator"

const props = withDefaults(
	defineProps<{
		floors: ElevatorFloorAccessSlot[]
		selectedFloorIndex: number | null
		selectedCountForFloor: (floorIndex: number) => number
		loading?: boolean
		disabled?: boolean
	}>(),
	{
		loading: false,
		disabled: false,
	},
)

const emit = defineEmits<{
	select: [floorIndex: number]
}>()

const formatFloorLabel = (floor: ElevatorFloorAccessSlot) => {
	const name = String(floor.name ?? "").trim()
	const base = name ? `${floor.code} ${name}` : floor.code
	const count = props.selectedCountForFloor(floor.index)
	return `${base} (${count})`
}

const floorOptions = computed(() =>
	props.floors.map((floor) => ({
		value: String(floor.index),
		label: formatFloorLabel(floor),
	})),
)

const selectedValue = computed(() =>
	props.selectedFloorIndex != null ? String(props.selectedFloorIndex) : "",
)

const handleSelect = (value: string) => {
	const next = Number(value)
	if (!Number.isFinite(next)) return
	emit("select", next)
}
</script>
