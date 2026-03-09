<template>
	<div class="space-y-6 2xl:space-y-8">
		<div class="flex items-center justify-between">
			<header class="flex flex-col gap-1 2xl:gap-2">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">警示紀錄</h1>
				<p class="text-base text-white/80 2xl:text-xl">查看與管理系統警示訊息</p>
			</header>

			<!-- 篩選器 -->
			<div class="flex items-center gap-3 2xl:gap-4">
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
			</div>
		</div>

		<!-- 警示列表 -->
		<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
			<!-- 統計資訊 -->
			<div class="mb-6 flex items-center gap-4 2xl:gap-6">
				<div class="text-white">
					<span class="text-sm text-white/70 2xl:text-base">總計：</span>
					<span class="text-lg font-semibold 2xl:text-xl">{{ totalAlerts }}</span>
				</div>
				<div class="text-white">
					<span class="text-sm text-white/70 2xl:text-base">未解決：</span>
					<span class="text-lg font-semibold text-yellow-400 2xl:text-xl">{{ unresolvedCount }}</span>
				</div>
			</div>

			<!-- 內容區域：使用過渡動畫切換內容 -->
			<div class="min-h-[500px]">
				<Transition name="fade" mode="out-in">
					<div :key="`content-${offset}-${filterStatus}-${filterSource}-${alerts.length}`">
						<div
							v-if="alerts.length === 0"
							class="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-12 text-center"
						>
							<div>
								<svg
									class="mx-auto mb-4 h-16 w-16 text-white/60"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
								<p class="text-2xl font-medium text-white/90 2xl:text-3xl">目前沒有警示紀錄</p>
								<p class="mt-2 text-sm text-white/70 2xl:text-base">請調整篩選條件或稍後再查看</p>
							</div>
						</div>

						<div v-else class="space-y-4">
							<div
								v-for="alert in alerts"
								:key="alert.id"
								:id="`alert-${alert.id}`"
								:class="['rounded-xl border-2 p-4 transition-all 2xl:p-6', getAlertCardClass(alert)]"
							>
								<div class="flex items-start justify-between gap-4">
									<div class="flex-1">
										<div class="mb-2 flex flex-wrap items-center gap-2">
											<span :class="[badgeBaseClass, 'bg-blue-500/80']">
												{{ getSourceLabel(alert.source) }}
											</span>
											<span :class="[badgeBaseClass, getSeverityBadgeClass(alert.severity)]">
												{{ getSeverityLabel(alert.severity) }}
											</span>
											<span :class="[badgeBaseClass, getTypeBadgeClass(alert.alert_type)]">
												{{ getTypeLabel(alert.alert_type) }}
											</span>
											<span v-if="isAlertResolved(alert)" :class="[badgeBaseClass, 'bg-green-500/80']">
												已解決
											</span>
											<span v-if="isAlertIgnored(alert)" :class="[badgeBaseClass, 'bg-gray-500/80']">
												已忽視
											</span>
										</div>

										<p class="mb-4 text-base text-white 2xl:text-lg">{{ alert.message }}</p>

										<!-- 設備資訊卡片 -->
										<div class="mb-3 rounded-lg border border-white/10 bg-white/5 p-3 2xl:p-4">
											<div class="grid grid-cols-4 gap-3 2xl:gap-4">
												<!-- 設備名稱 -->
												<div class="flex items-start gap-2">
													<svg
														class="mt-0.5 h-6 w-6 flex-shrink-0 text-blue-400"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
														/>
													</svg>
													<div class="min-w-0 flex-1">
														<div class="text-sm text-white/60">
															{{ getSourceLabel(alert.source) }}
														</div>
														<div class="mt-0.5 truncate text-base font-semibold text-white">
															<span v-if="getZoneName(alert)">{{ getZoneName(alert) }} - </span
															>{{ getSourceDisplayName(alert) }}
														</div>
													</div>
												</div>

												<!-- 設備類型 -->
												<div v-if="alert.device_type_name" class="flex items-start gap-2">
													<svg
														class="mt-0.5 h-6 w-6 flex-shrink-0 text-purple-400"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
														/>
													</svg>
													<div class="min-w-0 flex-1">
														<div class="text-sm text-white/60">類型</div>
														<div class="mt-0.5 text-base font-medium text-white">
															{{ alert.device_type_name }}
														</div>
													</div>
												</div>

												<!-- 創建時間 -->
												<div class="flex items-start gap-2">
													<svg
														class="mt-0.5 h-6 w-6 flex-shrink-0 text-green-400"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
														/>
													</svg>
													<div class="min-w-0 flex-1">
														<div class="text-sm text-white/60">創建時間</div>
														<div class="mt-0.5 text-base text-white">
															{{ formatDateTime(alert.created_at) }}
														</div>
													</div>
												</div>

												<!-- 更新時間 -->
												<div class="flex items-start gap-2">
													<svg
														class="mt-0.5 h-6 w-6 flex-shrink-0 text-yellow-400"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
														/>
													</svg>
													<div class="min-w-0 flex-1">
														<div class="text-sm text-white/60">更新時間</div>
														<div class="mt-0.5 text-base text-white">
															{{ formatDateTime(alert.updated_at) }}
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>

									<!-- 操作按鈕 -->
									<div class="flex h-[160px] flex-col justify-center gap-2">
										<button
											v-if="alert.status === 'active' && isOperator"
											type="button"
											@click="handleIgnore(alert)"
											:disabled="isIgnoring"
											class="rounded-lg bg-gray-500/80 px-3 py-1.5 text-base text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 2xl:px-4 2xl:py-2 2xl:text-lg"
											title="忽視此警報"
										>
											忽視
										</button>
										<button
											v-if="isAlertIgnored(alert) && isOperator"
											type="button"
											@click="handleUnignore(alert)"
											:disabled="isIgnoring"
											class="rounded-lg bg-blue-500/80 px-3 py-1.5 text-base text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 2xl:px-4 2xl:py-2 2xl:text-lg"
											title="取消忽視此警報"
										>
											取消忽視
										</button>

										<!-- 解決資訊：僅系統自動解決，解決時間為 status=resolved 時的 updated_at -->
										<div
											v-if="isAlertResolved(alert) && !isAlertIgnored(alert)"
											class="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 2xl:p-2.5"
										>
											<div class="flex items-center gap-2">
												<svg
													class="h-6 w-6 flex-shrink-0 text-emerald-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
													/>
												</svg>
												<div class="min-w-0 flex-1 space-y-0.5">
													<div class="text-base font-medium text-emerald-300">已解決</div>
													<div class="text-base text-white/70">
														{{ formatDateTime(alert.updated_at) }}
													</div>
													<div class="text-base text-emerald-400">系統自動解決</div>
												</div>
											</div>
										</div>

										<!-- 忽視資訊：顯示在按鈕下方 -->
										<div
											v-if="isAlertIgnored(alert)"
											class="mt-2 rounded-lg border border-gray-500/30 bg-gray-500/10 p-2 2xl:p-2.5"
										>
											<div class="flex items-center gap-2">
												<svg
													class="h-6 w-6 flex-shrink-0 text-gray-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
													/>
												</svg>
												<div class="min-w-0 flex-1 space-y-0.5">
													<div class="text-base font-medium text-gray-300">已忽視</div>
													<div v-if="alert.ignored_at" class="text-base text-white/70">
														{{ formatDateTime(alert.ignored_at) }}
													</div>
													<div v-if="alert.ignored_by_username" class="text-base text-white/60">
														忽視者：{{ alert.ignored_by_username }}
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						<!-- 分頁 -->
						<Pagination
							v-if="totalAlerts > limit"
							:total="totalAlerts"
							:offset="offset"
							:limit="limit"
							:disabled="isLoading"
							@previous="goToPreviousPage"
							@next="goToNextPage"
						/>
					</div>
				</Transition>
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import { useToast } from "~/composables/core/useToast";
import type { Alert, AlertStatus, AlertSource } from "~/types/alert";
import { useAuth } from "~/composables/core/useAuth";
import { useAlertMonitor } from "~/composables/monitoring/useAlertMonitor";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { useAlertApi } from "~/composables/systems/useAlertApi";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import type { AlertNewEvent, AlertUpdatedEvent } from "~/composables/websocket/useWebSocket";
import {
	getSourceLabel,
	getTypeLabel,
	getSeverityLabel,
	getSeverityBadgeClass,
	getTypeBadgeClass
} from "~/utils/alertUtils";
import { getTodayDateRangeUTC, formatDateTime } from "~/utils/dateUtils";
import { exportCsv } from "~/utils/csvExport";
import { isAlertResolved, isAlertIgnored } from "~/utils/alertUtils";
import FilterDropdown from "~/components/common/FilterDropdown.vue";
import TimeRangePicker from "~/components/common/TimeRangePicker.vue";
import Pagination from "~/components/common/Pagination.vue";
import { useDataLoader } from "~/composables/monitoring/useDataLoader";

