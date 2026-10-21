<template>
	<div
		class="flex shrink-0 flex-col bg-black text-white"
		role="region"
		aria-label="錄影回放時間軸"
	>
		<div
			class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-t border-white/15 px-3 py-1.5"
		>
			<div class="flex min-w-0 items-center gap-1.5">
				<span class="hidden text-xs text-white/60 sm:inline">日期</span>
				<button
					type="button"
					class="rounded px-2 py-1 text-sm hover:bg-white/10"
					aria-label="前一日"
					@click="emit('shiftDate', -1)"
				>
					‹
				</button>
				<div ref="calendarWrapRef" class="relative">
					<button
						type="button"
						class="min-w-0 rounded-lg border border-sky-200/80 bg-white px-2.5 py-1 text-sm font-medium text-slate-800 shadow-sm hover:bg-sky-50"
						aria-label="回放日期"
						:aria-expanded="isCalendarOpen"
						@click="handleToggleCalendar"
					>
						{{ selectedDate }}
					</button>
					<div
						v-if="isCalendarOpen"
						class="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-2xl bg-white p-3 text-slate-800 shadow-2xl ring-1 ring-slate-200"
						role="dialog"
						aria-label="回放月曆"
					>
						<div class="mb-2 flex items-center justify-between text-sm">
							<button
								type="button"
								class="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
								aria-label="上個月"
								@click="handleShiftCalendarMonth(-1)"
							>
								‹
							</button>
							<span class="font-semibold text-slate-800">
								{{ calendarYear }}-{{ pad2(calendarMonth) }}
							</span>
							<button
								type="button"
								class="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
								:disabled="!canGoNextCalendarMonth"
								aria-label="下個月"
								@click="handleShiftCalendarMonth(1)"
							>
								›
							</button>
						</div>
						<div class="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400">
							<span v-for="label in WEEKDAY_LABELS" :key="label">{{ label }}</span>
						</div>
						<div class="mt-1 grid grid-cols-7 gap-1">
							<button
								v-for="cell in calendarCells"
								:key="cell.key"
								type="button"
								class="relative flex h-8 items-center justify-center rounded-lg text-xs"
								:class="calendarCellClass(cell)"
								:disabled="cell.disabled || !cell.ymd"
								@click="handlePickDate(cell.ymd)"
							>
								<span>{{ cell.dayLabel }}</span>
								<span
									v-if="cell.hasRecording"
									class="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-sky-500"
									aria-hidden="true"
								/>
							</button>
						</div>
					</div>
				</div>
				<button
					type="button"
					class="rounded px-2 py-1 text-sm hover:bg-white/10 disabled:opacity-40"
					:disabled="!canGoNextDay"
					aria-label="後一日"
					@click="emit('shiftDate', 1)"
				>
					›
				</button>
			</div>

			<div class="flex items-center justify-center gap-2">
				<button
					type="button"
					class="rounded bg-white/15 px-3 py-1 text-sm hover:bg-white/25"
					:aria-label="isPlaying ? '暫停' : '播放'"
					@click="isPlaying ? emit('pause') : emit('play')"
				>
					{{ isPlaying ? "暫停" : "播放" }}
				</button>
				<div ref="clockWrapRef" class="relative">
					<button
						type="button"
						class="min-w-[6.5rem] rounded-lg px-2.5 py-1 text-center font-mono text-sm tabular-nums"
						:class="
							isPlaying
								? 'cursor-default text-white'
								: 'border border-sky-200/80 bg-white text-slate-800 shadow-sm hover:bg-sky-50'
						"
						:disabled="isPlaying"
						:aria-expanded="isClockOpen"
						aria-label="回放時間"
						aria-live="polite"
						@click="handleToggleClock"
					>
						{{ displayPlayheadLabel }}
					</button>
					<div
						v-if="isClockOpen && !isPlaying"
						class="absolute bottom-full left-1/2 z-30 mb-2 w-52 -translate-x-1/2 rounded-2xl bg-white p-3 text-slate-800 shadow-2xl ring-1 ring-slate-200"
						role="dialog"
						aria-label="選擇回放時間"
					>
						<div class="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-1">
							<div
								v-for="part in CLOCK_PARTS"
								:key="part.key"
								class="contents"
							>
								<label class="flex flex-col items-center gap-1">
									<select
										:value="clockValue(part.key)"
										class="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 text-center font-mono text-lg font-semibold text-slate-800 outline-none focus:border-sky-400 focus:bg-white"
										:aria-label="part.label"
										@change="handleClockSelect(part.key, $event)"
									>
										<option
											v-for="option in part.key === 'hour' ? HOUR_OPTIONS : MINUTE_OPTIONS"
											:key="`${part.key}-${option}`"
											:value="option"
										>
											{{ pad2(option) }}
										</option>
									</select>
									<span class="text-[11px] text-slate-400">{{ part.label }}</span>
								</label>
								<span
									v-if="part.key !== 'second'"
									class="pb-6 text-xl font-semibold text-slate-300"
								>
									:
								</span>
							</div>
						</div>
						<button
							type="button"
							class="mt-3 w-full rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
							@click="handleConfirmClock"
						>
							確定
						</button>
					</div>
				</div>
			</div>

			<div class="flex items-center justify-end gap-2 whitespace-nowrap">
				<label class="flex items-center gap-1 text-xs text-white/70">
					<span class="hidden sm:inline">範圍</span>
					<select
						:value="zoomHours"
						class="rounded border border-white/30 bg-black px-2 py-1 text-sm text-white [color-scheme:dark]"
						aria-label="時間軸範圍"
						@change="handleZoomChange"
					>
						<option
							v-for="hours in ZOOM_OPTIONS"
							:key="hours"
							:value="hours"
						>
							{{ hours }} 小時
						</option>
					</select>
				</label>
				<button
					type="button"
					class="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20 disabled:opacity-40"
					:disabled="isDownloading"
					:aria-busy="isDownloading"
					aria-label="下載錄影"
					@click="emit('download')"
				>
					{{ isDownloading ? "下載中" : "下載" }}
				</button>
			</div>
		</div>

		<p v-if="searchError" class="px-3 text-xs text-red-300">{{ searchError }}</p>

		<div
			ref="trackRef"
			class="relative h-16 w-full cursor-ew-resize overflow-hidden"
			aria-label="回放時間軸"
			@pointerdown="handleTrackPointerDown"
			@pointermove="handleTrackPointerMove"
			@pointerup="handleTrackPointerUp"
			@pointercancel="handleTrackPointerUp"
		>
			<div
				v-for="(tick, index) in axisTicks"
				:key="`tick-${tick.offsetMs}-${index}`"
				class="pointer-events-none absolute top-0 bottom-0"
				:style="{ left: `${tick.left}%` }"
			>
				<div
					:class="tick.major ? 'h-3 w-px' : 'h-2 w-px'"
					:style="{ backgroundColor: tick.inDay ? (tick.major ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.12)' }"
				/>
				<span
					v-if="tick.label"
					class="absolute left-0 top-3.5 whitespace-nowrap text-[10px] text-white/70"
					:class="tickLabelClass(tick.left)"
				>
					{{ tick.label }}
				</span>
			</div>
			<div
				v-for="(seg, index) in visibleBars"
				:key="`bar-${seg.left}-${index}`"
				class="pointer-events-none absolute bottom-2 h-4 bg-cyan-400/80"
				:style="{ left: `${seg.left}%`, width: `${seg.width}%` }"
			/>
			<div
				class="pointer-events-none absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-red-500"
				style="left: 50%"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PlaybackZoomHours } from "~/types/surveillance"
