<template>
	<div class="space-y-3">
		<div
			v-if="!selectedLocation"
			class="py-8 text-center text-sm text-white/55 2xl:text-base"
		>
			請從左側選擇戶別
		</div>
		<template v-else>
			<IntercomLocationFields
				:location="selectedLocation"
				:floor="selectedLocation.floor || ''"
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
import IntercomLocationFields from "../LocationFormFields/IntercomLocationFields.vue"
import type { IntercomZone, IntercomLocation } from "~/types/intercom"
import type { Device } from "~/types/device"

interface Props {
	zone: IntercomZone
	selectedLocationIndex: number
	devices: Device[]
	isLoadingDevices: boolean
	deviceHint?: string
}

interface Emits {
	(e: "update-location", index: number, location: IntercomLocation): void
}

const props = withDefaults(defineProps<Props>(), {
	deviceHint: "請先在「設備管理」建立視訊對講室內機（管理中心主機選填）",
})

const emit = defineEmits<Emits>()

const locations = computed(() => props.zone.locations || [])

const selectedLocation = computed(() => {
	const idx = props.selectedLocationIndex
	if (idx < 0 || idx >= locations.value.length) return null
	return locations.value[idx] ?? null
})

const handleLocationUpdate = (updatedLocation: IntercomLocation) => {
	emit("update-location", props.selectedLocationIndex, updatedLocation)
}
</script>
