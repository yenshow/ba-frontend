<template>
	<div class="flex min-w-0 flex-1 flex-col">
		<div class="flex min-w-0 flex-wrap items-end gap-2">
			<!-- 地點名稱 -->
			<label
				class="flex min-w-0 flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
			>
				<span>地點名稱 *</span>
				<input
					v-model="localLocation.name"
					type="text"
					required
					class="form-input-small"
					placeholder="例如：AA工地、BB工地"
					@blur="handleChange"
				/>
			</label>

			<!-- 入口車道（lane_type=1，參考人流統計入口設備） -->
			<label
				class="flex min-w-0 flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
			>
				<span>入口車道</span>
				<FilterDropdown
					v-model="entryLaneIdString"
					:options="entryLaneOptions"
					placeholder="無"
					@update:modelValue="handleEntryLaneChange"
				/>
			</label>

			<!-- 出口車道（lane_type=2） -->
			<label
				class="flex min-w-0 flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
			>
				<span>出口車道</span>
				<FilterDropdown
					v-model="exitLaneIdString"
					:options="exitLaneOptions"
					placeholder="無"
					@update:modelValue="handleExitLaneChange"
				/>
			</label>
		</div>

		<!-- 提示 -->
		<div
			v-if="localLocation.entryLaneId && !localLocation.exitLaneId"
			class="mt-3 rounded border border-amber-500/50 bg-amber-500/20 p-2 text-xs text-amber-300 2xl:text-sm"
		>
			已設定入口車道，建議同時設定出口車道
		</div>
		<div
			v-if="localLocation.exitLaneId && !localLocation.entryLaneId"
			class="mt-3 rounded border border-amber-500/50 bg-amber-500/20 p-2 text-xs text-amber-300 2xl:text-sm"
		>
			已設定出口車道，建議同時設定入口車道
		</div>
	</div>
</template>

<script setup lang="ts">
import type { VehicleAccessLocation, LaneInfo } from "~/types/vehicleAccess";
import FilterDropdown from "~/components/common/FilterDropdown.vue";
import { useVehicleAccessApi } from "~/composables/systems/vehicleAccess/useVehicleAccessApi";
import { ref, watch, computed, onMounted } from "vue";

interface Props {
	location: VehicleAccessLocation;
}

interface Emits {
	(e: "update", location: VehicleAccessLocation): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localLocation = ref<VehicleAccessLocation>({ ...props.location });
const entryLaneIdString = ref("");
const exitLaneIdString = ref("");
const laneList = ref<LaneInfo[]>([]);

const vehicleAccessApi = useVehicleAccessApi();

onMounted(async () => {
	try {
		const list = await vehicleAccessApi.getLaneInfoList();
		laneList.value = list || [];
	} catch {
		laneList.value = [];
	}
});

/** 入口車道選項（lane_type=1） */
const entryLaneOptions = computed(() => {
	const options = laneList.value
		.filter(l => l.lane_type === 1)
		.map(lane => ({
			value: String(lane.id),
			label: lane.lane_name ?? `車道 ${lane.id}`
		}));
	return [{ value: "", label: "無" }, ...options];
});

/** 出口車道選項（lane_type=2） */
const exitLaneOptions = computed(() => {
	const options = laneList.value
		.filter(l => l.lane_type === 2)
		.map(lane => ({
			value: String(lane.id),
			label: lane.lane_name ?? `車道 ${lane.id}`
		}));
	return [{ value: "", label: "無" }, ...options];
});

watch(
	() => props.location,
	newLocation => {
		localLocation.value = { ...newLocation };
		entryLaneIdString.value = newLocation.entryLaneId != null ? String(newLocation.entryLaneId) : "";
		exitLaneIdString.value = newLocation.exitLaneId != null ? String(newLocation.exitLaneId) : "";
	},
	{ immediate: true, deep: true }
);

const handleChange = () => {
	emit("update", { ...localLocation.value });
};

const handleEntryLaneChange = (value: string) => {
	localLocation.value.entryLaneId = value ? Number(value) : undefined;
	handleChange();
};

const handleExitLaneChange = (value: string) => {
	localLocation.value.exitLaneId = value ? Number(value) : undefined;
	handleChange();
};
</script>
