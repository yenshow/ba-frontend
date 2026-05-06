<template>
	<div class="space-y-6 2xl:space-y-8">
		<div class="flex items-center justify-between">
			<header class="flex flex-col gap-1 2xl:gap-2 me-4">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">警示紀錄</h1>
				<p class="text-base text-white/80 2xl:text-xl">查看與管理系統警示訊息</p>
			</header>

			<!-- 僅 admin 可切換「警示紀錄／規則管理」 -->
			<div
				v-if="isAdmin"
				class="rounded-xl border border-white/20 bg-white/5 p-1 space-x-2 me-auto"
			>
				<button
					type="button"
					@click="currentMode = 'alerts'"
					:class="[
						'rounded-lg px-3 py-1.5 text-base transition-colors 2xl:text-lg',
						currentMode === 'alerts' ? 'bg-cyan-500 text-white' : 'text-white/80 hover:bg-white/10',
					]"
				>
					警示紀錄
				</button>
				<button
					type="button"
					@click="handleSwitchToRules"
					:class="[
						'rounded-lg px-3 py-1.5 text-base transition-colors 2xl:text-lg',
						currentMode === 'rules' ? 'bg-cyan-500 text-white' : 'text-white/80 hover:bg-white/10',
					]"
				>
					警報設定
				</button>
			</div>

			<div class="flex items-center gap-3 2xl:gap-4">
				<template v-if="currentMode === 'alerts'">
					<FilterDropdown v-model="filterStatus" :options="statusOptions" placeholder="全部狀態" />
					<FilterDropdown v-model="filterSource" :options="sourceOptions" placeholder="全部系統" />
					<TimeRangePicker v-model="timeRange" :presets="timeRangePresets" />

					<button
						type="button"
						@click="handleExport"
						:disabled="isLoading || alerts.length === 0"
						class="rounded-xl border border-white/20 bg-green-500/80 px-4 py-2 text-sm text-white transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
					>
						匯出 CSV
					</button>
				</template>
				<template v-else-if="currentMode === 'rules'">
					<FilterDropdown
						v-model="ruleFilterSource"
						:options="sourceOptions"
						placeholder="全部系統"
					/>
					<FilterDropdown
						v-model="ruleFilterType"
						:options="ruleTypeOptions"
						placeholder="全部類型"
					/>

					<button
						type="button"
						@click="handleOpenCreateRule"
						class="rounded-xl border border-white/20 bg-green-500/80 px-4 py-2 text-sm text-white transition-colors hover:bg-green-400 2xl:px-6 2xl:py-3 2xl:text-base"
					>
						新增警報
					</button>
				</template>
			</div>
		</div>

		<AlertListSection
			v-if="currentMode === 'alerts'"
			:alerts="alerts"
			:total-alerts="totalAlerts"
			:unresolved-count="unresolvedCount"
			:offset="offset"
			:limit="limit"
			:is-loading="isLoading"
			:is-ignoring="isIgnoring"
			:is-admin="isAdmin"
			@ignore="handleIgnore"
			@unignore="handleUnignore"
			@previous="goToPreviousPage"
			@next="goToNextPage"
		/>

		<AlertRuleManagement
			v-else-if="currentMode === 'rules' && isAdmin"
			ref="ruleManagementRef"
			v-model:selected-rule-source="ruleFilterSource"
			v-model:selected-rule-type="ruleFilterType"
		/>

		<ConfirmDialog
			v-model="showConfirmDialog"
			:title="confirmDialogConfig.title"
			:message="confirmDialogConfig.message"
			:details="confirmDialogConfig.details"
			:type="confirmDialogConfig.type"
			:confirm-text="confirmDialogConfig.confirmText"
			:cancel-text="confirmDialogConfig.cancelText"
			@confirm="handleConfirmIgnoreAction"
			@cancel="handleCancelIgnoreAction"
		/>
	</div>
</template>