/**
 * 開發模式日誌輔助函數（統一處理）
 */
const devLog = {
	warn: (msg: string, ...args: unknown[]) => {
		if (process.dev) {
			console.warn(msg, ...args);
		}
	}
};

definePageMeta({
	layout: "auxiliary"
});

const alertApi = useAlertApi();
const toast = useToast();
const { isAdmin, isOperator } = useAuth();
const { removeAlertToast } = useAlertMonitor();
const { handleError: handleApiError } = useErrorHandler();
const { on, off } = useWebSocket();

// 狀態
const isIgnoring = ref(false);
const unresolvedCount = ref(0);

// 篩選條件
const filterStatus = ref<string>("all");
const filterSource = ref<string>("");
const filterStartDate = ref<string>("");
const filterEndDate = ref<string>("");

// 狀態選項
const statusOptions = [
	{ value: "all", label: "全部狀態" },
	{ value: "active", label: "未解決" },
	{ value: "resolved", label: "已解決" },
	{ value: "ignored", label: "已忽視" }
];

// 系統來源選項
const sourceOptions = [
	{ value: "", label: "全部系統" },
	{ value: "device", label: "設備系統" },
	{ value: "environment", label: "環境系統" },
	{ value: "lighting", label: "照明系統" }
];

// 時間範圍
const timeRange = ref({
	startDate: "",
	endDate: "",
	preset: "today"
});

