<template>
	<div class="page-shell">
		<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
			<header class="flex shrink-0 flex-col gap-1 2xl:gap-2">
				<h1 class="page-title">營運事件</h1>
				<p class="page-subtitle">查詢現場控制、狀態變化與進出相關歷程</p>
			</header>

			<div class="flex shrink-0 flex-wrap items-center gap-3 2xl:gap-4">
				<div class="w-44 shrink-0 2xl:w-48">
					<FilterDropdown
						v-model="filterSource"
						:options="sourceOptions"
						placeholder="全部系統"
					/>
				</div>
				<div class="w-44 shrink-0 2xl:w-48">
					<FilterDropdown
						v-model="filterKind"
						:options="kindOptions"
						placeholder="全部類型"
					/>
				</div>
				<TimeRangePicker v-model="timeRange" :presets="timeRangePresets" />

				<PermissionActionButton
					:allowed="canExportReport"
					:disabled="isLoading || events.length === 0"
					aria-label="匯出 CSV"
					class="shrink-0 whitespace-nowrap rounded-xl border border-white/20 bg-green-500/80 px-4 py-2 text-sm text-white transition-colors enabled:hover:bg-green-400 2xl:px-6 2xl:py-3 2xl:text-base"
					@click="handleExport"
				>
					匯出 CSV
				</PermissionActionButton>
			</div>
		</div>

		<div class="mt-6">
			<OperationalEventListSection
				:events="events"
				:total="totalEvents"
				:offset="offset"
				:limit="limit"
				:is-loading="isLoading"
				:error="listLoadError"
				:kind-stats="kindStats"
				@previous="goToPreviousPage"
				@next="goToNextPage"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useToast } from "~/composables/core/useToast"
import { useOperationalLogRbac } from "~/composables/core/useAccessGate"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useOperationalEventApi } from "~/composables/systems/operationalEvents/useOperationalEventApi"
import type { OperationalEvent } from "~/types/operationalEvent"
import {
	OPERATIONAL_KIND_OPTIONS,
	buildOperationalSourceFilterOptions,
	getOperationalKindLabel,
	getOperationalSourceLabel,
} from "~/utils/operationalEventUtils"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import TimeRangePicker from "~/components/common/TimeRangePicker.vue"
import OperationalEventListSection from "~/components/operationalEvents/OperationalEventListSection.vue"
import { useDataLoader } from "~/composables/monitoring/useDataLoader"
import { logger } from "~/utils/logger"
import { exportCsv } from "~/utils/csvExport"
import { formatDateTime, getTodayDateRangeUTC } from "~/utils/dateUtils"

const pageLogger = logger.createLogger("operational-log")

definePageMeta({
	layout: "default",
})

const api = useOperationalEventApi()
const toast = useToast()
const { canExportReport } = useOperationalLogRbac()
const { handleError: handleApiError } = useErrorHandler()

const filterSource = ref("")
const filterKind = ref("")
const kindStats = ref<Array<{ event_kind: string; count: number }>>([])

const sourceOptions = buildOperationalSourceFilterOptions()
const kindOptions = [...OPERATIONAL_KIND_OPTIONS]

const timeRange = ref({
	startDate: "",
	endDate: "",
	preset: "today",
})

const timeRangePresets = [
	{ value: "today", label: "今天" },
	{ value: "yesterday", label: "昨天" },
	{ value: "this_week", label: "本週" },
	{ value: "last_week", label: "上周" },
	{ value: "last_7_days", label: "近七天" },
	{ value: "last_30_days", label: "最近三十天" },
	{ value: "custom", label: "自訂" },
]

const {
	data: events,
	total: totalEvents,
	offset,
	isLoading,
	errorMessage: listLoadError,
	load,
	nextPage,
	prevPage,
	resetPage,
} = useDataLoader<OperationalEvent, Record<string, never>>({
	fetcher: async (params) => {
		const result = await api.getEvents({
			source: filterSource.value || undefined,
			event_kind: filterKind.value || undefined,
			start_date: timeRange.value.startDate || undefined,
			end_date: timeRange.value.endDate || undefined,
			limit: params.limit as number,
			offset: params.offset as number,
		})
		kindStats.value = result.byKind || []
		return { items: result.events, total: result.total }
	},
	debounce: 150,
	pageSize: 5,
	onError: (err) =>
		handleApiError(err, "載入營運事件失敗") || "載入營運事件失敗",
})

const limit = 5

const initializeTimeRange = () => {
	const { start, end } = getTodayDateRangeUTC()
	timeRange.value = {
		startDate: start.toISOString(),
		endDate: end.toISOString(),
		preset: "today",
	}
}

watch(
	[
		filterSource,
		filterKind,
		() => timeRange.value.startDate,
		() => timeRange.value.endDate,
	],
	() => {
		if (!timeRange.value.startDate || !timeRange.value.endDate) return
		resetPage()
		load({}, true)
	},
)

onMounted(() => {
	initializeTimeRange()
})

const goToPreviousPage = () => {
	prevPage({})
}

const goToNextPage = () => {
	nextPage({})
}

const handleExport = async () => {
	try {
		const result = await api.getEvents({
			source: filterSource.value || undefined,
			event_kind: filterKind.value || undefined,
			start_date: timeRange.value.startDate || undefined,
			end_date: timeRange.value.endDate || undefined,
			limit: 5000,
			offset: 0,
		})
		if (result.events.length === 0) {
			toast.info("目前沒有可匯出的營運事件")
			return
		}
		const headers = [
			"時間",
			"系統",
			"類型",
			"摘要",
			"位元",
			"位址",
			"舊值",
			"新值",
			"操作者",
			"警報ID",
			"設備ID",
		]
		const rows = result.events.map((e) => ({
			時間: formatDateTime(e.occurred_at),
			系統: getOperationalSourceLabel(e.source),
			類型: getOperationalKindLabel(e.event_kind),
			摘要: e.summary,
			位元: e.bit_key ?? "",
			位址: e.address == null ? "" : String(e.address),
			舊值: e.old_value == null ? "" : e.old_value ? "開啟" : "關閉",
			新值: e.new_value == null ? "" : e.new_value ? "開啟" : "關閉",
			操作者: e.actor_user_id == null ? "" : String(e.actor_user_id),
			警報ID: e.alert_id == null ? "" : String(e.alert_id),
			設備ID: e.device_id == null ? "" : String(e.device_id),
		}))
		exportCsv(headers, rows, "operational-events.csv")
		toast.success(`已匯出 ${result.events.length} 筆營運事件`, 3000)
	} catch (error) {
		pageLogger.warn("匯出營運事件失敗", error)
		handleApiError(error, "匯出營運事件失敗")
	}
}
</script>
