<template>
	<div class="space-y-6 2xl:space-y-8">
		<div class="flex items-center justify-between">
			<header class="flex flex-col gap-2">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">警示紀錄</h1>
				<p class="text-base text-white/80 2xl:text-xl">查看與管理系統警示訊息</p>
			</header>

			<!-- 篩選器 -->
			<div class="flex items-center gap-3 2xl:gap-4">
				<!-- 狀態篩選 -->
				<select
					v-model="filterResolved"
					@change="loadAlerts"
					class="select-filter rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 2xl:px-6 2xl:py-3 2xl:text-base"
				>
					<option :value="undefined">全部狀態</option>
					<option :value="false">未解決</option>
					<option :value="true">已解決</option>
				</select>

				<!-- 嚴重程度篩選 -->
				<select
					v-model="filterSeverity"
					@change="loadAlerts"
					class="select-filter rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 2xl:px-6 2xl:py-3 2xl:text-base"
				>
					<option value="">全部嚴重程度</option>
					<option value="info">資訊</option>
					<option value="warning">警告</option>
					<option value="error">錯誤</option>
					<option value="critical">嚴重</option>
				</select>

				<!-- 類型篩選 -->
				<select
					v-model="filterType"
					@change="loadAlerts"
					class="select-filter rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 2xl:px-6 2xl:py-3 2xl:text-base"
				>
					<option value="">全部類型</option>
					<option value="offline">離線</option>
					<option value="error">錯誤</option>
					<option value="threshold">閾值</option>
					<option value="maintenance">維護</option>
				</select>

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
										v-if="alert.resolved"
										class="inline-block rounded-full bg-green-500/80 px-3 py-1 text-xs font-semibold text-white 2xl:px-4 2xl:py-1.5 2xl:text-sm"
									>
										已解決
									</span>
								</div>

								<p class="mb-2 text-base text-white 2xl:text-lg">{{ alert.message }}</p>

								<div class="flex flex-wrap items-center gap-4 text-sm text-white/70 2xl:text-base">
									<div>
										<span class="font-medium">設備：</span>
										<span>{{ alert.device_name || `ID: ${alert.device_id}` }}</span>
									</div>
									<div v-if="alert.device_type_name">
										<span class="font-medium">類型：</span>
										<span>{{ alert.device_type_name }}</span>
									</div>
									<div>
										<span class="font-medium">時間：</span>
										<span>{{ formatDateTime(alert.created_at) }}</span>
									</div>
									<div v-if="alert.resolved && alert.resolved_at">
										<span class="font-medium">解決時間：</span>
										<span>{{ formatDateTime(alert.resolved_at) }}</span>
									</div>
									<div v-if="alert.resolved && alert.resolved_by_username">
										<span class="font-medium">解決者：</span>
										<span>{{ alert.resolved_by_username }}</span>
									</div>
								</div>
							</div>

							<!-- 操作按鈕 -->
							<div class="flex flex-col gap-2">
								<button
									v-if="!alert.resolved"
									type="button"
									@click="handleResolve(alert.id)"
									:disabled="isResolving"
									class="rounded-lg bg-green-500/80 px-3 py-1.5 text-xs text-white hover:bg-green-400 disabled:cursor-not-allowed disabled:bg-green-500/40 2xl:px-4 2xl:py-2 2xl:text-sm"
								>
									標記已解決
								</button>
								<button
									v-if="alert.resolved && isAdmin"
									type="button"
									@click="handleUnresolve(alert.id)"
									:disabled="isResolving"
									class="rounded-lg bg-yellow-500/80 px-3 py-1.5 text-xs text-white hover:bg-yellow-400 disabled:cursor-not-allowed disabled:bg-yellow-500/40 2xl:px-4 2xl:py-2 2xl:text-sm"
								>
									標記未解決
								</button>
								<button
									v-if="isAdmin"
									type="button"
									@click="handleDelete(alert.id)"
									:disabled="isDeleting"
									class="rounded-lg bg-red-500/80 px-3 py-1.5 text-xs text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-red-500/40 2xl:px-4 2xl:py-2 2xl:text-sm"
								>
									刪除
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
import type { Alert } from "~/types/alert";
import { useAuth } from "~/composables/useAuth";

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
const isDeleting = ref(false);
const totalAlerts = ref(0);
const unresolvedCount = ref(0);

// 篩選條件
const filterResolved = ref<boolean | undefined>(undefined);
const filterSeverity = ref<string>("");
const filterType = ref<string>("");

// 分頁
const limit = ref(20);
const offset = ref(0);

// 載入警示列表
const loadAlerts = async () => {
	isLoading.value = true;
	try {
		const result = await alertApi.getAlerts({
			resolved: filterResolved.value,
			severity: filterSeverity.value || undefined,
			alert_type: filterType.value || undefined,
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
		const result = await alertApi.getUnresolvedAlertCount();
		unresolvedCount.value = result.count;
	} catch (error) {
		console.error("[alert-log] 載入未解決警示數量失敗", error);
	}
};

// 標記為已解決
const handleResolve = async (id: number) => {
	isResolving.value = true;
	try {
		await alertApi.resolveAlert(id);
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

// 刪除警示
const handleDelete = async (id: number) => {
	if (!confirm("確定要刪除此警示嗎？")) {
		return;
	}

	isDeleting.value = true;
	try {
		await alertApi.deleteAlert(id);
		toast.success("警示已刪除", 3000);
		await loadAlerts();
		await loadUnresolvedCount();
	} catch (error) {
		console.error("[alert-log] 刪除警示失敗", error);
		const errorMsg = error instanceof Error ? error.message : "刪除失敗";
		toast.error(errorMsg, 5000);
	} finally {
		isDeleting.value = false;
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

// 取得嚴重程度標籤
const getSeverityLabel = (severity: string) => {
	const labels: Record<string, string> = {
		info: "資訊",
		warning: "警告",
		error: "錯誤",
		critical: "嚴重"
	};
	return labels[severity] || severity;
};

// 取得類型標籤
const getTypeLabel = (type: string) => {
	const labels: Record<string, string> = {
		offline: "離線",
		error: "錯誤",
		threshold: "閾值",
		maintenance: "維護"
	};
	return labels[type] || type;
};

// 取得嚴重程度徽章樣式
const getSeverityBadgeClass = (severity: string) => {
	const classes: Record<string, string> = {
		info: "bg-blue-500/80 text-white",
		warning: "bg-yellow-500/80 text-white",
		error: "bg-orange-500/80 text-white",
		critical: "bg-red-500/80 text-white"
	};
	return classes[severity] || "bg-gray-500/80 text-white";
};

// 取得類型徽章樣式
const getTypeBadgeClass = (type: string) => {
	const classes: Record<string, string> = {
		offline: "bg-gray-500/80 text-white",
		error: "bg-red-500/80 text-white",
		threshold: "bg-purple-500/80 text-white",
		maintenance: "bg-blue-500/80 text-white"
	};
	return classes[type] || "bg-gray-500/80 text-white";
};

// 取得警示卡片樣式
const getAlertCardClass = (alert: Alert) => {
	if (alert.resolved) {
		return "border-green-500/30 bg-green-500/5";
	}

	const severityClasses: Record<string, string> = {
		info: "border-blue-500/30 bg-blue-500/5",
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

