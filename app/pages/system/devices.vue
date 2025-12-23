<template>
	<div class="space-y-6 2xl:space-y-8">
		<div class="flex items-center justify-between">
			<header class="flex flex-col gap-2">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">設備管理</h1>
				<p class="text-base text-white/80 2xl:text-xl">管理各類型設備配置與配對</p>
		</header>

		<!-- Tab 切換 -->
			<div class="rounded-2xl border border-white/20 bg-white/15 p-1">
			<div class="flex gap-2 overflow-x-auto">
				<button
					v-for="tab in deviceTabs"
					:key="tab.code"
					type="button"
					:class="[
							'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all 2xl:px-6 2xl:py-3 2xl:text-base',
							activeTab === tab.code
								? 'bg-blue-500/80 text-white shadow-lg'
								: 'text-white/70 hover:bg-white/10 hover:text-white'
					]"
					@click="switchTab(tab.code)"
				>
					{{ tab.name }}
				</button>
			</div>
			</div>

			<button
				v-if="isAdmin"
				type="button"
				class="rounded-xl bg-purple-500/80 px-4 py-2 text-sm text-white hover:bg-purple-400 disabled:cursor-not-allowed disabled:bg-purple-500/40 2xl:px-6 2xl:py-3 2xl:text-base"
				@click="showDeviceTypeDialog = true"
			>
				設備類型管理
			</button>
		</div>

		<!-- 設備列表 -->
		<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
			<!-- Tab 標題和操作按鈕 -->
			<div class="mb-6 flex flex-wrap items-center justify-between gap-4 2xl:gap-6">
				<h2 class="text-xl font-semibold text-white 2xl:text-2xl">
					{{ currentTabName ? `${currentTabName}管理` : "設備管理" }}
				</h2>
				<div class="flex items-center gap-3 2xl:gap-4">
					<button
						v-if="isAdmin"
						type="button"
						class="rounded-xl bg-blue-500/80 px-4 py-2 text-sm text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/40 2xl:px-6 2xl:py-3 2xl:text-base"
						@click="showDeviceModelDialog = true"
					>
						設備型號管理
					</button>
					<button
						v-if="isAdmin"
						type="button"
						class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 2xl:px-6 2xl:py-3 2xl:text-base"
						@click="showCreateDialog = true"
					>
						新增設備
					</button>
				</div>
			</div>

			<!-- 骨架屏：載入中時顯示 -->
			<template v-if="isLoading">
				<table class="w-full text-center">
					<thead>
						<tr class="border-b border-white/20">
							<th :class="tableHeaderClass">設備名稱</th>
							<th :class="tableHeaderClass">設備型號</th>
							<th :class="tableHeaderClass">配置資訊</th>
							<th :class="tableHeaderClass">狀態</th>
							<th :class="tableHeaderClass">
								<label>
									<select
										v-model="dateSortOrder"
										:class="sortSelectClass"
										@change="handleSortChange"
									>
										<option value="desc">由新到舊</option>
										<option value="asc">由舊到新</option>
									</select>
								</label>
							</th>
							<th v-if="isAdmin" :class="tableHeaderClass">操作</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="n in 5" :key="`skeleton-${n}`" class="border-b border-white/10">
							<td :class="tableCellClass">
								<div class="h-4 w-20 animate-pulse rounded bg-white/20 2xl:h-5 2xl:w-24"></div>
							</td>
							<td :class="tableCellClass">
								<div class="h-4 w-24 animate-pulse rounded bg-white/20 2xl:h-5 2xl:w-28"></div>
							</td>
							<td :class="tableCellClass">
								<div class="h-4 w-32 animate-pulse rounded bg-white/20 2xl:h-5 2xl:w-40"></div>
							</td>
							<td :class="tableCellClass">
								<div class="h-6 w-16 animate-pulse rounded bg-white/20 2xl:h-7 2xl:w-20"></div>
							</td>
							<td :class="tableCellClass">
								<div class="h-4 w-32 animate-pulse rounded bg-white/20 2xl:h-5 2xl:w-40"></div>
							</td>
							<td v-if="isAdmin" :class="tableCellClass">
								<div class="flex gap-2 2xl:gap-3">
									<div class="h-6 w-12 animate-pulse rounded bg-white/20 2xl:h-7 2xl:w-16"></div>
									<div class="h-6 w-12 animate-pulse rounded bg-white/20 2xl:h-7 2xl:w-16"></div>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</template>
			<!-- 設備列表表格：有數據時顯示 -->
			<template v-else-if="devices.length > 0">
				<table class="w-full text-center">
					<thead>
						<tr class="border-b border-white/20">
							<th :class="tableHeaderClass">設備名稱</th>
							<th :class="tableHeaderClass">設備型號</th>
							<th :class="tableHeaderClass">配置資訊</th>
							<th :class="tableHeaderClass">狀態</th>
							<th :class="tableHeaderClass">
								<label>
									<select
										v-model="dateSortOrder"
										:class="sortSelectClass"
										@change="handleSortChange"
									>
										<option value="desc">由新到舊</option>
										<option value="asc">由舊到新</option>
									</select>
								</label>
							</th>
							<th v-if="isAdmin" :class="tableHeaderClass">操作</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="device in devices"
							:key="device.id"
							class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
						>
							<td :class="tableCellClass">{{ device.name }}</td>
							<td :class="tableCellClass">
								<span v-if="device.model_name" class="text-white/90">{{ device.model_name }}</span>
								<span v-else class="text-white/50">-</span>
							</td>
							<td :class="tableCellClass">
								<span class="text-sm text-white/80 2xl:text-base">{{
									formatDeviceConfig(device.config)
								}}</span>
							</td>
							<td :class="tableCellClass">
								<span
									:class="[
										getStatusBadgeClass(device.status),
										'rounded px-2 py-1 2xl:px-3 2xl:py-1.5'
									]"
								>
									{{ statusLabels[device.status] }}
								</span>
							</td>
							<td :class="[tableCellClass, 'text-white/70']">
								{{ formatDate(device.created_at) }}
							</td>
							<td v-if="isAdmin" :class="tableCellClass">
								<div class="flex gap-2 2xl:gap-3">
									<button
										type="button"
										class="rounded bg-blue-500/80 px-3 py-1 text-white hover:bg-blue-400 2xl:px-4 2xl:py-2"
										@click="editDevice(device)"
									>
										編輯
									</button>
									<button
										type="button"
										class="rounded bg-red-500/80 px-3 py-1 text-white hover:bg-red-400 2xl:px-4 2xl:py-2"
										@click="confirmDeleteDevice(device)"
									>
										刪除
									</button>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</template>
			<!-- 無數據提示 -->
			<template v-else>
				<div class="py-8 text-center text-white/60">
					<p class="text-lg 2xl:text-xl">尚無設備資料</p>
					<p v-if="isAdmin" class="mt-2 text-sm 2xl:text-base">
						點擊「新增設備」開始建立 {{ currentTabName }}
					</p>
				</div>
			</template>

			<!-- 分頁：只在有數據且總數超過每頁限制時顯示 -->
			<div
				v-if="!isLoading && devices.length > 0 && total > limit"
				class="mt-4 flex items-center justify-between text-white/80 2xl:mt-6"
			>
				<div class="text-sm 2xl:text-base">
					顯示 {{ offset + 1 }}-{{ Math.min(offset + limit, total) }} / 共 {{ total }} 筆
				</div>
				<div class="flex gap-2 2xl:gap-3">
					<button
						type="button"
						class="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20 disabled:opacity-50 2xl:px-4 2xl:py-2 2xl:text-base"
						:disabled="offset === 0"
						@click="previousPage"
					>
						上一頁
					</button>
					<button
						type="button"
						class="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20 disabled:opacity-50 2xl:px-4 2xl:py-2 2xl:text-base"
						:disabled="offset + limit >= total"
						@click="nextPage"
					>
						下一頁
					</button>
				</div>
			</div>
		</section>

		<!-- 建立/編輯設備對話框 -->
		<DeviceDialog
			v-model="showDialog"
			:editing-device="editingDevice"
			:device-type-code="activeTab"
			:is-admin="isAdmin"
			:is-submitting="isSubmitting"
			:error-message="errorMessage"
			:refresh-device-types="refreshDeviceTypes"
			@submit="handleSubmit"
			@close="closeDialog"
		/>

		<!-- 設備型號管理對話框 -->
		<DeviceModelDialog
			v-model="showDeviceModelDialog"
			:device-type-code="activeTab"
			@close="showDeviceModelDialog = false"
			@refresh="
				() => {
					// 設備型號變更後，刷新設備列表和設備型號選擇
					loadDevices();
					refreshDeviceTypes = !refreshDeviceTypes; // 觸發 DeviceDialog 刷新設備型號列表
				}
			"
		/>

		<!-- 設備類型管理對話框 -->
		<DeviceTypeDialog
			v-model="showDeviceTypeDialog"
			@close="showDeviceTypeDialog = false"
			@refresh="
				() => {
					deviceApi.clearDeviceTypesCache(); // 清除快取
					loadDeviceTypes(true); // 強制刷新
					refreshDeviceTypes = !refreshDeviceTypes;
				}
			"
		/>
	</div>