<script setup lang="ts">
import { useToast } from "~/composables/core/useToast"
import type { Alert, AlertStatus, AlertSource, AlertType } from "~/types/alert"
import { useAuth } from "~/composables/core/useAuth"
import { useAlertMonitor } from "~/composables/monitoring/useAlertMonitor"
import { useAlertEventBus } from "~/composables/monitoring/alertMonitor/useAlertEventBus"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi"
import type { AlertNewEvent, AlertUpdatedEvent } from "~/types/websocket"
import { getSourceLabel, getTypeLabel, getSeverityLabel } from "~/utils/alertUtils"
import { getTodayDateRangeUTC, formatDateTime } from "~/utils/dateUtils"
import { exportCsv } from "~/utils/csvExport"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import TimeRangePicker from "~/components/common/TimeRangePicker.vue"
import AlertListSection from "~/components/alerts/AlertListSection.vue"
import AlertRuleManagement from "~/components/alerts/AlertRuleManagement.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import { useDataLoader } from "~/composables/monitoring/useDataLoader"
import { logger } from "~/utils/logger"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"

const alertLogLogger = logger.createLogger("alert-log")

definePageMeta({
	layout: "default",
})

const alertApi = useAlertApi()
const toast = useToast()
const { isAdmin } = useAuth()
const { removeAlertToast } = useAlertMonitor()
const {
	onAlertNew: busOnAlertNew,
	onAlertUpdated: busOnAlertUpdated,
	onAlertDailyRollover: busOnAlertDailyRollover,
	offAlertNew: busOffAlertNew,
	offAlertUpdated: busOffAlertUpdated,
	offAlertDailyRollover: busOffAlertDailyRollover,
} = useAlertEventBus()
const { handleError: handleApiError } = useErrorHandler()

const confirmDialog = useConfirmDialog()
const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value
	},
})
const confirmDialogConfig = computed(() => confirmDialog.config.value)

// 攝影機連動彈窗改為全域（layout）；本頁不再管理 popup

// 狀態
const isIgnoring = ref(false)
const unresolvedCount = ref(0)
const currentMode = ref<"alerts" | "rules">("alerts")

const ruleManagementRef = ref<{ openCreateRuleDialog: () => void } | null>(null)
const ruleFilterSource = ref<"" | AlertSource>("")
const ruleFilterType = ref<"" | AlertType>("")

const ruleTypeOptions: { value: "" | AlertType; label: string }[] = [
	{ value: "", label: "全部類型" },
	{ value: "offline", label: "設備狀態警報" },
	{ value: "threshold", label: "環境參數警報" },
	{ value: "di", label: "DI 警報" },
	{ value: "do", label: "DO 警報" },
]

const handleOpenCreateRule = () => {
	ruleManagementRef.value?.openCreateRuleDialog()
}

// 篩選條件
const filterStatus = ref<string>("all")
const filterSource = ref<string>("")
const filterStartDate = ref<string>("")
const filterEndDate = ref<string>("")

// 狀態選項
const statusOptions = [
	{ value: "all", label: "全部狀態" },
	{ value: "active", label: "未解決" },
	{ value: "resolved", label: "已解決" },
	{ value: "ignored", label: "已忽視" },
]

// 系統來源選項
const sourceOptions = [
	{ value: "", label: "全部系統" },
	{ value: "device", label: "設備系統" },
	{ value: "environment", label: "環境系統" },
	{ value: "drainage", label: "衛生排水系統" },
	{ value: "air_circulation", label: "空氣循環系統" },
	{ value: "power", label: "電力系統" },
	{ value: "fire", label: "消防系統" },
	{ value: "smoke_alarm", label: "煙霧警報系統" },
	{ value: "emergency_rescue", label: "緊急求救系統" },
]

// 時間範圍
const timeRange = ref({
	startDate: "",
	endDate: "",
	preset: "today",
})

// 時間範圍預設選項
const timeRangePresets = [
	{ value: "today", label: "今天" },
	{ value: "yesterday", label: "昨天" },
	{ value: "this_week", label: "本週" },
	{ value: "last_week", label: "上周" },
	{ value: "last_7_days", label: "近七天" },
	{ value: "last_30_days", label: "最近三十天" },
	{ value: "custom", label: "自訂" },
]

// 監聽時間範圍變化（避免 deep watch 造成不必要觸發）
watch(
	() => [timeRange.value.startDate, timeRange.value.endDate] as const,
	([startDate, endDate]) => {
		filterStartDate.value = startDate
		filterEndDate.value = endDate
	}
)

