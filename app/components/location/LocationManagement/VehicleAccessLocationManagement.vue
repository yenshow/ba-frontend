<template>
	<div class="space-y-3">
		<div
			v-if="!selectedLocation"
			class="py-8 text-center text-sm text-white/55 2xl:text-base"
		>
			請從左側選擇地點
		</div>
		<template v-else>
			<VehicleAccessLocationFields
				:location="selectedLocation"
				:vehicle-custom-groups="vehicleCustomGroups"
				@update="handleLocationUpdate"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { VehicleAccessZone, VehicleAccessLocation } from "~/types/vehicleAccess"
import VehicleAccessLocationFields from "../LocationFormFields/VehicleAccessLocationFields.vue"

interface VehicleCustomGroupOption {
	id: number
	list_name: string
}

interface Props {
	zone: VehicleAccessZone
	selectedLocationIndex: number
	vehicleCustomGroups?: VehicleCustomGroupOption[]
}

interface Emits {
	(e: "update-location", index: number, location: VehicleAccessLocation): void
}

const props = withDefaults(defineProps<Props>(), {
	vehicleCustomGroups: () => [],
})

const emit = defineEmits<Emits>()

const locations = computed(() => props.zone.locations || [])

const selectedLocation = computed(() => {
	const idx = props.selectedLocationIndex
	if (idx < 0 || idx >= locations.value.length) return null
	return locations.value[idx] ?? null
})

const handleLocationUpdate = (updatedLocation: VehicleAccessLocation) => {
	emit("update-location", props.selectedLocationIndex, updatedLocation)
}
</script>
