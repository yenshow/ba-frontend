<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px] flex items-center justify-center z-[2000]"
				@click.self="handleClose"
			>
				<div class="w-full max-w-md 2xl:max-w-lg max-h-[90vh] rounded-3xl p-7 2xl:p-8 flex flex-col gap-4 2xl:gap-6 overflow-y-auto dialog-panel-bg">
					<header class="flex items-center justify-between">
						<h3 class="text-lg 2xl:text-xl text-white font-semibold tracking-[4px]">{{ editingDevice ? "編輯設備" : "新增設備" }}</h3>
						<button
							type="button"
							class="text-[1.75rem] leading-none text-white bg-transparent border-none cursor-pointer transition-opacity hover:opacity-70"
							aria-label="關閉對話框"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<form class="flex flex-col gap-4 2xl:gap-6" @submit.prevent="handleSubmit">
						<div class="flex flex-col gap-4 2xl:gap-6">
							<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
								<span>設備名稱 *</span>
								<input v-model="localFormData.name" type="text" required class="form-input" placeholder="例如：DDC 控制器 1" />
							</label>
							<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
								<span>設備型號</span>
								<select v-model.number="localFormData.model_id" class="form-input form-select" @change="onModelChange" :disabled="isLoadingDeviceModels">
									<option :value="0">不使用型號</option>
									<option v-if="isLoadingDeviceModels" value="" disabled>載入中...</option>
									<option v-else-if="deviceModels.length === 0" value="" disabled>無可用設備型號</option>
									<option v-for="model in deviceModels" :key="model.id" :value="model.id">{{ model.name }}</option>
								</select>
								<p v-if="deviceModels.length === 0 && !isLoadingDeviceModels" class="text-xs text-amber-300 mt-1">可選：在「設備型號管理」中建立設備型號</p>
							</label>

							<!-- 根據設備類型顯示不同的配置欄位 -->
							<!-- 控制器（Modbus）配置 -->
							<template v-if="deviceTypeCode === 'controller'">
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>主機位址 (IP) *</span>
									<input
										v-model="controllerConfig.host"
										type="text"
										required
										pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
										class="form-input"
										placeholder="例如：192.168.2.205"
									/>
								</label>
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>端口 *</span>
									<input v-model.number="controllerConfig.port" type="number" required min="1" max="65535" class="form-input" placeholder="例如：502" />
								</label>
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>單元 ID *</span>
									<input v-model.number="controllerConfig.unitId" type="number" required min="1" max="255" class="form-input" placeholder="例如：1" />
								</label>
							</template>

							<!-- 影像設備配置 -->
							<template v-if="deviceTypeCode === 'camera'">
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>IP 位址 *</span>
									<input
										v-model="cameraConfig.ip_address"
										type="text"
										required
										pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
										class="form-input"
										placeholder="例如：192.168.2.100"
									/>
								</label>
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>RTSP URL</span>
									<input v-model="cameraConfig.rtsp_url" type="text" class="form-input" placeholder="例如：rtsp://192.168.2.100:554/stream" />
								</label>
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>端口</span>
									<input v-model.number="cameraConfig.port" type="number" min="1" max="65535" class="form-input" placeholder="例如：554" />
								</label>
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>使用者名稱</span>
									<input v-model="cameraConfig.username" type="text" class="form-input" placeholder="選填" />
								</label>
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>密碼</span>
									<input v-model="cameraConfig.password" type="password" class="form-input" placeholder="選填" />
								</label>
							</template>

							<!-- 感測器配置 -->
							<template v-if="deviceTypeCode === 'sensor'">
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>通訊協定 *</span>
									<select v-model="sensorConfig.protocol" required class="form-input form-select">
										<option value="modbus">Modbus</option>
										<option value="http">HTTP</option>
										<option value="mqtt">MQTT</option>
									</select>
								</label>
								<template v-if="sensorConfig.protocol === 'modbus'">
									<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
										<span>主機位址 (IP) *</span>
										<input
											v-model="sensorConfig.host"
											type="text"
											required
											pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
											class="form-input"
											placeholder="例如：192.168.2.204"
										/>
									</label>
									<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
										<span>端口 *</span>
										<input v-model.number="sensorConfig.port" type="number" required min="1" max="65535" class="form-input" placeholder="例如：5020" />
									</label>
									<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
										<span>單元 ID *</span>
										<input v-model.number="sensorConfig.unitId" type="number" required min="1" max="255" class="form-input" placeholder="例如：1" />
									</label>
								</template>
								<template v-else-if="sensorConfig.protocol === 'http'">
									<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
										<span>API 端點 *</span>
										<input v-model="sensorConfig.api_endpoint" type="text" required class="form-input" placeholder="例如：http://192.168.2.204/api/sensor" />
									</label>
								</template>
								<template v-else-if="sensorConfig.protocol === 'mqtt'">
									<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
										<span>連線字串 *</span>
										<input v-model="sensorConfig.connection_string" type="text" required class="form-input" placeholder="例如：mqtt://192.168.2.204:1883" />
									</label>
								</template>
							</template>

							<!-- 平板配置 -->
							<template v-if="deviceTypeCode === 'tablet'">
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>MAC 位址 *</span>
									<input
										v-model="tabletConfig.mac_address"
										type="text"
										required
										pattern="^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
										class="form-input"
										placeholder="例如：00:11:22:33:44:55"
									/>
								</label>
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>IP 位址</span>
									<input
										v-model="tabletConfig.ip_address"
										type="text"
										pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
										class="form-input"
										placeholder="例如：192.168.2.50"
									/>
								</label>
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>位置</span>
									<input v-model="tabletConfig.location" type="text" class="form-input" placeholder="例如：一樓大廳" />
								</label>
							</template>

							<!-- 網路裝置配置 -->
							<template v-if="deviceTypeCode === 'network'">
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>IP 位址 *</span>
									<input
										v-model="networkConfig.ip_address"
										type="text"
										required
										pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
										class="form-input"
										placeholder="例如：192.168.2.1"
									/>
								</label>
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>MAC 位址</span>
									<input
										v-model="networkConfig.mac_address"
										type="text"
										pattern="^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
										class="form-input"
										placeholder="例如：00:11:22:33:44:55"
									/>
								</label>
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>裝置類型 *</span>
									<select v-model="networkConfig.device_type" required class="form-input form-select">
										<option value="router">路由器</option>
										<option value="switch">交換器</option>
										<option value="access_point">無線基地台</option>
										<option value="other">其他</option>
									</select>
								</label>
								<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
									<span>端口</span>
									<input v-model.number="networkConfig.port" type="number" min="1" max="65535" class="form-input" placeholder="例如：80" />
								</label>
							</template>

							<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
								<span>備註</span>
								<textarea v-model="localFormData.description" class="form-input" rows="3" placeholder="設備描述或備註"></textarea>
							</label>
							<label v-if="isAdmin" class="flex items-center gap-3 2xl:gap-4 text-sm 2xl:text-base text-white/80">
								<label class="relative inline-flex items-center cursor-pointer">
									<input v-model="localFormData.status" type="checkbox" value="active" true-value="active" false-value="inactive" class="sr-only peer" />
									<div
										class="w-11 2xl:w-14 h-6 2xl:h-7 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:rounded-full after:h-5 2xl:after:h-6 after:w-5 2xl:after:w-6 after:transition-all peer-checked:bg-emerald-500"
									></div>
									<span class="ml-3 text-sm 2xl:text-base">{{ localFormData.status === "active" ? "已啟用" : "已停用" }}</span>
								</label>
							</label>
						</div>

						<p v-if="errorMessage" class="text-rose-300 text-sm 2xl:text-base mt-4 2xl:mt-5">{{ errorMessage }}</p>

						<footer class="flex items-center gap-3 2xl:gap-4 mt-2 2xl:mt-3">
							<button type="button" class="btn-secondary" @click="handleClose">取消</button>
							<div class="flex-1"></div>
							<button type="submit" class="btn-primary" :disabled="isSubmitting">
								{{ isSubmitting ? "處理中..." : editingDevice ? "更新" : "建立" }}
							</button>
						</footer>
					</form>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { Device, CreateDeviceData, UpdateDeviceData, DeviceModel, DeviceTypeCode, DeviceConfig } from "~/types/device";
