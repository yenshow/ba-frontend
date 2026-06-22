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
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
							{{ editingDevice ? "編輯設備" : "新增設備" }}
						</h3>
						<div class="flex items-center gap-3">
							<FormChangeIndicator
								v-if="hasUnsavedChanges"
								:has-changes="hasUnsavedChanges"
								:changed-fields="changedFieldsList"
								:message="changeSummary"
							/>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉對話框"
								@click="handleClose"
							>
								&times;
							</button>
						</div>
					</header>

					<form
						@submit.prevent="handleSubmit"
						class="show-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto pb-4 pr-7 2xl:gap-6 2xl:pb-6 2xl:pr-8"
					>
						<fieldset :disabled="!canWrite" class="flex min-w-0 flex-col gap-4 border-0 p-0 2xl:gap-6">
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
							<span>設備名稱 *</span>
							<input
								v-model="localFormData.name"
								type="text"
								required
								class="form-input"
								placeholder="例如：控制器 1"
							/>
						</label>
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
							<span v-if="deviceTypeCode === 'camera'">群組</span>
							<input
								v-if="deviceTypeCode === 'camera'"
								v-model="cameraGroup"
								type="text"
								class="form-input"
								placeholder="例如：大門、工地 A 區"
								aria-label="攝影機群組"
							/>
						</label>
						<label
							v-if="deviceTypeCode === 'camera'"
							class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
						>
							<span>型號分類 *</span>
							<FilterDropdown
								v-model="cameraCategoryCode"
								:options="cameraCategoryOptions"
								placeholder="請選擇型號分類"
								@update:modelValue="onCameraCategoryChange"
							/>
						</label>
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
							<span>設備型號 *</span>
							<FilterDropdown
								v-model="modelIdString"
								:options="deviceModelOptions"
								:placeholder="cameraModelPlaceholder"
								:disabled="deviceTypeCode === 'camera' && !cameraCategoryCode"
								@update:modelValue="onModelChange"
							/>
							<p
								v-if="filteredDeviceModels.length === 0 && !isLoadingDeviceModels"
								class="mt-1 text-xs text-amber-300"
							>
								{{
									deviceTypeCode === "camera" && !cameraCategoryCode
										? "請先選擇型號分類"
										: canPlatformAdmin
											? "請先在「型號管理」中建立設備型號"
											: "目前無可用型號，請聯繫平台管理員新增"
								}}
							</p>
						</label>

						<template v-if="deviceTypeCode === 'controller'">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>主機位址 *</span>
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
								<span>端口 *</span>
								<input
									v-model.number="controllerConfig.port"
									type="number"
									min="1"
									max="65535"
									required
									class="form-input"
									:placeholder="isHcnetSdkController ? '例如：8000' : '例如：502'"
									:disabled="isControllerPortInherited"
									:aria-label="isHcnetSdkController ? 'SDK 端口' : 'Modbus 端口'"
								/>
							</label>
							<template v-if="isHcnetSdkController">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>帳號 *</span>
									<input
										v-model="controllerConfig.username"
										type="text"
										required
										class="form-input"
										placeholder="預設 admin，可修改"
										aria-label="梯控登入帳號"
									/>
								</label>
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>密碼 *</span>
									<div class="relative w-full">
										<input
											v-model="controllerConfig.password"
											:type="showControllerPassword ? 'text' : 'password'"
											required
											class="form-input w-full pr-12"
											placeholder="請輸入設備登入密碼"
											:aria-label="
												showControllerPassword ? '梯控密碼（已顯示）' : '梯控密碼（已隱藏）'
											"
										/>
										<button
											type="button"
											class="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/50 transition-colors hover:text-white/80 focus:outline-none"
											:aria-label="showControllerPassword ? '隱藏密碼' : '顯示密碼'"
											@click="showControllerPassword = !showControllerPassword"
										>
											<svg
												v-if="!showControllerPassword"
												class="h-5 w-5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
												/>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
												/>
											</svg>
											<svg
												v-else
												class="h-5 w-5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
												/>
											</svg>
										</button>
									</div>
								</label>
							</template>
						</template>

						<template v-if="deviceTypeCode === 'camera'">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>設備 IP 位址 *</span>
								<input
									v-model="cameraIp"
									type="text"
									required
									pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
									class="form-input"
									placeholder="例如：192.168.2.102"
								/>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>帳號 *</span>
								<input
									v-model="cameraUsername"
									type="text"
									required
									class="form-input"
									placeholder="預設 admin，可修改"
									aria-label="攝影機登入帳號"
								/>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>密碼 *</span>
								<div class="relative w-full">
									<input
										v-model="cameraPassword"
										:type="showCameraPassword ? 'text' : 'password'"
										required
										class="form-input w-full pr-12"
										placeholder="請輸入設備登入密碼"
										:aria-label="showCameraPassword ? '攝影機密碼（已顯示）' : '攝影機密碼（已隱藏）'"
									/>
									<button
										type="button"
										class="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/50 transition-colors hover:text-white/80 focus:outline-none"
										:aria-label="showCameraPassword ? '隱藏密碼' : '顯示密碼'"
										@click="showCameraPassword = !showCameraPassword"
									>
										<svg
											v-if="!showCameraPassword"
											class="h-5 w-5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
										<svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
											/>
										</svg>
									</button>
								</div>
							</label>
							<div class="text-xs text-white/60 2xl:text-sm">
								RTSP URL 預覽：
								<span class="break-all">{{ cameraRtspPreview }}</span>
							</div>
						</template>

						<template v-if="deviceTypeCode === 'sensor'">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>通訊協定 *</span>
								<FilterDropdown
									v-model="sensorConfig.protocol"
									:options="sensorProtocolOptions"
									placeholder="請選擇協定"
									text-size="text-sm 2xl:text-base"
								/>
							</label>
							<template v-if="sensorConfig.protocol === 'modbus'">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>主機位址 *</span>
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
										min="1"
										max="65535"
										required
										class="form-input"
										placeholder="例如：502"
									:disabled="isSensorPortInherited"
									aria-label="Modbus 端口"
								/>
							</label>
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>Unit ID *</span>
									<input
										v-model.number="sensorConfig.unitId"
										type="number"
										min="1"
										max="255"
										required
										class="form-input"
										placeholder="例如：1"
									:disabled="isSensorUnitIdInherited"
									aria-label="Modbus Unit ID"
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
								<span>主機位址 *</span>
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
								<span>密碼 *</span>
								<div class="relative w-full">
									<input
										v-model="accessControlConfig.password"
										:type="showAccessControlPassword ? 'text' : 'password'"
										required
										class="form-input w-full pr-12"
										placeholder="設備登入密碼"
										:aria-label="showAccessControlPassword ? '門禁密碼（已顯示）' : '門禁密碼（已隱藏）'"
									/>
									<button
										type="button"
										class="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/50 transition-colors hover:text-white/80 focus:outline-none"
										:aria-label="showAccessControlPassword ? '隱藏密碼' : '顯示密碼'"
										@click="showAccessControlPassword = !showAccessControlPassword"
									>
										<svg
											v-if="!showAccessControlPassword"
											class="h-5 w-5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
										<svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
											/>
										</svg>
									</button>
								</div>
							</label>
						</template>

						<p v-if="displayErrorMessage" class="form-error-text">
							{{ displayErrorMessage }}
						</p>
						</fieldset>
					</form>

					<footer class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8">
						<button type="button" class="btn-secondary" @click="handleClose">取消</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="btn-primary"
							:class="{ 'cursor-not-allowed opacity-50': editingDevice && !hasUnsavedChanges }"
							:disabled="!canWrite || isSubmitting || (editingDevice && !hasUnsavedChanges)"
							@click="handleSubmit"
						>
							{{ isSubmitting ? "處理中..." : editingDevice ? "儲存變更" : "建立" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>

	<ConfirmDialog
		v-model="showConfirmDialog"
		:title="confirmDialogConfig.title"
		:message="confirmDialogConfig.message"
		:details="confirmDialogConfig.details"
		:type="confirmDialogConfig.type"
		@confirm="closeDialog"
	/>
</template>

<script setup lang="ts">
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi";
import { usePlatformAdmin } from "~/composables/core/useAuth";
import FilterDropdown from "~/components/common/FilterDropdown.vue";
import ConfirmDialog from "~/components/common/ConfirmDialog.vue";
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue";
import { useConfirmDialog } from "~/composables/core/useConfirmDialog";
import { computed } from "vue";
import {
	isHcnetSdkDeviceModel,
	type Device,
	type CreateDeviceData,
	type UpdateDeviceData,
	type DeviceModel,
	type DeviceTypeCode,
	type DeviceConfig,
	type ControllerDeviceConfig,
	type CameraDeviceConfig,
	type SensorDeviceConfig,
	type AccessControlDeviceConfig
} from "~/types/device";
import {
	DEFAULT_CAMERA_RTSP_TEMPLATE,
	buildCameraRtspUrl,
	previewCameraRtspTemplate,
	parseCameraRtspUrl
} from "~/utils/cameraRtspUtils";
import { CAMERA_MODEL_CATEGORY_OPTIONS } from "~/utils/cameraModelCategories";
import { validateDeviceFormForSave } from "~/utils/deviceFormValidation";

interface Props {
	modelValue: boolean;
	editingDevice: Device | null;
	deviceTypeCode: DeviceTypeCode;
	canWrite: boolean;
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
	canWrite: false,
	isSubmitting: false,
	errorMessage: null
});

const emit = defineEmits<Emits>();

const deviceApi = useDeviceApi();
const canPlatformAdmin = usePlatformAdmin();
const deviceModels = ref<DeviceModel[]>([]);
const isLoadingDeviceModels = ref(false);
const localErrorMessage = ref<string | null>(null);

// 設備型號 ID 字串（用於 FilterDropdown）
const modelIdString = ref("");

const localFormData = reactive({
	name: "",
	model_id: 0
});

const controllerConfig = reactive<ControllerDeviceConfig>({
	type: "controller",
	host: "",
	port: undefined,
	unitId: undefined,
	username: "admin",
	password: ""
});
const showControllerPassword = ref(false);

const cameraConfig = reactive<CameraDeviceConfig>({
	type: "camera",
	rtsp_url: ""
});

const cameraIp = ref<string>("");
const cameraUsername = ref<string>("admin");
const cameraPassword = ref<string>("");
const cameraGroup = ref<string>("");
const cameraCategoryCode = ref("");
const showCameraPassword = ref(false);

const cameraCategoryOptions = computed(() => [
	{ value: "", label: "請選擇型號分類" },
	...CAMERA_MODEL_CATEGORY_OPTIONS
]);

const filteredDeviceModels = computed(() => {
	if (props.deviceTypeCode !== "camera") return deviceModels.value;
	if (!cameraCategoryCode.value) return [];
	return deviceModels.value.filter(
		(m) => String(m.category_code || "") === cameraCategoryCode.value
	);
});

const cameraModelPlaceholder = computed(() => {
	if (isLoadingDeviceModels.value) return "載入中...";
	if (props.deviceTypeCode === "camera" && !cameraCategoryCode.value) return "請先選擇型號分類";
	return "請選擇設備型號";
});
const showAccessControlPassword = ref(false);

const selectedCameraRtspTemplate = computed(() => {
	const config = selectedDeviceModel.value?.config as Record<string, unknown> | undefined;
	const tpl = config?.rtsp_url_template;
	return typeof tpl === "string" && tpl.trim() ? tpl.trim() : DEFAULT_CAMERA_RTSP_TEMPLATE;
});

const cameraRtspPreview = computed(() =>
	previewCameraRtspTemplate(
		selectedCameraRtspTemplate.value,
		cameraIp.value,
		cameraUsername.value,
		cameraPassword.value
	)
);

const sensorProtocolOptions = [
	{ value: "modbus", label: "Modbus / TCP" },
	{ value: "http", label: "HTTP" },
	{ value: "mqtt", label: "MQTT" },
];

const sensorConfig = reactive<SensorDeviceConfig>({
	type: "sensor",
	protocol: "modbus",
	host: "",
	port: undefined,
	unitId: undefined,
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
	const source =
		props.deviceTypeCode === "camera" ? filteredDeviceModels.value : deviceModels.value;
	const options = source.map((model) => ({
		value: String(model.id),
		label: model.name,
	}));
	// 添加空選項（用於清除選擇）
	return [{ value: "", label: "請選擇設備型號" }, ...options];
});

// 獲取當前選中的設備型號
const selectedDeviceModel = computed(() => {
	if (!localFormData.model_id || deviceModels.value.length === 0) return null;
	return deviceModels.value.find(m => m.id === localFormData.model_id) || null;
});

const isHcnetSdkController = computed(() =>
	isHcnetSdkDeviceModel(selectedDeviceModel.value)
);

// 從選中的型號繼承 port 與 unit_id
const inheritFromModel = () => {
	const model = selectedDeviceModel.value;
	if (!model) return;

	if (props.deviceTypeCode === "controller") {
		if (model.port != null) controllerConfig.port = model.port;
		if (isHcnetSdkDeviceModel(model)) {
			controllerConfig.protocol = "hcnet_sdk";
			controllerConfig.unitId = undefined;
			if (!controllerConfig.username?.trim()) controllerConfig.username = "admin";
		} else {
			controllerConfig.protocol = undefined;
			controllerConfig.username = undefined;
			controllerConfig.password = "";
			if (model.unit_id != null) controllerConfig.unitId = model.unit_id;
		}
	} else if (props.deviceTypeCode === "sensor" && sensorConfig.protocol === "modbus") {
		if (model.port != null) sensorConfig.port = model.port;
		if (model.unit_id != null) sensorConfig.unitId = model.unit_id;
	}
};

const onCameraCategoryChange = () => {
	localFormData.model_id = 0;
	modelIdString.value = "";
};

const onModelChange = (value: string) => {
	localFormData.model_id = value ? Number(value) : 0;
	inheritFromModel();
};

// 監聽感測器協議變化，當切換到 modbus 時，如果已選擇型號則繼承 port / unit_id
watch(
	() => sensorConfig.protocol,
	newProtocol => {
		if (newProtocol === "modbus") {
			inheritFromModel();
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
	controllerConfig.host = "";
	controllerConfig.port = undefined;
	controllerConfig.unitId = undefined;
	controllerConfig.protocol = undefined;
	controllerConfig.username = "admin";
	controllerConfig.password = "";
	showControllerPassword.value = false;

	cameraConfig.rtsp_url = "";

	cameraIp.value = "";
	cameraUsername.value = "admin";
	cameraPassword.value = "";
	cameraGroup.value = "";
	cameraCategoryCode.value = "";
	showCameraPassword.value = false;

	sensorConfig.protocol = "modbus";
	sensorConfig.host = "";
	sensorConfig.port = undefined;
	sensorConfig.unitId = undefined;
	sensorConfig.connection_string = "";
	sensorConfig.api_endpoint = "";

	accessControlConfig.host = "";
	accessControlConfig.port = 80;
	accessControlConfig.password = "";
	showAccessControlPassword.value = false;

	localErrorMessage.value = null;
};

const displayErrorMessage = computed(() => {
	return localErrorMessage.value || props.errorMessage;
});

// 表單快照（用於比對未保存變更）
interface FormSnapshot {
	name: string;
	model_id: number;
	config: DeviceConfig;
}
const initialFormSnapshot = ref<FormSnapshot | null>(null);

const getFormSnapshot = (): FormSnapshot => ({
	name: localFormData.name,
	model_id: localFormData.model_id,
	config: getCurrentConfig()
});

// 新增模式下表單是否已填寫（任一欄位有值即視為有變更）
const createModeHasContent = computed(() => {
	if (props.editingDevice) return false;
	const nameFilled = localFormData.name.trim() !== "";
	const modelSelected = localFormData.model_id > 0;
	const configFilled = (() => {
		const c = getCurrentConfig();
		if (c.type === "controller") {
			const hasPort = c.port != null || controllerConfig.port != null;
			if (isHcnetSdkController.value) {
				return !!(
					c.host &&
					hasPort &&
					controllerConfig.username?.trim() &&
					controllerConfig.password?.trim()
				);
			}
			return !!(c.host && hasPort);
		}
		if (c.type === "camera") {
			const ip = cameraIp.value.trim();
			const user = cameraUsername.value.trim();
			const pwd = cameraPassword.value.trim();
			return !!(ip && user && pwd);
		}
		if (c.type === "sensor") {
			if (c.protocol === "modbus") return !!(c.host && (c.port != null || sensorConfig.port != null));
			if (c.protocol === "http") return !!c.api_endpoint;
			if (c.protocol === "mqtt") return !!c.connection_string;
			return false;
		}
		if (c.type === "access_control") return !!(c.host && c.password);
		return false;
	})();
	return nameFilled || modelSelected || configFilled;
});

const hasUnsavedChanges = computed(() => {
	if (props.editingDevice) {
		if (!initialFormSnapshot.value) return false;
		const current = getFormSnapshot();
		const initial = initialFormSnapshot.value;
		return (
			current.name !== initial.name ||
			current.model_id !== initial.model_id ||
			JSON.stringify(current.config) !== JSON.stringify(initial.config)
		);
	}
	return createModeHasContent.value;
});

const changedFieldsList = computed(() => {
	if (!props.editingDevice || !initialFormSnapshot.value) return [];
	const current = getFormSnapshot();
	const initial = initialFormSnapshot.value;
	const fields: string[] = [];
	if (current.name !== initial.name) {
		fields.push(`設備名稱: ${initial.name || "(空)"} → ${current.name || "(空)"}`);
	}
	if (current.model_id !== initial.model_id) {
		fields.push("設備型號");
	}
	if (JSON.stringify(current.config) !== JSON.stringify(initial.config)) {
		fields.push("連線設定");
	}
	return fields;
});

const changeSummary = computed(() => {
	const count = changedFieldsList.value.length;
	if (count === 0 && !props.editingDevice && createModeHasContent.value)
		return "表單已填寫，尚未儲存";
	if (count === 0) return "";
	return `有 ${count} 個欄位已修改`;
});

// 確認對話框（關閉前未保存提示）
const confirmDialog = useConfirmDialog();
const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value;
	}
});
const confirmDialogConfig = computed(() => confirmDialog.config.value);

