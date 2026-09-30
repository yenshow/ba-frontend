<template>
	<div
		class="flex cursor-pointer gap-2 rounded-xl bg-white/10 py-1 transition-all"
		tabindex="0"
		role="button"
		:aria-label="`查看 ${location.name}`"
		@click="emit('click', location)"
		@keydown.enter="emit('click', location)"
		@keydown.space.prevent="emit('click', location)"
	>
		<div class="overview-zone-tag">
			{{ location.zoneName || "未分類" }}
		</div>

		<div class="relative flex flex-1 flex-col items-center pr-2">
			<div class="mb-2 flex w-[160px] items-center justify-center border-b border-white/80 pb-px">
				<h3 class="text-base text-white 2xl:text-lg">{{ location.name }}</h3>
			</div>

			<div class="flex items-center gap-8 py-2">
				<div
					class="flex min-w-[140px] flex-col gap-3 border-r-2 border-white/50 pr-8 text-white 2xl:min-w-[160px]"
				>
					<div class="flex items-center justify-center gap-3 monitoring-chip-bg p-2">
						<div class="overview-stat-label">應到人數</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ summary.expectedCount }}
						</div>
					</div>
					<div class="flex items-center justify-center gap-3 monitoring-chip-bg p-2">
						<div class="overview-stat-label">實到人數</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ summary.presentCount }}
						</div>
					</div>
					<div class="flex items-center justify-center gap-3 monitoring-chip-bg p-2">
						<div class="overview-stat-label">未到人數</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ summary.absentCount }}
						</div>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-2 overflow-hidden" @click.stop>
					<div
						v-for="(unit, index) in displayUnits"
						:key="unit ? unit.id : `empty-${index}`"
						class="flex min-h-[36px] min-w-[64px] items-center justify-center p-2 text-center transition-all"
						:class="{
							'monitoring-chip-bg': unit && (unit.currentCount || 0) > 0,
							'bg-black/20': !unit || (unit.currentCount || 0) === 0,
							'text-white/90': unit,
							'text-white/30': !unit,
						}"
						:title="unit ? unit.name : ''"
					>
						<span v-if="unit" class="line-clamp-2 text-[11px] font-semibold text-white 2xl:text-xs">
							{{ unit.name }}
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { RollCallTodayLocation } from "~/types/rollCall"

const props = defineProps<{
	location: RollCallTodayLocation
}>()

const emit = defineEmits<{
	click: [location: RollCallTodayLocation]
}>()

const TOTAL_GRID_CELLS = 12

const primarySession = computed(() => {
	const sessions = props.location.sessions || []
	return (
		sessions.find((item) => item.status === "open") ||
		sessions.find((item) => item.status === "closed") ||
		sessions[0] ||
		null
	)
})

const summary = computed(() => {
	const session = primarySession.value
	return {
		expectedCount: session?.expectedCount ?? 0,
		presentCount: session?.presentCount ?? 0,
		absentCount: session?.absentCount ?? 0,
	}
})

const displayUnits = computed(() => {
	const units = (props.location.units || []).slice(0, TOTAL_GRID_CELLS)
	return [...units, ...Array(TOTAL_GRID_CELLS - units.length).fill(null)]
})
</script>