import type { ControllerDeviceConfig, CameraDeviceConfig, SensorDeviceConfig, TabletDeviceConfig, NetworkDeviceConfig } from "~/types/device";

interface Props {
	modelValue: boolean;
	editingDevice: Device | null;
	deviceTypeCode: DeviceTypeCode;
	isAdmin: boolean;
	isSubmitting?: boolean;
	errorMessage?: string | null;
	refreshDeviceTypes?: boolean;
}

interface Emits {
	(e: "update:modelValue", value: boolean): void;
	(e: "submit", data: CreateDeviceData | UpdateDeviceData): void;
	(e: "close"): void;
}

const props = withDefaults(defineProps<Props>(), {
	isSubmitting: false,
	errorMessage: null
});

const emit = defineEmits<Emits>();

const deviceApi = useDeviceApi();
const deviceModels = ref<DeviceModel[]>([]);
const isLoadingDeviceModels = ref(false);

// 取得當前設備類型 ID
const currentDeviceTypeId = ref<number | null>(null);

// 載入設備類型 ID
const loadDeviceType = async () => {
	try {
		const result = await deviceApi.getDeviceTypeByCode(props.deviceTypeCode);
		currentDeviceTypeId.value = result.device_type.id;
	} catch (error) {
		console.error("載入設備類型失敗:", error);
	}
};

