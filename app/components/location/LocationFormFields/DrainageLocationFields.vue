<template>
	<div class="flex w-full min-w-0 flex-col gap-3">
		<div class="flex min-w-0 flex-1 flex-wrap items-end gap-2">
			<label class="flex min-w-[8rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
				<span>點位名稱 *</span>
				<input
					v-model="localLocation.name"
					type="text"
					required
					class="form-input-small"
					placeholder="例如：PW-1"
					@blur="handleChange"
				/>
			</label>

			<label class="flex min-w-[8rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
				<span>控制器</span>
				<FilterDropdown
					v-model="deviceIdString"
					:options="deviceOptions"
					:placeholder="isLoadingDevices ? '載入中...' : '請選擇控制器'"
					@update:modelValue="handleDeviceChange"
				/>
			</label>

			<template v-if="localLocation.deviceId && localLocation.deviceId > 0 && localLocation.modbus?.points?.[0]">
				<label
					class="flex w-24 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
				>
					<span>類型 *</span>
					<select
						v-model="localLocation.modbus.points[0].type"
						class="form-input-small form-select w-full"
						required
						@change="handleChange"
					>
						<option value="DO">DO</option>
						<option value="DI">DI</option>
					</select>
				</label>

				<label
					class="flex w-24 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
				>
					<span>地址 *</span>
					<input
						v-model.number="localLocation.modbus.points[0].address"
						type="number"
						min="0"
						class="form-input-small w-full"
						@blur="handleChange"
					/>
				</label>
			</template>
		</div>

		<div class="flex min-w-0 flex-wrap items-end gap-2">
			<label class="flex min-w-[7rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:text-base">
				<span>設備類型</span>
				<select
					v-model="localLocation.equipmentKind"
					class="form-input-small form-select w-full"
					@change="handleChange"
				>
					<option value="pump">揚水泵</option>
					<option value="tank">水箱／液位</option>
				</select>
			</label>

			<label class="flex min-w-[7rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:text-base">
				<span>檢視分類</span>
				<select
					v-model="localLocation.viewCategory"
					class="form-input-small form-select w-full"
					@change="handleChange"
				>
					<option value="pumping">揚水</option>
					<option value="sewage">污水</option>
					<option value="drainage">排水</option>
				</select>
			</label>
		</div>

		<label class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:text-base">
			<span>狀態點位 JSON（Modbus）</span>
			<textarea
				v-model="statusPointsJson"
				rows="3"
				class="form-input-small font-mono text-xs 2xl:text-sm"
				placeholder='{"fault":{"registerType":"discrete","address":0}}'
				@blur="handleStatusPointsBlur"
			/>
		</label>
	</div>
</template>

<script setup lang="ts">
import type { DrainageLocation } from "~/types/drainage";
import type { Device } from "~/types/device";
import FilterDropdown from "~/components/common/FilterDropdown.vue";
import { useToast } from "~/composables/core/useToast";

interface Props {
	location: DrainageLocation;
	devices?: Device[];
	isLoadingDevices?: boolean;
}

interface Emits {
	(e: "update", location: DrainageLocation): void;
}

const props = withDefaults(defineProps<Props>(), {
	devices: () => [],
	isLoadingDevices: false
});

const emit = defineEmits<Emits>();
const toast = useToast();

const localLocation = ref<DrainageLocation>({ ...props.location });
const deviceIdString = ref("");
const statusPointsJson = ref("{}");

const ensureModbusConfig = (location: DrainageLocation) => {
	if (location.deviceId && location.deviceId > 0) {
		if (!location.modbus) {
			location.modbus = { deviceId: location.deviceId, points: [] };
		} else {
			location.modbus.deviceId = location.deviceId;
		}
		if (!location.modbus.points || location.modbus.points.length === 0) {
			location.modbus.points = [{ address: 0, type: "DI" }];
		}
	}
};

const syncStatusPointsJson = () => {
	const sp = localLocation.value.statusPoints;
	statusPointsJson.value =
		sp && Object.keys(sp).length > 0 ? JSON.stringify(sp, null, 0) : "{}";
};

watch(
	() => props.location,
	newLocation => {
		localLocation.value = {
			...newLocation,
			equipmentKind: newLocation.equipmentKind ?? "pump",
			viewCategory: newLocation.viewCategory ?? "drainage",
			statusPoints: newLocation.statusPoints ?? {}
		};
		ensureModbusConfig(localLocation.value);
		deviceIdString.value =
			localLocation.value.deviceId && localLocation.value.deviceId > 0
				? String(localLocation.value.deviceId)
				: "";
		syncStatusPointsJson();
	},
	{ immediate: true, deep: true }
);

const handleChange = () => {
	emit("update", { ...localLocation.value });
};

const handleStatusPointsBlur = () => {
	try {
		const parsed = JSON.parse(statusPointsJson.value || "{}");
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			localLocation.value.statusPoints = parsed;
		} else {
			throw new Error("必須為物件");
		}
	} catch {
		toast.error("狀態點位 JSON 格式錯誤");
		syncStatusPointsJson();
		return;
	}
	handleChange();
};

const deviceOptions = computed(() => {
	if (props.isLoadingDevices) return [{ value: "", label: "載入中..." }];
	if (props.devices.length === 0) return [{ value: "", label: "尚無可用控制器" }];
	return [
		{ value: "", label: "請選擇控制器" },
		...props.devices.map(d => ({ value: String(d.id), label: d.name }))
	];
});

const handleDeviceChange = (value: string) => {
	const deviceId = value ? Number(value) : 0;
	localLocation.value.deviceId = deviceId;
	ensureModbusConfig(localLocation.value);
	handleChange();
};
</script>
