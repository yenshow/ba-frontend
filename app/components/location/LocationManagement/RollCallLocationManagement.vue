<template>
	<div class="space-y-3">
		<div v-if="!selectedLocation" class="py-8 text-center text-sm text-white/55 2xl:text-base">
			請從左側選擇地點
		</div>
		<RollCallLocationFields
			v-else
			:location="selectedLocation"
			:access-control-devices="accessControlDevices"
			@update="handleLocationUpdate"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Device } from "~/types/device"
import type { RollCallLocation, RollCallZone } from "~/types/rollCall"
import RollCallLocationFields from "../LocationFormFields/RollCallLocationFields.vue"

const props = withDefaults(
	defineProps<{
		zone: RollCallZone
		selectedLocationIndex: number
		accessControlDevices?: Device[]
	}>(),
	{ accessControlDevices: () => [] },
)

const emit = defineEmits<{
	"update-location": [index: number, location: RollCallLocation]
}>()

const locations = computed(() => props.zone.locations || [])

const selectedLocation = computed(() => {
	const idx = props.selectedLocationIndex
	if (idx < 0 || idx >= locations.value.length) return null
	return locations.value[idx] ?? null
})

const handleLocationUpdate = (updatedLocation: RollCallLocation) => {
	emit("update-location", props.selectedLocationIndex, updatedLocation)
}
</script>
