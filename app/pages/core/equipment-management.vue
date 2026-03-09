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

			<button
				v-if="isOperator"
				type="button"
				class="rounded-xl bg-purple-500/80 px-4 py-2 text-base text-white hover:bg-purple-400 disabled:cursor-not-allowed disabled:bg-purple-500/40 2xl:px-6 2xl:py-3 2xl:text-lg"
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
									<td :class="tableCellClass">
										<span v-if="device.model_name" class="text-white/90">{{
											device.model_name
										}}</span>
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
												'rounded px-2 py-1 2xl:px-3 2xl:py-1.5',
											]"
										>
											{{ statusLabels[device.status] }}
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

		<!-- 設備類型管理對話框 -->
		<DeviceTypeDialog
			v-model="showDeviceTypeDialog"
			@close="showDeviceTypeDialog = false"
			@refresh="handleDeviceTypeRefresh"
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
	DeviceType,
	DeviceStatus,
} from "~/types/device"
import type {
	DeviceCreatedEvent,
	DeviceUpdatedEvent,
	DeviceDeletedEvent,
	DeviceStatusChangedEvent,
	MonitoringDeviceStatusEvent,
	MonitoringDeviceStatusBatchEvent,
} from "~/composables/websocket/useWebSocket"
import DeviceModelDialog from "~/components/device/DeviceModelDialog.vue"
import DeviceTypeDialog from "~/components/device/DeviceTypeDialog.vue"
import Pagination from "~/components/common/Pagination.vue"
import { formatDate } from "~/utils/dateUtils"
import { useDataLoader } from "~/composables/monitoring/useDataLoader"
import { useAuth } from "~/composables/core/useAuth"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useDeviceApi } from "~/composables/systems/useDeviceApi"
import { useDeviceMonitor } from "~/composables/monitoring/useDeviceMonitor"

definePageMeta({
	layout: "default",
})

const { isAdmin, isOperator } = useAuth()
const deviceApi = useDeviceApi()
const toast = useToast()
const { handleError: handleApiError } = useErrorHandler()
const { setupDeviceListeners, removeDeviceListeners } = useDeviceMonitor()

// 從後端動態讀取的設備類型
const deviceTypes = ref<DeviceType[]>([])
const deviceTabs = computed(() => {
	return deviceTypes.value.map((type) => ({
		name: type.name,
		code: type.code as DeviceTypeCode,
	}))
})

const activeTab = ref<DeviceTypeCode | null>(null)
const currentTabName = computed(() => {
	const tab = deviceTabs.value.find((tab) => tab.code === activeTab.value)
	return tab?.name || ""
})

const showCreateDialog = ref(false)
const showDeviceModelDialog = ref(false)
const showDeviceTypeDialog = ref(false)
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

// 常數配置
const limit = 20 // 用於分頁組件
const dateSortOrder = ref<"asc" | "desc">("desc")

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
	{ typeCode: DeviceTypeCode; order: "asc" | "desc"; limit?: number; offset?: number }
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
		})
		return { items: result.devices, total: result.total }
	},
	debounce: 300,
	pageSize: 20,
	onError: (err) => {
		const errorMsg = handleApiError(err, "載入設備列表失敗")
		errorMessage.value = errorMsg || "載入設備列表失敗"
	},
})

// 標籤映射
const statusLabels: Record<string, string> = {
	active: "啟用",
	inactive: "停用",
	error: "錯誤",
}

// 統一樣式類
const tableHeaderClass = "py-3 2xl:py-4 px-4 2xl:px-6 text-sm 2xl:text-base text-white/80"
const tableCellClass = "py-3 2xl:py-4 px-4 2xl:px-6"
const sortSelectClass =
	"rounded-lg border border-white/40 bg-white/10 px-2 2xl:px-3 py-1 2xl:py-2 text-sm 2xl:text-base text-white focus:border-white focus:outline-none"

