<template>
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<span class="text-base font-medium 2xl:text-lg">地點</span>
			<PermissionActionButton
				:allowed="allowCreateLocation"
				aria-label="新增地點"
				class="btn-secondary text-sm 2xl:text-base"
				@click="handleAddLocation"
			>
				新增地點
			</PermissionActionButton>
		</div>

		<div
			v-if="(zone.locations || []).length === 0"
			class="py-4 text-center text-sm text-white/60 2xl:text-base"
		>
			尚無地點，請新增地點
		</div>
		<div v-else class="space-y-2">
			<div
				v-for="(location, locationIndex) in zone.locations"
				:key="getLocationId(location, locationIndex)"
				class="flex min-w-0 items-start gap-2 rounded border border-white/10 bg-white/5 p-2"
			>
				<div class="min-w-0 flex-1">
					<ElevatorLocationFields
						:location="location"
						:devices="devices"
						@update="handleLocationUpdate(locationIndex, $event)"
					/>
				</div>

				<div v-if="reorderableLocations" class="btn-reorder-stack shrink-0 self-start">
					<button
						type="button"
						class="btn-reorder-arrow"
						:disabled="locationIndex === 0"
						title="上移"
						aria-label="此地點上移"
						@click="emit('reorder-location', { index: locationIndex, direction: 'up' })"
					>
						↑
					</button>
					<button
						type="button"
						class="btn-reorder-arrow"
						:disabled="locationIndex >= (zone.locations || []).length - 1"
						title="下移"
						aria-label="此地點下移"
						@click="emit('reorder-location', { index: locationIndex, direction: 'down' })"
					>
						↓
					</button>
				</div>

				<IconTrashButton
					:disabled="!allowDeleteLocation"
					button-class="ml-auto flex-shrink-0"
					title="刪除地點"
					aria-label="刪除此地點"
					@click="handleRemoveLocation(locationIndex)"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import IconTrashButton from "~/components/common/IconTrashButton.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import ElevatorLocationFields from "../LocationFormFields/ElevatorLocationFields.vue"
import type { ElevatorZone, ElevatorLocation } from "~/types/elevator"
import type { Device } from "~/types/device"
import { getLocationUiKey } from "~/utils/locationUiId"

interface Props {
	zone: ElevatorZone
	devices?: Device[]
	reorderableLocations?: boolean
	allowCreateLocation?: boolean
	allowDeleteLocation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	devices: () => [],
	reorderableLocations: false,
	allowCreateLocation: true,
	allowDeleteLocation: true,
})

const emit = defineEmits<{
	"add-location": []
	"remove-location": [index: number]
	"update-location": [index: number, location: ElevatorLocation]
	"reorder-location": [payload: { index: number; direction: "up" | "down" }]
}>()

const getLocationId = (location: ElevatorLocation, index: number) =>
	getLocationUiKey({ zone: props.zone as never, location: location as never, locationIndex: index })

const handleAddLocation = () => emit("add-location")
const handleRemoveLocation = (index: number) => emit("remove-location", index)
const handleLocationUpdate = (index: number, location: ElevatorLocation) =>
	emit("update-location", index, location)
</script>
