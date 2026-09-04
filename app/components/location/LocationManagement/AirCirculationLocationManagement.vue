<template>
	<div class="space-y-3">
		<div
			v-if="!selectedLocation"
			class="py-8 text-center text-sm text-white/55 2xl:text-base"
		>
			請從左側選擇點位
		</div>
		<template v-else>
			<AirCirculationLocationFields
				:location="selectedLocation"
				:all-locations="locations"
				:current-index="selectedLocationIndex"
				:devices="devices"
				:is-loading-devices="isLoadingDevices"
				:group-view-category="selectedLocation.viewCategory ?? ''"
				@update="handleLocationUpdate"
			/>
			<p v-if="devices.length === 0 && !isLoadingDevices" class="mt-1 text-xs text-amber-300">
				{{ deviceHint }}
			</p>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { AirCirculationZone, AirCirculationLocation } from "~/types/air-circulation"
import type { Device } from "~/types/device"
import AirCirculationLocationFields from "../LocationFormFields/AirCirculationLocationFields.vue"

interface Props {
	zone: AirCirculationZone
	selectedLocationIndex: number
	devices: Device[]
	isLoadingDevices: boolean
	deviceHint?: string
}

interface Emits {
	(e: "update-location", index: number, location: AirCirculationLocation): void
}

const props = withDefaults(defineProps<Props>(), {
	deviceHint: "請先在「設備管理」中建立控制器設備",
})

const emit = defineEmits<Emits>()

const locations = computed(() => props.zone.locations || [])

const selectedLocation = computed(() => {
	const idx = props.selectedLocationIndex
	if (idx < 0 || idx >= locations.value.length) return null
	return locations.value[idx] ?? null
})

const handleLocationUpdate = (updatedLocation: AirCirculationLocation) => {
	emit("update-location", props.selectedLocationIndex, updatedLocation)
}
</script>
