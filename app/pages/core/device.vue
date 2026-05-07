<template>
	<div class="space-y-6 2xl:space-y-8">
		<div class="flex items-center justify-between">
			<header class="flex flex-col gap-2">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">設備管理</h1>
				<p class="text-base text-white/80 2xl:text-xl">管理各類型設備配置與配對</p>
			</header>

			<!-- Tab 切換 -->
			<div class="rounded-2xl border border-white/20 bg-white/15 p-1">
				<div class="show-scrollbar flex gap-2 overflow-x-auto">
					<button
						v-for="tab in deviceTabs"
						:key="tab.code"
						type="button"
						:class="[
							'whitespace-nowrap rounded-xl px-4 py-2 text-lg font-medium transition-all 2xl:px-6 2xl:py-3 2xl:text-xl',
							activeTab === tab.code
								? 'bg-blue-500/80 text-white shadow-lg'
								: 'text-white/70 hover:bg-white/10 hover:text-white',
						]"
						@click="switchTab(tab.code)"
					>
						{{ tab.name }}
					</button>
				</div>
			</div>
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
						v-if="isOperator"
						type="button"
						:disabled="!activeTab"
						class="rounded-xl bg-blue-500/80 px-4 py-2 text-base text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/40 2xl:px-6 2xl:py-3 2xl:text-lg"
						@click="showDeviceModelDialog = true"
					>
						型號管理
					</button>
					<button
						v-if="isOperator"
						type="button"
						class="rounded-xl bg-emerald-500/80 px-4 py-2 text-base text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 2xl:px-6 2xl:py-3 2xl:text-lg"
						@click="showCreateDialog = true"
					>
						新增設備
					</button>
				</div>
			</div>

			<!-- 設備列表表格：使用過渡動畫 -->
			<div class="min-h-[500px]">
				<Transition name="fade" mode="out-in">
					<div v-if="devices.length > 0" :key="`devices-${activeTab}-${offset}`">
						<table class="w-full text-center">
							<thead>
								<tr class="border-b border-white/20">
									<th :class="tableHeaderClass">設備名稱</th>
									<th v-if="activeTab === 'camera'" :class="tableHeaderClass">
										<FilterDropdown
											:model-value="cameraGroupFilter"
											:options="cameraGroupFilterOptions"
											placeholder="全部"
											text-size="text-sm 2xl:text-base"
											@update:model-value="onCameraGroupFilterUpdate"
										/>
									</th>
									<th :class="tableHeaderClass">設備型號</th>
									<th :class="tableHeaderClass">
										{{ activeTab === "camera" ? "IP 位址" : "配置資訊" }}
									</th>
									<th :class="tableHeaderClass">狀態</th>
									<th :class="tableHeaderClass">連線</th>
									<th :class="tableHeaderClass">
										<FilterDropdown
											:model-value="dateSortOrder"
											:options="dateSortOptions"
											placeholder="由新到舊"
											text-size="text-sm 2xl:text-base"
											@update:model-value="onDateSortUpdate"
										/>
									</th>
									<th v-if="isOperator" :class="tableHeaderClass">操作</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="device in devices"
									:key="device.id"
									class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
								>
									<td :class="tableCellClass">{{ device.name }}</td>
									<td v-if="activeTab === 'camera'" :class="tableCellClass">
										<span class="text-white/80">{{ getCameraGroup(device) }}</span>
									</td>
									<td :class="tableCellClass">
										<span v-if="device.model_name" class="text-white/90">{{
											device.model_name
										}}</span>
										<span v-else class="text-white/50">-</span>
									</td>
									<td :class="tableCellClass">
										<span class="text-sm text-white/80 2xl:text-base">{{
											activeTab === "camera"
												? getCameraIp(device)
												: formatDeviceConfig(device.config)
										}}</span>
									</td>
									<td :class="tableCellClass">
										<span
											:class="[
												getStatusBadgeClass(device.status),
												'rounded px-2 py-1 2xl:px-3 2xl:py-1.5',
											]"
										>
											{{ statusLabels[device.status] }}
										</span>
									</td>
									<td :class="tableCellClass">
										<span
											:class="[
												deviceConnectivity.getBadgeClass(deviceConnectivity.getStatus(device.id)),
												'rounded px-2 py-1 text-sm 2xl:px-3 2xl:py-1.5 2xl:text-base',
											]"
										>
											<span
												v-if="deviceConnectivity.isLoading(device.id)"
												class="inline-flex items-center justify-center gap-2 min-w-[32px]"
											>
												<span
													class="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
												></span>
											</span>
											<span v-else>
												{{ connectivityLabels[deviceConnectivity.getStatus(device.id)] }}
											</span>
										</span>
									</td>
									<td :class="[tableCellClass, 'text-white/70']">
										{{ formatDate(device.created_at) }}
									</td>
									<td v-if="isOperator" :class="tableCellClass">
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

						<!-- 分頁 -->
						<Pagination
							:show="total > limit"
							:total="total"
							:offset="offset"
							:limit="limit"
							:disabled="isLoading"
							@previous="handlePreviousPage"
							@next="handleNextPage"
						/>
					</div>
					<!-- 無數據提示 -->
					<div v-else key="empty" class="py-8 text-center text-white/60">
						<p class="text-lg 2xl:text-xl">尚無設備資料</p>
						<p v-if="isOperator" class="mt-2 text-sm 2xl:text-base">
							點擊「新增設備」開始建立 {{ currentTabName }}
						</p>
					</div>
				</Transition>
			</div>
		</section>

		<!-- 建立/編輯設備對話框 -->
		<DeviceDialog
			v-if="activeTab"
			v-model="showDialog"
			:editing-device="editingDevice"
			:device-type-code="activeTab"
			:is-admin="isOperator"
			:is-submitting="isSubmitting"
			:error-message="errorMessage"
			:refresh-device-types="refreshDeviceTypes"
			@submit="handleSubmit"
			@close="closeDialog"
		/>

		<!-- 設備型號管理對話框 -->
		<DeviceModelDialog
			v-if="activeTab"
			v-model="showDeviceModelDialog"
			:device-type-code="activeTab"
			@close="showDeviceModelDialog = false"
			@refresh="handleDeviceModelRefresh"
		/>

		<ConfirmDialog
			v-model="showConfirmDialog"
			:title="confirmDialogConfig.title"
			:message="confirmDialogConfig.message"
			:details="confirmDialogConfig.details"
			:type="confirmDialogConfig.type"
			:confirm-text="confirmDialogConfig.confirmText"
			:cancel-text="confirmDialogConfig.cancelText"
			@confirm="handleConfirmDeleteDevice"
			@cancel="handleCancelDeleteDevice"
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
	DeviceStatus,
	CameraDeviceConfig,
} from "~/types/device"
import type {
	DeviceCreatedEvent,
	DeviceUpdatedEvent,
	DeviceDeletedEvent,
	DeviceStatusChangedEvent,
	MonitoringDeviceStatusEvent,
	MonitoringDeviceStatusBatchEvent,
} from "~/types/websocket"
import DeviceModelDialog from "~/components/device/DeviceModelDialog.vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import Pagination from "~/components/common/Pagination.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import { formatDate } from "~/utils/dateUtils"
import { useDataLoader } from "~/composables/monitoring/useDataLoader"
import { useAuth } from "~/composables/core/useAuth"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useDeviceConnectivity } from "~/composables/systems/devices/useDeviceConnectivity"
import { useDeviceWebSocket } from "~/composables/websocket/subscribers/useDeviceWebSocket"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { FIXED_DEVICE_TABS } from "~/constants/deviceTypes"