const formatDeviceConfig = (config: DeviceConfig): string => {
	if (!config) return "-"
	switch (config.type) {
		case "controller":
			return `${config.host}`
		case "camera":
			return `${config.host || config.ip_address || "-"}${config.isapi_preview_path ? ` ${config.isapi_preview_path}` : ""}`
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

	// 切換 tab 並重置分頁
	activeTab.value = tabCode
	resetPage()

	// 立即載入新資料（不使用防抖）
	load({ typeCode: tabCode, order: dateSortOrder.value }, true)
}

// 載入設備類型（使用共享快取）
const loadDeviceTypes = async (force = false) => {
	try {
		const types = await deviceApi.getDeviceTypes(force)
		// 確保 types 是數組，避免 undefined 錯誤
		deviceTypes.value = Array.isArray(types) ? types : []
		// 如果還沒有選中的標籤，選擇第一個
		if (!activeTab.value && deviceTypes.value.length > 0) {
			activeTab.value = deviceTypes.value[0].code as DeviceTypeCode
		}
	} catch (error) {
		// 錯誤處理：確保 deviceTypes.value 保持為空數組，而不是 undefined
		deviceTypes.value = []
		handleError(error, "載入設備類型失敗")
	}
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
			if (index > -1) devices.value[index] = result.device
		} else {
			// 新增後重新載入列表，避免重複顯示（雙擊或事件觸發兩次時仍只會顯示後端一份）
			if (activeTab.value) {
				resetPage()
				load({ typeCode: activeTab.value, order: dateSortOrder.value }, true)
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

const confirmDeleteDevice = async (device: Device) => {
	if (!confirm(`確定要刪除設備 "${device.name}" 嗎？此操作無法復原。`)) {
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
	}
}

const handlePreviousPage = () => {
	if (!activeTab.value) return
	prevPage({ typeCode: activeTab.value, order: dateSortOrder.value })
}

const handleNextPage = () => {
	if (!activeTab.value) return
	nextPage({ typeCode: activeTab.value, order: dateSortOrder.value })
}

const handleSortChange = () => {
	if (!activeTab.value) return
	resetPage()
	load({ typeCode: activeTab.value, order: dateSortOrder.value }, true) // 立即執行
}

// 設備型號變更後刷新列表與型號選擇（供 DeviceModelDialog @refresh 使用）
const handleDeviceModelRefresh = () => {
	if (activeTab.value) {
		load({ typeCode: activeTab.value, order: dateSortOrder.value }, true)
	}
	refreshDeviceTypes.value = !refreshDeviceTypes.value
}

// 設備類型變更後刷新（供 DeviceTypeDialog @refresh 使用）
const handleDeviceTypeRefresh = () => {
	loadDeviceTypes(true)
	refreshDeviceTypes.value = !refreshDeviceTypes.value
}

// 監聽 tab 切換（僅用於初始載入，手動切換由 switchTab 處理）
watch(activeTab, (newTab, oldTab) => {
	// 只有在初始設置時才載入（不是手動切換）
	if (newTab && oldTab === null) {
		load({ typeCode: newTab, order: dateSortOrder.value }, true)
	}
})

// 更新設備監控狀態的共用邏輯
const updateDeviceMonitoringStatus = (deviceId: number, status: "online" | "offline") => {
	const device = devices.value.find((d) => d.id === deviceId)
	if (device) {
		if (status === "offline" && device.status === "active") {
			device.status = "error"
		} else if (status === "online" && device.status === "error") {
			device.status = "active"
		}
	}
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
				void load({ typeCode: activeTab.value, order: dateSortOrder.value }, true)
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
			devices.value[index] = device
		} else {
			// 如果不在當前列表，重新載入
			if (activeTab.value) {
				void load({ typeCode: activeTab.value, order: dateSortOrder.value }, true)
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
	// 優先使用 deviceId，如果沒有則使用 sourceId（向後兼容）
	const deviceId = event.deviceId || event.sourceId
	updateDeviceMonitoringStatus(deviceId, event.status)
}

// 處理設備批次監控狀態事件
const handleMonitoringStatusBatch = (event: MonitoringDeviceStatusBatchEvent) => {
	event.updates.forEach(({ sourceId, deviceId }) => {
		// 優先使用 deviceId，如果沒有則使用 sourceId（向後兼容）
		const id = deviceId || sourceId
		updateDeviceMonitoringStatus(id, event.status)
	})
}

onMounted(async () => {
	await loadDeviceTypes()
	// 設備類型載入後會自動設置第一個 tab，watch 會處理載入設備
	// 但如果沒有觸發 watch，手動載入一次
	if (activeTab.value) {
		load({ typeCode: activeTab.value, order: dateSortOrder.value }, true) // 立即執行
	}

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
