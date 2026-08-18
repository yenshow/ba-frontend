<template>
	<div>
		<div v-if="deviceTabItems.length" class="page-shell">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<header class="me-4 flex flex-col gap-1 2xl:gap-2">
					<h1 class="page-title">設備管理</h1>
					<p class="page-subtitle">管理各類型設備配置與配對</p>
				</header>

				<PageTabs
					v-model="activeTabModel"
					:tabs="deviceTabItems"
					:panels="false"
					list-class="me-auto max-w-full overflow-x-auto show-scrollbar"
					aria-label="設備類型"
					id-prefix="device-tab"
				/>
			</div>

			<PageTabs
				v-model="activeTabModel"
				:tabs="deviceTabItems"
				:list="false"
				single-panel
				:panel-transition="false"
				id-prefix="device-tab"
			>
				<section class="section-card">
					<div class="mb-6 flex flex-wrap items-center justify-between gap-4 2xl:gap-6">
						<h2 class="text-xl font-semibold text-white 2xl:text-2xl">
							{{ currentTabName ? `${currentTabName}管理` : "設備管理" }}
						</h2>
						<div class="flex items-center gap-3 2xl:gap-4">
							<button
								v-if="canManageDeviceModels && activeTab"
								type="button"
								class="rounded-xl bg-blue-500/80 px-4 py-2 text-base text-white hover:bg-blue-400 2xl:px-6 2xl:py-3 2xl:text-lg"
								aria-label="型號管理"
								@click="showDeviceModelDialog = true"
							>
								型號管理
							</button>
							<PermissionActionButton
								:allowed="canCreateDevice"
								aria-label="新增設備"
								class="rounded-xl bg-emerald-500/80 px-4 py-2 text-base text-white enabled:hover:bg-emerald-400 2xl:px-6 2xl:py-3 2xl:text-lg"
								@click="openCreateDevice"
								>新增設備</PermissionActionButton
							>
						</div>
					</div>

					<AsyncPanel
						:loading="isLoading"
						:empty="!isLoading && devices.length === 0"
						:error="listLoadError"
						empty-title="尚無設備資料"
						:empty-description="
							canCreateDevice && currentTabName ? `點擊「新增設備」開始建立${currentTabName}` : ''
						"
					>
						<div :key="`devices-${activeTab}-${offset}`" class="table-scroll">
							<table class="w-full min-w-[720px] text-center">
								<thead>
									<tr class="border-b border-white/20">
										<th class="table-th">設備名稱</th>
										<th v-if="activeTab === 'camera'" class="table-th">
											<FilterDropdown
												:model-value="cameraGroupFilter"
												:options="cameraGroupFilterOptions"
												placeholder="全部"
												text-size="text-sm 2xl:text-base"
												@update:model-value="onCameraGroupFilterUpdate"
											/>
										</th>
										<th v-if="activeTab === 'camera'" class="table-th">攝影機群組</th>
										<th class="table-th">設備型號</th>
										<th class="table-th">
											{{ activeTab === "camera" ? "IP 位址" : "配置資訊" }}
										</th>
										<th class="table-th">狀態</th>
										<th class="table-th">
											<FilterDropdown
												:model-value="dateSortOrder"
												:options="dateSortOptions"
												placeholder="更新時間"
												text-size="text-sm 2xl:text-base"
												@update:model-value="onDateSortUpdate"
											/>
										</th>
										<th class="table-th">操作</th>
									</tr>
								</thead>
								<tbody>
									<tr
										v-for="device in devices"
										:key="device.id"
										class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
									>
										<td class="table-td">{{ device.name }}</td>
										<td v-if="activeTab === 'camera'" class="table-td">
											<span class="text-white/80">{{ getCameraGroup(device) }}</span>
										</td>
										<td v-if="activeTab === 'camera'" class="table-td">
											<span class="text-sm text-white/80 2xl:text-base">{{
												getModelCategoryLabel(device)
											}}</span>
										</td>
										<td class="table-td">
											<span v-if="device.model_name" class="text-white/90">{{
												device.model_name
											}}</span>
											<span v-else class="text-white/50">-</span>
										</td>
										<td class="table-td">
											<span class="text-sm text-white/80 2xl:text-base">{{
												activeTab === "camera"
													? getCameraIp(device)
													: formatDeviceConfig(device.config)
											}}</span>
										</td>
										<td class="table-td">
											<span
												:class="[
													deviceConnectivity.getBadgeClass(deviceConnectivity.getStatus(device.id)),
													'rounded px-2 py-1 text-sm 2xl:px-3 2xl:py-1.5 2xl:text-base',
												]"
											>
												<span
													v-if="deviceConnectivity.isLoading(device.id)"
													class="inline-flex min-w-[32px] items-center justify-center gap-2"
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
										<td class="table-td text-white/70">
											{{ formatDate(device.created_at) }}
										</td>
										<td class="table-td">
											<div class="flex gap-2 2xl:gap-3">
												<PermissionActionButton
													:allowed="canUpdateDevice"
													aria-label="編輯設備"
													class="rounded bg-blue-500/80 px-3 py-1 text-white enabled:hover:bg-blue-400 2xl:px-4 2xl:py-2"
													@click="editDevice(device)"
												>
													編輯
												</PermissionActionButton>
												<PermissionActionButton
													:allowed="canDeleteDevice"
													aria-label="刪除設備"
													class="rounded bg-red-500/80 px-3 py-1 text-white enabled:hover:bg-red-400 2xl:px-4 2xl:py-2"
													@click="confirmDeleteDevice(device)"
													>刪除</PermissionActionButton
												>
											</div>
										</td>
									</tr>
								</tbody>
							</table>

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
					</AsyncPanel>
				</section>
			</PageTabs>
		</div>

		<DeviceDialog
			v-if="activeTab"
			v-model="showDialog"
			:editing-device="editingDevice"
			:device-type-code="activeTab"
			:can-write="canWriteDevice"
			:is-submitting="isSubmitting"
			:error-message="errorMessage"
			@submit="handleSubmit"
			@close="closeDialog"
		/>

		<DeviceModelDialog
			v-if="activeTab && canManageDeviceModels"
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
import { TOAST } from "~/config/toastCatalog"
import type {
	Device,
	CreateDeviceData,
	UpdateDeviceData,
	DeviceTypeCode,
	DeviceConfig,
	CameraDeviceConfig,
} from "~/types/device"
import type {
	DeviceCreatedEvent,
	DeviceUpdatedEvent,
	DeviceDeletedEvent,
	MonitoringDeviceStatusEvent,
	MonitoringDeviceStatusBatchEvent,
} from "~/types/websocket"
import DeviceModelDialog from "~/components/device/DeviceModelDialog.vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import Pagination from "~/components/common/Pagination.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import PageTabs from "~/components/common/PageTabs.vue"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import { formatDate } from "~/utils/dateUtils"
import { useDataLoader } from "~/composables/monitoring/useDataLoader"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useDeviceConnectivity } from "~/composables/systems/devices/useDeviceConnectivity"
import { useDeviceWebSocket } from "~/composables/websocket/subscribers/useDeviceWebSocket"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { applyFormApiErrorToRef } from "~/utils/apiError"
import { getCameraModelCategoryLabel } from "~/utils/cameraModelCategories"
import { useEquipmentRbac } from "~/composables/core/useAccessGate"
import { useCanManageDeviceModels } from "~/composables/core/useAuth"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"