import {
	DAY_DURATION_MS,
	daysInTaipeiMonth,
	formatAxisClock,
	formatPlayheadClock,
	formatTaipeiYmd,
	pad2,
	parsePlayheadClock,
	parseYmdParts,
	playbackTickMs,
	taipeiWeekdaySun0,
} from "~/utils/nvrPlaybackTime"

interface Segment {
	startMs: number
	endMs: number
}

interface CalendarCell {
	key: string
	ymd: string
	dayLabel: string
	disabled: boolean
	hasRecording: boolean
	isSelected: boolean
	isToday: boolean
}

type ClockPart = "hour" | "minute" | "second"

interface Props {
	selectedDate: string
	playheadLabel: string
	playheadMs: number
	dayStartMs: number
	isPlaying: boolean
	isDownloading: boolean
	canGoNextDay: boolean
	searchError?: string | null
	zoomHours: PlaybackZoomHours
	unionSegments: readonly Segment[]
	recordingDays?: readonly string[]
}

const props = withDefaults(defineProps<Props>(), {
	searchError: null,
	recordingDays: () => [],
})

const emit = defineEmits<{
	(e: "play"): void
	(e: "pause"): void
	(e: "download"): void
	(e: "shiftDate", delta: number): void
	(e: "setDate", ymd: string): void
	(e: "zoom", hours: PlaybackZoomHours): void
	(e: "seekOffset", offsetMs: number): void
	(e: "seekTime", clock: { hour: number; minute: number; second: number }): void
	(e: "loadCalendar", payload: { year: number; month: number }): void
	(e: "scrubStart"): void
	(e: "scrubCancel"): void
}>()

