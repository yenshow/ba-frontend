<template>
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<span class="text-base font-medium 2xl:text-lg">戶別列表</span>
			<PermissionActionButton
				:allowed="allowCreateLocation"
				aria-label="新增戶別"
				class="btn-secondary text-sm 2xl:text-base"
				@click="handleAddLocation"
			>
				新增戶別
			</PermissionActionButton>
		</div>

		<div v-if="getLocations(zone).length === 0" class="py-4 text-center text-sm text-white/60 2xl:text-base">
			尚無戶別，請新增並綁定室內機
		</div>

		<div v-else class="space-y-2">
			<div
				v-for="(location, locationIndex) in getLocations(zone)"
				:key="getLocationId(location, locationIndex)"
				class="flex min-w-0 items-start gap-2 rounded border border-white/10 bg-white/5 p-2"
			>
				<div class="min-w-0 flex-1">
					<AccessSecurityLocationFields
						:location="location"
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
						aria-label="此戶別上移"
						@click="emit('reorder-location', { index: locationIndex, direction: 'up' })"
					>
						↑
					</button>
					<button
						type="button"
						class="btn-reorder-arrow"
						:disabled="locationIndex >= getLocations(zone).length - 1"
						title="下移"
						aria-label="此戶別下移"
						@click="emit('reorder-location', { index: locationIndex, direction: 'down' })"
					>
						↓
					</button>
				</div>

				<IconTrashButton
					:allowed="allowDeleteLocation"
					button-class="ml-auto flex-shrink-0"
					title="刪除戶別"
					aria-label="刪除此戶別"
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
import AccessSecurityLocationFields from "../LocationFormFields/AccessSecurityLocationFields.vue"
import type { AccessSecurityZone, AccessSecurityLocation } from "~/types/accessSecurity"
import type { Device } from "~/types/device"
import { getLocationUiKey } from "~/utils/locationUiId"

interface Props {
	zone: AccessSecurityZone
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
	(e: "update-location", index: number, location: AccessSecurityLocation): void
	(e: "reorder-location", payload: { index: number; direction: "up" | "down" }): void
}

const props = withDefaults(defineProps<Props>(), {
	allowCreateLocation: true,
	allowDeleteLocation: true,
	deviceHint: "請先在「設備管理」建立視訊對講室內機",
	reorderableLocations: false,
})

const emit = defineEmits<Emits>()

const getLocations = (zone: AccessSecurityZone): AccessSecurityLocation[] => zone.locations || []

const getLocationId = (location: AccessSecurityLocation, index: number): string =>
	getLocationUiKey({ zone: props.zone as any, location: location as any, locationIndex: index })

const handleAddLocation = () => emit("add-location")
const handleRemoveLocation = (locationIndex: number) => emit("remove-location", locationIndex)
const handleLocationUpdate = (locationIndex: number, updatedLocation: AccessSecurityLocation) => {
	emit("update-location", locationIndex, updatedLocation)
}
</script>
