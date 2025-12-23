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

				<!-- 3. 設備類型篩選（僅適用於設備系統） -->
				<select
					v-if="!filterSource || filterSource === 'device'"
					v-model="filterDeviceType"
					@change="loadAlerts"
					class="select-filter rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 2xl:px-6 2xl:py-3 2xl:text-base"
				>
					<option value="">全部設備</option>
					<option value="camera">攝影機</option>
					<option value="sensor">感測器</option>
					<option value="controller">控制器</option>
					<option value="tablet">平板</option>
					<option value="network">網路裝置</option>
				</select>

				<!-- 4. 時間範圍篩選 -->
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
			</div>
		</div>

		<!-- 警示列表 -->
		<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
			<!-- 統計資訊 -->
			<div class="mb-6 flex flex-wrap items-center justify-between gap-4 2xl:gap-6">
				<div class="flex items-center gap-4 2xl:gap-6">
					<div class="text-white">
						<span class="text-sm 2xl:text-base text-white/70">總計：</span>
						<span class="text-lg 2xl:text-xl font-semibold">{{ totalAlerts }}</span>
					</div>
					<div class="text-white">
						<span class="text-sm 2xl:text-base text-white/70">未解決：</span>
						<span class="text-lg 2xl:text-xl font-semibold text-yellow-400">{{ unresolvedCount }}</span>
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
						:class="[
							'rounded-xl border-2 p-4 transition-all 2xl:p-6',
							getAlertCardClass(alert)
						]"
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
										v-if="alert.alert_count && alert.alert_count > 1"
										class="inline-block rounded-full bg-blue-500/80 px-3 py-1 text-xs font-semibold text-white 2xl:px-4 2xl:py-1.5 2xl:text-sm"
									>
										{{ alert.alert_count }} 次
									</span>
									<span
										v-if="alert.status === 'resolved' || alert.resolved"
										class="inline-block rounded-full bg-green-500/80 px-3 py-1 text-xs font-semibold text-white 2xl:px-4 2xl:py-1.5 2xl:text-sm"
									>
										已解決
									</span>
									<span
										v-if="alert.status === 'ignored' || alert.ignored"
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
										<span>{{ alert.device_name || alert.metadata?.device_name || `ID: ${alert.source_id}` }}</span>
									</div>
									<div v-else-if="alert.source === 'environment'">
										<span class="font-medium">位置：</span>
										<span>{{ alert.metadata?.location_name || `ID: ${alert.source_id}` }}</span>
									</div>
									<div v-else-if="alert.source === 'lighting'">
										<span class="font-medium">區域：</span>
										<span>{{ alert.metadata?.area_name || `ID: ${alert.source_id}` }}</span>
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
										<span class="font-medium">時間：</span>
										<span>{{ formatDateTime(alert.created_at) }}</span>
									</div>
									<div v-if="(alert.status === 'resolved' || alert.resolved) && alert.resolved_at">
										<span class="font-medium">解決時間：</span>
										<span>{{ formatDateTime(alert.resolved_at) }}</span>
									</div>
									<div v-if="(alert.status === 'resolved' || alert.resolved) && alert.resolved_by_username">
										<span class="font-medium">解決者：</span>
										<span>{{ alert.resolved_by_username }}</span>
									</div>
									<div v-if="(alert.status === 'ignored' || alert.ignored) && alert.ignored_at">
										<span class="font-medium">忽視時間：</span>
										<span>{{ formatDateTime(alert.ignored_at) }}</span>
									</div>
									<div v-if="(alert.status === 'ignored' || alert.ignored) && alert.ignored_by_username">
										<span class="font-medium">忽視者：</span>
										<span>{{ alert.ignored_by_username }}</span>
									</div>
								</div>
							</div>

							<!-- 操作按鈕 -->
							<div class="flex flex-col gap-2">
								<button
									v-if="alert.status === 'active' && !alert.resolved && !alert.ignored"
									type="button"
									@click="handleResolve(alert)"
									:disabled="isResolving"
									class="rounded-lg bg-green-500/80 px-3 py-1.5 text-xs text-white hover:bg-green-400 disabled:cursor-not-allowed disabled:bg-green-500/40 2xl:px-4 2xl:py-2 2xl:text-sm"
								>
									標記已解決
								</button>
								<button
									v-if="(alert.status === 'resolved' || alert.resolved) && isAdmin && !alert.ignored"
									type="button"
									@click="handleUnresolve(alert.id)"
									:disabled="isResolving"
									class="rounded-lg bg-yellow-500/80 px-3 py-1.5 text-xs text-white hover:bg-yellow-400 disabled:cursor-not-allowed disabled:bg-yellow-500/40 2xl:px-4 2xl:py-2 2xl:text-sm"
								>
									標記未解決
								</button>
								<button
									v-if="alert.status === 'active' && !alert.resolved && !alert.ignored"
									type="button"
									@click="handleIgnore(alert)"
									:disabled="isIgnoring"
									class="rounded-lg bg-gray-500/80 px-3 py-1.5 text-xs text-white hover:bg-gray-400 disabled:cursor-not-allowed disabled:bg-gray-500/40 2xl:px-4 2xl:py-2 2xl:text-sm"
								>
									忽視
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
import { useAlertApi } from "~/composables/useAlertApi";
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

