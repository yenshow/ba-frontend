<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div v-if="modelValue" class="dialog-backdrop" @click.self="emit('update:modelValue', false)">
				<div class="dialog-panel">
					<header class="dialog-header">
						<h3 class="text-lg xl:text-xl text-white font-semibold tracking-[4px]">{{ title }}</h3>
						<button type="button" class="dialog-close" aria-label="Close dialog" @click="emit('update:modelValue', false)">&times;</button>
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
								<label class="form-field col-span-2">
									<span>選擇設備</span>
									<select v-model.number="form.modbus.deviceId" class="form-select" @change="handleDeviceChange">
										<option :value="0">請選擇設備</option>
										<option v-for="device in devices" :key="device.id" :value="device.id">{{ device.name }} ({{ device.host }}:{{ device.port }})</option>
									</select>
								</label>
								<template v-if="selectedDevice">
									<label class="form-field">
										<span>裝置 IP</span>
										<input v-model="deviceInfo.host" type="text" disabled class="form-input-disabled" />
									</label>
									<label class="form-field">
										<span>Port</span>
										<input v-model.number="deviceInfo.port" type="number" disabled class="form-input-disabled" />
									</label>
									<label class="form-field">
										<span>Unit ID</span>
										<input v-model.number="deviceInfo.unitId" type="number" disabled class="form-input-disabled" />
									</label>
								</template>
								<div v-else class="col-span-2 text-white/60 text-sm">請先選擇設備</div>
							</div>
							<div class="mt-4 space-y-4">
								<h5 class="section-title">點位配置</h5>
								<div class="p-4 rounded-lg bg-white/5 border border-white/10">
									<div class="grid grid-cols-3 gap-3">
										<label class="form-field">
											<span>點位類型</span>
											<select v-model="currentPoint.type" class="form-select" required>
												<option value="DO">DO (數位輸出 - 可控制)</option>
												<option value="DI">DI (數位輸入 - 僅讀取)</option>
											</select>
										</label>
										<label class="form-field">
											<span>點位地址</span>
											<input v-model.number="currentPoint.address" type="number" min="0" placeholder="例如：10" required />
										</label>
										<label class="form-field">
											<span>備註</span>
											<input v-model="currentPoint.note" type="text" placeholder="選填，例如：控制主燈開關" />
										</label>
									</div>
								</div>
							</div>
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
import { useModbusDeviceApi } from "~/composables/useModbusDeviceApi";
import type { LightingCategory, CategoryModbusConfig, ModbusPointConfig } from "~/types/lighting";
import type { ModbusDevice } from "~/types/modbus";

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
const modbusDeviceApi = useModbusDeviceApi();
const isTesting = ref(false);
const errorMessage = ref("");
const isLoadingDevices = ref(false);
const devices = ref<ModbusDevice[]>([]);

const form = reactive({
	id: "",
	name: "",
	floorId: "",
	description: "",
	location: { x: 50, y: 50 },
	modbus: {
		deviceId: 0,
		points: [] as ModbusPointConfig[],
		host: "",
		port: 502,
		unitId: 1,
		address: 0,
		length: 1
	} as CategoryModbusConfig
});

// 確保始終有一個點位（單一點位配置）
const ensureSinglePoint = () => {
	if (!form.modbus.points || form.modbus.points.length === 0) {
		form.modbus.points = [
			{
				id: `point-${Date.now()}-${Math.random()}`,
				address: 0,
				type: "DO",
				note: ""
			}
		];
	} else if (form.modbus.points.length > 1) {
		// 如果有多個點位，只保留第一個
		form.modbus.points = [form.modbus.points[0]];
	}
	// 確保點位有必要的欄位
	if (!form.modbus.points[0].id) {
		form.modbus.points[0].id = `point-${Date.now()}-${Math.random()}`;
	}
	if (!form.modbus.points[0].type) {
		form.modbus.points[0].type = "DO";
	}
};

// 取得當前點位（用於模板綁定）
const currentPoint = computed(() => {
	ensureSinglePoint();
	return form.modbus.points[0];
});

// 選中的設備資訊
const selectedDevice = computed(() => {
	if (!form.modbus.deviceId) return null;
	return devices.value.find((d) => d.id === form.modbus.deviceId) || null;
});

// 設備資訊（用於顯示）
const deviceInfo = computed(() => {
	if (selectedDevice.value) {
		return {
			host: selectedDevice.value.host,
			port: selectedDevice.value.port,
			unitId: selectedDevice.value.unitId
		};
	}
	return {
		host: form.modbus.host || "",
		port: form.modbus.port || 502,
		unitId: form.modbus.unitId || 1
	};
});

// 載入設備列表
const loadDevices = async () => {
	isLoadingDevices.value = true;
	try {
		const result = await modbusDeviceApi.getDevices({
			status: "active",
			limit: 100
		});
		devices.value = result.devices;
	} catch (error) {
		console.error("載入設備列表失敗:", error);
		errorMessage.value = "載入設備列表失敗";
	} finally {
		isLoadingDevices.value = false;
	}
};