// 時間範圍預設選項
const timeRangePresets = [
	{ value: "past_hour", label: "過去一小時" },
	{ value: "today", label: "今天" },
	{ value: "yesterday", label: "昨天" },
	{ value: "this_week", label: "本週" },
	{ value: "last_week", label: "上周" },
	{ value: "last_7_days", label: "近七天" },
	{ value: "last_30_days", label: "最近三十天" },
	{ value: "custom", label: "自訂" }
];

// 監聽時間範圍變化
watch(
	() => timeRange.value,
	newValue => {
		filterStartDate.value = newValue.startDate;
		filterEndDate.value = newValue.endDate;
	},
	{ deep: true }
);

// 使用 useDataLoader 統一管理數據載入
const {
	data: alerts,
	total: totalAlerts,
	offset,
	isLoading,
	load,
	nextPage,
	prevPage,
	resetPage
} = useDataLoader<Alert, Record<string, never>>({
	fetcher: async params => {
		const result = await alertApi.getAlerts({
			status: getFilterStatus(),
			source: filterSource.value as AlertSource | undefined,
			start_date: filterStartDate.value || undefined,
			end_date: filterEndDate.value || undefined,
			limit: params.limit as number,
			offset: params.offset as number,
			orderBy: "created_at",
			order: "desc"
		});
		return { items: result.alerts, total: result.total };
	},
	debounce: 150,
	pageSize: 5,
	onError: err => {
		handleApiError(err, "載入警示列表失敗");
	}
});

const limit = 5;

// 載入未解決警示數量（根據時間範圍篩選）
const loadUnresolvedCount = async () => {
	try {
		const result = await alertApi.getUnresolvedAlertCount({
			source: (filterSource.value as AlertSource) || undefined,
			start_date: filterStartDate.value || undefined,
			end_date: filterEndDate.value || undefined
		});
		unresolvedCount.value = result.count;
	} catch (error) {
		devLog.warn("[alert-log] 載入未解決警示數量失敗", error);
	}
};

// 處理警報操作後的重新載入
const reloadAfterAction = async () => {
	load({}, true); // 立即執行
	loadUnresolvedCount();
};

// 處理忽視/取消忽視操作的通用函數
const handleIgnoreAction = async (
	alert: Alert,
	action: "ignore" | "unignore",
	confirmMessage: string,
	successMessage: string,
	errorMessage: string
) => {
	if (!confirm(confirmMessage)) {
		return;
	}

	isIgnoring.value = true;
	try {
		if (action === "ignore") {
			await alertApi.ignoreAlert(alert.source_id, alert.alert_type, alert.source);
			removeAlertToast(alert.id);
		} else {
			await alertApi.unignoreAlert(alert.source_id, alert.alert_type, alert.source);
		}
		toast.success(successMessage, 3000);
		await reloadAfterAction();
	} catch (error) {
		handleApiError(error, errorMessage);
	} finally {
		isIgnoring.value = false;
	}
};

// 忽視警示
const handleIgnore = (alert: Alert) =>
	handleIgnoreAction(
		alert,
		"ignore",
		"確定要忽視此警示嗎？忽視後將不再顯示此來源的相同類型警示。",
		"警示已忽視",
		"忽視警示失敗"
	);

