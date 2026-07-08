<template>
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<span class="text-base font-medium 2xl:text-lg">點位列表</span>
			<PermissionActionButton
				:allowed="allowCreateLocation"
				aria-label="新增點位"
				class="btn-secondary text-sm 2xl:text-base"
				@click="handleAddLocation"
			>
				新增點位
			</PermissionActionButton>
		</div>

		<div
			v-if="getLocations(zone).length === 0"
			class="py-4 text-center text-sm text-white/60 2xl:text-base"
		>
			尚無點位，請新增點位
		</div>

		<div v-else class="space-y-2">
			<div
				v-for="(location, locationIndex) in getLocations(zone)"
				:key="getLocationId(location, locationIndex)"
				class="flex min-w-0 items-start gap-2 rounded border border-white/10 bg-white/5 p-2"
			>
				<div class="min-w-0 flex-1">
					<EmergencyRescueLocationFields
						:location="location"
						:all-locations="getLocations(zone)"
						:current-index="locationIndex"
						:devices="devices"
						:is-loading-devices="isLoadingDevices"
						@update="handleLocationUpdate(locationIndex, $event)"
					/>
				</div>

				<div v-if="reorderableLocations" class="btn-reorder-stack shrink-0 self-start">
					<button
						type="button"
						class="btn-reorder-arrow"
						:disabled="locationIndex === 0"
						title="上移"
						aria-label="此點位上移"
						@click="emit('reorder-location', { index: locationIndex, direction: 'up' })"
					>
						↑
					</button>
					<button
						type="button"
						class="btn-reorder-arrow"
						:disabled="locationIndex >= getLocations(zone).length - 1"
						title="下移"
						aria-label="此點位下移"
						@click="emit('reorder-location', { index: locationIndex, direction: 'down' })"
					>
						↓
					</button>
				</div>

				<IconTrashButton
					:allowed="allowDeleteLocation"
					button-class="ml-auto flex-shrink-0"
					title="刪除點位"
					aria-label="刪除此點位"
					@click="handleRemoveLocation(locationIndex)"
				/>
			</div>
		</div>

		<p v-if="devices.length === 0 && !isLoadingDevices" class="mt-1 text-xs text-amber-300">
			{{ deviceHint }}
		</p>
	</div>
</template>

<script setup lang="ts">
import IconTrashButton from "~/components/common/IconTrashButton.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"

import type { EmergencyRescueZone, EmergencyRescueLocation } from "~/types/emergency-rescue"
import type { Device } from "~/types/device"
import EmergencyRescueLocationFields from "../LocationFormFields/EmergencyRescueLocationFields.vue"
import { getLocationUiKey } from "~/utils/locationUiId"

interface Props {
	zone: EmergencyRescueZone
	devices: Device[]
	isLoadingDevices: boolean
	deviceHint?: string
	reorderableLocations?: boolean
	allowCreateLocation?: boolean
	allowDeleteLocation?: boolean
}

interface Emits {
	(e: "add-location"): void
	(e: "remove-location", index: number): void
	(e: "update-location", index: number, location: EmergencyRescueLocation): void
	(e: "reorder-location", payload: { index: number; direction: "up" | "down" }): void
}

const props = withDefaults(defineProps<Props>(), {
	allowCreateLocation: true,
	allowDeleteLocation: true,
	deviceHint: "請先在「設備管理」中建立控制器設備",
	reorderableLocations: false,
})

const emit = defineEmits<Emits>()

const getLocations = (zone: EmergencyRescueZone): EmergencyRescueLocation[] => {
	return zone.locations || []
}

const getLocationId = (location: EmergencyRescueLocation, index: number): string => {
	return getLocationUiKey({
		zone: props.zone as any,
		location: location as any,
		locationIndex: index,
	})
}

const handleAddLocation = () => {
	emit("add-location")
}

const handleRemoveLocation = (locationIndex: number) => {
	emit("remove-location", locationIndex)
}

const handleLocationUpdate = (locationIndex: number, updatedLocation: EmergencyRescueLocation) => {
	emit("update-location", locationIndex, updatedLocation)
}
</script>