definePageMeta({
	layout: "default",
})

const { isOperator } = useAuth()
const deviceApi = useDeviceApi()
const toast = useToast()
const { handleError: handleApiError } = useErrorHandler()
const { setupDeviceListeners, removeDeviceListeners } = useDeviceWebSocket()

// 設備類型固定（不提供 CRUD）
const deviceTabs = computed(() => FIXED_DEVICE_TABS)

const activeTab = ref<DeviceTypeCode | null>(null)
const currentTabName = computed(() => {
	const tab = deviceTabs.value.find((tab) => tab.code === activeTab.value)
	return tab?.name || ""
})

const showCreateDialog = ref(false)
const showDeviceModelDialog = ref(false)
const refreshDeviceTypes = ref(false)

const showDialog = computed({
	get: () => showCreateDialog.value || !!editingDevice.value,
	set: (val) => {
		if (!val) {
			showCreateDialog.value = false
			editingDevice.value = null
		}
	},
})
const editingDevice = ref<Device | null>(null)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

const confirmDialog = useConfirmDialog()
const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value
	},
})
const confirmDialogConfig = computed(() => confirmDialog.config.value)
const pendingDeleteDeviceId = ref<number | null>(null)

// 常數配置
const limit = 10 // 用於分頁組件
const dateSortOrder = ref<"asc" | "desc">("desc")
const cameraGroupFilter = ref<string>("")
const cameraGroups = ref<string[]>([])