const CONFIRM_CLOSE = {
	title: "確認關閉",
	message: "您有未保存的變更，確定要關閉嗎？",
	details: "未保存的變更將會遺失。",
	type: "warning" as const
};

const closeDialog = () => {
	initialFormSnapshot.value = null;
	localErrorMessage.value = null;
	emit("update:modelValue", false);
	emit("close");
};

// 判斷控制器的 port 是否繼承自型號
const isControllerPortInherited = computed(() => {
	return props.deviceTypeCode === "controller" && !!selectedDeviceModel.value?.port;
});

// 判斷感測器的 port 是否繼承自型號（僅當協議為 modbus 時）
const isSensorPortInherited = computed(() => {
	return (
		props.deviceTypeCode === "sensor" &&
		sensorConfig.protocol === "modbus" &&
		selectedDeviceModel.value?.port != null
	);
});

// 判斷感測器的 unitId 是否繼承自型號（僅當協議為 modbus 時）
const isSensorUnitIdInherited = computed(() => {
	return (
		props.deviceTypeCode === "sensor" &&
		sensorConfig.protocol === "modbus" &&
		selectedDeviceModel.value?.unit_id != null
	);
});

const loadConfigFromDevice = (device: Device) => {
	if (!device.config) return;

	switch (device.config.type) {
		case "controller":
			Object.assign(controllerConfig, device.config);
			break;
		case "camera": {
			Object.assign(cameraConfig, device.config);
			const camCfg = device.config as CameraDeviceConfig;
			cameraGroup.value = camCfg.group ?? "";
			if (!(cameraConfig.rtsp_url || "").trim()) {
				cameraIp.value = "";
				cameraUsername.value = camCfg.username?.trim() || "admin";
				cameraPassword.value = "";
				break;
			}
			const { host, user, password } = parseCameraRtspUrl(cameraConfig.rtsp_url);
			cameraIp.value = host;
			cameraUsername.value = camCfg.username?.trim() || user || "admin";
			cameraPassword.value = password;
			break;
		}
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
			cameraCategoryCode.value = String(device.model_category_code || "");
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
			loadDeviceModels();
			nextTick(() => {
				initialFormSnapshot.value = getFormSnapshot();
			});
		} else {
			resetForm();
			initialFormSnapshot.value = null;
		}
	},
	{ immediate: true }
);

