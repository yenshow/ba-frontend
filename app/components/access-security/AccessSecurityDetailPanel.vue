<template>
	<div class="flex min-h-0 flex-1">
		<div class="flex min-w-0 flex-1 flex-col gap-8">
			<AccessSecurityMainStationPanel :main-stations="mainStations" />
			<AccessSecurityIntercomLogTable
				:events="events"
				:locations="locations"
				:focused-location-id="focusedLocationId"
			/>
		</div>
		<div class="ms-4 flex min-h-0 min-w-0 flex-1 flex-col border-l-2 border-white/30 ps-4">
			<AccessSecurityIndoorPanel
				:grouped-floors="groupedFloors"
				:focused-location-id="focusedLocationId"
				:ringing-location-id="ringingLocationId"
				:can-ring="canRing"
				@focus="emit('focus', $event)"
				@ring="emit('ring', $event)"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import type {
	AccessSecurityFloorGroup,
	AccessSecurityMainStation,
	AccessSecuritySiteLocation,
} from "~/types/accessSecurity"
import type { OperationalEvent } from "~/composables/systems/useOperationalEvents"
import AccessSecurityMainStationPanel from "~/components/access-security/AccessSecurityMainStationPanel.vue"
import AccessSecurityIntercomLogTable from "~/components/access-security/AccessSecurityIntercomLogTable.vue"
import AccessSecurityIndoorPanel from "~/components/access-security/AccessSecurityIndoorPanel.vue"

withDefaults(
	defineProps<{
		locations: AccessSecuritySiteLocation[]
		groupedFloors: AccessSecurityFloorGroup[]
		mainStations: AccessSecurityMainStation[]
		events: OperationalEvent[]
		focusedLocationId?: number | null
		ringingLocationId?: number | null
		canRing?: boolean
	}>(),
	{
		focusedLocationId: null,
		ringingLocationId: null,
		canRing: false,
	}
)

const emit = defineEmits<{
	focus: [locationId: number]
	ring: [locationId: number]
}>()
</script>