const deviceConnectivity = useDeviceConnectivity({ debounceMs: 150 })

// 使用 useDataLoader 統一管理數據載入
const {
	data: devices,
	total,
	offset,
	isLoading,
	load,
	nextPage,
	prevPage,
	resetPage,
} = useDataLoader<
	Device,
	{
		typeCode: DeviceTypeCode
		order: "asc" | "desc"
		limit?: number
		offset?: number
		group?: string
	}
>({
	fetcher: async (params) => {
		if (!activeTab.value) {
			return { items: [], total: 0 }
		}
		const result = await deviceApi.getDevices({
			type_code: params.typeCode,
			limit: params.limit ?? limit,
			offset: params.offset ?? offset.value,
			orderBy: "created_at",
			order: params.order,
			...(params.typeCode === "camera" && params.group ? { group: params.group } : {}),
		})
		return { items: result.devices, total: result.total }
	},
	debounce: 300,
	pageSize: 10,
	onError: (err) => {
		const errorMsg = handleApiError(err, "載入設備列表失敗")
		errorMessage.value = errorMsg || "載入設備列表失敗"
	},
})

const deviceIdsInPage = computed(() =>
	(devices.value || []).map((d) => d.id).filter((n) => Number.isFinite(n))
)
deviceConnectivity.bindDeviceIds(deviceIdsInPage)

// 標籤映射
const statusLabels: Record<string, string> = {
	active: "啟用",
	inactive: "停用",
	error: "錯誤",
}

const connectivityLabels = computed(() => deviceConnectivity.labels.value)

// 統一樣式類
const tableHeaderClass = "py-3 2xl:py-4 px-4 2xl:px-6 text-sm 2xl:text-base text-white/80"
const tableCellClass = "py-3 2xl:py-4 px-4 2xl:px-6"

const dateSortOptions = [
	{ value: "desc", label: "由新到舊" },
	{ value: "asc", label: "由舊到新" },
]
const cameraGroupFilterOptions = computed(() => [
	{ value: "", label: "全部" },
	...cameraGroups.value.map((g) => ({ value: g, label: g })),
])

const onDateSortUpdate = (value: string) => {
	dateSortOrder.value = value as "asc" | "desc"
	if (activeTab.value) reloadList()
}
const onCameraGroupFilterUpdate = (value: string) => {
	cameraGroupFilter.value = value
	reloadList()
}

const reloadList = () => {
	resetPage()
	load(getLoadParams(), true)
}

const getCameraGroup = (device: Device): string => {
	const config = device.config as CameraDeviceConfig | undefined
	return config?.group?.trim() ?? "-"
}

const getCameraIp = (device: Device): string => {
	const config = device.config as CameraDeviceConfig | undefined
	if (!config) return "-"
	if (config.host) return config.host
	if (config.ip_address) return config.ip_address
	if (!config.rtsp_url) return "-"
	try {
		const url = new URL(config.rtsp_url)
		return url.hostname || url.host || "-"
	} catch {
		return "-"
	}
}

const formatDeviceConfig = (config: DeviceConfig): string => {
	if (!config) return "-"
	switch (config.type) {
		case "controller":
			return `${config.host}`
		case "camera": {
			const c = config as CameraDeviceConfig
			return c.host || c.ip_address || (c.rtsp_url ? "RTSP" : "-")
		}
		case "sensor":
			if (config.protocol === "modbus") {
				return `${config.host}`
			}
			return config.connection_string || config.api_endpoint || "-"
		case "access_control":
			return `${config.host}`
		default:
			return "-"
	}
}

const getStatusBadgeClass = (status: string) => {
	const classes = {
		active: "bg-emerald-500/20 text-emerald-200",
		inactive: "bg-yellow-500/20 text-yellow-200",
		error: "bg-red-500/20 text-red-200",
	}
	return classes[status as keyof typeof classes] || classes.inactive
}

