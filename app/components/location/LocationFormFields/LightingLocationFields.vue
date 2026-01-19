<template>
	<div class="flex min-w-0 flex-1 items-end gap-2">
		<!-- 點位名稱 -->
		<label class="flex flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base min-w-0">
			<span>點位名稱 *</span>
			<input
				v-model="localLocation.name"
				type="text"
				required
				class="form-input-small"
				placeholder="例如：主燈開關"
				@blur="handleChange"
			/>
		</label>

		<!-- 控制器 -->
		<label class="flex flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base min-w-0">
			<span>控制器</span>
			<select
				v-model.number="localLocation.deviceId"
				class="form-input-small form-select min-w-0"
				@change="handleDeviceChange"
				:disabled="isLoadingDevices"
			>
				<option :value="0">請選擇控制器</option>
				<option v-if="isLoadingDevices" value="" disabled>載入中...</option>
				<option v-else-if="devices.length === 0" value="" disabled>尚無可用控制器</option>
				<option v-for="device in devices" :key="device.id" :value="device.id">
					{{ device.name }}
				</option>
			</select>
		</label>

		<!-- Modbus 配置（當選擇了設備時顯示） -->
		<template v-if="localLocation.deviceId && localLocation.deviceId > 0 && localLocation.modbus?.points?.[0]">
			<!-- Modbus 類型 -->
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

			<!-- Modbus 地址 -->
			<label
				class="flex w-24 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
			>
				<span>地址 *</span>
				<div class="relative w-full">
					<input
						v-model.number="localLocation.modbus.points[0].address"
						type="number"
						min="0"
						placeholder="地址"
						required
						class="form-input-small w-full transition-all"
						:class="
							hasDuplicateAddress
								? 'animate-pulse border-2 border-rose-500 bg-rose-500/20 pr-10 shadow-[0_0_0_3px_rgba(244,63,94,0.2)] focus:border-rose-500 focus:bg-rose-500/25 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.3)]'
								: ''
						"
						title="此地址已被使用"
						@blur="handleChange"
					/>
					<div
						v-if="hasDuplicateAddress"
						class="pointer-events-none absolute right-9 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
						title="此地址已被使用"
					>
						<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
				</div>
			</label>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { LightingLocation } from "~/types/lighting";
import type { Device } from "~/types/device";
import { useLightingLocationValidation } from "~/composables/systems/location/useLightingLocationValidation";

interface Props {
	location: LightingLocation;
	allLocations?: LightingLocation[];
	currentIndex?: number;
	devices?: Device[];
	isLoadingDevices?: boolean;
}

interface Emits {
	(e: "update", location: LightingLocation): void;
}

const props = withDefaults(defineProps<Props>(), {
	allLocations: () => [],
	currentIndex: -1,
	devices: () => [],
	isLoadingDevices: false
});

const emit = defineEmits<Emits>();

const { checkDuplicateAddress } = useLightingLocationValidation();

// 本地副本，用於雙向綁定
const localLocation = ref<LightingLocation>({ ...props.location });

// 初始化 modbus 配置的輔助函數
const ensureModbusConfig = (location: LightingLocation) => {
	if (location.deviceId && location.deviceId > 0) {
		if (!location.modbus) {
			location.modbus = {
				deviceId: location.deviceId,
				points: []
			};
		}
		if (!location.modbus.points || location.modbus.points.length === 0) {
			location.modbus.points = [
				{
					address: 0,
					type: "DO"
				}
			];
		}
	}
};

// 監聽 props.location 變化
watch(
	() => props.location,
	newLocation => {
		localLocation.value = { ...newLocation };
		ensureModbusConfig(localLocation.value);
	},
	{ immediate: true, deep: true }
);

// 檢查地址是否重複
const hasDuplicateAddress = computed(() => {
	if (props.currentIndex < 0 || !props.allLocations || props.allLocations.length === 0) {
		return false;
	}
	return checkDuplicateAddress(localLocation.value, props.allLocations, props.currentIndex);
});

// 處理變更
const handleChange = () => {
	emit("update", { ...localLocation.value });
};

// 處理設備變更
const handleDeviceChange = () => {
	ensureModbusConfig(localLocation.value);
	handleChange();
};
</script>