<template>
	<div class="space-y-6">
		<header class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 class="text-3xl font-semibold text-white">Modbus 即時資料</h1>
				<p class="text-white/80">直接從 DDC 讀取離散輸入與暫存器，方便整合 BA 系統。</p>
			</div>
			<div class="flex items-center gap-3">
				<span v-if="lastUpdated" class="text-sm text-white/70">最後更新：{{ formatDate(lastUpdated) }}</span>
				<button
					type="button"
					class="rounded-xl bg-white/20 px-5 py-2 text-white shadow hover:bg-white/30 disabled:cursor-not-allowed disabled:bg-white/10"
					:disabled="isLoading"
					@click="() => loadData()"
				>
					{{ isLoading ? "讀取中..." : "重新整理" }}
				</button>
			</div>
		</header>

		<section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<div class="glass-card">
				<p class="text-sm text-white/70">連線狀態</p>
				<p class="text-2xl font-semibold" :class="isConnected ? 'text-emerald-300' : 'text-rose-300'">
					{{ isConnected ? "已連線" : "未連線" }}
				</p>
				<p class="text-sm text-white/70">{{ healthStatus }}</p>
			</div>

			<div class="glass-card">
				<p class="text-sm text-white/70">目標裝置</p>
				<p class="text-xl font-semibold text-white">{{ hostLabel }}</p>
				<p class="text-sm text-white/70">Unit ID：{{ health?.unitId ?? "-" }}</p>
			</div>

			<div class="glass-card">
				<p class="text-sm text-white/70">最後連線時間</p>
				<p class="text-xl font-semibold text-white">{{ formatDate(health?.lastConnectedAt ?? null) }}</p>
				<p class="text-sm text-white/70">自健康檢查回傳</p>
			</div>

			<div class="glass-card">
				<p class="text-sm text-white/70">查詢範圍</p>
				<p class="text-xl font-semibold text-white">位址 {{ form.address }}，筆數 {{ form.length }}</p>
				<p class="text-sm text-white/70">所有 API 共用此設定</p>
			</div>
		</section>

		<section class="rounded-2xl bg-white/15 p-6 backdrop-blur border border-white/20">
			<form class="flex flex-wrap gap-4" @submit.prevent="() => loadData()">
				<label class="flex flex-col text-white/80">
					<span>開始位址</span>
					<input
						v-model.number="form.address"
						type="number"
						min="0"
						class="mt-1 rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-white focus:border-white focus:outline-none"
					/>
				</label>

				<label class="flex flex-col text-white/80">
					<span>筆數 (1-125)</span>
					<input
						v-model.number="form.length"
						type="number"
						min="1"
						max="125"
						class="mt-1 rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-white focus:border-white focus:outline-none"
					/>
				</label>

				<div class="flex items-end">
					<button
						type="submit"
						class="rounded-xl bg-emerald-500/80 px-6 py-2 text-white shadow hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40"
						:disabled="isLoading"
					>
						{{ isLoading ? "讀取中..." : "立即讀取" }}
					</button>
				</div>

				<p v-if="errorMessage" class="flex-1 text-rose-200">{{ errorMessage }}</p>
			</form>
		</section>

		<section class="grid gap-6 xl:grid-cols-2">
			<div class="data-card">
				<header class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-white">離散輸入 (Function 02)</h2>
					<button type="button" class="text-sm text-white/70 hover:text-white" @click="handleDiscreteRefresh">只更新此區塊</button>
				</header>
				<table class="data-table mt-4">
					<thead>
						<tr>
							<th>位址</th>
							<th>狀態</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(value, index) in discreteInputs" :key="`di-${index}`">
							<td>{{ form.address + index }}</td>
							<td>
								<span :class="value ? 'text-emerald-300 font-medium' : 'text-white/70'">
									{{ value ? "啟動" : "關閉" }}
								</span>
							</td>
						</tr>
						<tr v-if="!discreteInputs.length">
							<td colspan="2" class="text-center text-white/60">尚未載入</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="data-card">
				<header class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-white">Holding Registers (Function 03)</h2>
					<button type="button" class="text-sm text-white/70 hover:text-white" @click="handleHoldingRefresh">只更新此區塊</button>
				</header>
				<table class="data-table mt-4">
					<thead>
						<tr>
							<th>位址</th>
							<th>數值</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(value, index) in holdingRegisters" :key="`hr-${index}`">
							<td>{{ form.address + index }}</td>
							<td class="text-white">{{ value }}</td>
						</tr>
						<tr v-if="!holdingRegisters.length">
							<td colspan="2" class="text-center text-white/60">尚未載入</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<section class="data-card">
			<header class="flex items-center justify-between">
				<h2 class="text-xl font-semibold text-white">數位輸出 (DO) - Function 01/05</h2>
				<button type="button" class="text-sm text-white/70 hover:text-white" @click="handleCoilsRefresh">只更新此區塊</button>
			</header>
			<table class="data-table mt-4">
				<thead>
					<tr>
						<th>DO 編號</th>
						<th>Modbus 位址</th>
						<th>狀態</th>
						<th>操作</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(value, index) in coils" :key="`coil-${index}`">
						<td class="font-medium">DO {{ index + 1 }}</td>
						<td>{{ form.address + index }}</td>
						<td>
							<span :class="value ? 'text-emerald-300 font-medium' : 'text-white/70'">
								{{ value ? "啟動" : "關閉" }}
							</span>
						</td>
						<td>
							<div class="flex gap-2">
								<button
									type="button"
									:disabled="isWritingCoil || !isConnected"
									:class="[
										'px-3 py-1 rounded text-sm font-medium transition',
										value
											? 'bg-rose-500/80 text-white hover:bg-rose-400 disabled:bg-rose-500/40'
											: 'bg-emerald-500/80 text-white hover:bg-emerald-400 disabled:bg-emerald-500/40'
									]"
									@click="handleToggleCoil(form.address + index, !value)"
								>
									{{ value ? "關閉" : "啟動" }}
								</button>
							</div>
						</td>
					</tr>
					<tr v-if="!coils.length">
						<td colspan="4" class="text-center text-white/60">尚未載入</td>
					</tr>
				</tbody>
			</table>
		</section>
	</div>