// 使用 useDataLoader 統一管理數據載入
const {
	data: alerts,
	total: totalAlerts,
	offset,
	isLoading,
	load,
	nextPage,
	prevPage,
	resetPage,
} = useDataLoader<Alert, Record<string, never>>({
	fetcher: async (params) => {
		const result = await alertApi.getAlerts({
			status: getFilterStatus(),
			source: filterSource.value as AlertSource | undefined,
			start_date: filterStartDate.value || undefined,
			end_date: filterEndDate.value || undefined,
			...({ time_field: "updated_at" } as Record<string, unknown>),
			limit: params.limit as number,
			offset: params.offset as number,
			orderBy: "updated_at",
			order: "desc",
		})
		return { items: result.alerts, total: result.total }
	},
	debounce: 150,
	pageSize: 5,
	onError: (err) => {
		handleApiError(err, "載入警示列表失敗")
	},
})

const limit = 5

const pendingIgnoreAction = ref<{
	alert: Alert
	action: "ignore" | "unignore"
	successMessage: string
	errorMessage: string
} | null>(null)

// 載入未解決警示數量（根據時間範圍篩選）
const loadUnresolvedCount = async () => {
	try {
		const result = await alertApi.getUnresolvedAlertCount({
			source: (filterSource.value as AlertSource) || undefined,
			start_date: filterStartDate.value || undefined,
			end_date: filterEndDate.value || undefined,
			...({ time_field: "updated_at" } as Record<string, unknown>),
		})
		unresolvedCount.value = result.count
	} catch (error) {
		alertLogLogger.warn("載入未解決警示數量失敗", error)
	}
}

const handleSwitchToRules = () => {
	currentMode.value = "rules"
}

// 處理警報操作後的重新載入
const reloadAfterAction = async () => {
	load({}, true) // 立即執行
	loadUnresolvedCount()
}

// 處理忽視/取消忽視操作的通用函數
const handleIgnoreAction = async (
	alert: Alert,
	action: "ignore" | "unignore",
	confirmMessage: string,
	successMessage: string,
	errorMessage: string
) => {
	pendingIgnoreAction.value = { alert, action, successMessage, errorMessage }
	confirmDialog.show({
		title: "確認",
		message: confirmMessage,
		type: action === "ignore" ? "warning" : "info",
		confirmText: "確定",
		cancelText: "取消",
	})
}

const handleConfirmIgnoreAction = async () => {
	const pending = pendingIgnoreAction.value
	if (!pending) return

	isIgnoring.value = true
	try {
		const { alert, action, successMessage, errorMessage } = pending
		if (action === "ignore") {
			await alertApi.ignoreAlert(
				alert.source_id,
				alert.alert_type,
				alert.source,
				alert.dimension_key || undefined
			)
			removeAlertToast(alert.id, alert.dimension_key)
		} else {
			await alertApi.unignoreAlert(
				alert.source_id,
				alert.alert_type,
				alert.source,
				alert.dimension_key || undefined
			)
		}
		toast.success(successMessage, 3000)
		await reloadAfterAction()
	} catch (error) {
		handleApiError(error, pending.errorMessage)
	} finally {
		isIgnoring.value = false
		pendingIgnoreAction.value = null
	}
}

const handleCancelIgnoreAction = () => {
	pendingIgnoreAction.value = null
}

// 忽視警示
const handleIgnore = (alert: Alert) =>
	handleIgnoreAction(
		alert,
		"ignore",
		"確定要忽視此警示嗎？\n忽視僅對「當日」有效；隔日若仍異常將再次通知。",
		"警示已忽視",
		"忽視警示失敗"
	)

// 取消忽視警示
const handleUnignore = (alert: Alert) =>
	handleIgnoreAction(
		alert,
		"unignore",
		"確定要取消忽視此警示嗎？\n取消後將恢復顯示此來源相同的警示。",
		"已取消忽視警示",
		"取消忽視警示失敗"
	)

// 獲取當前篩選條件對應的狀態
const getFilterStatus = (): AlertStatus | undefined =>
	filterStatus.value !== "all" ? (filterStatus.value as AlertStatus) : undefined

const getAlertKey = (alert: Pick<Alert, "id" | "dimension_key">): string =>
	`${alert.id}:${alert.dimension_key || "default"}`

// 檢查警報是否符合當前篩選條件
const startMs = computed(() =>
	filterStartDate.value ? new Date(filterStartDate.value).getTime() : null
)
const endMs = computed(() => (filterEndDate.value ? new Date(filterEndDate.value).getTime() : null))

