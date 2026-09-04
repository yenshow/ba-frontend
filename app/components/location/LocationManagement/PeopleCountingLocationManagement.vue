<template>
	<div class="space-y-3">
		<div
			v-if="!selectedLocation"
			class="py-8 text-center text-sm text-white/55 2xl:text-base"
		>
			請從左側選擇地點
		</div>
		<template v-else>
			<PeopleCountingLocationFields
				:location="selectedLocation"
				:person-groups="personGroups"
				:doors="doors"
				:access-control-devices="accessControlDevices"
				:isapi-camera-devices="isapiCameraDevices"
				:surveillance-camera-devices="surveillanceCameraDevices"
				@update="handleLocationUpdate"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting"
import type { Device } from "~/types/device"
import PeopleCountingLocationFields from "../LocationFormFields/PeopleCountingLocationFields.vue"

interface PersonGroup {
	id: number
	name: string
	is_deleted?: number
}

interface Door {
	id: number
	device_id: number
	dev_name: string
	door_index: number
	is_deleted?: number
}

interface Props {
	zone: PeopleCountingZone
	selectedLocationIndex: number
	personGroups?: PersonGroup[]
	doors?: Door[]
	accessControlDevices?: Device[]
	isapiCameraDevices?: Device[]
	surveillanceCameraDevices?: Device[]
}

interface Emits {
	(e: "update-location", index: number, location: PeopleCountingLocation): void
}

const props = withDefaults(defineProps<Props>(), {
	personGroups: () => [],
	doors: () => [],
	accessControlDevices: () => [],
	isapiCameraDevices: () => [],
	surveillanceCameraDevices: () => [],
})

const emit = defineEmits<Emits>()

const locations = computed(() => props.zone.locations || [])

const selectedLocation = computed(() => {
	const idx = props.selectedLocationIndex
	if (idx < 0 || idx >= locations.value.length) return null
	return locations.value[idx] ?? null
})

const handleLocationUpdate = (updatedLocation: PeopleCountingLocation) => {
	emit("update-location", props.selectedLocationIndex, updatedLocation)
}
</script>
