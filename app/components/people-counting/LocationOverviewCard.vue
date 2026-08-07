<template>
	<div
		class="flex cursor-pointer gap-2 rounded-xl bg-white/10 py-1 transition-all"
		tabindex="0"
		role="button"
		:aria-label="`查看 ${location.name}`"
		@click="handleClick"
		@keydown.enter="handleClick"
		@keydown.space.prevent="handleClick"
	>
		<div class="overview-zone-tag">
			{{ regionText }}
		</div>

		<div class="relative flex flex-1 flex-col items-center pr-2">
			<button
				v-if="isAccessControlLocation"
				type="button"
				class="absolute right-2 top-1 z-10 rounded-lg border border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-2 py-0.5 text-[10px] font-medium text-white transition-all hover:from-cyan-400/40 hover:to-blue-500/40 2xl:px-2.5 2xl:py-1 2xl:text-xs"
				:aria-label="showDoorPanel ? '切換為資訊' : '切換為門控'"
				:aria-pressed="showDoorPanel"
				@click.stop="showDoorPanel = !showDoorPanel"
			>
				{{ showDoorPanel ? "資訊" : "門控" }}
			</button>
			<span
				v-else-if="cameraModeBadge"
				class="absolute right-2 top-1 z-10 rounded-lg border border-white/40 bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white 2xl:px-2.5 2xl:py-1 2xl:text-xs"
			>
				{{ cameraModeBadge }}
			</span>

			<div class="mb-2 flex w-[160px] items-center justify-center border-b border-white/80 pb-px">
				<h3 class="text-base text-white 2xl:text-lg">{{ location.name }}</h3>
			</div>

			<div v-if="showDoorPanel" class="w-full max-h-[220px] overflow-y-auto py-2 text-white">
				<AccessDoorGatePanel variant="compact" :location="location" :can-write="canWrite" />
			</div>

			<div v-else class="flex items-center gap-8 py-2">
				<div
					class="flex min-w-[140px] flex-col gap-3 border-r-2 border-white/50 pr-8 text-white 2xl:min-w-[160px]"
				>
					<div class="flex items-center justify-center gap-3 monitoring-chip-bg p-2">
						<div class="overview-stat-label">進場人數</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ location.entryCount ?? 0 }}
						</div>
					</div>

					<div class="flex items-center justify-center gap-3 monitoring-chip-bg p-2">
						<div class="overview-stat-label">出場人數</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ location.exitCount ?? 0 }}
						</div>
					</div>

					<div class="flex items-center justify-center gap-3 monitoring-chip-bg p-2">
						<div class="overview-stat-label">在場人數</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ currentCount }}
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
import type { PeopleCountingLocation } from "~/types/peopleCounting"
import { computed, ref, toRefs, watch } from "vue"
import { computeCumulativePresence } from "~/utils/entryExitStats"
import AccessDoorGatePanel from "~/components/people-counting/AccessDoorGatePanel.vue"
import {
	isFaceRecognitionCameraMode,
	PEOPLE_COUNTING_CAMERA_MODE_LABELS,
} from "~/utils/peopleCountingCameraMode"

const props = withDefaults(
	defineProps<{
		location: PeopleCountingLocation & { overviewZoneName?: string | null }
		canWrite?: boolean
	}>(),
	{ canWrite: false }
)
const { location } = toRefs(props)

const emit = defineEmits<{
	click: [locationId: number]
}>()

const showDoorPanel = ref(false)

watch(
	() => props.location.locationId ?? props.location.id,
	() => {
		showDoorPanel.value = false
	}
)

const regionText = computed(() => location.value.overviewZoneName || "未分類")
const isIsapiCamera = computed(() => location.value.dataSource === "isapi_camera")
const isAccessControlLocation = computed(() => location.value.dataSource === "access_control")
const cameraModeBadge = computed(() => {
	if (!isIsapiCamera.value) return null
	return isFaceRecognitionCameraMode(location.value.cameraMode)
		? PEOPLE_COUNTING_CAMERA_MODE_LABELS.face_recognition
		: PEOPLE_COUNTING_CAMERA_MODE_LABELS.people_counting
})

const currentCount = computed(() => {
	if (isIsapiCamera.value) {
		return computeCumulativePresence(
			location.value.entryCount ?? 0,
			location.value.exitCount ?? 0
		)
	}
	if (location.value.currentCount != null) return location.value.currentCount
	if (!location.value.units) return 0
	return location.value.units.reduce((sum, unit) => sum + (unit.currentCount || 0), 0)
})

const TOTAL_GRID_CELLS = 12

const displayUnits = computed(() => {
	const units = (location.value.units ?? []).slice(0, TOTAL_GRID_CELLS)
	return [...units, ...Array(TOTAL_GRID_CELLS - units.length).fill(null)]
})

const handleClick = () => {
	emit("click", location.value.locationId || Number(location.value.id || 0))
}
</script>
