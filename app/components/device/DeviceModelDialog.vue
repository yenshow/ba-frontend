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
													<span class="rounded bg-blue-500/30 px-2 py-1 text-xs text-blue-200 2xl:text-sm">
														Port : {{ model.port != null ? model.port : "未設定" }}
													</span>
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
											<div class="flex gap-2 2xl:gap-3">
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
						<button type="button" class="btn-primary" @click="openAddForm">新增型號</button>
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
								<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
									{{ editingModel ? "編輯設備型號" : "新增設備型號" }}
								</h3>
								<button
									type="button"
									class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
									aria-label="關閉表單"
									@click="closeForm"
								>
									&times;
								</button>
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
								<label
									v-if="deviceTypeCode !== 'sensor'"
									class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>端口號</span>
									<input
										v-model="formData.port"
										type="number"
										min="1"
										max="65535"
										class="form-input"
										:placeholder="deviceTypeCode === 'access_control' ? '例如：80' : '例如：502'"
									/>
								</label>
								<template v-if="deviceTypeCode === 'sensor'">
									<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
										<span>端口號</span>
										<input
											v-model="formData.port"
											type="number"
											min="1"
											max="65535"
											class="form-input"
											placeholder="例如：502"
										/>
									</label>
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
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>備註</span>
									<textarea
										v-model="formData.description"
										class="form-input"
										rows="3"
										placeholder="設備型號描述或備註"
									></textarea>
								</label>

								<!-- 門禁設備：僅設定設備截圖回傳格式，其餘參數由後端預設 -->
								<template v-if="deviceTypeCode === 'access_control'">
									<div class="border-t border-white/10 pt-4">
										<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
											<span>設備截圖回傳格式 (CaptureFaceData) *</span>
											<select
												v-model="captureFaceDataType"
												required
												class="form-input form-select"
											>
												<option value="url">url（AC-07 等，回傳圖片網址）</option>
												<option value="binary">binary（AC-02 等，回傳二進位）</option>
											</select>
											<p class="text-xs text-white/60">AC-02 請選 binary；AC-07 請選 url。</p>
										</label>
									</div>
								</template>

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
													<button
														type="button"
														class="p-1 text-rose-400 transition-colors hover:text-rose-300"
														@click="removeSensorParameter(index)"
														title="刪除參數"
													>
														<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
															/>
														</svg>
													</button>
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

							<footer class="flex items-center gap-3 pr-7 2xl:gap-4 2xl:pr-8">
								<button type="button" class="btn-secondary" @click="closeForm">取消</button>
								<div class="flex-1"></div>
								<button
									type="button"
									class="btn-primary"
									:disabled="isSubmitting"
									@click="handleFormSubmit"
								>
									{{ isSubmitting ? "處理中..." : editingModel ? "更新" : "建立" }}
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
		@confirm="handleConfirmDelete"
	/>
</template>

<script setup lang="ts">
import { useDeviceApi } from "~/composables/systems/useDeviceApi";
import { useToast } from "~/composables/core/useToast";
import { useConfirmDialog } from "~/composables/core/useConfirmDialog";
import ConfirmDialog from "~/components/common/ConfirmDialog.vue";
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

const deviceTypeNameMap: Record<string, string> = {
	camera: "影像設備",
	controller: "控制器",
	sensor: "感測器",
	access_control: "門禁設備",
};

const deviceTypeName = computed(() => {
	return props.deviceTypeCode ? (deviceTypeNameMap[props.deviceTypeCode] || "設備") : "設備";
});

const deviceModels = ref<DeviceModel[]>([]);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const showForm = ref(false);
const editingModel = ref<DeviceModel | null>(null);
const isSubmitting = ref(false);
const formErrorMessage = ref<string | null>(null);
const currentDeviceTypeId = ref<number | null>(null);

const defaultPort = computed(() => (props.deviceTypeCode === "access_control" ? 80 : undefined));

const formData = reactive<{
	name: string;
	type_id: number;
	port: number | undefined | null;
	unit_id: number | undefined | null;
	description: string;
	config: SensorDeviceModelConfig | Record<string, any>;
}>({
	name: "",
	type_id: 0,
	port: undefined,
	unit_id: undefined,
	description: "",
	config: {}
});

// 感測器參數配置（僅當設備類型為 sensor 時使用）
const sensorParameters = ref<SensorParameterDefinition[]>([]);
// 感測器型號統一使用的 Modbus API 方法（型號層級設定一次）
const sensorRegisterType = ref<ModbusRegisterType>("holding");

