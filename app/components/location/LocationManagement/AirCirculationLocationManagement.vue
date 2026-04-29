<template>
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<span class="text-base font-medium 2xl:text-lg">點位列表</span>
			<button type="button" class="btn-secondary text-sm 2xl:text-base" @click="handleAddLocation">
				新增點位
			</button>
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
					<AirCirculationLocationFields
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

				<button
					type="button"
					class="ml-auto flex-shrink-0 p-2 text-rose-400 transition-colors hover:text-rose-300"
					@click="handleRemoveLocation(locationIndex)"
					title="刪除點位"
					aria-label="刪除此點位"
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

		<p v-if="devices.length === 0 && !isLoadingDevices" class="mt-1 text-xs text-amber-300">
			{{ deviceHint }}
		</p>
	</div>
</template>

<script setup lang="ts">
import type { AirCirculationZone, AirCirculationLocation } from "~/types/air-circulation"
import type { Device } from "~/types/device"
import AirCirculationLocationFields from "../LocationFormFields/AirCirculationLocationFields.vue"
import { getLocationUiKey } from "~/utils/locationUiId"

interface Props {
	zone: AirCirculationZone
	devices: Device[]
	isLoadingDevices: boolean
	deviceHint?: string
	reorderableLocations?: boolean
}

interface Emits {
	(e: "add-location"): void
	(e: "remove-location", index: number): void
	(e: "update-location", index: number, location: AirCirculationLocation): void
	(e: "reorder-location", payload: { index: number; direction: "up" | "down" }): void
}

const props = withDefaults(defineProps<Props>(), {
	deviceHint: "請先在「設備管理」中建立控制器設備",
	reorderableLocations: false,
})

const emit = defineEmits<Emits>()

const getLocations = (zone: AirCirculationZone): AirCirculationLocation[] => zone.locations || []

const getLocationId = (location: AirCirculationLocation, index: number): string =>
	getLocationUiKey({ zone: props.zone as any, location: location as any, locationIndex: index })

const handleAddLocation = () => {
	emit("add-location")
}

const handleRemoveLocation = (locationIndex: number) => {
	emit("remove-location", locationIndex)
}

const handleLocationUpdate = (locationIndex: number, updatedLocation: AirCirculationLocation) => {
	emit("update-location", locationIndex, updatedLocation)
}
</script>