// 取消忽視警示
const handleUnignore = (alert: Alert) =>
	handleIgnoreAction(
		alert,
		"unignore",
		"確定要取消忽視此警示嗎？取消後將恢復顯示此來源的相同類型警示。",
		"已取消忽視警示",
		"取消忽視警示失敗"
	);

// 獲取當前篩選條件對應的狀態
const getFilterStatus = (): AlertStatus | undefined =>
	filterStatus.value !== "all" ? (filterStatus.value as AlertStatus) : undefined;

// 檢查警報是否符合當前篩選條件
const matchesFilters = (alert: Alert): boolean => {
	const currentStatus = getFilterStatus();
	if (currentStatus && alert.status !== currentStatus) return false;
	if (filterSource.value && alert.source !== filterSource.value) return false;

	if (filterStartDate.value || filterEndDate.value) {
		const alertTime = new Date(alert.created_at).getTime();

		if (filterStartDate.value) {
			const startTime = new Date(filterStartDate.value).getTime();
			if (alertTime < startTime) return false;
		}
		if (filterEndDate.value) {
			const endTime = new Date(filterEndDate.value).getTime();
			if (alertTime > endTime) return false;
		}
	}

	return true;
};

// 處理新警報事件（WebSocket）
const handleAlertNew = (alert: AlertNewEvent) => {
	// 檢查是否已存在
	if (alerts.value.find(a => a.id === alert.id)) return;

	// 檢查是否符合篩選條件
	if (!matchesFilters(alert)) {
		// 如果是 active 警報但不在時間範圍內，記錄警告（開發模式）
		if (alert.status === "active" && process.dev) {
			console.warn(
				`[AlertLog] 新警報 ${alert.id} 不在當前時間範圍內，` +
					`創建時間: ${alert.created_at}, 更新時間: ${alert.updated_at}`
			);
		}
		return;
	}

	// 正常添加到列表
	if (offset.value === 0) {
		alerts.value.unshift(alert);
	}
	totalAlerts.value += 1;

	if (alert.status === "active") {
		unresolvedCount.value++;
	}
};

// 處理警報更新事件（WebSocket）
const handleAlertUpdated = (data: AlertUpdatedEvent) => {
	const { alert, oldStatus, newStatus } = data;
	const index = alerts.value.findIndex(a => a.id === alert.id);
	const matches = matchesFilters(alert);

	if (index !== -1) {
		alerts.value[index] = { ...alerts.value[index], ...alert };
		if (!matches) {
			alerts.value.splice(index, 1);
			totalAlerts.value = Math.max(0, totalAlerts.value - 1);
		}
	} else if (matches && offset.value === 0) {
		alerts.value.unshift(alert);
		totalAlerts.value += 1;
	}

	if (oldStatus === "active" && (newStatus === "resolved" || newStatus === "ignored")) {
		unresolvedCount.value = Math.max(0, unresolvedCount.value - 1);
	} else if ((oldStatus === "resolved" || oldStatus === "ignored") && newStatus === "active") {
		unresolvedCount.value++;
	}
};

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
	"忽視者"
] as const;

const STATUS_LABELS: Record<string, string> = {
	active: "未解決",
	resolved: "已解決",
	ignored: "已忽視"
};

const formatZoneLocation = (z?: string | null, l?: string | null) =>
	[z, l].filter(Boolean).join("-") || "";

const getDeviceConfigDisplay = (c: Record<string, unknown> | string | null | undefined) => {
	if (!c) return "";
	const o = typeof c === "string" ? (JSON.parse(c || "{}") as Record<string, unknown>) : c;
	return String(o.host ?? "").trim() || "";
};

// 匯出警示為 CSV（欄位順序與後端備份一致）
const handleExport = async () => {
	try {
		const result = await alertApi.getAlerts({
			status: getFilterStatus(),
			source: filterSource.value as AlertSource | undefined,
			start_date: filterStartDate.value || undefined,
			end_date: filterEndDate.value || undefined,
			limit: 10000,
			offset: 0,
			orderBy: "created_at",
			order: "desc"
		});

		if (result.alerts.length === 0) {
			toast.info("無資料可匯出");
			return;
		}

		const fmt = (s?: string | null) => (s ? formatDateTime(s, true) : "");
		const typeSeverity = (a: Alert) =>
			`${getTypeLabel(a.alert_type)}（${getSeverityLabel(a.severity)}）`;

		const rows = result.alerts.map(alert => ({
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
			忽視者: alert.ignored_by_username ?? ""
		}));

		const datePart = (s: string) => s.split("T")[0];
		const filename =
			filterStartDate.value && filterEndDate.value
				? `警示紀錄_${datePart(filterStartDate.value)}_${datePart(filterEndDate.value)}.csv`
				: `警示紀錄_${new Date().toISOString().split("T")[0]}.csv`;

		exportCsv([...ALERT_CSV_HEADERS], rows, filename, { backupStyle: true });
		toast.success(`已匯出 ${result.alerts.length} 筆警示紀錄`, 3000);
	} catch (error) {
		handleApiError(error, "匯出警示失敗");
	}
};