const handleClose = () => {
	if (hasUnsavedChanges.value) {
		confirmDialog.show(CONFIRM_CLOSE);
		return;
	}
	closeDialog();
};

const getCurrentConfig = (): DeviceConfig => {
	switch (props.deviceTypeCode) {
		case "controller": {
			if (isHcnetSdkController.value) {
				return {
					type: "controller",
					protocol: "hcnet_sdk",
					host: controllerConfig.host,
					port: controllerConfig.port,
					username: controllerConfig.username?.trim() || "admin",
					password: controllerConfig.password || ""
				};
			}
			return {
				type: "controller",
				host: controllerConfig.host,
				port: controllerConfig.port,
				...(controllerConfig.unitId != null && { unitId: controllerConfig.unitId })
			};
		}
		case "camera": {
			const ip = cameraIp.value.trim();
			const user = cameraUsername.value.trim() || "admin";
			const pwd = cameraPassword.value.trim();
			const rtspUrl =
				ip && pwd
					? buildCameraRtspUrl(selectedCameraRtspTemplate.value, ip, user, pwd)
					: cameraConfig.rtsp_url;
			return {
				type: "camera",
				rtsp_url: rtspUrl,
				host: ip || cameraConfig.host,
				username: user,
				password: pwd || cameraConfig.password,
				group: cameraGroup.value.trim() || undefined
			};
		}
		case "sensor": {
			const { unitId, ...rest } = sensorConfig;
			return { ...rest, ...(unitId != null && { unitId }) };
		}
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
	if (!props.canWrite) return;

	localErrorMessage.value = null;

	const validationError = validateDeviceFormForSave({
		name: localFormData.name,
		deviceTypeCode: props.deviceTypeCode,
		modelId: localFormData.model_id,
		cameraCategoryCode: cameraCategoryCode.value,
		sensorProtocol: sensorConfig.protocol,
		sensorPort: sensorConfig.port,
		sensorUnitId: sensorConfig.unitId,
		isSensorPortInherited: isSensorPortInherited.value,
		isSensorUnitIdInherited: isSensorUnitIdInherited.value,
		controllerPort: controllerConfig.port,
		isControllerPortInherited: isControllerPortInherited.value,
		isHcnetSdkController: isHcnetSdkController.value,
		controllerUsername: controllerConfig.username,
		controllerPassword: controllerConfig.password,
		cameraIp: cameraIp.value,
		cameraUsername: cameraUsername.value,
		cameraPassword: cameraPassword.value,
	});
	if (validationError) {
		localErrorMessage.value = validationError;
		return;
	}

	const config = getCurrentConfig();

	if (props.editingDevice) {
		emit("submit", {
			name: localFormData.name,
			model_id: localFormData.model_id,
			config: config
		} as UpdateDeviceData);
	} else {
		const submitData: CreateDeviceData = {
			name: localFormData.name,
			type_code: props.deviceTypeCode,
			model_id: localFormData.model_id,
			config: config
		};
		emit("submit", submitData);
	}
};
</script>

<style scoped></style>
