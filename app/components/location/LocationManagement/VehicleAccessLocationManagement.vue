<template>
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<span class="text-base font-medium 2xl:text-lg">地點</span>
			<button type="button" class="btn-secondary text-sm 2xl:text-base" @click="handleAddLocation">
				新增地點
			</button>
		</div>

		<div
			v-if="getLocations(zone).length === 0"
			class="py-4 text-center text-sm text-white/60 2xl:text-base"
		>
			尚無地點，請新增地點
		</div>
		<div v-else class="space-y-2">
			<div
				v-for="(location, locationIndex) in getLocations(zone)"
				:key="getLocationId(location, locationIndex)"
				class="flex min-w-0 items-start gap-2 rounded border border-white/10 bg-white/5 p-2"
			>
				<div class="min-w-0 flex-1">
					<VehicleAccessLocationFields
						:location="location"
						@update="handleLocationUpdate(locationIndex, $event)"
					/>
				</div>
				<button
					v-if="getLocations(zone).length > 1"
					type="button"
					class="ml-auto flex-shrink-0 p-2 text-rose-400 transition-colors hover:text-rose-300"
					@click="handleRemoveLocation(locationIndex)"
					title="刪除地點"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/>
					</svg>
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { VehicleAccessZone, VehicleAccessLocation } from "~/types/vehicleAccess";
import VehicleAccessLocationFields from "../LocationFormFields/VehicleAccessLocationFields.vue";

interface Props {
	zone: VehicleAccessZone;
}

interface Emits {
	(e: "add-location"): void;
	(e: "remove-location", index: number): void;
	(e: "update-location", index: number, location: VehicleAccessLocation): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const getLocations = (zone: VehicleAccessZone): VehicleAccessLocation[] => {
	return zone.locations || [];
};

const getLocationId = (location: VehicleAccessLocation, index: number): string =>
	location.id ?? `location-${index}`;

const handleAddLocation = () => {
	emit("add-location");
};

const handleRemoveLocation = (locationIndex: number) => {
	emit("remove-location", locationIndex);
};

const handleLocationUpdate = (locationIndex: number, updatedLocation: VehicleAccessLocation) => {
	emit("update-location", locationIndex, updatedLocation);
};
</script>