const localFormData = reactive({
	name: "",
	model_id: 0,
	description: "",
	status: "inactive" as "active" | "inactive" | "error"
});

// 各類型的配置
const controllerConfig = reactive<ControllerDeviceConfig>({
	type: "controller",
	host: "",
	port: 502,
	unitId: 1
});

const cameraConfig = reactive<CameraDeviceConfig>({
	type: "camera",
	ip_address: "",
	rtsp_url: "",
	port: 554,
	username: "",
	password: ""
});

const sensorConfig = reactive<SensorDeviceConfig>({
	type: "sensor",
	protocol: "modbus",
	host: "",
	port: 5020,
	unitId: 1,
	connection_string: "",
	api_endpoint: ""
});

const tabletConfig = reactive<TabletDeviceConfig>({
	type: "tablet",
	mac_address: "",
	ip_address: "",
	location: ""
});

const networkConfig = reactive<NetworkDeviceConfig>({
	type: "network",
	ip_address: "",
	mac_address: "",
	device_type: "router",
	port: 80
});

// 載入設備型號列表
const loadDeviceModels = async (force = false) => {
	if (!force && deviceModels.value.length > 0) return;

	isLoadingDeviceModels.value = true;
	try {
		const result = await deviceApi.getDeviceModels({
			type_code: props.deviceTypeCode
		});
		deviceModels.value = result.device_models;
	} catch (error) {
		console.error("載入設備型號失敗:", error);
	} finally {
		isLoadingDeviceModels.value = false;
	}
};

const onModelChange = () => {
	// 如果選擇了型號，可以從型號的 config 中繼承一些設定
	// 這裡暫時不實作，因為型號的 config 結構可能不同
};

// 監聽 refreshDeviceTypes 屬性變化
watch(
	() => props.refreshDeviceTypes,
	() => {
		if (props.refreshDeviceTypes) {
			loadDeviceModels(true);
		}
	}
);

const resetForm = () => {
	localFormData.name = "";
	localFormData.model_id = 0;
	localFormData.description = "";
	localFormData.status = "inactive";

	// 重置各類型配置
	controllerConfig.host = "";
	controllerConfig.port = 502;
	controllerConfig.unitId = 1;

	cameraConfig.ip_address = "";
	cameraConfig.rtsp_url = "";
	cameraConfig.port = 554;
	cameraConfig.username = "";
	cameraConfig.password = "";

	sensorConfig.protocol = "modbus";
	sensorConfig.host = "";
	sensorConfig.port = 5020;
	sensorConfig.unitId = 1;
	sensorConfig.connection_string = "";
	sensorConfig.api_endpoint = "";

	tabletConfig.mac_address = "";
	tabletConfig.ip_address = "";
	tabletConfig.location = "";

	networkConfig.ip_address = "";
	networkConfig.mac_address = "";
	networkConfig.device_type = "router";
	networkConfig.port = 80;
};

