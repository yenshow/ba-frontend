<template>
	<div class="space-y-6 2xl:space-y-8">
		<div class="flex items-center justify-between">
			<header class="flex flex-col gap-2">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">警示紀錄</h1>
				<p class="text-base text-white/80 2xl:text-xl">查看與管理系統警示訊息</p>
			</header>

			<!-- 篩選器 -->
			<div class="flex flex-wrap items-center gap-3 2xl:gap-4">
				<!-- 1. 狀態篩選 -->
				<select
					v-model="filterStatus"
					@change="loadAlerts"
					class="select-filter rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 2xl:px-6 2xl:py-3 2xl:text-base"
				>
					<option value="all">全部狀態</option>
					<option value="active">未解決</option>
					<option value="resolved">已解決</option>
					<option value="ignored">已忽視</option>
				</select>

				<!-- 2. 系統來源篩選 -->
				<select
					v-model="filterSource"
					@change="loadAlerts"
					class="select-filter rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 2xl:px-6 2xl:py-3 2xl:text-base"
				>
					<option value="">全部系統</option>
					<option value="device">設備系統</option>
					<option value="environment">環境系統</option>
					<option value="lighting">照明系統</option>
				</select>

				<!-- 3. 時間範圍篩選 -->
				<div class="flex items-center gap-2">
					<input
						v-model="filterStartDate"
						type="date"
						@change="loadAlerts"
						class="select-filter rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 2xl:px-6 2xl:py-3 2xl:text-base"
					/>
					<span class="text-white/70">~</span>
					<input
						v-model="filterEndDate"
						type="date"
						@change="loadAlerts"
						class="select-filter rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 2xl:px-6 2xl:py-3 2xl:text-base"
					/>
				</div>

				<!-- 刷新按鈕 -->
				<button
					type="button"
					@click="loadAlerts"
					:disabled="isLoading"
					class="rounded-xl bg-blue-500/80 px-4 py-2 text-sm text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/40 2xl:px-6 2xl:py-3 2xl:text-base"
				>
					刷新
				</button>

				<!-- 匯出按鈕 -->
				<button
					type="button"
					@click="handleExport"
					:disabled="isLoading || alerts.length === 0"
					class="rounded-xl border border-white/20 bg-green-500/80 px-4 py-2 text-sm text-white hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
				>
					匯出 CSV
				</button>
			</div>
		</div>

		<!-- 警示列表 -->
		<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
			<!-- 統計資訊 -->
			<div class="mb-6 flex flex-wrap items-center justify-between gap-4 2xl:gap-6">
				<div class="flex items-center gap-4 2xl:gap-6">
					<div class="text-white">
						<span class="text-sm text-white/70 2xl:text-base">總計：</span>
						<span class="text-lg font-semibold 2xl:text-xl">{{ totalAlerts }}</span>
					</div>
					<div class="text-white">
						<span class="text-sm text-white/70 2xl:text-base">未解決：</span>
						<span class="text-lg font-semibold text-yellow-400 2xl:text-xl">{{ unresolvedCount }}</span>
					</div>
				</div>
			</div>

			<!-- 骨架屏：載入中時顯示 -->
			<template v-if="isLoading">
				<div class="space-y-4">
					<div
						v-for="n in 5"
						:key="`skeleton-${n}`"
						class="h-20 animate-pulse rounded-lg bg-white/10 2xl:h-24"
					></div>
				</div>
			</template>

			<!-- 警示列表 -->
			<template v-else>
				<div v-if="alerts.length === 0" class="py-12 text-center text-white/70">
					<p class="text-lg 2xl:text-xl">目前沒有警示紀錄</p>
				</div>

				<div v-else class="space-y-4">
					<div
						v-for="alert in alerts"
						:key="alert.id"
						:class="['rounded-xl border-2 p-4 transition-all 2xl:p-6', getAlertCardClass(alert)]"
					>
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1">
								<div class="mb-2 flex items-center gap-3">
									<!-- 系統來源標籤 -->
									<span
										class="inline-block rounded-full bg-blue-500/80 px-3 py-1 text-xs font-semibold text-white 2xl:px-4 2xl:py-1.5 2xl:text-sm"
									>
										{{ getSourceLabel(alert.source) }}
									</span>
									<span
										:class="[
											'inline-block rounded-full px-3 py-1 text-xs font-semibold 2xl:px-4 2xl:py-1.5 2xl:text-sm',
											getSeverityBadgeClass(alert.severity)
										]"
									>
										{{ getSeverityLabel(alert.severity) }}
									</span>
									<span
										:class="[
											'inline-block rounded-full px-3 py-1 text-xs font-semibold 2xl:px-4 2xl:py-1.5 2xl:text-sm',
											getTypeBadgeClass(alert.alert_type)
										]"
									>
										{{ getTypeLabel(alert.alert_type) }}
									</span>
									<span
										v-if="isAlertResolved(alert)"
										class="inline-block rounded-full bg-green-500/80 px-3 py-1 text-xs font-semibold text-white 2xl:px-4 2xl:py-1.5 2xl:text-sm"
									>
										已解決
									</span>
									<span
										v-if="isAlertIgnored(alert)"
										class="inline-block rounded-full bg-gray-500/80 px-3 py-1 text-xs font-semibold text-white 2xl:px-4 2xl:py-1.5 2xl:text-sm"
									>
										已忽視
									</span>
								</div>

								<p class="mb-2 text-base text-white 2xl:text-lg">{{ alert.message }}</p>

								<div class="flex flex-wrap items-center gap-4 text-sm text-white/70 2xl:text-base">
									<!-- 顯示來源資訊 -->
									<div v-if="alert.source === 'device'">
										<span class="font-medium">設備：</span>
										<span>{{ alert.device_name || `ID: ${alert.source_id}` }}</span>
									</div>
									<div v-else>
										<span class="font-medium">來源：</span>
										<span>{{ getSourceLabel(alert.source) }} #{{ alert.source_id }}</span>
									</div>
									<div v-if="alert.device_type_name">
										<span class="font-medium">類型：</span>
										<span>{{ alert.device_type_name }}</span>
									</div>
									<div>
										<span class="font-medium">創建時間：</span>
										<span>{{ formatDateTime(alert.created_at) }}</span>
									</div>
									<div>
										<span class="font-medium">更新時間：</span>
										<span>{{ formatDateTime(alert.updated_at) }}</span>
									</div>
									<div v-if="isAlertResolved(alert) && alert.resolved_at">
										<span class="font-medium">解決時間：</span>
										<span>{{ formatDateTime(alert.resolved_at) }}</span>
									</div>
									<div v-if="isAlertResolved(alert) && alert.resolved_by_username">
										<span class="font-medium">解決者：</span>
										<span>{{ alert.resolved_by_username }}</span>
									</div>
									<div v-else-if="isAlertResolved(alert) && !alert.resolved_by_username">
										<span class="font-medium">解決方式：</span>
										<span class="text-green-400">系統自動解決</span>
									</div>
									<div v-if="isAlertIgnored(alert) && alert.ignored_at">
										<span class="font-medium">忽視時間：</span>
										<span>{{ formatDateTime(alert.ignored_at) }}</span>
									</div>
									<div v-if="isAlertIgnored(alert) && alert.ignored_by_username">
										<span class="font-medium">忽視者：</span>
										<span>{{ alert.ignored_by_username }}</span>
									</div>
								</div>
							</div>

							<!-- 操作按鈕 -->
							<div class="flex flex-col gap-2">
								<!-- 注意：警報由系統自動解決，不提供手動解決功能 -->
								<button
									v-if="isAlertResolved(alert) && isAdmin && !isAlertIgnored(alert)"
									type="button"
									@click="handleUnresolve(alert.id)"
									:disabled="isResolving"
									class="rounded-lg bg-yellow-500/80 px-3 py-1.5 text-xs text-white hover:bg-yellow-400 disabled:cursor-not-allowed disabled:bg-yellow-500/40 2xl:px-4 2xl:py-2 2xl:text-sm"
									title="將已解決的警報重新激活（僅限管理員，用於處理系統誤判）"
								>
									標記未解決
								</button>
								<button
									v-if="alert.status === 'active' && !isAlertResolved(alert) && !isAlertIgnored(alert) && isAdmin"
									type="button"
									@click="handleIgnore(alert)"
									:disabled="isIgnoring"
									class="rounded-lg bg-gray-500/80 px-3 py-1.5 text-xs text-white hover:bg-gray-400 disabled:cursor-not-allowed disabled:bg-gray-500/40 2xl:px-4 2xl:py-2 2xl:text-sm"
									title="忽視此警報（僅限管理員）"
								>
									忽視
								</button>
								<button
									v-if="isAlertIgnored(alert) && isAdmin"
									type="button"
									@click="handleUnignore(alert)"
									:disabled="isIgnoring"
									class="rounded-lg bg-blue-500/80 px-3 py-1.5 text-xs text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/40 2xl:px-4 2xl:py-2 2xl:text-sm"
									title="取消忽視此警報（僅限管理員）"
								>
									取消忽視
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- 分頁 -->
				<div v-if="totalAlerts > limit" class="mt-6 flex items-center justify-between">
					<div class="text-sm text-white/70 2xl:text-base">
						顯示 {{ offset + 1 }} - {{ Math.min(offset + limit, totalAlerts) }} / {{ totalAlerts }}
					</div>
					<div class="flex items-center gap-2">
						<button
							type="button"
							@click="goToPreviousPage"
							:disabled="offset === 0 || isLoading"
							class="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-4 2xl:py-2 2xl:text-base"
						>
							上一頁
						</button>
						<button
							type="button"
							@click="goToNextPage"
							:disabled="offset + limit >= totalAlerts || isLoading"
							class="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-4 2xl:py-2 2xl:text-base"
						>
							下一頁
						</button>
					</div>
				</div>
			</template>
		</section>
	</div>
