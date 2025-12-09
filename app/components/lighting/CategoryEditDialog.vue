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
								<label class="form-field col-span-2">
									<span>選擇設備</span>
									<select v-model.number="form.modbus.deviceId" class="form-select" @change="handleDeviceChange">
										<option :value="0">請選擇設備</option>
										<option v-for="device in devices" :key="device.id" :value="device.id">
											{{ device.name }} ({{ device.host }}:{{ device.port }})
										</option>
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
								<template v-else>
									<label class="form-field">
										<span>裝置 IP</span>
										<input v-model="form.modbus.host" type="text" placeholder="例如：192.168.2.205" />
									</label>
									<label class="form-field">
										<span>Port</span>
										<input v-model.number="form.modbus.port" type="number" min="1" max="65535" />
									</label>
									<label class="form-field">
										<span>Unit ID</span>
										<input v-model.number="form.modbus.unitId" type="number" min="0" max="255" />
									</label>
								</template>
							</div>
							<div class="mt-4 space-y-4">
								<div class="flex items-center justify-between">
									<h5 class="section-title">點位配置</h5>
									<button
										type="button"
										class="px-3 py-1.5 rounded-lg bg-emerald-500/80 text-white text-sm hover:bg-emerald-400 transition"
										@click="addPoint"
									>
										+ 新增點位
									</button>
								</div>
								
								<!-- 點位列表 -->
								<div v-if="form.modbus.points && form.modbus.points.length > 0" class="space-y-3">
									<div
										v-for="(point, index) in form.modbus.points"
										:key="`point-${index}`"
										class="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3"
									>
										<div class="flex items-start justify-between gap-3">
											<div class="flex-1 grid grid-cols-3 gap-3">
												<label class="form-field">
													<span>點位</span>
													<input
														v-model.number="point.address"
														type="number"
														min="0"
														placeholder="例如：10"
														required
													/>
												</label>
												<label class="form-field">
													<span>方法</span>
													<select v-model="point.method" class="form-select" required>
														<option value="getCoils">讀取 DO (getCoils)</option>
														<option value="writeCoil">寫入單一 DO (writeCoil)</option>
														<option value="writeCoils">寫入多個 DO (writeCoils)</option>
														<option value="getDiscreteInputs">讀取 DI (getDiscreteInputs)</option>
														<option value="getHoldingRegisters">讀取 Holding Registers</option>
														<option value="getInputRegisters">讀取 Input Registers</option>
													</select>
												</label>
												<label class="form-field">
													<span>備註</span>
													<input
														v-model="point.note"
														type="text"
														placeholder="選填"
													/>
												</label>
											</div>
											<button
												type="button"
												class="px-3 py-1.5 rounded-lg bg-red-500/80 text-white text-sm hover:bg-red-400 transition self-end"
												@click="removePoint(index)"
											>
												刪除
											</button>
										</div>
									</div>
								</div>
								<div v-else class="text-center py-6 text-white/50 text-sm">
									尚無點位配置，點擊「新增點位」開始設定
								</div>
							</div>
							<!-- 向後兼容：舊格式的欄位（如果沒有選擇設備） -->
							<div v-if="!selectedDevice" class="form-grid mt-4">
								<label class="form-field">
									<span>起始位址（舊格式）</span>
									<input v-model.number="form.modbus.address" type="number" min="0" placeholder="例如：0" />
								</label>
								<label class="form-field">
									<span>筆數（舊格式）</span>
									<input v-model.number="form.modbus.length" type="number" min="1" max="125" placeholder="例如：1" />
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

// 新增點位
const addPoint = () => {
	if (!form.modbus.points) {
		form.modbus.points = [];
	}
	form.modbus.points.push({
		address: 0,
		method: "getCoils",
		note: ""
	});
};