// 從設備載入配置
const loadConfigFromDevice = (device: Device) => {
	if (!device.config) return;

	switch (device.config.type) {
		case "controller":
			Object.assign(controllerConfig, device.config);
			break;
		case "camera":
			Object.assign(cameraConfig, device.config);
			break;
		case "sensor":
			Object.assign(sensorConfig, device.config);
			break;
		case "tablet":
			Object.assign(tabletConfig, device.config);
			break;
		case "network":
			Object.assign(networkConfig, device.config);
			break;
	}
};

// 當 editingDevice 改變時，更新表單數據
watch(
	() => props.editingDevice,
	(device) => {
		if (device) {
			localFormData.name = device.name;
			localFormData.model_id = device.model_id || 0;
			localFormData.description = device.description || "";
			localFormData.status = device.status;
			loadConfigFromDevice(device);
		} else {
			resetForm();
		}
	},
	{ immediate: true }
);

// 當對話框打開時載入設備型號和設備類型
watch(
	() => props.modelValue,
	(isOpen) => {
		if (isOpen) {
			loadDeviceType();
			loadDeviceModels();
		} else {
			resetForm();
		}
	},
	{ immediate: true }
);

const handleClose = () => {
	emit("update:modelValue", false);
	emit("close");
};

const getCurrentConfig = (): DeviceConfig => {
	switch (props.deviceTypeCode) {
		case "controller":
			return { ...controllerConfig };
		case "camera":
			return { ...cameraConfig };
		case "sensor":
			return { ...sensorConfig };
		case "tablet":
			return { ...tabletConfig };
		case "network":
			return { ...networkConfig };
		default:
			throw new Error(`未知的設備類型: ${props.deviceTypeCode}`);
	}
};

const handleSubmit = () => {
	if (!currentDeviceTypeId.value) {
		console.error("設備類型 ID 尚未載入");
		return;
	}

	const config = getCurrentConfig();

	if (props.editingDevice) {
		// 更新設備
		emit("submit", {
			name: localFormData.name,
			model_id: localFormData.model_id || undefined,
			description: localFormData.description,
			status: localFormData.status,
			config: config
		} as UpdateDeviceData);
	} else {
		// 建立設備
		const submitData: CreateDeviceData = {
			name: localFormData.name,
			type_id: currentDeviceTypeId.value,
			model_id: localFormData.model_id || undefined,
			description: localFormData.description,
			status: localFormData.status === "active" ? "active" : undefined,
			config: config
		};
		emit("submit", submitData);
	}
};
</script>

<style scoped>
.dialog-panel-bg {
	background: linear-gradient(145deg, rgba(9, 106, 133, 0.95), rgba(20, 64, 92, 0.98));
	border: 1px solid rgba(255, 255, 255, 0.25);
	box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
	color: #f5f9ff;
}

.form-input {
	border-radius: 0.75rem;
	border: 1px solid rgba(255, 255, 255, 0.35);
	background: rgba(255, 255, 255, 0.1);
	padding: 0.65rem 0.85rem;
	color: #f7fbff;
	transition: border-color 0.2s ease, background 0.2s ease;
}

.form-input:focus {
	border-color: #5be7f1;
	background: rgba(255, 255, 255, 0.18);
	outline: none;
}

.form-select {
	cursor: pointer;
}

.form-select option {
	background: rgba(20, 64, 92, 0.98);
	color: #f7fbff;
}

.btn-primary {
	border-radius: 999px;
	padding: 0.6rem 1.4rem;
	font-weight: 500;
	font-size: 0.9rem;
	cursor: pointer;
	transition: all 0.2s ease;
	background: linear-gradient(135deg, #2dd4bf, #1ba9d3);
	color: #0b2c3c;
	border: none;
	box-shadow: 0 10px 25px rgba(23, 217, 199, 0.35);
}

.btn-primary:hover:not(:disabled) {
	transform: translateY(-1px);
	box-shadow: 0 12px 30px rgba(23, 217, 199, 0.45);
}

.btn-primary:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.btn-secondary {
	border-radius: 999px;
	padding: 0.6rem 1.4rem;
	font-weight: 500;
	font-size: 0.9rem;
	cursor: pointer;
	transition: all 0.2s ease;
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(91, 231, 241, 0.5);
	color: #e8fbff;
}

.btn-secondary:hover {
	background: rgba(255, 255, 255, 0.12);
	border-color: rgba(91, 231, 241, 0.7);
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
	transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
	opacity: 0;
}
</style>
