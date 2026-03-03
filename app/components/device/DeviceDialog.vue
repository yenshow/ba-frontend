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
						class="show-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto pb-4 pr-7 2xl:gap-6 2xl:pb-6 2xl:pr-8"
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
							<FilterDropdown
								v-model="modelIdString"
								:options="deviceModelOptions"
								:placeholder="isLoadingDeviceModels ? '載入中...' : '請選擇設備型號'"
								@update:modelValue="onModelChange"
							/>
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
									placeholder="例如：502"
									:disabled="isControllerPortInherited"
								/>
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
								<input v-model="cameraConfig.username" type="text" class="form-input" placeholder="選填" />
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
									<option value="modbus">Modbus / TCP</option>
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
										:disabled="isSensorPortInherited"
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

						<template v-if="deviceTypeCode === 'access_control'">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>主機位址 (IP 或網域名稱) *</span>
								<input
									v-model="accessControlConfig.host"
									type="text"
									required
									class="form-input"
									placeholder="例如：192.168.2.34"
								/>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>端口（選填，預設 80）</span>
								<input
									v-model.number="accessControlConfig.port"
									type="number"
									min="1"
									max="65535"
									class="form-input"
									placeholder="80"
								/>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>密碼 (Digest Auth) *</span>
								<input
									v-model="accessControlConfig.password"
									type="password"
									required
									class="form-input"
									placeholder="設備登入密碼"
								/>
							</label>
						</template>

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
						<button type="button" class="btn-primary" :disabled="isSubmitting" @click="handleSubmit">
							{{ isSubmitting ? "處理中..." : editingDevice ? "更新" : "建立" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { useDeviceApi } from "~/composables/systems/useDeviceApi";
import FilterDropdown from "~/components/common/FilterDropdown.vue";
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
	AccessControlDeviceConfig,
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

// 設備型號 ID 字串（用於 FilterDropdown）
const modelIdString = ref("");

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
	status: "active" as "active" | "inactive" | "error"
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

const accessControlConfig = reactive<AccessControlDeviceConfig>({
	type: "access_control",
	host: "",
	port: 80,
	username: "",
	password: ""
});

// 追蹤當前載入的設備類型，確保切換類型時重新載入
const currentLoadedTypeCode = ref<DeviceTypeCode | null>(null);

const loadDeviceModels = async (force = false) => {
	// 檢查是否需要重新載入：
	// 1. 強制刷新
	// 2. 當前載入的類型與目標類型不一致
	// 3. 還沒有載入過資料
	const needsReload =
		force || currentLoadedTypeCode.value !== props.deviceTypeCode || deviceModels.value.length === 0;

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

// 設備型號選項（用於 FilterDropdown）
const deviceModelOptions = computed(() => {
	if (isLoadingDeviceModels.value) {
		return [{ value: "", label: "載入中..." }];
	}
	if (deviceModels.value.length === 0) {
		return [{ value: "", label: "無可用設備型號" }];
	}
	const options = deviceModels.value.map(model => ({
		value: String(model.id),
		label: model.name
	}));
	// 添加空選項（用於清除選擇）
	return [
		{ value: "", label: "請選擇設備型號" },
		...options
	];
});

// 獲取當前選中的設備型號
const selectedDeviceModel = computed(() => {
	if (!localFormData.model_id || deviceModels.value.length === 0) return null;
	return deviceModels.value.find(m => m.id === localFormData.model_id) || null;
});

// 從選中的型號繼承 port
const inheritPortFromModel = () => {
	const model = selectedDeviceModel.value;
	if (!model?.port) return;

	if (props.deviceTypeCode === "controller") {
		controllerConfig.port = model.port;
	} else if (props.deviceTypeCode === "sensor" && sensorConfig.protocol === "modbus") {
		sensorConfig.port = model.port;
	}
};

const onModelChange = (value: string) => {
	localFormData.model_id = value ? Number(value) : 0;
	inheritPortFromModel();
};

// 監聽感測器協議變化，當切換到 modbus 時，如果已選擇型號則繼承 port
watch(
	() => sensorConfig.protocol,
	newProtocol => {
		if (newProtocol === "modbus") {
			inheritPortFromModel();
		}
	}
);

// 監聽設備類型變化，切換類型時重新載入設備型號
// loadDeviceModels 會自動檢測類型不匹配並重新載入，無需強制刷新
watch(
	() => props.deviceTypeCode,
	() => {
		loadDeviceModels();
	}
);

// 監聽 model_id 變化，同步更新 modelIdString
watch(
	() => localFormData.model_id,
	newModelId => {
		modelIdString.value = newModelId > 0 ? String(newModelId) : "";
	},
	{ immediate: true }
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
	localFormData.status = "active";
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

	accessControlConfig.host = "";
	accessControlConfig.port = 80;
	accessControlConfig.password = "";

	localErrorMessage.value = null;
};

const displayErrorMessage = computed(() => {
	return localErrorMessage.value || props.errorMessage;
});

// 判斷控制器的 port 是否繼承自型號
const isControllerPortInherited = computed(() => {
	return props.deviceTypeCode === "controller" && !!selectedDeviceModel.value?.port;
});

// 判斷感測器的 port 是否繼承自型號（僅當協議為 modbus 時）
const isSensorPortInherited = computed(() => {
	return (
		props.deviceTypeCode === "sensor" &&
		sensorConfig.protocol === "modbus" &&
		!!selectedDeviceModel.value?.port
	);
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
		case "access_control":
			Object.assign(accessControlConfig, device.config);
			break;
	}
};

watch(
	() => props.editingDevice,
	device => {
		if (device) {
			localFormData.name = device.name;
			localFormData.model_id = device.model_id; // model_id 現在是必填的
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
		case "access_control":
			return {
				type: "access_control",
				host: accessControlConfig.host,
				port: accessControlConfig.port || 80,
				username: "admin",
				password: accessControlConfig.password
			};
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
			status: localFormData.status,
			config: config
		} as UpdateDeviceData);
	} else {
		const submitData: CreateDeviceData = {
			name: localFormData.name,
			type_id: currentDeviceTypeId.value,
			model_id: localFormData.model_id,
			status: localFormData.status === "active" ? "active" : undefined,
			config: config
		};
		emit("submit", submitData);
	}
};
</script>

<style scoped>
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

.form-input:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.form-select {
	cursor: pointer;
}

.form-select option {
	background: rgba(20, 64, 92, 0.98);
	color: #f7fbff;
}

</style>
