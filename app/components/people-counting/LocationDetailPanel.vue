<template>
	<div class="flex min-h-0 min-w-0 flex-col overflow-hidden">
		<!-- 標題一律外提，讓 UnitList 的 min-h 只撐卡片區（門禁／攝影機一致） -->
		<div class="relative mb-3 shrink-0">
			<h3
				class="people-detail-side-title monitoring-chip-bg py-1 text-center text-lg font-semibold text-white 2xl:text-xl"
			>
				{{ headerTitle }}
			</h3>
			<button
				v-if="isAccessControl"
				type="button"
				class="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-lg border border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-2 py-0.5 text-[10px] font-medium text-white transition-all hover:from-cyan-400/40 hover:to-blue-500/40 2xl:px-2.5 2xl:py-1 2xl:text-xs"
				:aria-label="showDoorPanel ? '切換為人員群組' : '切換為門控'"
				:aria-pressed="showDoorPanel"
				@click="emit('update:showDoorPanel', !showDoorPanel)"
			>
				{{ showDoorPanel ? "人員群組" : "門控" }}
			</button>
		</div>

		<AccessDoorGatePanel
			v-if="isAccessControl && showDoorPanel"
			hide-title
			class="min-h-0"
			:location="location"
			:can-write="canWrite"
		/>

		<div v-else class="show-scrollbar flex min-h-0 flex-1 flex-col space-y-8 overflow-y-auto">
			<UnitList
				hide-title
				:units="location.units || []"
				:selected-unit-id="selectedUnitId ?? undefined"
				:show-region-stats="isCameraRegionMode"
				:panel-title="unitPanelTitle"
				@select="emit('unit-select', $event)"
			/>

			<PersonnelList
				v-if="selectedUnitId !== null && !isCameraRegionMode"
				:personnel="personnel"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { PeopleCountingLocation, PeopleCountingPersonnel } from "~/types/peopleCounting"
import UnitList from "~/components/people-counting/UnitList.vue"
import PersonnelList from "~/components/people-counting/PersonnelList.vue"
import AccessDoorGatePanel from "~/components/people-counting/AccessDoorGatePanel.vue"
import { isFaceRecognitionCameraMode } from "~/utils/peopleCountingCameraMode"

const props = withDefaults(
	defineProps<{
		location: PeopleCountingLocation
		personnel: PeopleCountingPersonnel[]
		selectedUnitId?: number | null
		showDoorPanel?: boolean
		canWrite?: boolean
	}>(),
	{
		selectedUnitId: null,
		showDoorPanel: false,
		canWrite: false,
	}
)

const emit = defineEmits<{
	"unit-select": [unitId: number | null]
	"update:showDoorPanel": [value: boolean]
}>()

const isAccessControl = computed(() => props.location.dataSource === "access_control")
const isCameraRegionMode = computed(
	() =>
		props.location.dataSource === "isapi_camera" &&
		!isFaceRecognitionCameraMode(props.location.cameraMode)
)
const unitPanelTitle = computed(() => (isCameraRegionMode.value ? "分區" : "人員群組"))
const headerTitle = computed(() => {
	if (isAccessControl.value && props.showDoorPanel) return "門控"
	return unitPanelTitle.value
})
</script>
