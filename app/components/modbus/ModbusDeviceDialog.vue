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
								<span>設備型號 *</span>
								<select
									v-model.number="localFormData.model_id"
									required
									class="form-input form-select"
									@change="onModelChange"
									:disabled="isLoadingDeviceModels"
								>
									<option :value="0" disabled>請選擇設備型號</option>
									<option v-if="isLoadingDeviceModels" value="" disabled>載入中...</option>
									<option v-else-if="deviceModels.length === 0" value="" disabled>無可用設備型號</option>
									<option v-for="model in deviceModels" :key="model.id" :value="model.id">{{ model.name }} ({{ model.type_name || "類型" }})</option>
								</select>
								<p v-if="deviceModels.length === 0 && !isLoadingDeviceModels" class="text-xs text-amber-300 mt-1">請先在「設備型號管理」中建立設備型號</p>
							</label>
							<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
								<span>主機位址 (IP) *</span>
								<input
									v-model="localFormData.host"
									type="text"
									required
									pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
									class="form-input"
									placeholder="例如：192.168.2.205"
								/>
							</label>
							<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
								<span>端口（由型號綁定）</span>
								<input
									v-model.number="localFormData.port"
									type="number"
									readonly
									class="form-input bg-white/5 cursor-not-allowed opacity-60"
									:placeholder="selectedModel?.port?.toString() || '選擇型號後自動填入'"
								/>
							</label>
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
import type { ModbusDevice, CreateModbusDeviceData, UpdateModbusDeviceData, ModbusDeviceModel } from "~/types/modbus";

interface Props {
	modelValue: boolean;
	editingDevice: ModbusDevice | null;
	isAdmin: boolean;
	isSubmitting?: boolean;
	errorMessage?: string | null;
	refreshDeviceTypes?: boolean; // 當設備類型更新時觸發刷新
}

interface Emits {
	(e: "update:modelValue", value: boolean): void;
	(e: "submit", data: CreateModbusDeviceData | UpdateModbusDeviceData): void;
	(e: "close"): void;
}

const props = withDefaults(defineProps<Props>(), {
	isSubmitting: false,
	errorMessage: null
});

const emit = defineEmits<Emits>();

const modbusDeviceApi = useModbusDeviceApi();
const deviceModels = ref<ModbusDeviceModel[]>([]);
const isLoadingDeviceModels = ref(false);
const selectedModel = computed(() => deviceModels.value.find((m) => m.id === localFormData.model_id));

const localFormData = reactive({
	name: "",
	model_id: 0,
	host: "",
	port: 502,
	unitId: 1,
	description: "",
	status: "inactive" as "active" | "inactive" | "error"
});

// 載入設備型號列表
const loadDeviceModels = async (force = false) => {
	if (!force && deviceModels.value.length > 0) return; // 已經載入過，不需要重複載入

	isLoadingDeviceModels.value = true;
	try {
		const result = await modbusDeviceApi.getDeviceModels();
		deviceModels.value = result.device_models;

		// 如果正在編輯設備且有 model_id，從型號更新端口
		if (props.editingDevice && props.editingDevice.model_id) {
			const model = deviceModels.value.find((m) => m.id === props.editingDevice.model_id);
			if (model) {
				localFormData.port = model.port;
			}
		}

		// 如果還沒有選擇型號且列表不為空，預設選擇第一個
		if (localFormData.model_id === 0 && deviceModels.value.length > 0) {
			localFormData.model_id = deviceModels.value[0].id;
			localFormData.port = deviceModels.value[0].port;
		}
		// 如果當前選擇的型號不存在於新列表中，重置為第一個
		if (localFormData.model_id > 0 && !deviceModels.value.find((m) => m.id === localFormData.model_id)) {
			if (deviceModels.value.length > 0) {
				localFormData.model_id = deviceModels.value[0].id;
				localFormData.port = deviceModels.value[0].port;
			}
		}
	} catch (error) {
		console.error("載入設備型號失敗:", error);
		// 不顯示錯誤，因為這不是關鍵功能
	} finally {
		isLoadingDeviceModels.value = false;
	}
};

// 當選擇型號改變時，更新端口
const onModelChange = () => {
	if (selectedModel.value) {
		localFormData.port = selectedModel.value.port;
	}
};

// 監聽 refreshDeviceTypes 屬性變化，強制重新載入設備型號
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
	localFormData.model_id = deviceModels.value.length > 0 ? deviceModels.value[0].id : 0;
	localFormData.host = "";
	localFormData.port = deviceModels.value.length > 0 ? deviceModels.value[0].port : 502;
	localFormData.unitId = 1; // 預設值，不顯示給用戶
	localFormData.description = "";
	localFormData.status = "inactive";
};

// 當 editingDevice 改變時，更新表單數據
watch(
	() => props.editingDevice,
	(device) => {
		if (device) {
			localFormData.name = device.name;
			localFormData.model_id = device.model_id || 0;
			localFormData.host = device.host;
			// 端口應該從型號繼承，如果型號已載入則使用型號的端口，否則暫時使用設備的端口
			if (localFormData.model_id && deviceModels.value.length > 0) {
				const model = deviceModels.value.find((m) => m.id === localFormData.model_id);
				localFormData.port = model?.port || device.port;
			} else {
				localFormData.port = device.port;
			}
			localFormData.unitId = device.unitId || 1; // 保留原有值或使用預設值
			localFormData.description = device.description || "";
			localFormData.status = device.status;
		} else {
			resetForm();
		}
	},
	{ immediate: true }
);

// 當對話框打開時載入設備型號
watch(
	() => props.modelValue,
	(isOpen) => {
		if (isOpen) {
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

const handleSubmit = () => {
	if (props.editingDevice) {
		// 更新設備
		emit("submit", {
			name: localFormData.name,
			model_id: localFormData.model_id,
			host: localFormData.host,
			unitId: localFormData.unitId,
			description: localFormData.description,
			status: localFormData.status
		} as UpdateModbusDeviceData);
	} else {
		// 建立設備（後端會從 model_id 自動獲取 type_id 和 port）
		if (!localFormData.model_id || localFormData.model_id === 0) {
			// 這裡可以顯示錯誤訊息，但由於表單有 required，理論上不會到這裡
			return;
		}
		const submitData: CreateModbusDeviceData = {
			name: localFormData.name,
			model_id: localFormData.model_id,
			host: localFormData.host,
			unitId: localFormData.unitId,
			description: localFormData.description
		};
		// 只有在啟用狀態時才傳送 status
		if (localFormData.status === "active") {
			submitData.status = "active";
		}
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
