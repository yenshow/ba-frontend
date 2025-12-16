<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-lg 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
							{{ editingDevice ? "編輯設備" : "新增設備" }}
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉對話框"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<form
						@submit.prevent="handleSubmit"
						class="flex flex-1 flex-col gap-4 overflow-y-auto pb-4 pr-7 2xl:gap-6 2xl:pb-6 2xl:pr-8"
					>
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
							<span>設備名稱 *</span>
							<input
								v-model="localFormData.name"
								type="text"
								required
								class="form-input"
								placeholder="例如：DDC 控制器 1"
							/>
						</label>
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
							<span>設備型號 *</span>
							<select
								v-model.number="localFormData.model_id"
								class="form-input form-select"
								required
								@change="onModelChange"
								:disabled="isLoadingDeviceModels"
							>
								<option :value="0" disabled>請選擇設備型號</option>
								<option v-if="isLoadingDeviceModels" value="" disabled>載入中...</option>
								<option v-else-if="deviceModels.length === 0" value="" disabled>
									無可用設備型號
								</option>
								<option v-for="model in deviceModels" :key="model.id" :value="model.id">
									{{ model.name }}
								</option>
							</select>
							<p
								v-if="deviceModels.length === 0 && !isLoadingDeviceModels"
								class="mt-1 text-xs text-amber-300"
							>
								請先在「設備型號管理」中建立設備型號
							</p>
						</label>

						<template v-if="deviceTypeCode === 'controller'">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
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
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>端口（可選）</span>
								<input
									v-model.number="controllerConfig.port"
									type="number"
									min="1"
									max="65535"
									class="form-input"
									placeholder="例如：502（可選，未提供時會從設備型號繼承）"
								/>
								<p class="mt-1 text-xs text-white/60">未提供時會自動從設備型號繼承端口</p>
							</label>
						</template>

						<template v-if="deviceTypeCode === 'camera'">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
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
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>RTSP URL</span>
								<input
									v-model="cameraConfig.rtsp_url"
									type="text"
									class="form-input"
									placeholder="例如：rtsp://192.168.2.100:554/stream"
								/>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>端口</span>
								<input
									v-model.number="cameraConfig.port"
									type="number"
									min="1"
									max="65535"
									class="form-input"
									placeholder="例如：554"
								/>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>使用者名稱</span>
								<input
									v-model="cameraConfig.username"
									type="text"
									class="form-input"
									placeholder="選填"
								/>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>密碼</span>
								<input
									v-model="cameraConfig.password"
									type="password"
									class="form-input"
									placeholder="選填"
								/>
							</label>
						</template>

						<template v-if="deviceTypeCode === 'sensor'">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>通訊協定 *</span>
								<select v-model="sensorConfig.protocol" required class="form-input form-select">
									<option value="modbus">Modbus</option>
									<option value="http">HTTP</option>
									<option value="mqtt">MQTT</option>
								</select>
							</label>
							<template v-if="sensorConfig.protocol === 'modbus'">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
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
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>端口 *</span>
									<input
										v-model.number="sensorConfig.port"
										type="number"
										required
										min="1"
										max="65535"
										class="form-input"
										placeholder="例如：5020"
									/>
								</label>
							</template>
							<template v-else-if="sensorConfig.protocol === 'http'">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>API 端點 *</span>
									<input
										v-model="sensorConfig.api_endpoint"
										type="text"
										required
										class="form-input"
										placeholder="例如：http://192.168.2.204/api/sensor"
									/>
								</label>
							</template>
							<template v-else-if="sensorConfig.protocol === 'mqtt'">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>連線字串 *</span>
									<input
										v-model="sensorConfig.connection_string"
										type="text"
										required
										class="form-input"
										placeholder="例如：mqtt://192.168.2.204:1883"
									/>
								</label>
							</template>
						</template>

						<template v-if="deviceTypeCode === 'tablet'">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
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
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>IP 位址</span>
								<input
									v-model="tabletConfig.ip_address"
									type="text"
									pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
									class="form-input"
									placeholder="例如：192.168.2.50"
								/>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>位置</span>
								<input
									v-model="tabletConfig.location"
									type="text"
									class="form-input"
									placeholder="例如：一樓大廳"
								/>
							</label>
						</template>

						<template v-if="deviceTypeCode === 'network'">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
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
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>MAC 位址</span>
								<input
									v-model="networkConfig.mac_address"
									type="text"
									pattern="^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
									class="form-input"
									placeholder="例如：00:11:22:33:44:55"
								/>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>裝置類型 *</span>
								<select v-model="networkConfig.device_type" required class="form-input form-select">
									<option value="router">路由器</option>
									<option value="switch">交換器</option>
									<option value="access_point">無線基地台</option>
									<option value="other">其他</option>
								</select>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>端口</span>
								<input
									v-model.number="networkConfig.port"
									type="number"
									min="1"
									max="65535"
									class="form-input"
									placeholder="例如：80"
								/>
							</label>
						</template>

						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
							<span>備註</span>
							<textarea
								v-model="localFormData.description"
								class="form-input"
								rows="3"
								placeholder="設備描述或備註"
							></textarea>
						</label>
						<label
							v-if="isAdmin"
							class="flex items-center gap-3 text-sm text-white/80 2xl:gap-4 2xl:text-base"
						>
							<label class="relative inline-flex cursor-pointer items-center">
								<input
									v-model="localFormData.status"
									type="checkbox"
									value="active"
									true-value="active"
									false-value="inactive"
									class="peer sr-only"
								/>
								<div
									class="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[4px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none 2xl:h-7 2xl:w-14 2xl:after:h-6 2xl:after:w-6"
								></div>
								<span class="ml-3 text-sm 2xl:text-base">{{
									localFormData.status === "active" ? "已啟用" : "已停用"
								}}</span>
							</label>
						</label>

						<p v-if="displayErrorMessage" class="text-sm text-rose-300 2xl:text-base">
							{{ displayErrorMessage }}
						</p>
					</form>

					<footer class="flex items-center gap-3 pr-7 2xl:gap-4 2xl:pr-8">
						<button type="button" class="btn-secondary" @click="handleClose">取消</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="btn-primary"
							:disabled="isSubmitting"
							@click="handleSubmit"
						>
							{{ isSubmitting ? "處理中..." : editingDevice ? "更新" : "建立" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type {
	Device,
	CreateDeviceData,
	UpdateDeviceData,
	DeviceModel,
	DeviceTypeCode,
	DeviceConfig
} from "~/types/device";
import type {
	ControllerDeviceConfig,
	CameraDeviceConfig,
	SensorDeviceConfig,
	TabletDeviceConfig,
	NetworkDeviceConfig
} from "~/types/device";

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
const currentDeviceTypeId = ref<number | null>(null);
const localErrorMessage = ref<string | null>(null);

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

const controllerConfig = reactive<ControllerDeviceConfig>({
	type: "controller",
	host: "",
	port: 502
	// unitId 由後端自動生成，前端不提供
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
	// unitId 由後端自動生成（僅 Modbus 協議），前端不提供
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

// 追蹤當前載入的設備類型，確保切換類型時重新載入
const currentLoadedTypeCode = ref<DeviceTypeCode | null>(null);

const loadDeviceModels = async (force = false) => {
	// 檢查是否需要重新載入：
	// 1. 強制刷新
	// 2. 當前載入的類型與目標類型不一致
	// 3. 還沒有載入過資料
	const needsReload =
		force ||
		currentLoadedTypeCode.value !== props.deviceTypeCode ||
		deviceModels.value.length === 0;

	if (!needsReload) return;

	isLoadingDeviceModels.value = true;
	try {
		// 清除舊資料，避免顯示錯誤的型號列表
		deviceModels.value = [];

		// 強制刷新時添加時間戳以繞過瀏覽器快取
		const params: { type_code: DeviceTypeCode; _t?: string } = { type_code: props.deviceTypeCode };
		if (force) {
			params._t = String(Date.now());
		}
		const result = await deviceApi.getDeviceModels(params);
		deviceModels.value = result.device_models;
		// 記錄當前載入的類型
		currentLoadedTypeCode.value = props.deviceTypeCode;
	} catch (error) {
		console.error("載入設備型號失敗:", error);
	} finally {
		isLoadingDeviceModels.value = false;
	}
};

const onModelChange = () => {
	// 當選擇型號時，從型號繼承 port
	if (localFormData.model_id && deviceModels.value.length > 0) {
		const selectedModel = deviceModels.value.find(m => m.id === localFormData.model_id);
		if (selectedModel && selectedModel.port) {
			// 如果是控制器類型，更新 controllerConfig.port
			if (props.deviceTypeCode === "controller" || props.deviceTypeCode === "modbus") {
				controllerConfig.port = selectedModel.port;
			}
		}
	}
};

// 監聽設備類型變化，切換類型時重新載入設備型號
// loadDeviceModels 會自動檢測類型不匹配並重新載入，無需強制刷新
watch(
	() => props.deviceTypeCode,
	() => {
		loadDeviceModels();
	}
);

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
	controllerConfig.host = "";
	controllerConfig.port = 502;
	// unitId 由後端自動生成，不需要重置

	cameraConfig.ip_address = "";
	cameraConfig.rtsp_url = "";
	cameraConfig.port = 554;
	cameraConfig.username = "";
	cameraConfig.password = "";

	sensorConfig.protocol = "modbus";
	sensorConfig.host = "";
	sensorConfig.port = 5020;
	// unitId 由後端自動生成（僅 Modbus 協議），不需要重置
	sensorConfig.connection_string = "";
	sensorConfig.api_endpoint = "";

	tabletConfig.mac_address = "";
	tabletConfig.ip_address = "";
	tabletConfig.location = "";

	networkConfig.ip_address = "";
	networkConfig.mac_address = "";
	networkConfig.device_type = "router";
	networkConfig.port = 80;

	localErrorMessage.value = null;
};

const displayErrorMessage = computed(() => {
	return localErrorMessage.value || props.errorMessage;
});

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

watch(
	() => props.editingDevice,
	device => {
		if (device) {
			localFormData.name = device.name;
			localFormData.model_id = device.model_id; // model_id 現在是必填的
			localFormData.description = device.description || "";
			localFormData.status = device.status;
			loadConfigFromDevice(device);
		} else {
			resetForm();
		}
	},
	{ immediate: true }
);

watch(
	() => props.modelValue,
	isOpen => {
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
	localErrorMessage.value = null;
	emit("update:modelValue", false);
	emit("close");
};

const getCurrentConfig = (): DeviceConfig => {
	switch (props.deviceTypeCode) {
		case "controller": {
			// unitId 由後端自動生成，前端不提供
			const config: ControllerDeviceConfig = {
				type: "controller",
				host: controllerConfig.host,
				port: controllerConfig.port
			};
			return config;
		}
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
	localErrorMessage.value = null;

	if (!currentDeviceTypeId.value) {
		console.error("設備類型 ID 尚未載入");
		return;
	}

	// 驗證 model_id 必填
	if (!localFormData.model_id || localFormData.model_id === 0) {
		localErrorMessage.value = "請選擇設備型號";
		return;
	}

	const config = getCurrentConfig();

	if (props.editingDevice) {
		emit("submit", {
			name: localFormData.name,
			model_id: localFormData.model_id,
			description: localFormData.description,
			status: localFormData.status,
			config: config
		} as UpdateDeviceData);
	} else {
		const submitData: CreateDeviceData = {
			name: localFormData.name,
			type_id: currentDeviceTypeId.value,
			model_id: localFormData.model_id,
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
	transition:
		border-color 0.2s ease,
		background 0.2s ease;
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

.btn-primary,
.btn-secondary {
	border-radius: 999px;
	padding: 0.6rem 1.4rem;
	font-weight: 500;
	font-size: 0.9rem;
	cursor: pointer;
	transition: all 0.2s ease;
}

.btn-primary {
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
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(91, 231, 241, 0.5);
	color: #e8fbff;
}

.btn-secondary:hover:not(:disabled) {
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
