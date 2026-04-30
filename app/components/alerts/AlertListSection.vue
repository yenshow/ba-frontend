<template>
	<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
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

		<div class="min-h-[500px]">
			<Transition name="fade" mode="out-in">
				<div :key="`content-${offset}-${alerts.length}`">
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
							:key="`${alert.id}:${alert.dimension_key || 'default'}`"
							:id="`alert-${alert.id}`"
							:class="['rounded-xl border-2 p-4 transition-all 2xl:p-6', getAlertCardClass(alert)]"
						>
							<div class="flex items-start justify-between gap-4">
								<div class="flex-1">
									<div class="mb-2 flex flex-wrap items-center gap-2">
										<span :class="[badgeBaseClass, 'bg-blue-500/80']">{{
											getSourceLabel(alert.source)
										}}</span>
										<span :class="[badgeBaseClass, getSeverityBadgeClass(alert.severity)]">{{
											getSeverityLabel(alert.severity)
										}}</span>
										<span :class="[badgeBaseClass, getTypeBadgeClass(alert.alert_type)]">{{
											getTypeLabel(alert.alert_type)
										}}</span>
										<span v-if="isAlertResolved(alert)" :class="[badgeBaseClass, 'bg-green-500/80']"
											>已解決</span
										>
										<span v-if="isAlertIgnored(alert)" :class="[badgeBaseClass, 'bg-gray-500/80']"
											>已忽視</span
										>
									</div>

									<p class="mb-4 text-base text-white 2xl:text-lg">{{ alert.message }}</p>

									<div class="mb-3 rounded-lg border border-white/10 bg-white/5 p-3 2xl:p-4">
										<div class="grid grid-cols-4 gap-3 2xl:gap-4">
											<div class="flex items-start gap-2">
												<div class="min-w-0 flex-1">
													<div class="text-sm text-white/60">
														{{ getSourceLabel(alert.source) }}
													</div>
													<div class="mt-0.5 truncate text-base font-semibold text-white">
														<span v-if="alert.zone_name">{{ alert.zone_name }} - </span
														>{{ getSourceDisplayName(alert) }}
													</div>
												</div>
											</div>
											<div v-if="alert.device_type_name" class="flex items-start gap-2">
												<div class="min-w-0 flex-1">
													<div class="text-sm text-white/60">類型</div>
													<div class="mt-0.5 text-base font-medium text-white">
														{{ alert.device_type_name }}
													</div>
												</div>
											</div>
											<div class="flex items-start gap-2">
												<div class="min-w-0 flex-1">
													<div class="text-sm text-white/60">創建時間</div>
													<div class="mt-0.5 text-base text-white">
														{{ formatDateTime(alert.created_at) }}
													</div>
												</div>
											</div>
											<div class="flex items-start gap-2">
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

								<div class="flex h-[160px] flex-col justify-center gap-2">
									<button
										v-if="alert.status === 'active' && isAdmin"
										type="button"
										@click="emit('ignore', alert)"
										:disabled="isIgnoring"
										class="rounded-lg bg-gray-500/80 px-3 py-1.5 text-base text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 2xl:px-4 2xl:py-2 2xl:text-lg"
									>
										忽視
									</button>
									<button
										v-if="isAlertIgnored(alert) && isAdmin"
										type="button"
										@click="emit('unignore', alert)"
										:disabled="isIgnoring"
										class="rounded-lg bg-blue-500/80 px-3 py-1.5 text-base text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 2xl:px-4 2xl:py-2 2xl:text-lg"
									>
										取消忽視
									</button>
								</div>
							</div>
						</div>
					</div>

					<Pagination
						v-if="totalAlerts > limit"
						:total="totalAlerts"
						:offset="offset"
						:limit="limit"
						:disabled="isLoading"
						@previous="emit('previous')"
						@next="emit('next')"
					/>
				</div>
			</Transition>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { Alert } from "~/types/alert";
import Pagination from "~/components/common/Pagination.vue";
import {
	getSourceLabel,
	getTypeLabel,
	getSeverityLabel,
	getSeverityBadgeClass,
	getTypeBadgeClass,
	isAlertResolved,
	isAlertIgnored
} from "~/utils/alertUtils";
import { formatDateTime } from "~/utils/dateUtils";

defineProps<{
	alerts: Alert[];
	totalAlerts: number;
	unresolvedCount: number;
	offset: number;
	limit: number;
	isLoading: boolean;
	isIgnoring: boolean;
	isAdmin: boolean;
}>();

const emit = defineEmits<{
	(e: "ignore", alert: Alert): void;
	(e: "unignore", alert: Alert): void;
	(e: "previous"): void;
	(e: "next"): void;
}>();

const badgeBaseClass =
	"inline-block rounded-full px-3 py-1 text-base font-semibold text-white 2xl:px-4 2xl:py-1.5";

const getSourceDisplayName = (alert: Alert): string =>
	alert.source_display_name ||
	alert.location_name ||
	alert.source_name ||
	`${getSourceLabel(alert.source)} #${alert.source_id}`;

const getAlertCardClass = (alert: Alert) => {
	if (isAlertResolved(alert)) return "border-green-500/30 bg-green-500/5";
	if (isAlertIgnored(alert)) return "border-gray-500/30 bg-gray-500/5";
	const severityClasses: Record<string, string> = {
		warning: "border-yellow-500 bg-yellow-500/30",
		critical: "border-red-500 bg-red-500/30"
	};
	return severityClasses[alert.severity] || "border-white/20 bg-white/5";
};
</script>
