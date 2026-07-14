<template>
	<section class="section-card">
		<div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
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
			<div class="space-y-2">
				<article
					v-for="event in events"
					:key="event.id"
					class="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 2xl:px-4 2xl:py-3"
					:aria-label="event.summary"
				>
					<div class="mb-1 flex flex-wrap items-center gap-1.5">
						<span :class="[badgeBaseClass, 'bg-blue-500/80']">{{
							getOperationalSourceLabel(event.source)
						}}</span>
						<span
							:class="[badgeBaseClass, getOperationalKindBadgeClass(event.event_kind)]"
						>
							{{ getOperationalKindLabel(event.event_kind) }}
						</span>
					</div>

					<p class="mb-1.5 text-sm font-medium text-white 2xl:text-base">
						{{ event.summary }}
					</p>

					<div
						class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-white/55 2xl:text-sm"
					>
						<span v-for="meta in buildOperationalEventMeta(event)" :key="meta.key">
							<span class="mr-1 text-white/40">{{ meta.label }}</span>
							{{ meta.value }}
						</span>
					</div>
				</article>

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
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import Pagination from "~/components/common/Pagination.vue"
import {
	type OperationalEvent,
	buildOperationalEventMeta,
	getOperationalKindBadgeClass,
	getOperationalKindLabel,
	getOperationalSourceLabel,
} from "~/composables/systems/useOperationalEvents"

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
	"inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white 2xl:px-3 2xl:py-1 2xl:text-sm"
</script>
