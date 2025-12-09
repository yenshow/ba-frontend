<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px] flex items-center justify-center z-[2000]"
				@click.self="handleClose"
			>
				<div class="w-full max-w-2xl 2xl:max-w-3xl max-h-[90vh] rounded-3xl p-7 2xl:p-8 flex flex-col gap-4 2xl:gap-6 overflow-hidden dialog-panel-bg">
					<header class="flex items-center justify-between">
						<h3 class="text-lg 2xl:text-xl text-white font-semibold tracking-[4px]">設備型號管理</h3>
						<button
							type="button"
							class="text-[1.75rem] leading-none text-white bg-transparent border-none cursor-pointer transition-opacity hover:opacity-70"
							aria-label="關閉對話框"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<!-- 設備型號列表 -->
					<div class="flex-1 overflow-y-auto">
						<!-- 載入中 -->
						<template v-if="isLoading">
							<div class="space-y-3">
								<div v-for="n in 3" :key="`skeleton-${n}`" class="h-20 bg-white/10 rounded-lg animate-pulse"></div>
							</div>
						</template>

						<!-- 設備型號列表 -->
						<template v-else-if="deviceModels.length > 0">
							<div class="space-y-3">
								<div
									v-for="model in deviceModels"
									:key="model.id"
									class="flex items-center justify-between p-4 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15 transition-colors"
								>
									<div class="flex-1">
										<div class="flex items-center gap-3">
											<h4 class="text-base 2xl:text-lg font-medium text-white">{{ model.name }}</h4>
											<span class="px-2 py-1 text-xs 2xl:text-sm rounded bg-white/20 text-white/80">{{ model.type_name || "類型" }}</span>
											<span class="px-2 py-1 text-xs 2xl:text-sm rounded bg-blue-500/20 text-blue-200">端口: {{ model.port }}</span>
										</div>
										<p v-if="model.description" class="text-sm 2xl:text-base text-white/60 mt-1">{{ model.description }}</p>
									</div>
									<div class="flex gap-2 2xl:gap-3">
										<button
											type="button"
											class="px-3 2xl:px-4 py-1 2xl:py-2 rounded bg-blue-500/80 text-white hover:bg-blue-400 text-sm 2xl:text-base"
											@click="editDeviceModel(model)"
										>
											編輯
										</button>
										<button
											type="button"
											class="px-3 2xl:px-4 py-1 2xl:py-2 rounded bg-red-500/80 text-white hover:bg-red-400 text-sm 2xl:text-base"
											@click="confirmDelete(model)"
										>
											刪除
										</button>
									</div>
								</div>
							</div>
						</template>

						<!-- 無數據 -->
						<template v-else>
							<div class="text-center py-8 text-white/60">
								<p class="text-base 2xl:text-lg">尚無設備型號</p>
								<p class="text-sm 2xl:text-base mt-2">點擊「新增型號」開始建立</p>
							</div>
						</template>
					</div>

					<!-- 錯誤訊息 -->
					<p v-if="errorMessage" class="text-rose-300 text-sm 2xl:text-base">{{ errorMessage }}</p>

					<!-- 底部按鈕 -->
					<footer class="flex items-center gap-3 2xl:gap-4 pt-2 border-t border-white/20">
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
						<div class="flex-1"></div>
						<button type="button" class="btn-primary" @click="showForm = true">新增型號</button>
					</footer>
				</div>

				<!-- 新增/編輯表單對話框 -->
				<Transition name="dialog-fade">
					<div
						v-if="showForm"
						class="fixed inset-0 bg-[rgba(5,24,40,0.9)] backdrop-blur-[10px] flex items-center justify-center z-[2001]"
						@click.self="closeForm"
					>
						<div class="w-full max-w-md 2xl:max-w-lg rounded-3xl p-7 2xl:p-8 flex flex-col gap-4 2xl:gap-6 dialog-panel-bg">
							<header class="flex items-center justify-between">
								<h3 class="text-lg 2xl:text-xl text-white font-semibold tracking-[4px]">{{ editingModel ? "編輯設備型號" : "新增設備型號" }}</h3>
								<button
									type="button"
									class="text-[1.75rem] leading-none text-white bg-transparent border-none cursor-pointer transition-opacity hover:opacity-70"
									aria-label="關閉表單"
									@click="closeForm"
								>
									&times;
								</button>
							</header>

							<form class="flex flex-col gap-4 2xl:gap-6" @submit.prevent="handleFormSubmit">
								<div class="flex flex-col gap-4 2xl:gap-6">
									<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
										<span>型號名稱 *</span>
										<input v-model="formData.name" type="text" required class="form-input" placeholder="例如：DDC-2000" />
									</label>
									<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
										<span>類型 *</span>
										<select v-model.number="formData.type_id" required class="form-input form-select">
											<option :value="0" disabled>請選擇設備類型</option>
											<option v-for="deviceType in deviceTypes" :key="deviceType.id" :value="deviceType.id">
												{{ deviceType.name }}
											</option>
										</select>
										<p v-if="deviceTypes.length === 0" class="text-xs text-white/60 mt-1">載入設備類型中...</p>
									</label>
									<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
										<span>端口 *</span>
										<input v-model.number="formData.port" type="number" required min="1" max="65535" class="form-input" placeholder="例如：502" />
									</label>
									<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
										<span>備註</span>
										<textarea v-model="formData.description" class="form-input" rows="3" placeholder="設備型號描述或備註"></textarea>
									</label>
								</div>

								<p v-if="formErrorMessage" class="text-rose-300 text-sm 2xl:text-base">{{ formErrorMessage }}</p>

								<footer class="flex items-center gap-3 2xl:gap-4 mt-2 2xl:mt-3">
									<button type="button" class="btn-secondary" @click="closeForm">取消</button>
									<div class="flex-1"></div>
									<button type="submit" class="btn-primary" :disabled="isSubmitting">
										{{ isSubmitting ? "處理中..." : editingModel ? "更新" : "建立" }}
									</button>
								</footer>
							</form>
						</div>
					</div>
				</Transition>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { ModbusDeviceModel, ModbusDeviceType, CreateModbusDeviceModelData, UpdateModbusDeviceModelData } from "~/types/modbus";

