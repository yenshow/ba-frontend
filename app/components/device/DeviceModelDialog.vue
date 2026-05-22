<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-3xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
							{{ deviceTypeName }} - 設備型號管理
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

					<div class="show-scrollbar flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div class="min-h-[200px]">
							<Transition name="fade" mode="out-in">
								<div v-if="deviceModels && deviceModels.length > 0" :key="`models-${deviceModels.length}`">
									<div class="space-y-3">
										<div
											v-for="model in deviceModels"
											:key="model.id"
											class="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 p-4 transition-colors hover:bg-white/15"
										>
											<div class="flex-1">
												<div class="flex items-center gap-3">
													<h4 class="text-base font-medium text-white 2xl:text-lg">{{ model.name }}</h4>
													<span class="rounded bg-white/20 px-2 py-1 text-xs text-white/80 2xl:text-sm">{{
														model.type_name || "類型"
													}}</span>
													<span
														v-if="deviceTypeCode === 'sensor' && model.unit_id != null"
														class="rounded bg-emerald-500/30 px-2 py-1 text-xs text-emerald-200 2xl:text-sm"
													>
														Unit ID : {{ model.unit_id }}
													</span>
												</div>
												<p v-if="model.description" class="mt-1 text-sm text-white/60 2xl:text-base">
													{{ model.description }}
												</p>
											</div>
											<div v-if="!deviceModelsLocked" class="flex gap-2 2xl:gap-3">
												<button type="button" class="btn-list-edit" @click="editDeviceModel(model)">
													編輯
												</button>
												<button type="button" class="btn-list-delete" @click="confirmDelete(model)">
													刪除
												</button>
											</div>
										</div>
									</div>
								</div>
								<!-- 空狀態 -->
								<div v-else key="empty" class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無設備型號</p>
									<p class="mt-2 text-sm 2xl:text-base">點擊「新增型號」開始建立</p>
								</div>
							</Transition>
						</div>
					</div>
					<p v-if="errorMessage" class="pr-7 text-sm text-rose-300 2xl:pr-8 2xl:text-base">
						{{ errorMessage }}
					</p>
					<footer class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8">
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
						<div class="flex-1"></div>
						<button v-if="!deviceModelsLocked" type="button" class="btn-primary" @click="openAddForm">
							新增型號
						</button>
					</footer>
				</div>

				<Transition name="dialog-fade">
					<div
						v-if="showForm"
						class="fixed inset-0 z-[2001] flex items-center justify-center bg-[rgba(5,24,40,0.9)] backdrop-blur-[10px]"
					>
						<div
							class="dialog-panel-bg flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-lg 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
						>
							<header class="flex items-center justify-between pr-7 2xl:pr-8">
								<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
									{{ editingModel ? "編輯設備型號" : "新增設備型號" }}
								</h3>
								<div class="flex items-center gap-3">
									<FormChangeIndicator
										v-if="formHasUnsavedChanges"
										:has-changes="formHasUnsavedChanges"
										:changed-fields="formChangedFieldsList"
										:message="formChangeSummary"
									/>
									<button
										type="button"
										class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
										aria-label="關閉表單"
										@click="handleCloseFormClick"
									>
										&times;
									</button>
								</div>
							</header>

							<form
								@submit.prevent="handleFormSubmit"
								class="show-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto pb-4 pr-7 2xl:gap-6 2xl:pb-6 2xl:pr-8"
							>
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>型號名稱 *</span>
									<input
										v-model="formData.name"
										type="text"
										required
										class="form-input"
										placeholder="例如：展廳測試"
									/>
								</label>
								<template v-if="deviceTypeCode === 'sensor'">
									<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
										<span>Unit ID</span>
										<input
											v-model="formData.unit_id"
											type="number"
											min="1"
											max="255"
											class="form-input"
											placeholder="例如：1"
											aria-label="Modbus Unit ID"
										/>
									</label>
								</template>
								<label
									v-if="deviceTypeCode === 'sensor'"
									class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>API 方法 (功能碼) *</span>
									<FilterDropdown
										v-model="sensorRegisterType"
										:options="modbusRegisterTypeOptions"
										placeholder="請選擇功能碼"
									/>
								</label>

								<!-- 攝影機型號：RTSP URL 樣板（供新增設備時參考） -->
								<label
									v-if="deviceTypeCode === 'camera'"
									class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>RTSP URL 樣板 *</span>
									<div class="space-y-3 rounded-xl border border-white/15 bg-white/10 p-3">
										<div class="space-y-2">
											<label class="flex items-start gap-2">
												<input
													v-model="cameraRtspTemplatePresetKey"
													type="radio"
													name="camera-rtsp-template"
													value="hik_channels_101"
													class="mt-1 h-4 w-4 accent-emerald-400"
													aria-label="RTSP 路由：Streaming channels 101"
												/>
												<div class="flex-1">
													<div class="text-sm text-white/80 2xl:text-base">Yenshow</div>
												</div>
											</label>

											<label class="flex items-start gap-2">
												<input
													v-model="cameraRtspTemplatePresetKey"
													type="radio"
													name="camera-rtsp-template"
													value="stream1"
													class="mt-1 h-4 w-4 accent-emerald-400"
													aria-label="RTSP 路由：stream1"
												/>
												<div class="flex-1">
													<div class="text-sm text-white/80 2xl:text-base">TP Link</div>
												</div>
											</label>

											<label class="flex items-center gap-2">
												<input
													v-model="cameraRtspTemplatePresetKey"
													type="radio"
													name="camera-rtsp-template"
													value="custom"
													class="mt-1 h-4 w-4 accent-emerald-400"
													aria-label="RTSP 路由：自訂"
												/>
												<div class="flex items-center gap-2">
													<div class="text-sm text-white/80 2xl:text-base">自訂</div>
													<input
														v-model="cameraRtspTemplateCustom"
														type="text"
														class="form-input"
														:disabled="cameraRtspTemplatePresetKey !== 'custom'"
														placeholder="rtsp://{username}:{password}@{ip}:554/Streaming/channels/101"
														aria-label="自訂 RTSP 樣板"
													/>
												</div>
											</label>
										</div>
									</div>
								</label>

								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>備註</span>
									<textarea
										v-model="formData.description"
										class="form-input"
										rows="3"
										placeholder="設備型號描述或備註"
									></textarea>
								</label>

								<!-- 門禁設備：CaptureFaceData 統一使用 binary（由後端處理），型號層不需設定 -->

								<!-- 感測器參數配置（僅當設備類型為 sensor 時顯示） -->
								<template v-if="deviceTypeCode === 'sensor'">
									<div class="border-t border-white/10 pt-4">
										<div class="mb-3 flex items-center justify-between">
											<h4 class="text-base font-medium text-white 2xl:text-lg">感測器參數配置</h4>
											<button
												type="button"
												class="btn-secondary text-xs 2xl:text-sm"
												@click="addSensorParameter"
											>
												新增參數
											</button>
										</div>

										<div
											v-if="sensorParameters.length === 0"
											class="py-2 text-center text-xs text-white/50 2xl:text-sm"
										>
											尚無參數配置，請新增參數
										</div>

										<div v-else class="space-y-3">
											<div
												v-for="(param, index) in sensorParameters"
												:key="index"
												class="bg-white/3 rounded border border-white/5 p-3"
											>
												<div class="mb-2 flex items-center justify-between">
													<span class="text-sm font-medium text-white">參數 {{ index + 1 }}</span>
													<IconTrashButton
														size="sm"
														title="刪除參數"
														aria-label="刪除參數"
														@click="removeSensorParameter(index)"
													/>
												</div>

												<div class="space-y-3">
													<label class="flex flex-col gap-1 text-xs text-white/80 2xl:text-sm">
														<span>參數類型 *</span>
														<FilterDropdown
															v-model="param.type"
															:options="parameterTypeOptions"
															placeholder="請選擇參數類型"
														/>
													</label>

													<label class="flex flex-col gap-1 text-xs text-white/80 2xl:text-sm">
														<span>Modbus 地址 *</span>
														<input
															v-model.number="param.modbusConfig.address"
															type="number"
															min="0"
															required
															class="form-input"
															placeholder="0"
														/>
													</label>

													<label class="flex flex-col gap-1 text-xs text-white/80 2xl:text-sm">
														<span>轉換公式</span>
														<input
															v-model="param.modbusConfig.transform"
															type="text"
															class="form-input"
															placeholder="例如: - 1, / 10, * 2, + 5"
														/>
													</label>
												</div>
											</div>
										</div>
									</div>
								</template>

								<p v-if="formErrorMessage" class="text-sm text-rose-300 2xl:text-base">
									{{ formErrorMessage }}
								</p>
							</form>

							<footer
								class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8"
							>
								<button type="button" class="btn-secondary" @click="handleCloseFormClick">取消</button>
								<div class="flex-1"></div>
								<button
									type="button"
									class="btn-primary"
									:class="{ 'cursor-not-allowed opacity-50': editingModel && !formHasUnsavedChanges }"
									:disabled="isSubmitting || (editingModel && !formHasUnsavedChanges)"
									@click="handleFormSubmit"
								>
									{{ isSubmitting ? "處理中..." : editingModel ? "儲存變更" : "建立" }}
								</button>
							</footer>
						</div>
					</div>
				</Transition>
			</div>
		</Transition>
	</Teleport>

	<!-- 確認對話框 -->
	<ConfirmDialog
		v-model="showConfirmDialog"
		:title="confirmDialogConfig.title"
		:message="confirmDialogConfig.message"
		:details="confirmDialogConfig.details"
		:type="confirmDialogConfig.type"
		@confirm="handleConfirmDialogConfirm"
	/>