definePageMeta({
	layout: "default",
})

const { canCreateDevice, canUpdateDevice, canDeleteDevice } = useEquipmentRbac()
const canManageDeviceModels = useCanManageDeviceModels()
const canWriteDevice = computed(() =>
	editingDevice.value ? canUpdateDevice.value : canCreateDevice.value
)
const deviceApi = useDeviceApi()
const toast = useToast()
const { handleError: handleApiError } = useErrorHandler()
const { setupDeviceListeners, removeDeviceListeners } = useDeviceWebSocket()

const deviceTabs = [
	{ name: "攝影機", code: "camera" },
	{ name: "感測器", code: "sensor" },
	{ name: "控制器", code: "controller" },
	{ name: "門禁設備", code: "access_control" },
	{ name: "視訊對講", code: "video_intercom" },
] as const

const deviceTabItems = computed(() => deviceTabs.map((tab) => ({ id: tab.code, label: tab.name })))

const activeTab = ref<DeviceTypeCode | null>(null)

const activeTabModel = computed({
	get: () => activeTab.value ?? deviceTabs[0]?.code ?? ("" as DeviceTypeCode),
	set: (code: DeviceTypeCode) => {
		if (!code) return
		switchTab(code)
	},
})
const currentTabName = computed(() => {
	const tab = deviceTabs.find((tab) => tab.code === activeTab.value)
	return tab?.name || ""
})

const showCreateDialog = ref(false)
const showDeviceModelDialog = ref(false)

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

const limit = 10
const dateSortOrder = ref<"asc" | "desc">("desc")
const cameraGroupFilter = ref<string>("")
const cameraGroups = ref<string[]>([])

const deviceConnectivity = useDeviceConnectivity({ debounceMs: 150 })

const getModelCategoryLabel = (device: Device): string =>
	getCameraModelCategoryLabel(device.model_category_code)

const {
	data: devices,
	total,
	offset,
	isLoading,
	errorMessage: listLoadError,
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
	onError: (err) => handleApiError(err, "載入設備列表失敗") || "載入設備列表失敗",
})