// 門禁設備：僅設定 CaptureFaceData 回傳格式，其餘由後端預設
const captureFaceDataType = ref<"binary" | "url">("url");

const resetForm = () => {
	formData.name = "";
	formData.type_id = currentDeviceTypeId.value || 0;
	formData.port = defaultPort.value;
	formData.unit_id = undefined;
	formData.description = "";
	formData.config = {};
	sensorParameters.value = [];
	sensorRegisterType.value = "holding";
	captureFaceDataType.value = "url";
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

const loadDeviceType = async () => {
	if (!props.deviceTypeCode) return;
	
	try {
		const result = await deviceApi.getDeviceTypeByCode(props.deviceTypeCode);
		currentDeviceTypeId.value = result.device_type.id;
		formData.type_id = result.device_type.id;
	} catch (error) {
		console.error("載入設備類型失敗:", error);
	}
};

const handleError = (
	error: unknown,
	defaultMsg: string,
	target: "errorMessage" | "formErrorMessage" = "errorMessage"
) => {
	const errorMsg = error instanceof Error ? error.message : defaultMsg;
	if (target === "errorMessage") {
		errorMessage.value = errorMsg;
	} else {
		formErrorMessage.value = errorMsg;
	}
	toast.error(errorMsg);
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
	formData.type_id = model.type_id;
	formData.port = model.port ?? defaultPort.value ?? undefined;
	formData.unit_id = model.unit_id ?? undefined;
	formData.description = model.description || "";

	if (props.deviceTypeCode === "access_control") {
		const config = model.config as Record<string, any> | undefined;
		const c = config?.isapi?.captureFaceData;
		captureFaceDataType.value = c?.dataType === "binary" ? "binary" : "url";
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
};

// 確認對話框
const confirmDialog = useConfirmDialog();
const pendingDeleteModel = ref<DeviceModel | null>(null);

// 解包 ref 以便在模板中使用
const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value;
	}
});

const confirmDialogConfig = computed(() => confirmDialog.config.value);

const confirmDelete = (model: DeviceModel) => {
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
};

const closeForm = () => {
	showForm.value = false;
	editingModel.value = null;
	resetForm();
};

const handleFormSubmit = async () => {
	isSubmitting.value = true;
	formErrorMessage.value = null;

	try {
		const toOpt = (v: unknown) =>
			v !== undefined && v !== null && v !== "" ? Number(v) : undefined;
		const submitData: CreateDeviceModelData | UpdateDeviceModelData = {
			name: formData.name,
			type_id: formData.type_id,
			port: toOpt(formData.port),
			unit_id: toOpt(formData.unit_id),
			description: formData.description || undefined
		};

		if (props.deviceTypeCode === "sensor") {
			const sensorConfig: SensorDeviceModelConfig = {
				registerType: sensorRegisterType.value,
				sensorParameters: sensorParameters.value.length > 0 ? sensorParameters.value : undefined
			};
			submitData.config = sensorConfig;
		}
		if (props.deviceTypeCode === "access_control") {
			submitData.config = {
				isapi: { captureFaceData: { dataType: captureFaceDataType.value } }
			};
		}

		if (editingModel.value) {
			await deviceApi.updateDeviceModel(editingModel.value.id, submitData);
			toast.success("設備型號更新成功");
		} else {
			await deviceApi.createDeviceModel(submitData as CreateDeviceModelData);
			toast.success("設備型號建立成功");
		}
		closeForm();
		await loadDeviceModels(true); // 強制刷新
		emit("refresh");
	} catch (error) {
		handleError(error, "操作失敗", "formErrorMessage");
	} finally {
		isSubmitting.value = false;
	}
};

const handleClose = () => {
	emit("update:modelValue", false);
	emit("close");
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
			showForm.value = false;
			editingModel.value = null;
			resetForm();
		}
	},
	{ immediate: true }
);
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

.btn-list-edit,
.btn-list-delete {
	border-radius: 0.5rem;
	padding: 0.5rem 1rem;
	font-size: 0.875rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;
	border: none;
}

.btn-list-edit {
	background: rgba(59, 130, 246, 0.8);
	color: white;
}

.btn-list-edit:hover {
	background: rgba(96, 165, 250, 0.9);
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-list-delete {
	background: rgba(239, 68, 68, 0.8);
	color: white;
}

.btn-list-delete:hover {
	background: rgba(248, 113, 113, 0.9);
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

@media (min-width: 1536px) {
	.btn-list-edit,
	.btn-list-delete {
		padding: 0.625rem 1.25rem;
		font-size: 1rem;
	}
}

</style>
