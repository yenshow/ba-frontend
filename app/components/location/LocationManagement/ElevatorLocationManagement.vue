<template>
	<div class="space-y-3">
		<div
			v-if="!selectedLocation"
			class="py-8 text-center text-sm text-white/55 2xl:text-base"
		>
			請從左側選擇地點
		</div>
		<template v-else>
			<ElevatorLocationFields
				:location="selectedLocation"
				:devices="devices"
				:access-control-devices="accessControlDevices"
				@update="handleLocationUpdate"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import ElevatorLocationFields from "../LocationFormFields/ElevatorLocationFields.vue"
import type { ElevatorZone, ElevatorLocation } from "~/types/elevator"
import type { Device } from "~/types/device"

interface Props {
	zone: ElevatorZone
	selectedLocationIndex: number
	devices?: Device[]
	accessControlDevices?: Device[]
}

const props = withDefaults(defineProps<Props>(), {
	devices: () => [],
	accessControlDevices: () => [],
})

const emit = defineEmits<{
	"update-location": [index: number, location: ElevatorLocation]
}>()

const locations = computed(() => props.zone.locations || [])

const selectedLocation = computed(() => {
	const idx = props.selectedLocationIndex
	if (idx < 0 || idx >= locations.value.length) return null
	return locations.value[idx] ?? null
})

const handleLocationUpdate = (updatedLocation: ElevatorLocation) => {
	emit("update-location", props.selectedLocationIndex, updatedLocation)
}
</script>