const getLoadParams = () => ({
	typeCode: activeTab.value!,
	order: dateSortOrder.value,
	...(activeTab.value === "camera" && cameraGroupFilter.value
		? { group: cameraGroupFilter.value }
		: {}),
})

// 業務邏輯函數：統一錯誤處理（同時更新頁面錯誤訊息）
const handleError = (error: unknown, defaultMessage: string) => {
	const errorMsg = handleApiError(error, defaultMessage)
	errorMessage.value = errorMsg || defaultMessage
	return errorMsg
}

const switchTab = (tabCode: DeviceTypeCode) => {
	if (activeTab.value === tabCode) return // 如果已經是當前 tab，不執行

	// 立即清空舊資料，觸發過渡動畫
	devices.value.length = 0
	total.value = 0
	deviceConnectivity.reset()

	// 切換 tab 並重置分頁
	activeTab.value = tabCode
	resetPage()

	// 立即載入新資料（不使用防抖）
	load(getLoadParams(), true)
}

const initDefaultTab = () => {
	if (activeTab.value) return
	const first = deviceTabs.value[0]
	if (!first) return
	activeTab.value = first.code
}

const editDevice = (device: Device) => {
	editingDevice.value = device
	showCreateDialog.value = true
}

const closeDialog = () => {
	showCreateDialog.value = false
	editingDevice.value = null
	errorMessage.value = null
}

// 將後端 getDeviceById 結構正規化為列表用（保留 model_name / type_name / type_code）
const normalizeDeviceForList = (
	raw: Device & { model?: { name?: string }; type_name?: string; type_code?: string },
	fallback?: Device
): Device => ({
	...raw,
	model_name: raw.model?.name ?? fallback?.model_name,
	type_name: raw.type_name ?? fallback?.type_name,
	type_code: raw.type_code ?? fallback?.type_code,
})

const handleSubmit = async (data: CreateDeviceData | UpdateDeviceData) => {
	if (isSubmitting.value) return
	isSubmitting.value = true
	errorMessage.value = null

	try {
		const result = editingDevice.value
			? await deviceApi.updateDevice(editingDevice.value.id, data as UpdateDeviceData)
			: await deviceApi.createDevice(data as CreateDeviceData)

		if (editingDevice.value) {
			const index = devices.value.findIndex((d) => d.id === editingDevice.value!.id)
			if (index > -1) {
				// 後端 PUT 回傳 getDeviceById 結構（含 model 物件），正規化為列表用欄位以即時顯示
				devices.value[index] = normalizeDeviceForList(
					result.device as Device & { model?: { name?: string } },
					devices.value[index]
				)
			}
		} else {
			// 新增後重新載入列表，避免重複顯示（雙擊或事件觸發兩次時仍只會顯示後端一份）
			if (activeTab.value) {
				resetPage()
				load(getLoadParams(), true)
			} else {
				devices.value.push(result.device)
				total.value += 1
			}
		}

		closeDialog()
		toast.success(result.message || "操作成功")
	} catch (error) {
		handleError(error, "操作失敗")
	} finally {
		isSubmitting.value = false
	}
}

const confirmDeleteDevice = (device: Device) => {
	pendingDeleteDeviceId.value = device.id
	confirmDialog.show({
		title: "確認刪除",
		message: `確定要刪除設備「${device.name}」嗎？`,
		details: "此操作無法復原。",
		type: "danger",
		confirmText: "刪除",
		cancelText: "取消",
	})
}

const handleConfirmDeleteDevice = async () => {
	const id = pendingDeleteDeviceId.value
	if (id == null) return
	const device = devices.value.find((d) => d.id === id)
	if (!device) {
		pendingDeleteDeviceId.value = null
		return
	}

	try {
		const result = await deviceApi.deleteDevice(device.id)

		// 從本地移除（避免不必要的重新載入）
		devices.value = devices.value.filter((d) => d.id !== device.id)
		total.value = Math.max(0, total.value - 1)

		toast.success(result.message || "刪除成功")
	} catch (error) {
		handleError(error, "刪除設備失敗")
	} finally {
		pendingDeleteDeviceId.value = null
	}
}

const handleCancelDeleteDevice = () => {
	pendingDeleteDeviceId.value = null
}