const ZOOM_OPTIONS: readonly PlaybackZoomHours[] = [24, 12, 6]
const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"] as const
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i)
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i)
const CLOCK_PARTS: ReadonlyArray<{ key: ClockPart; label: string }> = [
	{ key: "hour", label: "時" },
	{ key: "minute", label: "分" },
	{ key: "second", label: "秒" },
]

const trackRef = ref<HTMLElement | null>(null)
const calendarWrapRef = ref<HTMLElement | null>(null)
const clockWrapRef = ref<HTMLElement | null>(null)
const todayYmd = computed(() => formatTaipeiYmd())
const isDragging = ref(false)
const dragPreviewOffsetMs = ref(0)
const isCalendarOpen = ref(false)
const isClockOpen = ref(false)
const calendarYear = ref(new Date().getFullYear())
const calendarMonth = ref(new Date().getMonth() + 1)
const clockHour = ref(0)
const clockMinute = ref(0)
const clockSecond = ref(0)

let dragStartX = 0
let dragStartOffsetMs = 0
let dragMoved = false
let scrubStarted = false

const tickLabelClass = (left: number) => {
	if (left <= 1) return "translate-x-0"
	if (left >= 99) return "-translate-x-full"
	return "-translate-x-1/2"
}

const clampDayOffset = (offsetMs: number) =>
	Math.max(0, Math.min(DAY_DURATION_MS - 1, offsetMs))

const windowSpan = computed(() => Math.max(1, props.zoomHours * 60 * 60 * 1000))

const displayOffsetMs = computed(() =>
	isDragging.value ? dragPreviewOffsetMs.value : props.playheadMs
)

const displayPlayheadLabel = computed(() =>
	isDragging.value ? formatPlayheadClock(displayOffsetMs.value) : props.playheadLabel
)

const viewWindow = computed(() => {
	const center = props.dayStartMs + displayOffsetMs.value
	const half = windowSpan.value / 2
	return { startMs: center - half, endMs: center + half }
})

