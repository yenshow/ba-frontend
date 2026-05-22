<template>
	<div class="space-y-3">
		<!-- 地點列表標題 -->
		<div class="flex items-center justify-between">
			<span class="text-base font-medium 2xl:text-lg">地點</span>
			<button type="button" class="btn-secondary text-sm 2xl:text-base" @click="handleAddLocation">
				新增地點
			</button>
		</div>

		<!-- 地點項目 -->
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
				<!-- 地點欄位（內容區塊：可多段、佔滿寬度） -->
				<div class="min-w-0 flex-1">
					<PeopleCountingLocationFields
						:location="location"
						:person-groups="personGroups"
						:doors="doors"
						:access-control-devices="accessControlDevices"
						:isapi-camera-devices="isapiCameraDevices"
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
						:disabled="locationIndex >= getLocations(zone).length - 1"
						title="下移"
						aria-label="此地點下移"
						@click="emit('reorder-location', { index: locationIndex, direction: 'down' })"
					>
						↓
					</button>
				</div>

				<!-- 刪除按鈕 -->
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
import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting"
import type { Device } from "~/types/device"
import PeopleCountingLocationFields from "../LocationFormFields/PeopleCountingLocationFields.vue"
import { getLocationUiKey } from "~/utils/locationUiId"

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
	personGroups?: PersonGroup[]
	doors?: Door[]
	accessControlDevices?: Device[]
	isapiCameraDevices?: Device[]
	reorderableLocations?: boolean
}

interface Emits {
	(e: "add-location"): void
	(e: "remove-location", index: number): void
	(e: "update-location", index: number, location: PeopleCountingLocation): void
	(e: "reorder-location", payload: { index: number; direction: "up" | "down" }): void
}

const props = withDefaults(defineProps<Props>(), {
	personGroups: () => [],
	doors: () => [],
	accessControlDevices: () => [],
	isapiCameraDevices: () => [],
	reorderableLocations: false,
})

const emit = defineEmits<Emits>()

// 取得地點列表
const getLocations = (zone: PeopleCountingZone): PeopleCountingLocation[] => {
	return zone.locations || []
}

// 取得地點 ID
const getLocationId = (location: PeopleCountingLocation, index: number): string => {
	return getLocationUiKey({
		zone: props.zone as any,
		location: location as any,
		locationIndex: index,
	})
}

// 處理新增地點
const handleAddLocation = () => {
	emit("add-location")
}

// 處理刪除地點
const handleRemoveLocation = (locationIndex: number) => {
	emit("remove-location", locationIndex)
}

// 處理地點更新
const handleLocationUpdate = (locationIndex: number, updatedLocation: PeopleCountingLocation) => {
	emit("update-location", locationIndex, updatedLocation)
}
</script>
