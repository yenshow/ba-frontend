<template>
	<div class="flex min-h-0 min-w-0 flex-col overflow-hidden">
		<div v-if="isAccessControl" class="relative mb-3 shrink-0">
			<h3
				class="people-detail-side-title monitoring-chip-bg py-1 text-center text-lg font-semibold text-white 2xl:text-xl"
			>
				{{ showDoorPanel ? "門控" : "人員群組" }}
			</h3>
			<button
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
		<PeopleUnitGroupPanel
			v-else
			class="min-h-0"
			:units="location?.units ?? []"
			:selected-unit-id="selectedUnitId"
			:is-isapi-camera="isIsapiCamera"
			:hide-title="isAccessControl"
			@select="emit('select', $event)"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { PeopleCountingLocation } from "~/types/peopleCounting"
import AccessDoorGatePanel from "~/components/people-counting/AccessDoorGatePanel.vue"
import PeopleUnitGroupPanel from "~/components/people-counting/PeopleUnitGroupPanel.vue"

const props = withDefaults(
	defineProps<{
		location?: PeopleCountingLocation | null
		selectedUnitId?: number | null
		showDoorPanel?: boolean
		canWrite?: boolean
	}>(),
	{
		location: null,
		selectedUnitId: null,
		showDoorPanel: false,
		canWrite: false,
	}
)

const emit = defineEmits<{
	(e: "update:showDoorPanel", value: boolean): void
	(e: "select", unitId: number): void
}>()

const isAccessControl = computed(() => props.location?.dataSource === "access_control")
const isIsapiCamera = computed(() => props.location?.dataSource === "isapi_camera")
</script>
