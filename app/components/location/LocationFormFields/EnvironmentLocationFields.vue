<template>
	<div class="flex min-w-0 flex-1 flex-col">
		<div class="flex min-w-0 flex-col gap-2">
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

			<!-- 感測器設備（複選，勾選多台） -->
			<div class="flex flex-1 flex-col gap-2">
				<span class="text-sm text-white/80 2xl:text-base">感測器設備</span>
				<div
					v-if="isLoadingDevices"
					class="py-2 text-center text-xs text-white/50 2xl:text-sm"
				>
					載入中...
				</div>
				<div
					v-else-if="sensorDevices.length === 0"
					class="py-2 text-center text-xs text-amber-300 2xl:text-sm"
				>
					尚無可用感測器，請先在「設備管理」中建立感測器設備
				</div>
				<div v-else class="grid grid-cols-2 gap-2">
					<label
						v-for="device in sensorDevices"
						:key="device.id"
						class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
						:class="{
							'border-cyan-400/50 bg-cyan-500/20': isDeviceSelected(device.id)
						}"
					>
						<input
							type="checkbox"
							:checked="isDeviceSelected(device.id)"
							@change="toggleDevice(device.id)"
							class="h-4 w-4 cursor-pointer accent-cyan-400"
							:aria-label="`勾選感測器：${device.name}`"
						/>
						<span class="text-xs text-white/90 2xl:text-sm">{{ device.name }}</span>
					</label>
				</div>
				<p class="text-xs text-white/50 2xl:text-sm">可勾選多台設備，此地點數值將由所選設備提供</p>
			</div>
		</div>

		<!-- 感測器參數列表（從所選設備型號聯集讀取） -->
		<div class="mt-3 border-t border-white/10 pt-3">
			<div class="mb-3">
				<span class="text-sm font-medium text-white/80 2xl:text-base">感測器參數</span>
			</div>

			<div
				v-if="selectedDeviceIds.length === 0"
				class="py-2 text-center text-xs text-amber-300 2xl:text-sm"
			>
				請至少勾選一台感測器設備以顯示可用參數
			</div>

			<template v-else>
				<div
					v-if="availableParameters.length === 0"
					class="py-2 text-center text-xs text-white/50 2xl:text-sm"
				>
					<p>所選設備型號尚未配置參數</p>
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
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi";
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

const localLocation = ref<EnvironmentLocation>({ ...props.location });

const deviceParameterDefinitions = ref<Map<number, SensorParameterDefinition[]>>(new Map());

watch(
	() => props.location,
	newLocation => {
		localLocation.value = { ...newLocation };
		if (!localLocation.value.parameters) {
			localLocation.value.parameters = [];
		}
		const ids = getNormalizedDeviceIds(localLocation.value);
		if (JSON.stringify(ids) !== JSON.stringify(localLocation.value.deviceIds ?? [])) {
			localLocation.value.deviceIds = ids.length ? ids : undefined;
			localLocation.value.deviceId = ids[0];
		}
	},
	{ immediate: true, deep: true }
);

function getNormalizedDeviceIds(loc: EnvironmentLocation): number[] {
	if (Array.isArray(loc.deviceIds) && loc.deviceIds.length > 0) return loc.deviceIds;
	if (loc.deviceId != null && loc.deviceId > 0) return [loc.deviceId];
	return [];
}

const selectedDeviceIds = computed(() => getNormalizedDeviceIds(localLocation.value));

const sensorDevices = computed(() =>
	props.devices.filter((d) => d.type_code === "sensor" || (d as { type_code?: string }).type_code === "sensor")
);

const handleChange = () => {
	emit("update", { ...localLocation.value });
};

watch(
	selectedDeviceIds,
	async (ids) => {
		for (const deviceId of ids) {
			if (!deviceId || deviceParameterDefinitions.value.has(deviceId)) continue;
			try {
				const result = await deviceApi.getDevice(deviceId);
				const fullDevice = result.device;
				const modelConfig = (fullDevice as any).model?.config;
				if (modelConfig?.sensorParameters) {
					deviceParameterDefinitions.value.set(deviceId, modelConfig.sensorParameters);
				} else if (fullDevice.model_id) {
					const modelResult = await deviceApi.getDeviceModel(fullDevice.model_id);
					const model = modelResult.device_model;
					const config = model?.config;
					if (config?.sensorParameters) {
						deviceParameterDefinitions.value.set(deviceId, config.sensorParameters);
					}
				}
			} catch (error) {
				console.error(`載入設備 ${deviceId} 的參數定義失敗:`, error);
			}
		}
	},
	{ immediate: true, deep: true }
);

const availableParameters = computed(() => {
	const ids = selectedDeviceIds.value;
	if (ids.length === 0) return [];
	const seen = new Set<string>();
	const out: SensorParameterDefinition[] = [];
	for (const deviceId of ids) {
		const defs = deviceParameterDefinitions.value.get(deviceId) || [];
		for (const d of defs) {
			if (!seen.has(d.type)) {
				seen.add(d.type);
				out.push(d);
			}
		}
	}
	return out;
});

const isDeviceSelected = (deviceId: number): boolean =>
	selectedDeviceIds.value.includes(deviceId);

const toggleDevice = (deviceId: number) => {
	const ids = [...selectedDeviceIds.value];
	const idx = ids.indexOf(deviceId);
	if (idx >= 0) {
		ids.splice(idx, 1);
	} else {
		ids.push(deviceId);
		ids.sort((a, b) => a - b);
	}
	localLocation.value.deviceIds = ids.length ? ids : undefined;
	localLocation.value.deviceId = ids[0];
	const availableTypes = new Set(availableParameters.value.map((p) => p.type));
	localLocation.value.parameters = localLocation.value.parameters.filter((p) =>
		availableTypes.has(p.type as SensorParameterType)
	);
	handleChange();
};

const isParameterEnabled = (paramType: SensorParameterType): boolean =>
	localLocation.value.parameters.some((p) => p.type === paramType && p.enabled);

const toggleParameter = (paramType: SensorParameterType) => {
	const existingParam = localLocation.value.parameters.find((p) => p.type === paramType);
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
</script>
