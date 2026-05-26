<template>
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<span class="text-base font-medium 2xl:text-lg">地點</span>
			<button type="button" class="btn-secondary text-sm 2xl:text-base" @click="handleAddLocation">
				新增地點
			</button>
		</div>

		<div
			v-if="visibleLocations.length === 0"
			class="py-4 text-center text-sm text-white/60 2xl:text-base"
		>
			尚無地點，請新增地點
		</div>
		<div v-else class="space-y-2">
			<div
				v-for="({ location, locationIndex }) in visibleLocations"
				:key="getLocationId(location, locationIndex)"
				class="flex min-w-0 items-start gap-2 rounded border border-white/10 bg-white/5 p-2"
			>
				<div class="min-w-0 flex-1">
					<VehicleAccessLocationFields
						:location="location"
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
						:disabled="locationIndex >= visibleLocations.length - 1"
						title="下移"
						aria-label="此地點下移"
						@click="emit('reorder-location', { index: locationIndex, direction: 'down' })"
					>
						↓
					</button>
				</div>

				<IconTrashButton
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
import type { VehicleAccessZone, VehicleAccessLocation } from "~/types/vehicleAccess"
import VehicleAccessLocationFields from "../LocationFormFields/VehicleAccessLocationFields.vue"
import { getLocationUiKey } from "~/utils/locationUiId"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import { filterVehicleAccessZoneLocations } from "~/utils/vehicleAccessDataSource"
import { computed } from "vue"

interface Props {
	zone: VehicleAccessZone
	reorderableLocations?: boolean
}

interface Emits {
	(e: "add-location"): void
	(e: "remove-location", index: number): void
	(e: "update-location", index: number, location: VehicleAccessLocation): void
	(e: "reorder-location", payload: { index: number; direction: "up" | "down" }): void
}

const props = withDefaults(defineProps<Props>(), {
	reorderableLocations: false,
})
const emit = defineEmits<Emits>()

const { enableYscpVehicleAccess } = useModuleRegistry()
const visibleLocations = computed(() =>
	filterVehicleAccessZoneLocations(props.zone.locations || [], enableYscpVehicleAccess.value)
)

const getLocationId = (location: VehicleAccessLocation, index: number): string =>
	getLocationUiKey({ zone: props.zone as any, location: location as any, locationIndex: index })

const handleAddLocation = () => {
	emit("add-location")
}

const handleRemoveLocation = (locationIndex: number) => {
	emit("remove-location", locationIndex)
}

const handleLocationUpdate = (locationIndex: number, updatedLocation: VehicleAccessLocation) => {
	emit("update-location", locationIndex, updatedLocation)
}
</script>