const axisTicks = computed(() => {
	const { startMs, endMs } = viewWindow.value
	const majorMs = playbackTickMs(props.zoomHours)
	const minorMs = majorMs / 2
	const span = windowSpan.value
	const remainder = (startMs - props.dayStartMs) % minorMs
	const first = remainder === 0 ? startMs : startMs - remainder
	const ticks: Array<{
		offsetMs: number
		left: number
		major: boolean
		inDay: boolean
		label: string
	}> = []
	for (let t = first; t <= endMs + 1; t += minorMs) {
		if (t < startMs - 1) continue
		const rel = t - props.dayStartMs
		const inDay = rel >= 0 && rel < DAY_DURATION_MS
		const major = rel % majorMs === 0
		ticks.push({
			offsetMs: rel,
			left: ((t - startMs) / span) * 100,
			major,
			inDay,
			label: major && inDay ? formatAxisClock(rel) : "",
		})
	}
	return ticks
})

const visibleBars = computed(() => {
	const { startMs, endMs } = viewWindow.value
	const span = windowSpan.value
	return props.unionSegments
		.filter((seg) => seg.endMs > startMs && seg.startMs < endMs)
		.map((seg) => {
			const leftMs = Math.max(seg.startMs, startMs)
			const rightMs = Math.min(seg.endMs, endMs)
			return {
				left: ((leftMs - startMs) / span) * 100,
				width: Math.max(0.2, ((rightMs - leftMs) / span) * 100),
			}
		})
})

const recordingDaySet = computed(() => new Set(props.recordingDays))

const canGoNextCalendarMonth = computed(() => {
	const today = parseYmdParts(todayYmd.value)
	if (!today) return false
	return (
		calendarYear.value < today.year ||
		(calendarYear.value === today.year && calendarMonth.value < today.month)
	)
})

const calendarCells = computed((): CalendarCell[] => {
	const firstYmd = `${calendarYear.value}-${pad2(calendarMonth.value)}-01`
	const lead = taipeiWeekdaySun0(firstYmd)
	const days = daysInTaipeiMonth(calendarYear.value, calendarMonth.value)
	const cells: CalendarCell[] = []
	for (let i = 0; i < lead; i += 1) {
		cells.push({
			key: `pad-${i}`,
			ymd: "",
			dayLabel: "",
			disabled: true,
			hasRecording: false,
			isSelected: false,
			isToday: false,
		})
	}
	for (let day = 1; day <= days; day += 1) {
		const ymd = `${calendarYear.value}-${pad2(calendarMonth.value)}-${pad2(day)}`
		cells.push({
			key: ymd,
			ymd,
			dayLabel: String(day),
			disabled: ymd > todayYmd.value,
			hasRecording: recordingDaySet.value.has(ymd),
			isSelected: ymd === props.selectedDate,
			isToday: ymd === todayYmd.value,
		})
	}
	return cells
})

const calendarCellClass = (cell: CalendarCell) => {
	if (!cell.ymd) return "opacity-0"
	if (cell.disabled) return "cursor-not-allowed text-slate-300"
	if (cell.isSelected) return "bg-sky-600 font-semibold text-white"
	if (cell.isToday) return "font-semibold text-sky-700 hover:bg-sky-50"
	return "text-slate-700 hover:bg-slate-100"
}

const clockValue = (part: ClockPart) => {
	if (part === "hour") return clockHour.value
	if (part === "minute") return clockMinute.value
	return clockSecond.value
}

const handleClockSelect = (part: ClockPart, event: Event) => {
	const value = Number((event.target as HTMLSelectElement).value)
	if (part === "hour") clockHour.value = value
	else if (part === "minute") clockMinute.value = value
	else clockSecond.value = value
}

const syncCalendarToSelected = () => {
	const parts = parseYmdParts(props.selectedDate)
	if (!parts) return
	calendarYear.value = parts.year
	calendarMonth.value = parts.month
}

const emitLoadCalendar = () => {
	emit("loadCalendar", { year: calendarYear.value, month: calendarMonth.value })
}

const handleToggleCalendar = () => {
	isClockOpen.value = false
	isCalendarOpen.value = !isCalendarOpen.value
	if (isCalendarOpen.value) {
		syncCalendarToSelected()
		emitLoadCalendar()
	}
}