const matchesFilters = (alert: Alert): boolean => {
	const currentStatus = getFilterStatus()
	if (currentStatus && alert.status !== currentStatus) return false
	if (filterSource.value && alert.source !== filterSource.value) return false

	if (startMs.value != null || endMs.value != null) {
		const alertTime = new Date(alert.updated_at).getTime()

		if (startMs.value != null && alertTime < startMs.value) return false
		if (endMs.value != null && alertTime > endMs.value) return false
	}

	return true
}

// 處理新警報事件（WebSocket）
const handleAlertNew = (alert: AlertNewEvent) => {
	// 檢查是否已存在
	if (alerts.value.find((a) => getAlertKey(a) === getAlertKey(alert))) return

	// 檢查是否符合篩選條件
	if (!matchesFilters(alert)) {
		if (alert.status === "active") {
			alertLogLogger.warn(
				`新警報 ${alert.id} 不在當前時間範圍內，創建時間: ${alert.created_at}, 更新時間: ${alert.updated_at}`
			)
		}
		return
	}

	// 正常添加到列表
	if (offset.value === 0) {
		alerts.value.unshift(alert)
	}
	totalAlerts.value += 1

	if (alert.status === "active") {
		unresolvedCount.value++
	}

	// 攝影機連動彈窗為全域（layout）處理
}

// 處理警報更新事件（WebSocket）
const handleAlertUpdated = (data: AlertUpdatedEvent) => {
	const { alert, oldStatus, newStatus } = data
	const index = alerts.value.findIndex((a) => getAlertKey(a) === getAlertKey(alert))
	const matches = matchesFilters(alert)

	if (index !== -1) {
		alerts.value[index] = { ...alerts.value[index], ...alert }
		if (!matches) {
			alerts.value.splice(index, 1)
			totalAlerts.value = Math.max(0, totalAlerts.value - 1)
		}
	} else if (matches && offset.value === 0) {
		alerts.value.unshift(alert)
		totalAlerts.value += 1
	}

	if (oldStatus === "active" && (newStatus === "resolved" || newStatus === "ignored")) {
		unresolvedCount.value = Math.max(0, unresolvedCount.value - 1)
	} else if ((oldStatus === "resolved" || oldStatus === "ignored") && newStatus === "active") {
		unresolvedCount.value++
	}
}

const handleAlertDailyRollover = () => {
	if (currentMode.value !== "alerts") return
	load({}, true)
	void loadUnresolvedCount()
}

// 攝影機連動彈窗已改為全域（layout）；此處不再處理攝影機連動/串流啟動

const ALERT_CSV_HEADERS = [
	"系統來源",
	"區域-地點",
	"設備類型",
	"設備配置",
	"類型與程度",
	"狀態",
	"訊息",
	"創建時間",
	"更新時間",
	"忽視時間",
	"忽視者",
] as const

const STATUS_LABELS: Record<string, string> = {
	active: "未解決",
	resolved: "已解決",
	ignored: "已忽視",
}

const formatZoneLocation = (z?: string | null, l?: string | null) =>
	[z, l].filter(Boolean).join("-") || ""

const getDeviceConfigDisplay = (c: Record<string, unknown> | string | null | undefined) => {
	if (!c) return ""
	try {
		const o = typeof c === "string" ? (JSON.parse(c || "{}") as Record<string, unknown>) : c
		return String(o.host ?? "").trim() || ""
	} catch {
		return ""
	}
}

// 匯出警示為 CSV（欄位順序與後端備份一致）
const handleExport = async () => {
	try {
		const result = await alertApi.getAlerts({
			status: getFilterStatus(),
			source: filterSource.value as AlertSource | undefined,
			start_date: filterStartDate.value || undefined,
			end_date: filterEndDate.value || undefined,
			...({ time_field: "updated_at" } as Record<string, unknown>),
			limit: 10000,
			offset: 0,
			orderBy: "updated_at",
			order: "desc",
		})

		if (result.alerts.length === 0) {
			toast.info("無資料可匯出")
			return
		}

		const fmt = (s?: string | null) => (s ? formatDateTime(s, true) : "")
		const typeSeverity = (a: Alert) =>
			`${getTypeLabel(a.alert_type)}（${getSeverityLabel(a.severity)}）`

		const rows = result.alerts.map((alert) => ({
			系統來源: getSourceLabel(alert.source),
			"區域-地點": formatZoneLocation(alert.zone_name, alert.source_name),
			設備類型: alert.device_type_name ?? "",
			設備配置: getDeviceConfigDisplay(
				alert.device_config as Record<string, unknown> | null | undefined
			),
			類型與程度: typeSeverity(alert),
			狀態: STATUS_LABELS[alert.status] ?? alert.status,
			訊息: alert.message ?? "",
			創建時間: fmt(alert.created_at),
			更新時間: fmt(alert.updated_at),
			忽視時間: fmt(alert.ignored_at),
			忽視者: alert.ignored_by_username ?? "",
		}))

		const datePart = (s: string) => s.split("T")[0]
		const filename =
			filterStartDate.value && filterEndDate.value
				? `警示紀錄_${datePart(filterStartDate.value)}_${datePart(filterEndDate.value)}.csv`
				: `警示紀錄_${new Date().toISOString().split("T")[0]}.csv`

		exportCsv([...ALERT_CSV_HEADERS], rows, filename, { backupStyle: true })
		toast.success(`已匯出 ${result.alerts.length} 筆警示紀錄`, 3000)
	} catch (error) {
		handleApiError(error, "匯出警示失敗")
	}
}

