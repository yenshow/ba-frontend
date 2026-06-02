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
					<div
						v-for="dev in barrierDevices"
						:key="dev.id"
						class="flex min-w-[200px] flex-col gap-2 rounded-lg border-2 border-white/20 p-2"
						role="group"
						:aria-label="`${dev.label} 道閘控制`"
						@click.stop
						@keydown.stop
					>
						<span
							class="line-clamp-2 text-[10px] font-medium text-white/70 2xl:text-xs"
							:title="dev.label"
						>
							{{ dev.label }}
						</span>
						<div class="flex gap-1">
							<button
								type="button"
								class="rounded bg-emerald-500/20 px-1 py-1.5 text-[10px] font-medium text-emerald-100 hover:bg-emerald-500/35 disabled:opacity-50 2xl:text-xs"
								:disabled="!canWrite || isControlling"
								:aria-label="`${dev.label} 開啟道閘`"
								@click="handleBarrierControl(dev.id, 'open')"
							>
								開啟
							</button>
							<button
								type="button"
								class="rounded bg-white/15 px-1 py-1.5 text-[10px] font-medium text-white hover:bg-white/25 disabled:opacity-50 2xl:text-xs"
								:disabled="!canWrite || isControlling"
								:aria-label="`${dev.label} 關閉道閘`"
								@click="handleBarrierControl(dev.id, 'close')"
							>
								關閉
							</button>
							<button
								type="button"
								class="rounded bg-amber-500/20 px-1 py-1.5 text-[10px] font-medium text-amber-100 hover:bg-amber-500/35 disabled:opacity-50 2xl:text-xs"
								:disabled="!canWrite || isControlling"
								:aria-label="`${dev.label} 鎖定道閘`"
								@click="handleBarrierControl(dev.id, 'lock')"
							>
								鎖定
							</button>
							<button
								type="button"
								class="rounded bg-cyan-500/20 px-1 py-1.5 text-[10px] font-medium text-cyan-100 hover:bg-cyan-500/35 disabled:opacity-50 2xl:text-xs"
								:disabled="!canWrite || isControlling"
								:aria-label="`${dev.label} 解鎖道閘`"
								@click="handleBarrierControl(dev.id, 'unlock')"
							>
								解鎖
							</button>
						</div>
					</div>
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
import { computed, ref } from "vue";
import type {
	VehicleAccessLocation,
	VehicleAccessLocationSummary,
	VehicleOrganizationGroupItem,
	BarrierGateCtrlMode,
} from "~/types/vehicleAccess";
import { useVehicleAccessIsapiBarrierDevices } from "~/composables/systems/vehicleAccess/useVehicleAccessIsapiBarrierDevices";
import { useVehicleBarrierGate } from "~/composables/systems/vehicleAccess/useVehicleBarrierGate";

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

const barrierDeviceId = ref<number | null>(null);
const { isControlling, control } = useVehicleBarrierGate({
	location: () => props.location,
	deviceId: () => barrierDeviceId.value,
});

const handleBarrierControl = (deviceId: number, ctrlMode: BarrierGateCtrlMode) => {
	barrierDeviceId.value = deviceId;
	void control(ctrlMode, Boolean(props.canWrite));
};

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