</template>

<script setup lang="ts">
import { useToast } from "~/composables/useToast";
import type { Alert, AlertStatus, AlertSource } from "~/types/alert";
import { useAuth } from "~/composables/useAuth";
import {
	getSourceLabel,
	getTypeLabel,
	getSeverityLabel,
	getSeverityBadgeClass,
	getTypeBadgeClass
} from "~/utils/alertUtils";

definePageMeta({
	layout: "default"
});

const alertApi = useAlertApi();
const toast = useToast();
const { isAdmin } = useAuth();
const { removeAlertToast } = useAlertMonitor();
const { handleError: handleApiError } = useErrorHandler();

// 狀態
const alerts = ref<Alert[]>([]);
const isLoading = ref(false);
const isResolving = ref(false); // 用於 unresolve 操作
const isIgnoring = ref(false);
const totalAlerts = ref(0);
const unresolvedCount = ref(0);

// 篩選條件
const filterStatus = ref<string>("all"); // all, active, resolved, ignored
const filterSource = ref<string>(""); // 系統來源篩選
const filterStartDate = ref<string>("");
const filterEndDate = ref<string>("");

// 分頁
const limit = ref(20);
const offset = ref(0);

// 載入警示列表
const loadAlerts = async () => {
	isLoading.value = true;
	try {
		const result = await alertApi.getAlerts({
			status: getFilterStatus(),
			source: filterSource.value as AlertSource | undefined,
			start_date: filterStartDate.value || undefined,
			end_date: filterEndDate.value || undefined,
			limit: limit.value,
			offset: offset.value,
			orderBy: "created_at",
			order: "desc"
		});

		alerts.value = result.alerts;
		totalAlerts.value = result.total;
	} catch (error) {
		handleApiError(error, "載入警示列表失敗");
	} finally {
		isLoading.value = false;
	}
};