// 分頁
const goToPreviousPage = () => {
	prevPage({})
}

const goToNextPage = () => {
	nextPage({})
}

// 監聽篩選條件變化
watch([filterStatus, filterSource, filterStartDate, filterEndDate], () => {
	resetPage()
	load({})
	loadUnresolvedCount()
})

watch(isAdmin, (admin) => {
	if (!admin && currentMode.value !== "alerts") {
		currentMode.value = "alerts"
	}
})

// 初始化時間範圍為「今天」（使用統一的時間工具）
const initializeTimeRange = () => {
	const { start, end } = getTodayDateRangeUTC()
	timeRange.value = {
		startDate: start.toISOString(),
		endDate: end.toISOString(),
		preset: "today",
	}
	filterStartDate.value = start.toISOString()
	filterEndDate.value = end.toISOString()
}

// 滾動並高亮顯示指定警報
const scrollToAlert = async (alertId: number) => {
	await nextTick()
	const alertElement = document.getElementById(`alert-${alertId}`)
	if (alertElement) {
		alertElement.scrollIntoView({ behavior: "smooth", block: "center" })
		alertElement.classList.add("ring-2", "ring-blue-500", "ring-offset-2")
		setTimeout(() => {
			alertElement.classList.remove("ring-2", "ring-blue-500", "ring-offset-2")
		}, 3000)
	}
}

// 處理 alertId 查詢參數（用於從 Toast 跳轉）
const handleAlertIdQuery = async () => {
	const route = useRoute()
	const alertIdParam = route.query.alertId

	if (!alertIdParam) return

	const alertId = Number(alertIdParam)
	if (isNaN(alertId)) return

	await nextTick()

	// 檢查警報是否在當前列表中
	const alert = alerts.value.find((a) => a.id === alertId)

	if (alert) {
		await scrollToAlert(alertId)
		return
	}

	// 如果警報不在列表中，嘗試載入該警報並調整篩選條件
	try {
		const result = await alertApi.getAlertById(alertId)
		const targetAlert = result.alert
		const alertDate = new Date(targetAlert.updated_at)
		const { start, end } = getTodayDateRangeUTC()

		// 如果警報不在今天，調整時間範圍
		if (alertDate < start || alertDate >= end) {
			timeRange.value = {
				startDate: new Date(alertDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
				endDate: new Date(alertDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
				preset: "custom",
			}
			filterStartDate.value = timeRange.value.startDate
			filterEndDate.value = timeRange.value.endDate
			load({}, true) // 立即執行
		}

		await scrollToAlert(alertId)
	} catch (error) {
		alertLogLogger.warn(`無法載入警報 ${alertId}`, error)
	}
}

// 初始化
onMounted(async () => {
	// 初始化時間範圍
	initializeTimeRange()

	load({}, true) // 立即執行
	void loadUnresolvedCount()

	// 透過 EventBus 訂閱（唯一 WS 層由 useAlertEventBus 管理）
	busOnAlertNew(handleAlertNew)
	busOnAlertUpdated(handleAlertUpdated)
	busOnAlertDailyRollover(handleAlertDailyRollover)

	// 處理 alertId 查詢參數
	await handleAlertIdQuery()
})

// 組件卸載時清理
onUnmounted(() => {
	busOffAlertNew(handleAlertNew)
	busOffAlertUpdated(handleAlertUpdated)
	busOffAlertDailyRollover(handleAlertDailyRollover)
})
</script>
