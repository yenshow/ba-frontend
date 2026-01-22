<template>
	<div class="space-y-3">
		<!-- 地點列表標題 -->
		<div class="flex items-center justify-between">
			<span class="text-base font-medium 2xl:text-lg">地點</span>
		</div>

		<!-- 地點項目（人流統計只有一個地點） -->
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
						@update="handleLocationUpdate(locationIndex, $event)"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting";
import PeopleCountingLocationFields from "../LocationFormFields/PeopleCountingLocationFields.vue";

interface PersonGroup {
	id: number;
	name: string;
	is_deleted?: number;
}

interface Door {
	id: number;
	device_id: number;
	dev_name: string;
	door_index: number;
	is_deleted?: number;
}

interface Props {
	zone: PeopleCountingZone;
	personGroups?: PersonGroup[];
	doors?: Door[];
}

interface Emits {
	(e: "add-location"): void;
	(e: "remove-location", index: number): void;
	(e: "update-location", index: number, location: PeopleCountingLocation): void;
}

const props = withDefaults(defineProps<Props>(), {
	personGroups: () => [],
	doors: () => []
});

const emit = defineEmits<Emits>();

// 取得地點列表
const getLocations = (zone: PeopleCountingZone): PeopleCountingLocation[] => {
	return zone.locations || [];
};

// 取得地點 ID
const getLocationId = (location: PeopleCountingLocation, index: number): string => {
	return (location as any).id || `location-${index}`;
};

// 處理地點更新
const handleLocationUpdate = (locationIndex: number, updatedLocation: PeopleCountingLocation) => {
	emit("update-location", locationIndex, updatedLocation);
};
</script>