// 載入未解決警示數量
const loadUnresolvedCount = async () => {
	try {
		const result = await alertApi.getUnresolvedAlertCount({
			source: filterSource.value || undefined
		});
		unresolvedCount.value = result.count;
	} catch (error) {
		// 靜默處理，避免影響主要功能
		if (process.dev) {
			console.warn("[alert-log] 載入未解決警示數量失敗", error);
		}
	}
};


// 共用函數：處理警報操作後的重新載入
const reloadAfterAction = async () => {
	await Promise.all([loadAlerts(), loadUnresolvedCount()]);
};

// 標記為未解決（管理員專屬，用於處理系統誤判）
const handleUnresolve = async (id: number) => {
	isResolving.value = true;
	try {
		await alertApi.unresolveAlert(id);
		toast.success("警示已標記為未解決", 3000);
		await reloadAfterAction();
	} catch (error) {
		handleApiError(error, "標記警示為未解決失敗");
	} finally {
		isResolving.value = false;
	}
};

/**
 * 處理忽視/取消忽視操作的通用函數
 */
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

// 忽視警示（僅限管理員）
const handleIgnore = (alert: Alert) => {
	return handleIgnoreAction(
		alert,
		"ignore",
		"確定要忽視此警示嗎？忽視後將不再顯示此來源的相同類型警示。",
		"警示已忽視",
		"忽視警示失敗"
	);
};

// 取消忽視警示（僅限管理員）
const handleUnignore = (alert: Alert) => {
	return handleIgnoreAction(
		alert,
		"unignore",
		"確定要取消忽視此警示嗎？取消後將恢復顯示此來源的相同類型警示。",
		"已取消忽視警示",
		"取消忽視警示失敗"
	);
};

