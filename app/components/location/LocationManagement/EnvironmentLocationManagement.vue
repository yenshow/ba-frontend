<template>
	<div class="space-y-3">
		<div
			v-if="!selectedLocation"
			class="py-8 text-center text-sm text-white/55 2xl:text-base"
		>
			請從左側選擇地點
		</div>
		<template v-else>
			<EnvironmentLocationFields
				:location="selectedLocation"
				:devices="devices"
				:is-loading-devices="isLoadingDevices"
				@update="handleLocationUpdate"
			/>
			<p v-if="devices.length === 0 && !isLoadingDevices" class="mt-1 text-xs text-amber-300">
				{{ deviceHint }}
			</p>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { EnvironmentZone, EnvironmentLocation } from "~/types/environment"
import type { Device } from "~/types/device"
import EnvironmentLocationFields from "../LocationFormFields/EnvironmentLocationFields.vue"

interface Props {
	zone: EnvironmentZone
	selectedLocationIndex: number
	devices: Device[]
	isLoadingDevices: boolean
	deviceHint?: string
}

interface Emits {
	(e: "update-location", index: number, location: EnvironmentLocation): void
}

const props = withDefaults(defineProps<Props>(), {
	deviceHint: "請先在「設備管理」中建立感測器設備",
})

const emit = defineEmits<Emits>()

const locations = computed(() => props.zone.locations || [])

const selectedLocation = computed(() => {
	const idx = props.selectedLocationIndex
	if (idx < 0 || idx >= locations.value.length) return null
	return locations.value[idx] ?? null
})

const handleLocationUpdate = (updatedLocation: EnvironmentLocation) => {
	emit("update-location", props.selectedLocationIndex, updatedLocation)
}
</script>