// 處理設備選擇變更
const handleDeviceChange = () => {
	if (selectedDevice.value) {
		// 當選擇設備時，自動填入設備資訊
		form.modbus.host = selectedDevice.value.host;
		form.modbus.port = selectedDevice.value.port;
		form.modbus.unitId = selectedDevice.value.unitId;
	}
};

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

		// 載入 Modbus 配置
		if (category.modbus) {
			form.modbus = {
				deviceId: category.modbus.deviceId || 0,
				points: category.modbus.points ? [...category.modbus.points] : [],
				// 保留這些欄位用於向後兼容轉換和測試連線
				host: category.modbus.host || "",
				port: category.modbus.port ?? 502,
				unitId: category.modbus.unitId ?? 1
			};

			// 如果有 deviceId，嘗試從設備列表中找到並填入資訊
			if (category.modbus.deviceId && devices.value.length > 0) {
				const device = devices.value.find((d) => d.id === category.modbus!.deviceId);
				if (device) {
					form.modbus.host = device.host;
					form.modbus.port = device.port;
					form.modbus.unitId = device.unitId;
				}
			}

			// 向後兼容：將舊格式的點位轉換為新的 points 格式（只取第一個點位）
			if (!form.modbus.points || form.modbus.points.length === 0) {
				let firstPoint: ModbusPointConfig | null = null;

				// 優先轉換 DO 點位
				if (category.modbus.doAddresses && category.modbus.doAddresses.length > 0) {
					firstPoint = {
						id: `point-${Date.now()}-${Math.random()}`,
						address: category.modbus.doAddresses[0],
						type: "DO",
						note: "從舊 DO 點位轉換"
					};
				} else if (category.modbus.doAddress !== undefined) {
					firstPoint = {
						id: `point-${Date.now()}-${Math.random()}`,
						address: category.modbus.doAddress,
						type: "DO",
						note: "從舊 DO 點位轉換"
					};
				}
				// 如果沒有 DO，嘗試 DI 點位
				else if (category.modbus.diAddresses && category.modbus.diAddresses.length > 0) {
					firstPoint = {
						id: `point-${Date.now()}-${Math.random()}`,
						address: category.modbus.diAddresses[0],
						type: "DI",
						note: "從舊 DI 點位轉換"
					};
				} else if (category.modbus.diAddress !== undefined) {
					firstPoint = {
						id: `point-${Date.now()}-${Math.random()}`,
						address: category.modbus.diAddress,
						type: "DI",
						note: "從舊 DI 點位轉換"
					};
				}

				if (firstPoint) {
					form.modbus.points = [firstPoint];
				} else {
					// 如果沒有舊格式點位，創建預設點位
					form.modbus.points = [
						{
							id: `point-${Date.now()}-${Math.random()}`,
							address: 0,
							type: "DO",
							note: ""
						}
					];
				}
			} else {
				// 如果已有 points，只保留第一個點位，並確保格式正確
				const firstPoint = form.modbus.points[0];
				let point: ModbusPointConfig;

				if (firstPoint.type) {
					// 已經是新格式
					point = firstPoint;
				} else {
					// 從 method 推斷 type（向後兼容）
					let type: "DI" | "DO" = "DO";
					if (firstPoint.method === "getDiscreteInputs") {
						type = "DI";
					} else if (firstPoint.method === "getCoils" || firstPoint.method === "writeCoil" || firstPoint.method === "writeCoils") {
						type = "DO";
					}
					point = {
						...firstPoint,
						type,
						id: firstPoint.id || `point-${Date.now()}-${Math.random()}`
					};
				}
				form.modbus.points = [point];
			}
		} else {
			// 重置為預設值（包含一個預設點位）
			form.modbus = {
				deviceId: 0,
				points: [
					{
						id: `point-${Date.now()}-${Math.random()}`,
						address: 0,
						type: "DO",
						note: ""
					}
				],
				host: "",
				port: 502,
				unitId: 1
			};
		}
		// 確保只有一個點位
		ensureSinglePoint();
	},
	{ immediate: true }
);

// 當對話框打開時載入設備列表
watch(
	() => props.modelValue,
	(isOpen) => {
		if (isOpen && devices.value.length === 0) {
			loadDevices();
		}
	}
);

const validateForm = () => {
	errorMessage.value = "";
	if (!form.name.trim()) {
		errorMessage.value = "分類名稱不得為空";
		return false;
	}

	// 驗證設備配置
	if (!form.modbus.deviceId) {
		errorMessage.value = "請選擇設備";
		return false;
	}

	if (!selectedDevice.value) {
		errorMessage.value = "請選擇有效的設備";
		return false;
	}

	// 驗證點位配置（只驗證單一點位）
	const point = currentPoint.value;
	if (!point) {
		errorMessage.value = "請設定點位配置";
		return false;
	}
	if (point.address < 0) {
		errorMessage.value = "點位地址必須為非負整數";
		return false;
	}
	if (!point.type || (point.type !== "DI" && point.type !== "DO")) {
		errorMessage.value = "點位必須選擇類型（DI 或 DO）";
		return false;
	}
	return true;
};

const buildCategoryPayload = (): LightingCategory => {
	// 確保 points 陣列只有一個點位
	const point = currentPoint.value;
	return {
		id: form.id || `category-${Date.now()}`,
		name: form.name,
		floorId: form.floorId,
		location: { ...form.location },
		roomIds: [],
		modbus: {
			...form.modbus,
			points: point ? [{ ...point }] : []
		}
	};
};

const handleTestConnection = async () => {
	if (!validateForm()) return;
	if (!selectedDevice.value) {
		errorMessage.value = "請先選擇設備";
		return;
	}

	isTesting.value = true;
	try {
		const deviceConfig = {
			host: selectedDevice.value.host,
			port: selectedDevice.value.port,
			unitId: selectedDevice.value.unitId
		};

		await modbusApi.getHealth(deviceConfig);
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

/* 共用輸入框樣式 */
.form-field input,
.form-select {
	border-radius: 12px;
	border: 1px solid rgba(255, 255, 255, 0.35);
	background: rgba(255, 255, 255, 0.1);
	padding: 0.65rem 0.85rem;
	color: #f7fbff;
	transition:
		border-color 0.2s ease,
		background 0.2s ease;
}

.form-field input:focus,
.form-select:focus {
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

.form-input-disabled {
	opacity: 0.6;
	cursor: not-allowed;
	background: rgba(255, 255, 255, 0.05) !important;
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
