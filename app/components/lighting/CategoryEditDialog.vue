<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div v-if="modelValue" class="dialog-backdrop" @click.self="emit('update:modelValue', false)">
				<div class="dialog-panel">
					<header class="dialog-header">
						<h3 class="text-lg xl:text-xl text-white font-semibold tracking-[4px]">{{ title }}</h3>
						<button type="button" class="dialog-close" aria-label="Close dialog" @click="emit('update:modelValue', false)">
							&times;
						</button>
					</header>

					<form class="dialog-body" @submit.prevent="handleSubmit">
						<div class="form-grid">
							<label class="form-field">
								<span>分類名稱</span>
								<input v-model="form.name" type="text" required />
							</label>

							<label class="form-field">
								<span>對應樓層</span>
								<input v-model="form.floorId" type="text" required />
							</label>

							<label class="form-field col-span-2">
								<span>備註 / 描述</span>
								<input v-model="form.description" type="text" placeholder="選填" />
							</label>
						</div>

						<section class="mt-6 space-y-4">
							<h4 class="section-title">Modbus 設定</h4>
							<div class="form-grid">
								<label class="form-field">
									<span>裝置 IP</span>
									<input v-model="form.modbus.host" type="text" required placeholder="例如：192.168.2.205" />
								</label>
								<label class="form-field">
									<span>Port</span>
									<input v-model.number="form.modbus.port" type="number" min="1" max="65535" required />
								</label>
								<label class="form-field">
									<span>Unit ID</span>
									<input v-model.number="form.modbus.unitId" type="number" min="0" max="255" required />
								</label>
								<label class="form-field">
									<span>DO 起始位址</span>
									<input v-model.number="form.modbus.address" type="number" min="0" required />
								</label>
								<label class="form-field">
									<span>筆數 (長度)</span>
									<input v-model.number="form.modbus.length" type="number" min="1" max="125" required />
								</label>
							</div>
						</section>

						<section class="mt-6 space-y-4">
							<h4 class="section-title">座標 (百分比)</h4>
							<div class="form-grid">
								<label class="form-field">
									<span>X</span>
									<input v-model.number="form.location.x" type="number" min="0" max="100" step="0.1" required />
								</label>
								<label class="form-field">
									<span>Y</span>
									<input v-model.number="form.location.y" type="number" min="0" max="100" step="0.1" required />
								</label>
							</div>
						</section>

						<section class="mt-6 space-y-2">
							<h4 class="section-title">包含區域 (Room IDs)</h4>
							<textarea
								v-model="roomIdsInput"
								rows="2"
								class="textarea"
								placeholder="以逗號分隔，例如：room-1, room-2"
							></textarea>
						</section>

						<p v-if="errorMessage" class="text-rose-300 text-sm mt-4">{{ errorMessage }}</p>

						<footer class="dialog-footer">
							<button type="button" class="btn-secondary" @click="handleTestConnection" :disabled="isTesting">
								{{ isTesting ? "測試中..." : "測試連線" }}
							</button>
							<div class="flex-1"></div>
							<button type="button" class="btn-secondary" @click="emit('update:modelValue', false)">取消</button>
							<button type="submit" class="btn-primary">儲存</button>
						</footer>
					</form>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { useModbusApi } from "~/composables/useModbus";
import type { LightingCategory, CategoryModbusConfig } from "~/types/lighting";

interface Props {
	modelValue: boolean;
	category: LightingCategory | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
	"update:modelValue": [value: boolean];
	save: [category: LightingCategory];
}>();

const modbusApi = useModbusApi();
const isTesting = ref(false);
const errorMessage = ref("");

const form = reactive({
	id: "",
	name: "",
	floorId: "",
	description: "",
	location: { x: 50, y: 50 },
	roomIds: [] as string[],
	modbus: {
		host: "",
		port: 502,
		unitId: 1,
		address: 0,
		length: 1
	} as CategoryModbusConfig
});

const roomIdsInput = computed({
	get: () => form.roomIds.join(", "),
	set: (value: string) => {
		form.roomIds = value
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
	}
});

const title = computed(() => (form.id ? "編輯分類點" : "新增分類點"));

watch(
	() => props.category,
	(category) => {
		if (!category) return;
		form.id = category.id;
		form.name = category.name;
		form.floorId = category.floorId;
		form.description = (category as any).description || "";
		form.location = { ...category.location };
		form.roomIds = [...category.roomIds];
		form.modbus = {
			host: category.modbus?.host || "",
			port: category.modbus?.port ?? 502,
			unitId: category.modbus?.unitId ?? 1,
			address: category.modbus?.address ?? 0,
			length: category.modbus?.length ?? 1
		};
	},
	{ immediate: true }
);