// 刪除點位
const removePoint = (index: number) => {
	if (form.modbus.points) {
		form.modbus.points.splice(index, 1);
	}
};

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
				// 向後兼容：如果沒有 deviceId，使用舊格式
				host: category.modbus.host || category.modbus.deviceId ? "" : "",
				port: category.modbus.port ?? 502,
				unitId: category.modbus.unitId ?? 1,
				address: category.modbus.address ?? 0,
				length: category.modbus.length ?? 1
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
			
			// 向後兼容：將舊格式的點位轉換為新的 points 格式
			if (!form.modbus.points || form.modbus.points.length === 0) {
				const points: ModbusPointConfig[] = [];
				
				// 轉換 DO 點位
				if (category.modbus.doAddresses && category.modbus.doAddresses.length > 0) {
					category.modbus.doAddresses.forEach((addr) => {
						points.push({
							address: addr,
							method: "getCoils",
							note: ""
						});
					});
				} else if (category.modbus.doAddress !== undefined) {
					const start = category.modbus.doAddress;
					const length = category.modbus.doLength || 1;
					for (let i = 0; i < length; i++) {
						points.push({
							address: start + i,
							method: "getCoils",
							note: ""
						});
					}
				}
				
				// 轉換 DI 點位
				if (category.modbus.diAddresses && category.modbus.diAddresses.length > 0) {
					category.modbus.diAddresses.forEach((addr) => {
						points.push({
							address: addr,
							method: "getDiscreteInputs",
							note: ""
						});
					});
				} else if (category.modbus.diAddress !== undefined) {
					const start = category.modbus.diAddress;
					const length = category.modbus.diLength || 1;
					for (let i = 0; i < length; i++) {
						points.push({
							address: start + i,
							method: "getDiscreteInputs",
							note: ""
						});
					}
				}
				
				if (points.length > 0) {
					form.modbus.points = points;
				}
			}
		} else {
			// 重置為預設值
			form.modbus = {
				deviceId: 0,
				points: [],
				host: "",
				port: 502,
				unitId: 1,
				address: 0,
				length: 1
			};
		}
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
	
	// 如果選擇了設備，驗證設備資訊
	if (form.modbus.deviceId) {
		if (!selectedDevice.value) {
			errorMessage.value = "請選擇有效的設備";
			return false;
		}
		// 驗證點位配置
		if (!form.modbus.points || form.modbus.points.length === 0) {
			errorMessage.value = "請至少新增一個點位配置";
			return false;
		}
		// 驗證每個點位的設定
		for (let i = 0; i < form.modbus.points.length; i++) {
			const point = form.modbus.points[i];
			if (point.address < 0) {
				errorMessage.value = `點位 ${i + 1} 的地址必須為非負整數`;
				return false;
			}
			if (!point.method) {
				errorMessage.value = `點位 ${i + 1} 必須選擇方法`;
				return false;
			}
		}
		// 驗證點位數量（Modbus 限制最多 125 個）
		if (form.modbus.points.length > 125) {
			errorMessage.value = "點位數量不能超過 125 個";
			return false;
		}
	} else {
		// 向後兼容：使用舊格式驗證
		if (!form.modbus.host?.trim()) {
			errorMessage.value = "請選擇設備或輸入 Modbus 裝置 IP";
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
	}
	return true;
};

const buildCategoryPayload = (): LightingCategory => {
	return {
		id: form.id || `category-${Date.now()}`,
		name: form.name,
		floorId: form.floorId,
		location: { ...form.location },
		roomIds: [], // 移除 Room IDs，保留空陣列以向後兼容
		modbus: {
			...form.modbus,
			points: form.modbus.points ? form.modbus.points.map((p) => ({ ...p })) : []
		}
	};
};

const handleTestConnection = async () => {
	if (!validateForm()) return;
	isTesting.value = true;
	try {
		const deviceConfig = selectedDevice.value
			? {
					host: selectedDevice.value.host,
					port: selectedDevice.value.port,
					unitId: selectedDevice.value.unitId
				}
			: {
					host: form.modbus.host!,
					port: form.modbus.port!,
					unitId: form.modbus.unitId!
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

.form-select {
	border-radius: 12px;
	border: 1px solid rgba(255, 255, 255, 0.35);
	background: rgba(255, 255, 255, 0.1);
	padding: 0.65rem 0.85rem;
	color: #f7fbff;
	transition: border-color 0.2s ease, background 0.2s ease;
	cursor: pointer;
}

.form-select:focus {
	border-color: #5be7f1;
	background: rgba(255, 255, 255, 0.18);
	outline: none;
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