// 狀態
const alerts = ref<Alert[]>([]);
const isLoading = ref(false);
const isResolving = ref(false);
const isIgnoring = ref(false);
const totalAlerts = ref(0);
const unresolvedCount = ref(0);

// 篩選條件
const filterStatus = ref<string>("all"); // all, active, resolved, ignored
const filterSource = ref<string>(""); // 系統來源篩選
const filterDeviceType = ref<string>("");
const filterStartDate = ref<string>("");
const filterEndDate = ref<string>("");

// 分頁
const limit = ref(20);
const offset = ref(0);

// 載入警示列表
const loadAlerts = async () => {
	isLoading.value = true;
	try {
		// 根據 filterStatus 設置 status 篩選
		let status: AlertStatus | undefined = undefined;
		
		if (filterStatus.value === "active") {
			status = "active";
		} else if (filterStatus.value === "resolved") {
			status = "resolved";
		} else if (filterStatus.value === "ignored") {
			status = "ignored";
		}
		
		const result = await alertApi.getAlerts({
			status,
			source: filterSource.value as AlertSource | undefined,
			device_type_code: filterDeviceType.value || undefined,
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
		console.error("[alert-log] 載入警示列表失敗", error);
		const errorMsg = error instanceof Error ? error.message : "載入警示列表失敗";
		toast.error(errorMsg, 5000);
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
		console.error("[alert-log] 載入未解決警示數量失敗", error);
	}
};

// 取得來源 ID（向後兼容）
const getSourceId = (alert: Alert): number => {
	// 如果是設備系統，使用 device_id（向後兼容）
	if (alert.source === "device" && alert.device_id) {
		return alert.device_id;
	}
	return alert.source_id;
};

// 標記為已解決
const handleResolve = async (alert: Alert) => {
	isResolving.value = true;
	try {
		const sourceId = getSourceId(alert);
		await alertApi.resolveAlert(sourceId, alert.alert_type, alert.source);
		toast.success("警示已標記為已解決", 3000);
		await loadAlerts();
		await loadUnresolvedCount();
	} catch (error) {
		console.error("[alert-log] 標記警示為已解決失敗", error);
		const errorMsg = error instanceof Error ? error.message : "操作失敗";
		toast.error(errorMsg, 5000);
	} finally {
		isResolving.value = false;
	}
};

// 標記為未解決
const handleUnresolve = async (id: number) => {
	isResolving.value = true;
	try {
		await alertApi.unresolveAlert(id);
		toast.success("警示已標記為未解決", 3000);
		await loadAlerts();
		await loadUnresolvedCount();
	} catch (error) {
		console.error("[alert-log] 標記警示為未解決失敗", error);
		const errorMsg = error instanceof Error ? error.message : "操作失敗";
		toast.error(errorMsg, 5000);
	} finally {
		isResolving.value = false;
	}
};

// 忽視警示
const handleIgnore = async (alert: Alert) => {
	if (!confirm("確定要忽視此警示嗎？忽視後將不再顯示此來源的相同類型警示。")) {
		return;
	}

	isIgnoring.value = true;
	try {
		const sourceId = getSourceId(alert);
		await alertApi.ignoreAlert(sourceId, alert.alert_type, alert.source);
		toast.success("警示已忽視", 3000);
		await loadAlerts();
		await loadUnresolvedCount();
	} catch (error) {
		console.error("[alert-log] 忽視警示失敗", error);
		const errorMsg = error instanceof Error ? error.message : "忽視失敗";
		toast.error(errorMsg, 5000);
	} finally {
		isIgnoring.value = false;
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

// 取得警示卡片樣式
const getAlertCardClass = (alert: Alert) => {
	// 使用 status 或向後兼容的 resolved/ignored
	const isResolved = alert.status === "resolved" || alert.resolved;
	const isIgnored = alert.status === "ignored" || alert.ignored;

	if (isResolved) {
		return "border-green-500/30 bg-green-500/5";
	}
	if (isIgnored) {
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