const validateForm = () => {
	errorMessage.value = "";
	if (!form.name.trim()) {
		errorMessage.value = "分類名稱不得為空";
		return false;
	}
	if (!form.modbus.host.trim()) {
		errorMessage.value = "請輸入 Modbus 裝置 IP";
		return false;
	}
	if (form.modbus.port <= 0 || form.modbus.port > 65535) {
		errorMessage.value = "Port 需介於 1-65535";
		return false;
	}
	if (form.modbus.unitId < 0 || form.modbus.unitId > 255) {
		errorMessage.value = "Unit ID 需介於 0-255";
		return false;
	}
	if (form.modbus.length <= 0 || form.modbus.length > 125) {
		errorMessage.value = "筆數需介於 1-125";
		return false;
	}
	return true;
};

const buildCategoryPayload = (): LightingCategory => {
	return {
		id: form.id || `category-${Date.now()}`,
		name: form.name,
		floorId: form.floorId,
		location: { ...form.location },
		roomIds: [...form.roomIds],
		modbus: { ...form.modbus }
	};
};

const handleTestConnection = async () => {
	if (!validateForm()) return;
	isTesting.value = true;
	try {
		await modbusApi.getHealth({
			host: form.modbus.host,
			port: form.modbus.port,
			unitId: form.modbus.unitId
		});
		errorMessage.value = "連線成功";
	} catch (error) {
		errorMessage.value = `連線失敗：${error instanceof Error ? error.message : "未知錯誤"}`;
		console.error(error);
	} finally {
		isTesting.value = false;
	}
};

const handleSubmit = () => {
	if (!validateForm()) return;
	const payload = buildCategoryPayload();
	emit("save", payload);
	emit("update:modelValue", false);
};
</script>

<style scoped>
.dialog-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(5, 24, 40, 0.8);
	backdrop-filter: blur(10px);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2000;
}

.dialog-panel {
	width: min(640px, 90vw);
	max-height: 90vh;
	background: linear-gradient(145deg, rgba(9, 106, 133, 0.95), rgba(20, 64, 92, 0.98));
	border: 1px solid rgba(255, 255, 255, 0.25);
	box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
	border-radius: 24px;
	padding: 1.75rem;
	display: flex;
	flex-direction: column;
	gap: 1rem;
	overflow-y: auto;
	color: #f5f9ff;
}

.dialog-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.dialog-close {
	font-size: 1.75rem;
	line-height: 1;
	color: #fff;
	background: transparent;
	border: none;
	cursor: pointer;
}

.dialog-body {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.form-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1rem;
}

.form-field {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	font-size: 0.9rem;
	color: rgba(255, 255, 255, 0.8);
}

.form-field input {
	border-radius: 12px;
	border: 1px solid rgba(255, 255, 255, 0.35);
	background: rgba(255, 255, 255, 0.1);
	padding: 0.65rem 0.85rem;
	color: #f7fbff;
	transition: border-color 0.2s ease, background 0.2s ease;
}

.form-field input:focus {
	border-color: #5be7f1;
	background: rgba(255, 255, 255, 0.18);
	outline: none;
}

.textarea {
	width: 100%;
	border-radius: 12px;
	border: 1px solid rgba(255, 255, 255, 0.35);
	background: rgba(255, 255, 255, 0.1);
	padding: 0.65rem 0.85rem;
	color: #f7fbff;
	resize: vertical;
	transition: border-color 0.2s ease, background 0.2s ease;
}

.textarea:focus {
	border-color: #5be7f1;
	background: rgba(255, 255, 255, 0.18);
	outline: none;
}

.section-title {
	font-size: 0.95rem;
	font-weight: 600;
	color: #b9efff;
}

.dialog-footer {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	margin-top: 0.5rem;
}

.btn-primary,
.btn-secondary {
	border-radius: 999px;
	padding: 0.6rem 1.4rem;
	font-weight: 500;
	font-size: 0.9rem;
}

.btn-primary {
	background: linear-gradient(135deg, #2dd4bf, #1ba9d3);
	color: #0b2c3c;
	border: none;
	box-shadow: 0 10px 25px rgba(23, 217, 199, 0.35);
}

.btn-secondary {
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(91, 231, 241, 0.5);
	color: #e8fbff;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
	transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
	opacity: 0;
}

@media (max-width: 640px) {
	.form-grid {
		grid-template-columns: 1fr;
	}
}
</style>

