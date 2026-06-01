<template>
	<div
		class="flex cursor-pointer gap-2 rounded-xl bg-white/10 py-1 transition-all hover:bg-white/15"
		tabindex="0"
		role="button"
		:aria-label="`查看 ${summary.name} 過車記錄`"
		@click="handleClick"
		@keydown.enter="handleClick"
		@keydown.space.prevent="handleClick"
	>
		<div
			class="my-4 flex w-[36px] items-center justify-center bg-white px-2 text-xl 2xl:text-xl"
			style="clip-path: polygon(0 0, 100% calc(0% + 24px), 100% calc(100% - 24px), 0 100%)"
		>
			{{ summary.zoneName || "－" }}
		</div>

		<div class="flex flex-1 flex-col items-center pr-2">
			<div class="mb-2 flex w-[160px] items-center justify-center border-b border-white/80 pb-px">
				<h3 class="text-base text-white 2xl:text-lg">{{ summary.name }}</h3>
			</div>
			<div class="flex items-center gap-8 py-2 text-white">
				<div
					class="flex min-w-[140px] flex-col gap-3 border-r-2 border-white/50 pr-8 2xl:min-w-[160px]"
				>
					<div class="flex items-center justify-center gap-3 bg-white/20 p-2">
						<div class="text-sm font-semibold 2xl:text-base">進場車輛</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ summary.entryCount ?? 0 }}
						</div>
					</div>
					<div class="flex items-center justify-center gap-3 bg-white/20 p-2">
						<div class="text-sm font-semibold 2xl:text-base">出場車輛</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ summary.exitCount ?? 0 }}
						</div>
					</div>
					<div class="flex items-center justify-center gap-3 bg-white/20 p-2">
						<div class="text-sm font-semibold 2xl:text-base">在場車輛</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ currentCount }}
						</div>
					</div>
				</div>

				<div
					v-if="isIsapiLocation"
					class="flex max-h-[220px] flex-col gap-2 overflow-y-auto"
					@click.stop
				>
					<VehicleOverviewBarrierGrid
						v-for="dev in barrierDevices"
						:key="dev.id"
						:location="location"
						:device-id="dev.id"
						:device-name="dev.label"
						:can-write="canWrite"
						:active="isActive"
					/>
					<p
						v-if="barrierDevices.length === 0"
						class="min-w-[200px] rounded-lg border border-dashed border-white/20 p-3 text-center text-xs text-white/50"
					>
						未設定攝影機
					</p>
				</div>
				<div v-else class="grid grid-cols-3 gap-2 overflow-hidden">
					<div
						v-for="(group, index) in displayGroups"
						:key="group ? group.groupKey : `empty-${index}`"
						class="flex min-h-[36px] min-w-[64px] items-center justify-center p-2 text-center transition-all"
						:class="{
							'bg-white/20': group && (group.onSiteCount || 0) > 0,
							'bg-black/20': !group || (group.onSiteCount || 0) === 0,
							'text-white/90': group,
							'text-white/30': !group,
						}"
						:title="group ? group.personGroupName : ''"
					>
						<span
							v-if="group"
							class="line-clamp-2 text-[11px] font-semibold text-white 2xl:text-xs"
						>
							{{ group.personGroupName }}
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
	VehicleAccessLocation,
	VehicleAccessLocationSummary,
	VehicleOrganizationGroupItem,
} from "~/types/vehicleAccess";
import VehicleOverviewBarrierGrid from "~/components/vehicle-access/VehicleOverviewBarrierGrid.vue";
import { useVehicleAccessIsapiBarrierDevices } from "~/composables/systems/vehicleAccess/useVehicleAccessIsapiBarrierDevices";

const props = withDefaults(
	defineProps<{
		summary: VehicleAccessLocationSummary & { zoneName?: string };
		groups?: VehicleOrganizationGroupItem[];
		location?: VehicleAccessLocation | null;
		canWrite?: boolean;
		isActive?: boolean;
	}>(),
	{
		groups: () => [],
		location: null,
		canWrite: false,
		isActive: false,
	},
);

const emit = defineEmits<{
	(e: "click", locationId: string): void;
}>();

const currentCount = computed(() => props.summary.currentCount ?? 0);

const isIsapiLocation = computed(
	() => props.location?.dataSource === "isapi_camera",
);

const { devices: barrierDevices } = useVehicleAccessIsapiBarrierDevices(() => props.location);

const TOTAL_GRID_CELLS = 12;

const displayGroups = computed(() => {
	const list = (props.groups ?? []).slice(0, TOTAL_GRID_CELLS);
	const emptyCells = Array.from({ length: TOTAL_GRID_CELLS - list.length }, () => null);
	return [...list, ...emptyCells];
});

const handleClick = () => {
	emit("click", props.summary.id ?? "");
};
</script>