</template>

<script setup lang="ts">
import type {
	Device,
	CreateDeviceData,
	UpdateDeviceData,
	DeviceTypeCode,
	DeviceConfig,
	DeviceType
} from "~/types/device";
import DeviceModelDialog from "~/components/device/DeviceModelDialog.vue";
import DeviceTypeDialog from "~/components/device/DeviceTypeDialog.vue";

definePageMeta({
	layout: "default",
	middleware: "admin" // 需要管理員權限
});

const { isAdmin } = useAuth();
const deviceApi = useDeviceApi();
const toast = useToast();

// 從後端動態讀取的設備類型
const deviceTypes = ref<DeviceType[]>([]);
const deviceTabs = computed(() => {
	return deviceTypes.value.map(type => ({
		name: type.name,
		code: type.code as DeviceTypeCode
	}));
});

const activeTab = ref<DeviceTypeCode | null>(null);
const currentTabName = computed(() => {
	const tab = deviceTabs.value.find(tab => tab.code === activeTab.value);
	return tab?.name || "";
});

const devices = ref<Device[]>([]);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const showCreateDialog = ref(false);
const showDeviceModelDialog = ref(false);
const showDeviceTypeDialog = ref(false);
const refreshDeviceTypes = ref(false);

// 請求去重和防抖
const loadingDevicesMap = ref<Map<DeviceTypeCode, boolean>>(new Map());
let loadDevicesTimer: ReturnType<typeof setTimeout> | null = null;