const deviceIdsInPage = computed(() =>
	(devices.value || []).map((d) => d.id).filter((n) => Number.isFinite(n))
)
deviceConnectivity.bindDeviceIds(deviceIdsInPage)

const connectivityLabels = computed(() => deviceConnectivity.labels.value)

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
			return c.host || (c.rtsp_url ? "RTSP" : "-")
		}
		case "sensor":
			if (config.protocol === "modbus") {
				return `${config.host}`
			}
			return config.connection_string || config.api_endpoint || "-"
		case "access_control":
			return `${config.host}`
		case "video_intercom":
			return `${config.host}`
		default:
			return "-"
	}
}

const getLoadParams = () => ({
	typeCode: activeTab.value!,
	order: dateSortOrder.value,
	...(activeTab.value === "camera" && cameraGroupFilter.value
		? { group: cameraGroupFilter.value }
		: {}),
})

const switchTab = (tabCode: DeviceTypeCode) => {
	if (activeTab.value === tabCode) return

	devices.value.length = 0
	total.value = 0
	deviceConnectivity.reset()

	activeTab.value = tabCode
	resetPage()

	load(getLoadParams(), true)
}

const initDefaultTab = () => {
	if (activeTab.value) return
	const first = deviceTabs[0]
	if (!first) return
	activeTab.value = first.code
}

const openCreateDevice = () => {
	editingDevice.value = null
	showCreateDialog.value = true
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
			const device = result.device
			if (index > -1 && device?.id && device.model_name?.trim()) {
				devices.value[index] = device
			} else if (index > -1 && device) {
				load(getLoadParams(), true)
			}
		} else {
			if (activeTab.value) {
				resetPage()
				load(getLoadParams(), true)
			} else {
				devices.value.push(result.device)
				total.value += 1
			}
		}

		closeDialog()
		toast.success(result.message || TOAST.DEVICE_OPERATION_SUCCESS)
	} catch (error) {
		applyFormApiErrorToRef(errorMessage, error, "操作失敗")
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

		devices.value = devices.value.filter((d) => d.id !== device.id)
		total.value = Math.max(0, total.value - 1)

		toast.success(result.message || TOAST.DEVICE_OPERATION_SUCCESS)
	} catch (error) {
		handleApiError(error, "刪除設備失敗")
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

const handleDeviceModelRefresh = () => {
	if (activeTab.value) {
		load(getLoadParams(), true)
	}
	deviceApi.invalidateModelsCache()
}

watch(activeTab, (newTab) => {
	if (newTab === "camera") {
		void loadCameraGroups()
	}
})

const updateDeviceConnectivityStatus = (deviceId: number, status: "online" | "offline") => {
	deviceConnectivity.applyWsStatus(deviceId, status)
}

const handleDeviceCreated = (event: DeviceCreatedEvent) => {
	const { device } = event
	if (device.type_code === activeTab.value) {
		if (offset.value === 0) {
			devices.value = [device, ...devices.value]
			total.value += 1
		} else {
			if (activeTab.value) {
				void load(getLoadParams(), true)
			}
		}
	}
}

const handleDeviceUpdated = (event: DeviceUpdatedEvent) => {
	const { device } = event
	if (device.type_code === activeTab.value) {
		const index = devices.value.findIndex((d) => d.id === device.id)
		if (index !== -1) {
			devices.value[index] = device
		} else {
			if (activeTab.value) {
				void load(getLoadParams(), true)
			}
		}
	}
}

const handleDeviceDeleted = (event: DeviceDeletedEvent) => {
	const index = devices.value.findIndex((d) => d.id === event.deviceId)
	if (index !== -1) {
		devices.value.splice(index, 1)
		total.value = Math.max(0, total.value - 1)
	}
	deviceConnectivity.removeDevice(event.deviceId)
}

const handleMonitoringStatus = (event: MonitoringDeviceStatusEvent) => {
	if (event.system !== "device") return
	const deviceId = event.deviceId || event.sourceId
	updateDeviceConnectivityStatus(deviceId, event.status)
}

const handleMonitoringStatusBatch = (event: MonitoringDeviceStatusBatchEvent) => {
	if (event.system !== "device") return
	event.updates.forEach(({ sourceId, deviceId }) => {
		const id = deviceId || sourceId
		updateDeviceConnectivityStatus(id, event.status)
	})
}

onMounted(async () => {
	initDefaultTab()
	if (activeTab.value) {
		load(getLoadParams(), true)
	}

	setupDeviceListeners({
		onDeviceCreated: handleDeviceCreated,
		onDeviceUpdated: handleDeviceUpdated,
		onDeviceDeleted: handleDeviceDeleted,
		onMonitoringStatus: handleMonitoringStatus,
		onMonitoringStatusBatch: handleMonitoringStatusBatch,
	})
})

onUnmounted(() => {
	removeDeviceListeners()
})
</script>