</template>

<script setup lang="ts">
import { useModbusApi } from "~/composables/useModbus";
import type { ModbusHealth, DeviceConfig } from "~/types/modbus";

definePageMeta({
	layout: "default"
});

const modbusApi = useModbusApi();

// DI 和 DO 的設備配置：192.168.2.205:502, Unit ID: 205
const diDoDeviceConfig: DeviceConfig = {
	host: "192.168.2.205",
	port: 502,
	unitId: 205
};

const form = reactive({
	address: 0,
	length: 20
});

const health = ref<ModbusHealth | null>(null);
const discreteInputs = ref<boolean[]>([]);
const holdingRegisters = ref<number[]>([]);
const coils = ref<boolean[]>([]);
const errorMessage = ref<string | null>(null);
const isLoading = ref(false);
const isAutoRefreshing = ref(false);
const isWritingCoil = ref(false);
const lastUpdated = ref<Date | null>(null);
const AUTO_REFRESH_INTERVAL = 2000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const isConnected = computed(() => Boolean(health.value?.isOpen));
const hostLabel = computed(() => {
	if (!health.value) return "-";
	return `${health.value.host}:${health.value.port}`;
});
const healthStatus = computed(() => (health.value ? (health.value.isOpen ? "Modbus TCP 連線中" : "待連線") : "尚未取得"));

const setError = (message: string) => {
	errorMessage.value = message;
};

const validateForm = () => {
	if (form.address < 0) {
		setError("開始位址需為非負整數");
		return false;
	}
	if (form.length <= 0 || form.length > 125) {
		setError("筆數需介於 1 至 125");
		return false;
	}
	return true;
};

type ModbusDataType = "discrete-inputs" | "holding-registers" | "coils";

const loadModbusData = async (type: ModbusDataType, options?: { suppressError?: boolean }) => {
	if (!validateForm()) return;
	try {
		let response;
		switch (type) {
			case "discrete-inputs":
				response = await modbusApi.getDiscreteInputs(form.address, form.length, diDoDeviceConfig);
				discreteInputs.value = response.data;
				break;
			case "holding-registers":
				// Holding Registers 可以使用其他設備配置（如果需要）
				// 暫時使用相同的設備配置
				response = await modbusApi.getHoldingRegisters(form.address, form.length, diDoDeviceConfig);
				holdingRegisters.value = response.data;
				break;
			case "coils":
				response = await modbusApi.getCoils(form.address, form.length, diDoDeviceConfig);
				coils.value = response.data;
				break;
		}
	} catch (error) {
		console.error(error);
		const errorMessages = {
			"discrete-inputs": "離散輸入讀取失敗",
			"holding-registers": "Holding Registers 讀取失敗",
			coils: "DO (Coils) 讀取失敗"
		};
		setError(errorMessages[type]);
		if (!options?.suppressError) {
			throw error;
		}
	}
};