// 獲取當前篩選條件對應的狀態
const getFilterStatus = (): AlertStatus | undefined => {
	return filterStatus.value !== "all" ? (filterStatus.value as AlertStatus) : undefined;
};

// 匯出警示為 CSV
const handleExport = async () => {
	try {
		// 獲取所有符合當前篩選條件的警示（不分頁）
		const result = await alertApi.getAlerts({
			status: getFilterStatus(),
			source: filterSource.value as AlertSource | undefined,
			start_date: filterStartDate.value || undefined,
			end_date: filterEndDate.value || undefined,
			limit: 10000, // 最大限制
			offset: 0,
			orderBy: "created_at",
			order: "desc"
		});

		// 構建 CSV 內容
		const headers = [
			"ID",
			"系統來源",
			"來源ID",
			"警報類型",
			"嚴重程度",
			"狀態",
			"訊息",
			"創建時間",
			"更新時間",
			"解決時間",
			"解決者",
			"忽視時間",
			"忽視者",
			"設備名稱",
			"設備類型"
		];

		// 狀態標籤映射
		const statusLabels: Record<string, string> = {
			active: "未解決",
			resolved: "已解決",
			ignored: "已忽視"
		};

		const rows = result.alerts.map(alert => {
			return [
				alert.id,
				getSourceLabel(alert.source),
				alert.source_id,
				getTypeLabel(alert.alert_type),
				getSeverityLabel(alert.severity),
				statusLabels[alert.status] || alert.status,
				alert.message,
				formatDateTime(alert.created_at),
				formatDateTime(alert.updated_at),
				alert.resolved_at ? formatDateTime(alert.resolved_at) : "",
				alert.resolved_by_username || "",
				alert.ignored_at ? formatDateTime(alert.ignored_at) : "",
				alert.ignored_by_username || "",
				alert.device_name || "",
				alert.device_type_name || ""
			];
		});

		// 轉換為 CSV 格式（處理包含逗號的內容）
		const escapeCSV = (value: unknown): string => {
			if (value === null || value === undefined) return "";
			const str = String(value);
			if (str.includes(",") || str.includes('"') || str.includes("\n")) {
				return `"${str.replace(/"/g, '""')}"`;
			}
			return str;
		};

		const csvContent = [
			headers.map(escapeCSV).join(","),
			...rows.map(row => row.map(escapeCSV).join(","))
		].join("\n");

		// 添加 BOM 以支持 Excel 正確顯示中文
		const BOM = "\uFEFF";
		const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;

		// 生成檔案名稱（包含日期範圍）
		const dateStr =
			filterStartDate.value && filterEndDate.value
				? `${filterStartDate.value}_${filterEndDate.value}`
				: new Date().toISOString().split("T")[0];
		link.download = `警示紀錄_${dateStr}.csv`;

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		toast.success(`已匯出 ${result.alerts.length} 筆警示紀錄`, 3000);
	} catch (error) {
		handleApiError(error, "匯出警示失敗");
	}
};

// 分頁
const goToPreviousPage = () => {
	if (offset.value > 0) {
		offset.value = Math.max(0, offset.value - limit.value);
		loadAlerts();
	}
};

const goToNextPage = () => {
	if (offset.value + limit.value < totalAlerts.value) {
		offset.value += limit.value;
		loadAlerts();
	}
};

// 格式化日期時間
const formatDateTime = (dateString: string | null) => {
	if (!dateString) return "-";
	const date = new Date(dateString);
	return date.toLocaleString("zh-TW", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	});
};

// 標籤和樣式函數已移至 ~/utils/alertUtils.ts

// 檢查警報狀態（共用函數，避免重複邏輯）
const isAlertResolved = (alert: Alert): boolean => {
	return alert.status === "resolved" || alert.resolved === true;
};

const isAlertIgnored = (alert: Alert): boolean => {
	return alert.status === "ignored" || alert.ignored === true;
};

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

// 初始化
onMounted(async () => {
	await Promise.all([loadAlerts(), loadUnresolvedCount()]);
});
</script>

<style scoped>
/* 下拉選單選項樣式 */
.select-filter {
	color: white;
}

.select-filter option {
	background-color: #1e293b;
	color: white;
	padding: 0.5rem;
}

/* 確保選中的選項文字可見 */
.select-filter:focus {
	color: white;
}
</style>
