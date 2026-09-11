<template>
	<div
		class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5"
	>
		<div class="flex items-end justify-between gap-2 border-b border-white/10 p-3">
			<div class="flex min-w-0 flex-col gap-0.5">
				<span class="text-sm text-white/70 2xl:text-base">樓層</span>
				<p class="truncate text-sm font-semibold text-white 2xl:text-base">
					{{ hasSelectedPeople ? `已選 ${selectedPersonCount} 人` : "請先選擇人員" }}
				</p>
			</div>
			<button
				type="button"
				class="btn-secondary shrink-0 whitespace-nowrap text-sm 2xl:text-base"
				:disabled="!canSelectAll || isDisabled"
				:aria-label="isAllSelected ? '取消全選樓層' : '全選樓層'"
				@click="emit('toggleSelectAll')"
			>
				{{ isAllSelected ? "取消" : "全選" }}
			</button>
		</div>

		<div v-if="isLoading" class="min-h-0 flex-1 overflow-hidden p-3">
			<p class="sr-only">載入樓層清單</p>
			<ContentSkeleton variant="table" :rows="6" :columns="1" />
		</div>
		<div
			v-else-if="showPlaceholder"
			class="flex min-h-0 flex-1 items-center justify-center px-4 text-center"
		>
			<p class="text-sm text-white/60 2xl:text-base">{{ placeholderText }}</p>
		</div>
		<div v-else class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-3 pe-1">
			<ul class="space-y-2" role="list" aria-label="樓層授權">
				<li v-for="floor in floors" :key="floor.index">
					<label
						class="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 2xl:min-h-11"
						:class="{
							'ring-1 ring-cyan-400/35':
								isChecked(floor.index) || isIndeterminate(floor.index),
						}"
					>
						<input
							type="checkbox"
							class="h-[1.125rem] w-[1.125rem] shrink-0 accent-cyan-400 2xl:h-5 2xl:w-5"
							:checked="isChecked(floor.index)"
							:indeterminate="isIndeterminate(floor.index)"
							:disabled="!canEdit || isDisabled"
							:aria-label="`授權 ${formatFloorLabel(floor)}`"
							@change="handleToggle(floor.index, $event)"
						/>
						<span class="min-w-0 flex-1 truncate text-sm text-white/90 2xl:text-base">
							{{ formatFloorLabel(floor) }}
						</span>
						<span
							class="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs tabular-nums text-white/55 2xl:text-sm"
						>
							{{ selectedCountForFloor(floor.index) }}
						</span>
					</label>
				</li>
			</ul>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import ContentSkeleton from "~/components/common/ContentSkeleton.vue"
import type { ElevatorFloorAccessSlot } from "~/types/elevator"
import { formatElevatorFloorAccessName } from "~/utils/elevatorDisplayUtils"

const props = withDefaults(
	defineProps<{
		floors: ElevatorFloorAccessSlot[]
		isChecked: (floorIndex: number) => boolean
		isIndeterminate: (floorIndex: number) => boolean
		selectedCountForFloor: (floorIndex: number) => number
		selectedPersonCount: number
		canEdit: boolean
		isDisabled?: boolean
		isLoading?: boolean
		canSelectAll: boolean
		isAllSelected: boolean
	}>(),
	{
		isDisabled: false,
		isLoading: false,
	},
)

const emit = defineEmits<{
	toggleSelectAll: []
	toggle: [floorIndex: number, checked: boolean]
}>()

const hasSelectedPeople = computed(() => props.selectedPersonCount > 0)

const showPlaceholder = computed(
	() => !hasSelectedPeople.value || props.floors.length === 0,
)

const placeholderText = computed(() =>
	hasSelectedPeople.value ? "此地點尚無樓層" : "勾選人員後即可一次勾選樓層",
)

const formatFloorLabel = (floor: ElevatorFloorAccessSlot) => {
	const name = formatElevatorFloorAccessName(floor)
	return name ? `${floor.code} ${name}` : floor.code
}

const handleToggle = (floorIndex: number, event: Event) => {
	const checked = (event.target as HTMLInputElement | null)?.checked ?? false
	emit("toggle", floorIndex, checked)
}
</script>
