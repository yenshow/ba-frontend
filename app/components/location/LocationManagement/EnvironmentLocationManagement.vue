<template>
	<div class="space-y-3">
		<!-- 地點列表標題 -->
		<div class="flex items-center justify-between">
			<span class="text-base font-medium 2xl:text-lg">地點</span>
		</div>

		<!-- 地點項目（環境品質只有一個地點） -->
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
					<EnvironmentLocationFields
						:location="location"
						:devices="devices"
						:is-loading-devices="isLoadingDevices"
						@update="handleLocationUpdate(locationIndex, $event)"
					/>
				</div>
			</div>
		</div>

		<!-- 設備提示 -->
		<p v-if="devices.length === 0 && !isLoadingDevices" class="mt-1 text-xs text-amber-300">
			{{ deviceHint }}
		</p>
	</div>
</template>

<script setup lang="ts">
import type { EnvironmentZone, EnvironmentLocation } from "~/types/environment";
import type { Device } from "~/types/device";
import EnvironmentLocationFields from "../LocationFormFields/EnvironmentLocationFields.vue";

interface Props {
	zone: EnvironmentZone;
	devices: Device[];
	isLoadingDevices: boolean;
	deviceHint?: string;
}

interface Emits {
	(e: "add-location"): void;
	(e: "remove-location", index: number): void;
	(e: "update-location", index: number, location: EnvironmentLocation): void;
}

const props = withDefaults(defineProps<Props>(), {
	deviceHint: "請先在「設備管理」中建立感測器設備"
});

const emit = defineEmits<Emits>();

// 取得地點列表
const getLocations = (zone: EnvironmentZone): EnvironmentLocation[] => {
	return zone.locations || [];
};

// 取得地點 ID
const getLocationId = (location: EnvironmentLocation, index: number): string => {
	return (location as any).id || `location-${index}`;
};

// 處理地點更新
const handleLocationUpdate = (locationIndex: number, updatedLocation: EnvironmentLocation) => {
	emit("update-location", locationIndex, updatedLocation);
};
</script>