interface Props {
	modelValue: boolean;
}

interface Emits {
	(e: "update:modelValue", value: boolean): void;
	(e: "close"): void;
	(e: "refresh"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const modbusDeviceApi = useModbusDeviceApi();
const toast = useToast();

const deviceModels = ref<ModbusDeviceModel[]>([]);
const deviceTypes = ref<ModbusDeviceType[]>([]);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const showForm = ref(false);
const editingModel = ref<ModbusDeviceModel | null>(null);
const isSubmitting = ref(false);
const formErrorMessage = ref<string | null>(null);

const formData = reactive({
	name: "",
	type_id: 0,
	port: 502,
	description: ""
});

const resetForm = () => {
	formData.name = "";
	formData.type_id = deviceTypes.value.length > 0 ? deviceTypes.value[0].id : 0;
	formData.port = 502;
	formData.description = "";
	formErrorMessage.value = null;
};

// 載入設備類型列表
const loadDeviceTypes = async () => {
	if (deviceTypes.value.length > 0) return;

	try {
		const result = await modbusDeviceApi.getDeviceTypes();
		deviceTypes.value = result.device_types;
		if (formData.type_id === 0 && deviceTypes.value.length > 0) {
			formData.type_id = deviceTypes.value[0].id;
		}
	} catch (error) {
		console.error("載入設備類型失敗:", error);
	}
};

const loadDeviceModels = async () => {
	isLoading.value = true;
	errorMessage.value = null;

	try {
		const result = await modbusDeviceApi.getDeviceModels();
		deviceModels.value = result.device_models;
	} catch (error: any) {
		// 如果是 404，表示後端 API 尚未實作
		if (error?.statusCode === 404 || error?.status === 404) {
			errorMessage.value = "設備型號 API 尚未實作，請先完成後端實作";
			deviceModels.value = [];
			console.warn("設備型號 API 尚未實作，請參考後端實作指南");
		} else {
			const errorMsg = error instanceof Error ? error.message : "載入設備型號失敗";
			errorMessage.value = errorMsg;
			toast.error(errorMsg);
		}
	} finally {
		isLoading.value = false;
	}
};

const editDeviceModel = (model: ModbusDeviceModel) => {
	editingModel.value = model;
	formData.name = model.name;
	formData.type_id = model.type_id;
	formData.port = model.port;
	formData.description = model.description || "";
	showForm.value = true;
};

const confirmDelete = async (model: ModbusDeviceModel) => {
	if (!confirm(`確定要刪除設備型號 "${model.name}" 嗎？此操作無法復原。`)) {
		return;
	}

	try {
		await modbusDeviceApi.deleteDeviceModel(model.id);
		toast.success(`設備型號 "${model.name}" 已刪除`);
		await loadDeviceModels();
		emit("refresh");
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : "刪除設備型號失敗";
		errorMessage.value = errorMsg;
		toast.error(errorMsg);
	}
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
		if (editingModel.value) {
			await modbusDeviceApi.updateDeviceModel(editingModel.value.id, formData);
			toast.success("設備型號更新成功");
		} else {
			await modbusDeviceApi.createDeviceModel(formData);
			toast.success("設備型號建立成功");
		}

		closeForm();
		await loadDeviceModels();
		emit("refresh");
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : "操作失敗";
		formErrorMessage.value = errorMsg;
		toast.error(errorMsg);
	} finally {
		isSubmitting.value = false;
	}
};

const handleClose = () => {
	emit("update:modelValue", false);
	emit("close");
};

// 當對話框打開時載入設備型號和設備類型
watch(
	() => props.modelValue,
	(isOpen) => {
		if (isOpen) {
			loadDeviceTypes();
			loadDeviceModels();
		} else {
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
