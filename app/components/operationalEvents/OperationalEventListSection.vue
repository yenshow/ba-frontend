<template>
	<section class="section-card">
		<div class="mb-6 flex items-center gap-4 2xl:gap-6">
			<div>
				<span class="text-sm text-theme-muted 2xl:text-base">總計：</span>
				<span class="text-lg font-semibold text-theme-primary 2xl:text-xl">{{
					total
				}}</span>
			</div>
			<div
				v-for="item in kindStats"
				:key="item.event_kind"
				class="text-sm text-theme-muted 2xl:text-base"
			>
				{{ getOperationalKindLabel(item.event_kind) }}：
				<span class="font-semibold text-white">{{ item.count }}</span>
			</div>
		</div>

		<AsyncPanel
			:loading="isLoading"
			:empty="!isLoading && events.length === 0"
			:error="error"
			empty-title="目前沒有營運事件"
			empty-description="請調整篩選條件或稍後再查看"
		>
			<div class="space-y-4">
				<div
					v-for="event in events"
					:key="event.id"
					class="rounded-xl border-2 border-white/20 bg-white/5 p-4 transition-all 2xl:p-6"
				>
					<div class="flex-1">
						<div class="mb-2 flex flex-wrap items-center gap-2">
							<span :class="[badgeBaseClass, 'bg-blue-500/80']">{{
								getOperationalSourceLabel(event.source)
							}}</span>
							<span :class="[badgeBaseClass, getKindBadgeClass(event.event_kind)]">{{
								getOperationalKindLabel(event.event_kind)
							}}</span>
						</div>

						<p class="mb-4 text-base text-white 2xl:text-lg">{{ event.summary }}</p>

						<div class="alert-meta-panel mb-3 rounded-lg p-3 2xl:p-4">
							<div class="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:gap-4">
								<div class="flex items-start gap-2">
									<div class="min-w-0 flex-1">
										<div class="text-sm text-white/60">發生時間</div>
										<div class="mt-0.5 text-base text-white">
											{{ formatDateTime(event.occurred_at) }}
										</div>
									</div>
								</div>
								<div v-if="event.bit_key" class="flex items-start gap-2">
									<div class="min-w-0 flex-1">
										<div class="text-sm text-white/60">點位</div>
										<div class="mt-0.5 text-base font-medium text-white">
											{{ event.bit_key }}
										</div>
									</div>
								</div>
								<div v-if="event.device_id != null" class="flex items-start gap-2">
									<div class="min-w-0 flex-1">
										<div class="text-sm text-white/60">設備 ID</div>
										<div class="mt-0.5 text-base text-white">{{ event.device_id }}</div>
									</div>
								</div>
								<div v-if="event.actor_user_id != null" class="flex items-start gap-2">
									<div class="min-w-0 flex-1">
										<div class="text-sm text-white/60">操作者</div>
										<div class="mt-0.5 text-base text-white">
											#{{ event.actor_user_id }}
										</div>
									</div>
								</div>
								<div v-if="event.alert_id != null" class="flex items-start gap-2">
									<div class="min-w-0 flex-1">
										<div class="text-sm text-white/60">關聯警報</div>
										<NuxtLink
											:to="`/core/alert-log?alertId=${event.alert_id}`"
											class="mt-0.5 inline-block text-base text-sky-300 underline-offset-2 hover:underline"
											:aria-label="`查看警報 ${event.alert_id}`"
										>
											#{{ event.alert_id }}
										</NuxtLink>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<Pagination
					v-if="total > limit"
					:total="total"
					:offset="offset"
					:limit="limit"
					:disabled="isLoading"
					@previous="emit('previous')"
					@next="emit('next')"
				/>
			</div>
		</AsyncPanel>
	</section>
</template>

<script setup lang="ts">
import type { OperationalEvent } from "~/types/operationalEvent"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import Pagination from "~/components/common/Pagination.vue"
import { formatDateTime } from "~/utils/dateUtils"
import {
	getOperationalKindLabel,
	getOperationalSourceLabel,
} from "~/utils/operationalEventUtils"

defineProps<{
	events: OperationalEvent[]
	total: number
	offset: number
	limit: number
	isLoading: boolean
	error: string | null
	kindStats: Array<{ event_kind: string; count: number }>
}>()

const emit = defineEmits<{
	previous: []
	next: []
}>()

const badgeBaseClass =
	"inline-block rounded-full px-3 py-1 text-base font-semibold text-white 2xl:px-4 2xl:py-1.5"

const getKindBadgeClass = (kind: string): string => {
	const map: Record<string, string> = {
		control_write: "bg-emerald-500/80",
		linkage_write: "bg-orange-500/80",
		state_change: "bg-indigo-500/80",
		access: "bg-sky-500/80",
		vehicle: "bg-violet-500/80",
		elevator: "bg-fuchsia-500/80",
	}
	return map[kind] || "bg-slate-500/80"
}
</script>