const showDialog = computed({
	get: () => showCreateDialog.value || !!editingDevice.value,
	set: val => {
		if (!val) {
			showCreateDialog.value = false;
			editingDevice.value = null;
		}
	}
});
const editingDevice = ref<Device | null>(null);
const isSubmitting = ref(false);

// 常數配置
const LIMIT = 20;
const MIN_LOADING_DELAY = 300;

const limit = LIMIT;
const offset = ref(0);
const total = ref(0);
const dateSortOrder = ref<"asc" | "desc">("desc");

// 標籤映射
const statusLabels: Record<string, string> = {
	active: "啟用",
	inactive: "停用",
	error: "錯誤"
};

// 統一樣式類
const tableHeaderClass = "py-3 2xl:py-4 px-4 2xl:px-6 text-sm 2xl:text-base text-white/80";
const tableCellClass = "py-3 2xl:py-4 px-4 2xl:px-6";
const sortSelectClass =
	"rounded-lg border border-white/40 bg-white/10 px-2 2xl:px-3 py-1 2xl:py-2 text-sm 2xl:text-base text-white focus:border-white focus:outline-none";

// 工具函數
const formatDate = (dateString?: string) => {
	if (!dateString) return "-";
	return new Date(dateString).toLocaleDateString("zh-TW");
};

const formatDeviceConfig = (config: DeviceConfig): string => {
	if (!config) return "-";
	switch (config.type) {
		case "controller":
			return `${config.host}:${config.port}`;
		case "camera":
			return config.ip_address || config.rtsp_url || "-";
		case "sensor":
			if (config.protocol === "modbus") {
				return `${config.host}:${config.port}`;
			}
			return config.connection_string || config.api_endpoint || "-";
		case "tablet":
			return config.ip_address || config.mac_address || "-";
		case "network":
			return config.ip_address || "-";
		default:
			return "-";
	}
};

const getStatusBadgeClass = (status: string) => {
	const classes = {
		active: "bg-emerald-500/20 text-emerald-200",
		inactive: "bg-yellow-500/20 text-yellow-200",
		error: "bg-red-500/20 text-red-200"
	};
	return classes[status as keyof typeof classes] || classes.inactive;
};

// 業務邏輯函數
const handleError = (error: unknown, defaultMessage: string) => {
	console.error(defaultMessage, error);
	const errorMsg = error instanceof Error ? error.message : defaultMessage;
	errorMessage.value = errorMsg;
	toast.error(errorMsg);
	return errorMsg;
};

const switchTab = (tabCode: DeviceTypeCode) => {
	if (activeTab.value === tabCode) return; // 如果已經是當前 tab，不執行
	activeTab.value = tabCode;
	offset.value = 0;
	// 不需要手動調用 loadDevices，watch 會自動處理
};

