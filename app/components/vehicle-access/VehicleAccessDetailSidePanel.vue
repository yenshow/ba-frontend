<template>
	<div class="flex min-h-0 min-w-0 flex-col overflow-hidden">
		<div v-if="isIsapiCamera" class="relative mb-3 shrink-0">
			<h3
				class="vehicle-detail-side-title monitoring-chip-bg py-1 text-center text-lg font-semibold text-white 2xl:text-xl"
			>
				{{ showBarrierPanel ? "柵欄機" : "人員群組" }}
			</h3>
			<button
				type="button"
				class="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-lg border border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-2 py-0.5 text-[10px] font-medium text-white transition-all hover:from-cyan-400/40 hover:to-blue-500/40 2xl:px-2.5 2xl:py-1 2xl:text-xs"
				:aria-label="showBarrierPanel ? '切換為人員群組' : '切換為柵欄機控制'"
				:aria-pressed="showBarrierPanel"
				@click="emit('update:showBarrierPanel', !showBarrierPanel)"
			>
				{{ showBarrierPanel ? "人員群組" : "柵欄機" }}
			</button>
		</div>

		<VehicleBarrierGatePanel
			v-if="isIsapiCamera && showBarrierPanel"
			hide-title
			class="min-h-0"
			:location="location"
			:can-write="canWrite"
		/>
		<VehicleOrganizationGroupPanel
			v-else
			class="min-h-0"
			:hide-title="isIsapiCamera"
			:groups="groups"
			:selected-group-key="selectedGroupKey"
			:panel-title="isIsapiCamera ? '人員群組' : '車輛群組'"
			@select="emit('select-group', $event)"
		/>
	</div>
</template>

<script setup lang="ts">
import type {
	VehicleAccessLocation,
	VehicleOrganizationGroupItem,
} from "~/types/vehicleAccess"
import VehicleBarrierGatePanel from "~/components/vehicle-access/VehicleBarrierGatePanel.vue"
import VehicleOrganizationGroupPanel from "~/components/vehicle-access/VehicleOrganizationGroupPanel.vue"

defineProps<{
	isIsapiCamera: boolean
	showBarrierPanel: boolean
	location?: VehicleAccessLocation | null
	canWrite?: boolean
	groups: VehicleOrganizationGroupItem[]
	selectedGroupKey?: string
}>()

const emit = defineEmits<{
	(e: "update:showBarrierPanel", value: boolean): void
	(e: "select-group", groupKey: string): void
}>()
</script>