const handleShiftCalendarMonth = (delta: number) => {
	let nextMonth = calendarMonth.value + delta
	let nextYear = calendarYear.value
	if (nextMonth < 1) {
		nextMonth = 12
		nextYear -= 1
	} else if (nextMonth > 12) {
		nextMonth = 1
		nextYear += 1
	}
	const today = parseYmdParts(todayYmd.value)
	if (today && (nextYear > today.year || (nextYear === today.year && nextMonth > today.month))) {
		return
	}
	calendarYear.value = nextYear
	calendarMonth.value = nextMonth
	emitLoadCalendar()
}

const handlePickDate = (ymd: string) => {
	if (!ymd || ymd > todayYmd.value) return
	emit("setDate", ymd)
	isCalendarOpen.value = false
}

const handleToggleClock = () => {
	if (props.isPlaying) return
	isCalendarOpen.value = false
	isClockOpen.value = !isClockOpen.value
	if (isClockOpen.value) {
		const clock = parsePlayheadClock(props.playheadLabel)
		clockHour.value = clock.hour
		clockMinute.value = clock.minute
		clockSecond.value = clock.second
	}
}

const handleConfirmClock = () => {
	emit("seekTime", {
		hour: clockHour.value,
		minute: clockMinute.value,
		second: clockSecond.value,
	})
	isClockOpen.value = false
}

const handleZoomChange = (event: Event) => {
	const hours = Number((event.target as HTMLSelectElement).value)
	if (hours === 24 || hours === 12 || hours === 6) emit("zoom", hours)
}

const handleTrackPointerDown = (event: PointerEvent) => {
	if (event.button !== 0) return
	const el = trackRef.value
	if (!el) return
	try {
		el.setPointerCapture(event.pointerId)
	} catch {
		/* 合成事件或環境不支援 capture 時仍可拖曳 */
	}
	isDragging.value = true
	dragMoved = false
	dragStartX = event.clientX
	dragStartOffsetMs = props.playheadMs
	dragPreviewOffsetMs.value = props.playheadMs
	scrubStarted = props.isPlaying
	if (scrubStarted) emit("scrubStart")
}

const handleTrackPointerMove = (event: PointerEvent) => {
	if (!isDragging.value) return
	if (Math.abs(event.clientX - dragStartX) > 3) dragMoved = true
	const el = trackRef.value
	const width = el?.getBoundingClientRect().width || 1
	const deltaMs = ((event.clientX - dragStartX) / width) * windowSpan.value
	dragPreviewOffsetMs.value = clampDayOffset(dragStartOffsetMs - deltaMs)
}

const handleTrackPointerUp = () => {
	if (!isDragging.value) return
	const next = dragPreviewOffsetMs.value
	const moved = dragMoved
	const wasScrubbing = scrubStarted
	isDragging.value = false
	dragMoved = false
	scrubStarted = false
	if (!moved) {
		if (wasScrubbing) emit("scrubCancel")
		return
	}
	emit("seekOffset", next)
}

const handleDocumentPointerDown = (event: PointerEvent) => {
	const target = event.target as Node | null
	if (isCalendarOpen.value && calendarWrapRef.value && target && !calendarWrapRef.value.contains(target)) {
		isCalendarOpen.value = false
	}
	if (isClockOpen.value && clockWrapRef.value && target && !clockWrapRef.value.contains(target)) {
		isClockOpen.value = false
	}
}

watch(
	() => props.isPlaying,
	(playing) => {
		if (playing) isClockOpen.value = false
	}
)

watch(
	() => props.selectedDate,
	() => {
		if (isCalendarOpen.value) syncCalendarToSelected()
	}
)

onMounted(() => {
	document.addEventListener("pointerdown", handleDocumentPointerDown)
})

onBeforeUnmount(() => {
	document.removeEventListener("pointerdown", handleDocumentPointerDown)
})
</script>