// 保留個別函數以維持向後兼容
const loadDiscreteInputs = (options?: { suppressError?: boolean }) => loadModbusData("discrete-inputs", options);
const loadHoldingRegisters = (options?: { suppressError?: boolean }) => loadModbusData("holding-registers", options);
const loadCoils = (options?: { suppressError?: boolean }) => loadModbusData("coils", options);

interface LoadOptions {
	silent?: boolean;
}

const loadData = async (options?: LoadOptions) => {
	if (!validateForm()) return;

	// 避免自動刷新在手動載入時重複觸發
	if (options?.silent && (isLoading.value || isAutoRefreshing.value)) {
		return;
	}

	const targetLoading = options?.silent ? isAutoRefreshing : isLoading;
	targetLoading.value = true;

	if (!options?.silent) {
		errorMessage.value = null;
	}

	try {
		health.value = await modbusApi.getHealth(diDoDeviceConfig);
		await Promise.all([loadModbusData("discrete-inputs"), loadModbusData("holding-registers"), loadModbusData("coils")]);
		lastUpdated.value = new Date();
	} catch (error) {
		console.error(error);
		if (!options?.silent) {
			setError(error instanceof Error ? error.message : "讀取 Modbus 資料失敗");
		}
	} finally {
		targetLoading.value = false;
	}
};

const formatDate = (value: Date | string | null) => {
	if (!value) return "—";
	const date = typeof value === "string" ? new Date(value) : value;
	return date.toLocaleString();
};

const startAutoRefresh = () => {
	if (refreshTimer) return;
	refreshTimer = setInterval(() => {
		loadData({ silent: true });
	}, AUTO_REFRESH_INTERVAL);
};

const stopAutoRefresh = () => {
	if (!refreshTimer) return;
	clearInterval(refreshTimer);
	refreshTimer = null;
};

onMounted(() => {
	loadData();
	startAutoRefresh();
});

onBeforeUnmount(() => {
	stopAutoRefresh();
});

const handleRefresh = (type: ModbusDataType) => {
	loadModbusData(type, { suppressError: true });
};

// 保留個別函數以維持向後兼容
const handleDiscreteRefresh = () => handleRefresh("discrete-inputs");
const handleHoldingRefresh = () => handleRefresh("holding-registers");
const handleCoilsRefresh = () => handleRefresh("coils");

const handleToggleCoil = async (address: number, value: boolean) => {
	if (isWritingCoil.value || !isConnected.value) return;

	isWritingCoil.value = true;
	errorMessage.value = null;

	try {
		await modbusApi.writeCoil(address, value, diDoDeviceConfig);
		// 寫入成功後，重新讀取該位址的狀態（讀取整個範圍以更新 UI）
		await loadCoils({ suppressError: true });
	} catch (error) {
		console.error(error);
		setError(`DO 寫入失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
	} finally {
		isWritingCoil.value = false;
	}
};
</script>

<style scoped>
.glass-card {
	border-radius: 1rem;
	border: 1px solid rgba(255, 255, 255, 0.3);
	background-color: rgba(255, 255, 255, 0.1);
	padding: 1.25rem;
	color: #fff;
	backdrop-filter: blur(8px);
}

.data-card {
	border-radius: 1rem;
	border: 1px solid rgba(255, 255, 255, 0.3);
	background-color: rgba(255, 255, 255, 0.1);
	padding: 1.5rem;
	color: #fff;
	backdrop-filter: blur(8px);
}

.data-table {
	width: 100%;
	border-collapse: collapse;
}

.data-table th {
	border-bottom: 1px solid rgba(255, 255, 255, 0.3);
	padding-bottom: 0.5rem;
	text-align: left;
	font-size: 0.875rem;
	font-weight: 400;
	color: rgba(255, 255, 255, 0.7);
}

.data-table td {
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	padding: 0.5rem 0;
	font-size: 0.875rem;
	color: #fff;
}
</style>
