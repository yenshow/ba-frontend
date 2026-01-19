<template>
	<div class="flex min-w-0 flex-1 flex-col">
		<div class="flex min-w-0 items-end gap-2">
			<!-- 地點名稱 -->
			<label class="flex flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base min-w-0">
				<span>地點名稱 *</span>
				<input
					v-model="localLocation.name"
					type="text"
					required
					class="form-input-small"
					placeholder="例如：管理中心、展廳"
					@blur="handleChange"
				/>
			</label>

			<!-- 感測器設備 -->
			<label class="flex flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base min-w-0">
				<span>感測器設備</span>
				<select
					v-model.number="localLocation.deviceId"
					class="form-input-small form-select min-w-0"
					@change="handleDeviceChange"
					:disabled="isLoadingDevices"
				>
					<option :value="0">請選擇感測器</option>
					<option v-if="isLoadingDevices" value="" disabled>載入中...</option>
					<option v-else-if="devices.length === 0" value="" disabled>尚無可用感測器</option>
					<option v-for="device in devices" :key="device.id" :value="device.id">
						{{ device.name }}
					</option>
				</select>
			</label>
		</div>

		<!-- 感測器參數列表（從設備型號讀取） -->
		<div class="mt-3 border-t border-white/10 pt-3">
			<div class="mb-3">
				<span class="text-sm font-medium text-white/80 2xl:text-base">感測器參數</span>
			</div>

			<!-- 未選擇設備時的提示（對齊舊版） -->
			<div
				v-if="!localLocation.deviceId || localLocation.deviceId === 0"
				class="py-2 text-center text-xs text-amber-300 2xl:text-sm"
			>
				請先選擇感測器設備以顯示可用參數
			</div>

			<template v-else>
				<div
					v-if="availableParameters.length === 0"
					class="py-2 text-center text-xs text-white/50 2xl:text-sm"
				>
					<p>此設備型號尚未配置參數</p>
					<p class="mt-1 text-xs">請在「設備型號管理」中設定參數配置</p>
				</div>
				<div v-else class="grid grid-cols-2 gap-2">
					<label
						v-for="paramDef in availableParameters"
						:key="paramDef.type"
						class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
						:class="{
							'border-cyan-400/50 bg-cyan-500/20': isParameterEnabled(paramDef.type as SensorParameterType)
						}"
					>
						<input
							type="checkbox"
							:checked="isParameterEnabled(paramDef.type as SensorParameterType)"
							@change="toggleParameter(paramDef.type as SensorParameterType)"
							class="h-4 w-4 cursor-pointer accent-cyan-400"
						/>
						<span class="text-xs text-white/90 2xl:text-sm">
							{{ getParameterDisplayName(paramDef.type as SensorParameterType) }}
						</span>
						<span
							v-if="paramDef.modbusConfig"
							class="ml-auto text-xs text-white/50"
							:title="`Modbus 地址: ${paramDef.modbusConfig.address}`"
						>
							Addr: {{ paramDef.modbusConfig.address }}
						</span>
					</label>
				</div>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { EnvironmentLocation, SensorParameterType } from "~/types/environment";
import type { Device, SensorParameterDefinition } from "~/types/device";
import { useDeviceApi } from "~/composables/systems/useDeviceApi";
import { getParameterDisplayName } from "~/utils/sensorUtils";

interface Props {
	location: EnvironmentLocation;
	devices?: Device[];
	isLoadingDevices?: boolean;
}

interface Emits {
	(e: "update", location: EnvironmentLocation): void;
}

const props = withDefaults(defineProps<Props>(), {
	devices: () => [],
	isLoadingDevices: false
});

const emit = defineEmits<Emits>();

const deviceApi = useDeviceApi();

// 本地副本，用於雙向綁定
const localLocation = ref<EnvironmentLocation>({ ...props.location });

// 設備參數定義快取
const deviceParameterDefinitions = ref<Map<number, SensorParameterDefinition[]>>(new Map());

// 監聽 props.location 變化
watch(
	() => props.location,
	newLocation => {
		localLocation.value = { ...newLocation };
		// 確保 parameters 陣列存在
		if (!localLocation.value.parameters) {
			localLocation.value.parameters = [];
		}
	},
	{ immediate: true, deep: true }
);

// 處理變更
const handleChange = () => {
	emit("update", { ...localLocation.value });
};

// 監聽設備 ID 變化，載入參數定義
watch(
	() => localLocation.value.deviceId,
	async deviceId => {
		if (deviceId && deviceId > 0 && !deviceParameterDefinitions.value.has(deviceId)) {
			try {
				const result = await deviceApi.getDevice(deviceId);
				const fullDevice = result.device;

				// 檢查是否有 model 資訊
				const modelConfig = (fullDevice as any).model?.config;
				if (modelConfig?.sensorParameters) {
					deviceParameterDefinitions.value.set(deviceId, modelConfig.sensorParameters);
				} else if (fullDevice.model_id) {
					const modelResult = await deviceApi.getDeviceModel(fullDevice.model_id);
					const model = modelResult.device_model;
					const modelConfig = model.config;
					if (modelConfig?.sensorParameters) {
						deviceParameterDefinitions.value.set(deviceId, modelConfig.sensorParameters);
					}
				}
			} catch (error) {
				console.error(`載入設備 ${deviceId} 的參數定義失敗:`, error);
			}
		}
	},
	{ immediate: true }
);

// 取得可用參數定義
const availableParameters = computed(() => {
	const deviceId = localLocation.value.deviceId;
	if (!deviceId || deviceId === 0) return [];
	return deviceParameterDefinitions.value.get(deviceId) || [];
});

// 檢查參數是否已啟用
const isParameterEnabled = (paramType: SensorParameterType): boolean => {
	return localLocation.value.parameters.some(p => p.type === paramType && p.enabled);
};

// 切換參數啟用狀態
const toggleParameter = (paramType: SensorParameterType) => {
	const existingParam = localLocation.value.parameters.find(p => p.type === paramType);
	if (existingParam) {
		existingParam.enabled = !existingParam.enabled;
	} else {
		localLocation.value.parameters.push({
			type: paramType,
			enabled: true
		});
	}
	handleChange();
};

// 處理設備變更
const handleDeviceChange = () => {
	const deviceId = localLocation.value.deviceId;
	if (deviceId && deviceId > 0) {
		// 保留已啟用的參數，但清除不存在的參數
		const availableTypes = new Set(availableParameters.value.map(p => p.type));
		localLocation.value.parameters = localLocation.value.parameters.filter(p =>
			availableTypes.has(p.type as SensorParameterType)
		);
	} else {
		localLocation.value.parameters = [];
	}
	handleChange();
};
</script>