// 載入設備類型（使用共享快取）
const loadDeviceTypes = async (force = false) => {
	try {
		const types = await deviceApi.getDeviceTypes(force);
		deviceTypes.value = types;
		// 如果還沒有選中的標籤，選擇第一個
		if (!activeTab.value && deviceTypes.value.length > 0) {
			activeTab.value = deviceTypes.value[0].code as DeviceTypeCode;
		}
	} catch (error) {
		handleError(error, "載入設備類型失敗");
	}
};

const loadDevices = async (skipDebounce = false) => {
	if (!activeTab.value) return;

	const tabCode = activeTab.value;

	// 請求去重：如果該 tab 正在載入，跳過
	if (loadingDevicesMap.value.get(tabCode)) {
		return;
	}

	// 防抖：如果不是立即執行，清除之前的計時器並設置新的
	if (!skipDebounce && loadDevicesTimer) {
		clearTimeout(loadDevicesTimer);
	}

	const executeLoad = async () => {
		loadingDevicesMap.value.set(tabCode, true);
	isLoading.value = true;
	errorMessage.value = null;

	const startTime = Date.now();

	try {
		const result = await deviceApi.getDevices({
				type_code: tabCode,
			limit,
			offset: offset.value,
			orderBy: "created_at",
			order: dateSortOrder.value
		});

		const elapsed = Date.now() - startTime;
		const remainingDelay = Math.max(0, MIN_LOADING_DELAY - elapsed);

		if (remainingDelay > 0) {
				await new Promise(resolve => setTimeout(resolve, remainingDelay));
		}

		devices.value = result.devices;
		total.value = result.total;
	} catch (error) {
		handleError(error, "載入設備列表失敗");
	} finally {
		isLoading.value = false;
			loadingDevicesMap.value.delete(tabCode);
		}
	};

	if (skipDebounce) {
		await executeLoad();
	} else {
		loadDevicesTimer = setTimeout(executeLoad, 300); // 300ms 防抖
	}
};

const editDevice = (device: Device) => {
	editingDevice.value = device;
	showCreateDialog.value = true;
};

const closeDialog = () => {
	showCreateDialog.value = false;
	editingDevice.value = null;
	errorMessage.value = null;
};

const handleSubmit = async (data: CreateDeviceData | UpdateDeviceData) => {
	isSubmitting.value = true;
	errorMessage.value = null;

	try {
		if (editingDevice.value) {
			// 更新設備
			await deviceApi.updateDevice(editingDevice.value.id, data as UpdateDeviceData);
		} else {
			// 建立設備
			await deviceApi.createDevice(data as CreateDeviceData);
		}

		const wasEditing = !!editingDevice.value;
		closeDialog();
		await loadDevices(true); // 立即執行，不使用防抖
		toast.success(wasEditing ? "設備更新成功" : "設備建立成功");
	} catch (error) {
		handleError(error, "操作失敗");
	} finally {
		isSubmitting.value = false;
	}
};

const confirmDeleteDevice = async (device: Device) => {
	if (!confirm(`確定要刪除設備 "${device.name}" 嗎？此操作無法復原。`)) {
		return;
	}

	try {
		await deviceApi.deleteDevice(device.id);
		await loadDevices(true); // 立即執行，不使用防抖
		toast.success(`設備 "${device.name}" 已刪除`);
	} catch (error) {
		const errorMsg = handleError(error, "刪除設備失敗");
		alert(errorMsg);
	}
};

const previousPage = () => {
	if (offset.value > 0) {
		offset.value -= limit;
		loadDevices(true); // 立即執行，不使用防抖
	}
};

const nextPage = () => {
	if (offset.value + limit < total.value) {
		offset.value += limit;
		loadDevices(true); // 立即執行，不使用防抖
	}
};

const handleSortChange = () => {
	offset.value = 0;
	loadDevices(true); // 立即執行，不使用防抖
};

// 監聽 tab 切換（使用 immediate: false 避免初始觸發）
watch(activeTab, (newTab, oldTab) => {
	// 只有在 tab 真正改變時才載入（不是初始設置）
	if (newTab && oldTab !== null && newTab !== oldTab) {
		offset.value = 0; // 重置分頁
	loadDevices();
	}
});

onMounted(async () => {
	await loadDeviceTypes();
	// 設備類型載入後會自動設置第一個 tab，watch 會處理載入設備
	// 但如果沒有觸發 watch，手動載入一次
	if (activeTab.value) {
		loadDevices(true); // 立即執行，不使用防抖
	}
});
</script>

<style scoped></style>
