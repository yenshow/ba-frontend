<template>
	<div class="flex min-h-0 w-full flex-col">
		<template v-if="accessReady && !isLoading">
			<div
				v-if="!canAccess"
				class="flex flex-1 flex-col items-center justify-center gap-3 text-center"
				role="status"
			>
				<CommonLicenseLockIcon class="h-10 w-10 text-white/70" />
				<p class="text-sm text-white/70">{{ MSG_PERMISSION_LOCKED }}</p>
			</div>

			<div
				v-else-if="errorMessage"
				class="flex flex-1 items-center justify-center text-center text-sm text-red-300/90"
				role="alert"
			>
				{{ errorMessage }}
			</div>

			<div
				v-else-if="events.length === 0"
				class="flex flex-1 items-center justify-center"
				role="status"
			>
				<MonitoringLogEmptyState message="尚無營運事件紀錄" />
			</div>

			<ul v-else class="min-h-0 flex-1 space-y-2 overflow-y-auto">
				<li v-for="event in events" :key="event.id">
					<article
						role="link"
						tabindex="0"
						:aria-label="event.summary"
						class="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-3 py-2 transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
						@click="handleOpenFullPage"
						@keydown.enter.prevent="handleOpenFullPage"
						@keydown.space.prevent="handleOpenFullPage"
					>
						<div class="mb-1 flex flex-wrap items-center gap-1.5">
							<span :class="[badgeBaseClass, 'bg-blue-500/80']">
								{{ getOperationalSourceLabel(event.source) }}
							</span>
							<span :class="[badgeBaseClass, getOperationalKindBadgeClass(event.event_kind)]">
								{{ getOperationalKindLabel(event.event_kind) }}
							</span>
						</div>
						<p class="mb-0.5 line-clamp-1 text-base font-medium text-white">
							{{ event.summary }}
						</p>
						<p class="text-sm text-white/50">
							{{ formatDateTime(event.occurred_at) }}
						</p>
					</article>
				</li>
			</ul>
		</template>
	</div>
</template>

<script setup lang="ts">
import { useAccessGate } from "~/composables/core/useAccessGate"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useWebSocketEventSubscription } from "~/composables/websocket/useWebSocket"
import MonitoringLogEmptyState from "~/components/common/MonitoringLogEmptyState.vue"
import {
	getOperationalKindBadgeClass,
	getOperationalKindLabel,
	getOperationalSourceLabel,
	useOperationalEvents,
} from "~/composables/systems/useOperationalEvents"
import { formatDateTime } from "~/utils/dateUtils"
import { MSG_PERMISSION_LOCKED } from "~/utils/apiError"
import type { OperationalEventNewEvent } from "~/types/websocket"

type HomeOpEvent = Pick<
	OperationalEventNewEvent,
	"id" | "source" | "event_kind" | "summary" | "occurred_at"
>

const OPERATIONAL_LOG_ROUTE = "/core/operational-log"
const EVENT_LIMIT = 5
const badgeBaseClass = "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"

const accessGate = useAccessGate()
const { getEvents } = useOperationalEvents()
const { handleError } = useErrorHandler()

const events = ref<HomeOpEvent[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

const accessReady = computed(() => accessGate.isModuleAccessReady.value)
const canAccess = computed(
	() => accessReady.value && accessGate.canAccessModule({ route: OPERATIONAL_LOG_ROUTE })
)

const handleOpenFullPage = () => {
	navigateTo(OPERATIONAL_LOG_ROUTE)
}

const parseWsEvent = (payload: unknown): HomeOpEvent | null => {
	const p = payload as Partial<OperationalEventNewEvent> | null
	const id = Number(p?.id)
	if (!Number.isFinite(id) || !p?.source || !p?.event_kind || !p?.summary) return null
	return {
		id,
		source: String(p.source),
		event_kind: String(p.event_kind),
		summary: String(p.summary),
		occurred_at: String(p.occurred_at || p.timestamp || ""),
	}
}

const loadEvents = async () => {
	if (!canAccess.value) return
	isLoading.value = true
	errorMessage.value = null
	try {
		const result = await getEvents({ limit: EVENT_LIMIT, offset: 0 })
		events.value = (result.events ?? []).map((e) => ({
			id: e.id,
			source: e.source,
			event_kind: e.event_kind,
			summary: e.summary,
			occurred_at: e.occurred_at,
		}))
	} catch (error) {
		events.value = []
		errorMessage.value = handleError(error, "載入營運事件失敗") || "載入營運事件失敗"
	} finally {
		isLoading.value = false
	}
}

const handleWsEvent = (payload: unknown) => {
	if (!canAccess.value) return
	const next = parseWsEvent(payload)
	if (!next) return
	events.value = [next, ...events.value.filter((e) => e.id !== next.id)].slice(0, EVENT_LIMIT)
	errorMessage.value = null
}

useWebSocketEventSubscription("operational-event:new", handleWsEvent, {
	enabled: canAccess,
})

watch(
	canAccess,
	(allowed) => {
		if (!allowed) {
			events.value = []
			errorMessage.value = null
			isLoading.value = false
			return
		}
		void loadEvents()
	},
	{ immediate: true }
)
</script>