// 分頁
const goToPreviousPage = () => {
	prevPage({});
};

const goToNextPage = () => {
	nextPage({});
};

// Badge 基礎樣式類
const badgeBaseClass =
	"inline-block rounded-full px-3 py-1 text-base font-semibold text-white 2xl:px-4 2xl:py-1.5";

// 獲取來源顯示名稱
const getSourceDisplayName = (alert: Alert): string =>
	alert.source_name || `${getSourceLabel(alert.source)} #${alert.source_id}`;

// 獲取區域名稱
const getZoneName = (alert: Alert): string => alert.zone_name || "";

// 取得警示卡片樣式
const getAlertCardClass = (alert: Alert) => {
	if (isAlertResolved(alert)) {
		return "border-green-500/30 bg-green-500/5";
	}
	if (isAlertIgnored(alert)) {
		return "border-gray-500/30 bg-gray-500/5";
	}

	const severityClasses: Record<string, string> = {
		warning: "border-yellow-500/30 bg-yellow-500/5",
		error: "border-orange-500/30 bg-orange-500/5",
		critical: "border-red-500/30 bg-red-500/5"
	};

	return severityClasses[alert.severity] || "border-white/20 bg-white/5";
};

// 監聽篩選條件變化
watch([filterStatus, filterSource, filterStartDate, filterEndDate], () => {
	resetPage();
	load({});
	loadUnresolvedCount();
});

// 初始化時間範圍為「今天」（使用統一的時間工具）
const initializeTimeRange = () => {
	const { start, end } = getTodayDateRangeUTC();
	timeRange.value = {
		startDate: start.toISOString(),
		endDate: end.toISOString(),
		preset: "today"
	};
	filterStartDate.value = start.toISOString();
	filterEndDate.value = end.toISOString();
};

// 滾動並高亮顯示指定警報
const scrollToAlert = async (alertId: number) => {
	await nextTick();
	const alertElement = document.getElementById(`alert-${alertId}`);
	if (alertElement) {
		alertElement.scrollIntoView({ behavior: "smooth", block: "center" });
		alertElement.classList.add("ring-2", "ring-blue-500", "ring-offset-2");
		setTimeout(() => {
			alertElement.classList.remove("ring-2", "ring-blue-500", "ring-offset-2");
		}, 3000);
	}
};

// 處理 alertId 查詢參數（用於從 Toast 跳轉）
const handleAlertIdQuery = async () => {
	const route = useRoute();
	const alertIdParam = route.query.alertId;

	if (!alertIdParam) return;

	const alertId = Number(alertIdParam);
	if (isNaN(alertId)) return;

	await nextTick();

	// 檢查警報是否在當前列表中
	const alert = alerts.value.find(a => a.id === alertId);

	if (alert) {
		await scrollToAlert(alertId);
		return;
	}

	// 如果警報不在列表中，嘗試載入該警報並調整篩選條件
	try {
		const result = await alertApi.getAlertById(alertId);
		const targetAlert = result.alert;
		const alertDate = new Date(targetAlert.created_at);
		const { start, end } = getTodayDateRangeUTC();

		// 如果警報不在今天，調整時間範圍
		if (alertDate < start || alertDate >= end) {
			timeRange.value = {
				startDate: new Date(alertDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
				endDate: new Date(alertDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
				preset: "custom"
			};
			filterStartDate.value = timeRange.value.startDate;
			filterEndDate.value = timeRange.value.endDate;
			load({}, true); // 立即執行
		}

		await scrollToAlert(alertId);
	} catch (error) {
		if (process.dev) {
			console.warn(`[alert-log] 無法載入警報 ${alertId}`, error);
		}
	}
};

// 初始化
onMounted(async () => {
	// 初始化時間範圍
	initializeTimeRange();

	load({}, true); // 立即執行
	void loadUnresolvedCount();
	on("alert:new", handleAlertNew);
	on("alert:updated", handleAlertUpdated);

	// 處理 alertId 查詢參數
	await handleAlertIdQuery();
});

// 組件卸載時清理
onUnmounted(() => {
	off("alert:new", handleAlertNew);
	off("alert:updated", handleAlertUpdated);
});
</script>