</template>

<script setup lang="ts">
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi";
import { useToast } from "~/composables/core/useToast";
import { useConfirmDialog } from "~/composables/core/useConfirmDialog";
import ConfirmDialog from "~/components/common/ConfirmDialog.vue";
import IconTrashButton from "~/components/common/IconTrashButton.vue";
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue";
import FilterDropdown from "~/components/common/FilterDropdown.vue";
import type {
	DeviceModel,
	DeviceTypeCode,
	CreateDeviceModelData,
	UpdateDeviceModelData,
	SensorDeviceModelConfig,
	SensorParameterDefinition,
	ModbusRegisterType
} from "~/types/device";
import type { SensorParameterType } from "~/types/environment";
import { resolveUserFacingCatchMessage } from "~/utils/errorUtils";

interface Props {
	modelValue: boolean;
	deviceTypeCode: DeviceTypeCode | null;
}

interface Emits {
	(e: "update:modelValue", value: boolean): void;
	(e: "close"): void;
	(e: "refresh"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const deviceApi = useDeviceApi();
const toast = useToast();
const runtimeConfig = useRuntimeConfig();
const deviceModelsLocked = computed(
	() => String(runtimeConfig.public.deviceModelsLocked || "1") !== "0"
);

const deviceTypeNameMap: Record<string, string> = {
	camera: "影像設備",
	controller: "控制器",
	sensor: "感測器",
	access_control: "門禁設備"
};

const deviceTypeName = computed(() => {
	return props.deviceTypeCode ? deviceTypeNameMap[props.deviceTypeCode] || "設備" : "設備";
});

const deviceModels = ref<DeviceModel[]>([]);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const showForm = ref(false);
const editingModel = ref<DeviceModel | null>(null);
const isSubmitting = ref(false);
const formErrorMessage = ref<string | null>(null);
const formData = reactive<{
	name: string;
	type_code: DeviceTypeCode;
	unit_id: number | undefined | null;
	description: string;
	config: SensorDeviceModelConfig | Record<string, any>;
}>({
	name: "",
	type_code: "controller",
	unit_id: undefined,
	description: "",
	config: {}
});

// 攝影機型號：RTSP URL 樣板（存放在 config.rtsp_url_template）
const CAMERA_RTSP_PRESETS = {
	hik_channels_101: "rtsp://{username}:{password}@{ip}:554/Streaming/channels/101",
	stream1: "rtsp://{username}:{password}@{ip}/stream1"
} as const;
type CameraRtspPresetKey = keyof typeof CAMERA_RTSP_PRESETS | "custom";

const cameraRtspTemplatePresetKey = ref<CameraRtspPresetKey>("hik_channels_101");
const cameraRtspTemplateCustom = ref<string>("");

const cameraRtspTemplateEffective = computed(() => {
	if (cameraRtspTemplatePresetKey.value === "custom") return cameraRtspTemplateCustom.value.trim();
	return CAMERA_RTSP_PRESETS[cameraRtspTemplatePresetKey.value];
});

// 感測器參數配置（僅當設備類型為 sensor 時使用）
const sensorParameters = ref<SensorParameterDefinition[]>([]);
// 感測器型號統一使用的 Modbus API 方法（型號層級設定一次）
const sensorRegisterType = ref<ModbusRegisterType>("holding");

const resetForm = () => {
	formData.name = "";
	formData.type_code = props.deviceTypeCode || "controller";
	formData.unit_id = undefined;
	formData.description = "";
	formData.config = {};
	cameraRtspTemplatePresetKey.value = "hik_channels_101";
	cameraRtspTemplateCustom.value = "";
	sensorParameters.value = [];
	sensorRegisterType.value = "holding";
	formErrorMessage.value = null;
};

// 參數類型選項（用於 FilterDropdown）
const parameterTypeOptions: Array<{ value: string; label: string }> = [
	{ value: "pm25", label: "PM2.5" },
	{ value: "pm10", label: "PM10" },
	{ value: "tvoc", label: "TVOC" },
	{ value: "hcho", label: "HCHO" },
	{ value: "humidity", label: "濕度" },
	{ value: "temperature", label: "溫度" },
	{ value: "co2", label: "CO2" },
	{ value: "noise", label: "噪音值" },
	{ value: "wind", label: "風速" }
];

// Modbus API 方法（功能碼）選項：FC01～FC04
const modbusRegisterTypeOptions: Array<{ value: ModbusRegisterType; label: string }> = [
	{ value: "holding", label: "FC03 保持寄存器 (Holding Registers)" },
	{ value: "input", label: "FC04 輸入寄存器 (Input Registers)" },
	{ value: "coils", label: "FC01 線圈 (Coils)" },
	{ value: "discrete", label: "FC02 離散輸入 (Discrete Inputs)" }
];

// 新增參數配置
const addSensorParameter = () => {
	sensorParameters.value.push({
		type: "pm25",
		modbusConfig: { address: 0, transform: "" }
	});
};

// 刪除參數配置
const removeSensorParameter = (index: number) => {
	sensorParameters.value.splice(index, 1);
};

const loadDeviceType = () => {
	formData.type_code = props.deviceTypeCode || "controller";
};

const handleError = (
	error: unknown,
	defaultMsg: string,
	target: "errorMessage" | "formErrorMessage" = "errorMessage"
) => {
	const safeMsg = resolveUserFacingCatchMessage(error, defaultMsg);
	if (target === "errorMessage") {
		errorMessage.value = safeMsg;
	} else {
		formErrorMessage.value = safeMsg;
	}
	toast.error(safeMsg);
};

const loadDeviceModels = async (force = false) => {
	if (!props.deviceTypeCode) {
		deviceModels.value = [];
		return;
	}

	isLoading.value = true;
	errorMessage.value = null;
	try {
		// 強制刷新時添加時間戳以繞過瀏覽器快取
		const params: { type_code: DeviceTypeCode; _t?: string } = { type_code: props.deviceTypeCode };
		if (force) {
			params._t = String(Date.now());
		}
		const result = await deviceApi.getDeviceModels(params);
		deviceModels.value = Array.isArray(result?.device_models) ? result.device_models : [];
	} catch (error: any) {
		deviceModels.value = [];
		if (error?.statusCode === 404 || error?.status === 404) {
			errorMessage.value = "設備型號 API 尚未實作，請先完成後端實作";
			console.warn("設備型號 API 尚未實作，請參考後端實作指南");
		} else {
			handleError(error, "載入設備型號失敗");
		}
	} finally {
		isLoading.value = false;
	}
};

const editDeviceModel = (model: DeviceModel) => {
	editingModel.value = model;
	formData.name = model.name;
	formData.type_code = (model.type_code as DeviceTypeCode) || props.deviceTypeCode || "controller";
	formData.unit_id = model.unit_id ?? undefined;
	formData.description = model.description || "";

	// access_control：CaptureFaceData 固定 binary，不需要型號層配置

	if (props.deviceTypeCode === "camera") {
		const config = (model.config as Record<string, any> | undefined) ?? {};
		const existing = (config.rtsp_url_template as string) || "";
		const trimmed = existing.trim();
		if (!trimmed) {
			cameraRtspTemplatePresetKey.value = "hik_channels_101";
			cameraRtspTemplateCustom.value = "";
		} else if (trimmed === CAMERA_RTSP_PRESETS.hik_channels_101) {
			cameraRtspTemplatePresetKey.value = "hik_channels_101";
			cameraRtspTemplateCustom.value = "";
		} else if (trimmed === CAMERA_RTSP_PRESETS.stream1) {
			cameraRtspTemplatePresetKey.value = "stream1";
			cameraRtspTemplateCustom.value = "";
		} else {
			cameraRtspTemplatePresetKey.value = "custom";
			cameraRtspTemplateCustom.value = trimmed;
		}
	}

	// 載入感測器參數配置與型號層級 API 方法
	if (props.deviceTypeCode === "sensor" && model.config) {
		const config = model.config as SensorDeviceModelConfig;
		sensorRegisterType.value = config.registerType ?? "holding";
		sensorParameters.value = config.sensorParameters ? [...config.sensorParameters] : [];
	} else {
		sensorParameters.value = [];
	}

	showForm.value = true;
	nextTick(() => {
		formInitialSnapshot.value = getFormSnapshot();
	});
};

// 表單快照（內層新增/編輯型號表單）
interface FormSnapshot {
	name: string;
	type_code: DeviceTypeCode;
	unit_id: number | undefined | null;
	description: string;
	registerType: ModbusRegisterType;
	sensorParametersJson: string;
	cameraRtspTemplatePresetKey: string;
	cameraRtspTemplateCustom: string;
}
const formInitialSnapshot = ref<FormSnapshot | null>(null);

const getFormSnapshot = (): FormSnapshot => ({
	name: formData.name,
	type_code: formData.type_code,
	unit_id: formData.unit_id,
	description: formData.description,
	registerType: sensorRegisterType.value,
	sensorParametersJson: JSON.stringify(sensorParameters.value),
	cameraRtspTemplatePresetKey: cameraRtspTemplatePresetKey.value,
	cameraRtspTemplateCustom: cameraRtspTemplateCustom.value
});

const formHasUnsavedChanges = computed(() => {
	if (!showForm.value) return false;
	if (editingModel.value) {
		if (!formInitialSnapshot.value) return false;
		const cur = getFormSnapshot();
		const init = formInitialSnapshot.value;
		return (
			cur.name !== init.name ||
			cur.type_code !== init.type_code ||
			cur.unit_id !== init.unit_id ||
			cur.description !== init.description ||
			cur.registerType !== init.registerType ||
			cur.sensorParametersJson !== init.sensorParametersJson ||
			cur.cameraRtspTemplatePresetKey !== init.cameraRtspTemplatePresetKey ||
			cur.cameraRtspTemplateCustom !== init.cameraRtspTemplateCustom
		);
	}
	// 新增模式：任一欄位有值即視為有變更
	const cur = getFormSnapshot();
	return (
		cur.name.trim() !== "" ||
		cur.unit_id != null ||
		cur.description.trim() !== "" ||
		sensorParameters.value.length > 0
	);
});

const formChangedFieldsList = computed(() => {
	if (!editingModel.value || !formInitialSnapshot.value) return [];
	const cur = getFormSnapshot();
	const init = formInitialSnapshot.value;
	const fields: string[] = [];
	if (cur.name !== init.name)
		fields.push(`型號名稱: ${init.name || "(空)"} → ${cur.name || "(空)"}`);
	if (cur.unit_id !== init.unit_id) fields.push("Unit ID");
	if (cur.description !== init.description) fields.push("備註");
	if (cur.registerType !== init.registerType) fields.push("API 方法 (功能碼)");
	if (cur.sensorParametersJson !== init.sensorParametersJson) fields.push("感測器參數配置");
	if (
		cur.cameraRtspTemplatePresetKey !== init.cameraRtspTemplatePresetKey ||
		cur.cameraRtspTemplateCustom !== init.cameraRtspTemplateCustom
	)
		fields.push("RTSP URL 樣板");
	return fields;
});

const formChangeSummary = computed(() => {
	const count = formChangedFieldsList.value.length;
	if (count === 0 && !editingModel.value && formHasUnsavedChanges.value)
		return "表單已填寫，尚未儲存";
	if (count === 0) return "";
	return `有 ${count} 個欄位已修改`;
});

// 確認對話框（刪除 / 關閉表單 / 關閉主對話框）
const confirmDialog = useConfirmDialog();
const confirmAction = ref<"delete" | "closeForm" | "closeMain">("delete");
const pendingDeleteModel = ref<DeviceModel | null>(null);

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

const handleConfirmDialogConfirm = () => {
	if (confirmAction.value === "delete") handleConfirmDelete();
	else if (confirmAction.value === "closeForm") closeFormInternal();
	else if (confirmAction.value === "closeMain") closeMainDialog();
};

const closeFormInternal = () => {
	showForm.value = false;
	editingModel.value = null;
	resetForm();
	formInitialSnapshot.value = null;
};

const closeMainDialog = () => {
	closeFormInternal();
	emit("update:modelValue", false);
	emit("close");
};

const handleCloseFormClick = () => {
	if (formHasUnsavedChanges.value) {
		confirmAction.value = "closeForm";
		confirmDialog.show(CONFIRM_CLOSE);
		return;
	}
	closeFormInternal();
};

const handleClose = () => {
	if (showForm.value && formHasUnsavedChanges.value) {
		confirmAction.value = "closeMain";
		confirmDialog.show(CONFIRM_CLOSE);
		return;
	}
	if (showForm.value) closeFormInternal();
	emit("update:modelValue", false);
	emit("close");
};

const confirmDelete = (model: DeviceModel) => {
	confirmAction.value = "delete";
	pendingDeleteModel.value = model;
	confirmDialog.show({
		title: "確認刪除",
		message: `確定要刪除設備型號 "${model.name}" 嗎？`,
		details: "此操作無法復原。",
		type: "danger"
	});
};

const handleConfirmDelete = async () => {
	if (!pendingDeleteModel.value) return;

	try {
		await deviceApi.deleteDeviceModel(pendingDeleteModel.value.id);
		toast.success(`設備型號 "${pendingDeleteModel.value.name}" 已刪除`);
		await loadDeviceModels(true);
		emit("refresh");
		pendingDeleteModel.value = null;
	} catch (error) {
		handleError(error, "刪除設備型號失敗");
	}
};

const openAddForm = () => {
	editingModel.value = null;
	resetForm();
	showForm.value = true;
	nextTick(() => {
		formInitialSnapshot.value = getFormSnapshot();
	});
};

const handleFormSubmit = async () => {
	isSubmitting.value = true;
	formErrorMessage.value = null;

	try {
		if (props.deviceTypeCode === "camera") {
			const tpl = cameraRtspTemplateEffective.value.trim();
			if (!tpl) {
				formErrorMessage.value = "請選擇 RTSP URL 樣板，或填寫自訂樣板";
				return;
			}
			if (cameraRtspTemplatePresetKey.value === "custom" && !cameraRtspTemplateCustom.value.trim()) {
				formErrorMessage.value = "自訂樣板不可為空";
				return;
			}
		}

		const toOpt = (v: unknown) => (v !== undefined && v !== null && v !== "" ? Number(v) : undefined);
		const submitData: CreateDeviceModelData | UpdateDeviceModelData = {
			name: formData.name,
			type_code: formData.type_code,
			unit_id: toOpt(formData.unit_id),
			description: formData.description || undefined
		};

		if (props.deviceTypeCode === "camera") {
			const template = cameraRtspTemplateEffective.value.trim();
			submitData.config = template ? { rtsp_url_template: template } : {};
		}
		if (props.deviceTypeCode === "sensor") {
			const sensorConfig: SensorDeviceModelConfig = {
				registerType: sensorRegisterType.value,
				sensorParameters: sensorParameters.value.length > 0 ? sensorParameters.value : undefined
			};
			submitData.config = sensorConfig;
		}
		if (props.deviceTypeCode === "access_control") {
			submitData.config = {};
		}

		if (editingModel.value) {
			await deviceApi.updateDeviceModel(editingModel.value.id, submitData);
			toast.success("設備型號更新成功");
		} else {
			await deviceApi.createDeviceModel(submitData as CreateDeviceModelData);
			toast.success("設備型號建立成功");
		}
		closeFormInternal();
		await loadDeviceModels(true);
		emit("refresh");
	} catch (error) {
		handleError(error, "操作失敗", "formErrorMessage");
	} finally {
		isSubmitting.value = false;
	}
};

watch(
	() => props.modelValue,
	isOpen => {
		if (isOpen && props.deviceTypeCode) {
			loadDeviceType();
			loadDeviceModels(true); // 每次打開對話框時強制刷新，確保取得最新資料
		} else if (!isOpen) {
			deviceModels.value = [];
			errorMessage.value = null;
			closeFormInternal();
		}
	},
	{ immediate: true }
);
</script>

<style scoped></style>