const handlePreviousPage = () => {
	if (!activeTab.value) return
	prevPage(getLoadParams())
}

const handleNextPage = () => {
	if (!activeTab.value) return
	nextPage(getLoadParams())
}

const loadCameraGroups = async () => {
	try {
		const res = await deviceApi.getCameraGroups()
		cameraGroups.value = res.groups ?? []
	} catch {
		cameraGroups.value = []
	}
}

// 設備型號變更後刷新列表與型號選擇（供 DeviceModelDialog @refresh 使用）
const handleDeviceModelRefresh = () => {
	if (activeTab.value) {
		load(getLoadParams(), true)
	}
	refreshDeviceTypes.value = !refreshDeviceTypes.value
}

// 監聽 tab 切換（僅用於初始載入，手動切換由 switchTab 處理）
watch(activeTab, (newTab, oldTab) => {
	if (newTab && oldTab === null) {
		load(getLoadParams(), true)
	}
	if (newTab === "camera") {
		void loadCameraGroups()
	}
})

const updateDeviceConnectivityStatus = (deviceId: number, status: "online" | "offline") => {
	deviceConnectivity.applyWsStatus(deviceId, status)
}

// 處理設備創建事件
const handleDeviceCreated = (event: DeviceCreatedEvent) => {
	const { device } = event
	// 如果新設備的類型匹配當前 tab，添加到列表
	if (device.type_code === activeTab.value) {
		if (offset.value === 0) {
			// 在第一頁，添加到列表開頭
			devices.value = [device, ...devices.value]
			total.value += 1
		} else {
			// 不在第一頁，重新載入以確保數據一致性
			if (activeTab.value) {
				void load(getLoadParams(), true)
			}
		}
	}
}

// 處理設備更新事件
const handleDeviceUpdated = (event: DeviceUpdatedEvent) => {
	const { device } = event
	// 如果更新的設備在當前列表中，更新它
	if (device.type_code === activeTab.value) {
		const index = devices.value.findIndex((d) => d.id === device.id)
		if (index !== -1) {
			devices.value[index] = normalizeDeviceForList(
				device as Device & { model?: { name?: string } },
				devices.value[index]
			)
		} else {
			// 如果不在當前列表，重新載入
			if (activeTab.value) {
				void load(getLoadParams(), true)
			}
		}
	}
}

// 處理設備刪除事件
const handleDeviceDeleted = (event: DeviceDeletedEvent) => {
	const index = devices.value.findIndex((d) => d.id === event.deviceId)
	if (index !== -1) {
		devices.value.splice(index, 1)
		total.value = Math.max(0, total.value - 1)
	}
	deviceConnectivity.removeDevice(event.deviceId)
}

// 處理設備狀態變更事件
const handleDeviceStatusChanged = (event: DeviceStatusChangedEvent) => {
	const device = devices.value.find((d) => d.id === event.deviceId)
	if (device) {
		device.status = event.newStatus
	}
}

// 處理設備監控狀態事件（設備上線/離線）
const handleMonitoringStatus = (event: MonitoringDeviceStatusEvent) => {
	// 方案 A：設備管理頁只顯示「設備本體」連線
	if (event.system !== "device") return
	const deviceId = event.deviceId || event.sourceId
	updateDeviceConnectivityStatus(deviceId, event.status)
}

// 處理設備批次監控狀態事件
const handleMonitoringStatusBatch = (event: MonitoringDeviceStatusBatchEvent) => {
	if (event.system !== "device") return
	event.updates.forEach(({ sourceId, deviceId }) => {
		const id = deviceId || sourceId
		updateDeviceConnectivityStatus(id, event.status)
	})
}

onMounted(async () => {
	initDefaultTab()
	if (activeTab.value) load(getLoadParams(), true) // 立即執行

	// 設置設備 WebSocket 事件監聽器
	setupDeviceListeners({
		onDeviceCreated: handleDeviceCreated,
		onDeviceUpdated: handleDeviceUpdated,
		onDeviceDeleted: handleDeviceDeleted,
		onDeviceStatusChanged: handleDeviceStatusChanged,
		onMonitoringStatus: handleMonitoringStatus,
		onMonitoringStatusBatch: handleMonitoringStatusBatch,
	})
})

onUnmounted(() => {
	// 移除設備 WebSocket 事件監聽器
	removeDeviceListeners()
})
</script>
