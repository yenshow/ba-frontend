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
								<span>設備名稱</span>
								<input v-model="localFormData.name" type="text" required class="form-input" placeholder="例如：DDC 控制器 1" />
							</label>
							<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
								<span>設備類型 ID</span>
								<input v-model.number="localFormData.type_id" type="number" required min="1" class="form-input" placeholder="例如：1" />
							</label>
							<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
								<span>主機位址 (IP)</span>
								<input v-model="localFormData.host" type="text" required pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$" class="form-input" placeholder="例如：192.168.2.205" />
							</label>
							<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
								<span>端口</span>
								<input v-model.number="localFormData.port" type="number" required min="1" max="65535" class="form-input" placeholder="例如：502" />
							</label>
							<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
								<span>Unit ID</span>
								<input v-model.number="localFormData.unitId" type="number" required min="1" max="255" class="form-input" placeholder="例如：205" />
							</label>
							<label class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
								<span>描述（選填）</span>
								<textarea v-model="localFormData.description" class="form-input" rows="3" placeholder="設備描述或備註"></textarea>
							</label>
							<label v-if="isAdmin && editingDevice" class="flex flex-col gap-2 2xl:gap-2.5 text-sm 2xl:text-base text-white/80">
								<span>狀態</span>
								<select v-model="localFormData.status" class="form-input form-select">
									<option value="active">啟用</option>
									<option value="inactive">停用</option>
									<option value="error">錯誤</option>
								</select>
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
import type { ModbusDevice, CreateModbusDeviceData, UpdateModbusDeviceData } from "~/types/modbus";

interface Props {
	modelValue: boolean;
	editingDevice: ModbusDevice | null;
	isAdmin: boolean;
	isSubmitting?: boolean;
	errorMessage?: string | null;
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

const localFormData = reactive({
	name: "",
	type_id: 1,
	host: "",
	port: 502,
	unitId: 1,
	description: "",
	status: "active" as "active" | "inactive" | "error"
});

const resetForm = () => {
	localFormData.name = "";
	localFormData.type_id = 1;
	localFormData.host = "";
	localFormData.port = 502;
	localFormData.unitId = 1;
	localFormData.description = "";
	localFormData.status = "active";
};

// 當 editingDevice 改變時，更新表單數據
watch(
	() => props.editingDevice,
	(device) => {
		if (device) {
			localFormData.name = device.name;
			localFormData.type_id = device.type_id || 1;
			localFormData.host = device.host;
			localFormData.port = device.port;
			localFormData.unitId = device.unitId;
			localFormData.description = device.description || "";
			localFormData.status = device.status;
		} else {
			resetForm();
		}
	},
	{ immediate: true }
);

// 當對話框關閉時重置表單
watch(
	() => props.modelValue,
	(isOpen) => {
		if (!isOpen) {
			resetForm();
		}
	}
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
			type_id: localFormData.type_id,
			host: localFormData.host,
			port: localFormData.port,
			unitId: localFormData.unitId,
			description: localFormData.description,
			status: localFormData.status
		} as UpdateModbusDeviceData);
	} else {
		// 建立設備
		emit("submit", {
			name: localFormData.name,
			type_id: localFormData.type_id,
			device_type: `type_${localFormData.type_id}`, // 後端需要的 device_type 欄位
			host: localFormData.host,
			port: localFormData.port,
			unitId: localFormData.unitId,
			description: localFormData.description
		} as CreateModbusDeviceData);
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

