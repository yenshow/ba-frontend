<template>
	<div class="flex min-h-0 flex-col gap-4 pr-2 2xl:gap-5">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<p class="text-sm text-white/70 2xl:text-base">
				保全 DI 狀態變化（營運事件）。門禁刷卡明細請見門禁管理完整報表或營運事件。
			</p>
			<TimeRangePicker
				v-model="timeRange"
				:presets="[...TIME_RANGE_PRESETS_FULL_REPORT]"
			/>
		</div>

		<OperationalEventListSection
			:events="events"
			:total="total"
			:offset="offset"
			:limit="limit"
			:is-loading="isLoading"
			:error="loadError"
			:kind-stats="kindStats"
			@previous="handlePrevious"
			@next="handleNext"
		/>
	</div>
</template>

<script setup lang="ts">
import TimeRangePicker from "~/components/common/TimeRangePicker.vue"
import OperationalEventListSection from "~/components/operationalEvents/OperationalEventListSection.vue"
import {
	useOperationalEvents,
	type OperationalEvent,
} from "~/composables/systems/useOperationalEvents"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { getTimeRangeUTC, TIME_RANGE_PRESETS_FULL_REPORT } from "~/utils/dateUtils"

const api = useOperationalEvents()
const { handleError } = useErrorHandler()

const today = getTimeRangeUTC("today")
const timeRange = ref({
	startDate: today.start.toISOString(),
	endDate: today.end.toISOString(),
	preset: "today",
})

const events = ref<OperationalEvent[]>([])
const total = ref(0)
const offset = ref(0)
const limit = 20
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const kindStats = ref<Array<{ event_kind: string; count: number }>>([])

const loadEvents = async () => {
	if (!timeRange.value.startDate || !timeRange.value.endDate) return
	isLoading.value = true
	loadError.value = null
	try {
		const result = await api.getEvents({
			source: "security",
			start_date: timeRange.value.startDate,
			end_date: timeRange.value.endDate,
			limit,
			offset: offset.value,
		})
		events.value = result.events || []
		total.value = result.total || 0
		kindStats.value = result.byKind || []
	} catch (error) {
		events.value = []
		total.value = 0
		kindStats.value = []
		loadError.value = "載入保全營運事件失敗"
		handleError(error, "載入保全營運事件失敗")
	} finally {
		isLoading.value = false
	}
}

const handlePrevious = () => {
	offset.value = Math.max(0, offset.value - limit)
	void loadEvents()
}

const handleNext = () => {
	if (offset.value + limit >= total.value) return
	offset.value = offset.value + limit
	void loadEvents()
}

watch(
	() => [timeRange.value.startDate, timeRange.value.endDate] as const,
	() => {
		offset.value = 0
		void loadEvents()
	},
	{ immediate: true }
)
</script>
