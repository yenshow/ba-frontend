<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[3000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] px-4 backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="surveillance-download-title"
				@click.self="handleClose"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-[min(92vw,86rem)] flex-col gap-4 overflow-hidden rounded-3xl p-7 2xl:gap-6 2xl:p-8"
				>
					<header class="flex items-center justify-between gap-3">
						<h3
							id="surveillance-download-title"
							class="min-w-0 truncate text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
						>
							下載影片
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<p v-if="!nvrId" class="form-error-text">請先選擇 NVR 或加入回放畫面</p>
					<p v-else-if="loadError" class="form-error-text">{{ loadError }}</p>
					<p v-else-if="channelsLoading" class="text-sm text-white/60 2xl:text-base">載入通道中…</p>

					<div class="min-h-0 flex-1 overflow-auto">
						<table class="w-max min-w-full border-collapse text-left">
							<thead class="sticky top-0 bg-[rgba(5,24,40,0.92)]">
								<tr>
									<th class="table-th w-12">
										<input
											type="checkbox"
											:checked="allSelected"
											:indeterminate.prop="someSelected && !allSelected"
											:disabled="rows.length === 0 || isQueueRunning"
											aria-label="全選通道"
											@change="handleToggleAll"
										/>
									</th>
									<th class="table-th whitespace-nowrap">通道名稱</th>
									<th class="table-th w-32 whitespace-nowrap">串流類型</th>
									<th class="table-th min-w-[33rem] whitespace-nowrap">時間範圍</th>
									<th class="table-th w-24 whitespace-nowrap">下載進度</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="row in rows" :key="row.key" class="border-t border-white/10">
									<td class="table-td">
										<input
											v-model="row.selected"
											type="checkbox"
											:disabled="isQueueRunning"
											:aria-label="`選擇 ${row.label}`"
										/>
									</td>
									<td class="table-td text-sm 2xl:text-base">{{ row.label }}</td>
									<td class="table-td">
										<select
											v-model="row.stream"
											class="form-input w-28 !px-2.5 !py-1.5 text-sm"
											:disabled="isQueueRunning"
											aria-label="串流類型"
										>
											<option value="main">主串流</option>
											<option value="sub" :disabled="row.subTrackId == null">子串流</option>
										</select>
									</td>
									<td class="table-td min-w-[33rem] overflow-visible whitespace-nowrap">
										<div class="flex flex-nowrap items-center gap-1.5">
											<input
												v-model="row.startDate"
												type="date"
												:max="todayYmd"
												class="form-input w-[9.25rem] shrink-0 !px-2.5 !py-1.5 text-sm"
												:disabled="isQueueRunning"
												aria-label="開始日期"
											/>
											<input
												:value="row.startTime"
												type="text"
												inputmode="numeric"
												placeholder="00:00:00"
												class="form-input w-[6.5rem] shrink-0 !px-2.5 !py-1.5 font-mono text-sm tabular-nums"
												:disabled="isQueueRunning"
												aria-label="開始時間"
												@blur="handleClockBlur(row, 'startTime', $event)"
											/>
											<span class="shrink-0 text-sm text-white/50">－</span>
											<input
												v-model="row.endDate"
												type="date"
												:max="todayYmd"
												class="form-input w-[9.25rem] shrink-0 !px-2.5 !py-1.5 text-sm"
												:disabled="isQueueRunning"
												aria-label="結束日期"
											/>
											<input
												:value="row.endTime"
												type="text"
												inputmode="numeric"
												placeholder="23:59:59"
												class="form-input w-[6.5rem] shrink-0 !px-2.5 !py-1.5 font-mono text-sm tabular-nums"
												:disabled="isQueueRunning"
												aria-label="結束時間"
												@blur="handleClockBlur(row, 'endTime', $event)"
											/>
										</div>
									</td>
									<td class="table-td text-sm 2xl:text-base">{{ progressLabel(row) }}</td>
								</tr>
							</tbody>
						</table>
					</div>

					<footer class="flex items-center gap-3 border-t border-white/20 pt-4 2xl:gap-4">
						<button
							type="button"
							class="btn-secondary"
							:disabled="!isQueueRunning"
							@click="handleStopDownload"
						>
							停止下載
						</button>
						<div class="flex-1" />
						<button
							type="button"
							class="btn-primary"
							:disabled="!canStartDownload"
							@click="handleStartDownload"
						>
							下載
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { NvrVirtualChannel } from "~/types/surveillance"
import { useNvrApi } from "~/composables/systems/surveillance/useNvrApi"
import { formatTaipeiYmd, rewritePlaybackUriTimes } from "~/utils/nvrPlaybackTime"

type StreamKind = "main" | "sub"
type RowStatus = "idle" | "downloading" | "done" | "empty" | "error" | "cancelled"

type DownloadRow = {
	key: string
	label: string
	mainTrackId: number
	subTrackId: number | null
	stream: StreamKind
	selected: boolean
	startDate: string
	startTime: string
	endDate: string
	endTime: string
	progress: number | null
	status: RowStatus
	message: string
}

interface Props {
	modelValue: boolean
	nvrId: number | null
	selectedDate: string
	preselectedTrackIds?: readonly number[]
}

const props = withDefaults(defineProps<Props>(), {
	preselectedTrackIds: () => [],
})

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	"update:running": [value: boolean]
}>()

const nvrApi = useNvrApi()
const todayYmd = computed(() => formatTaipeiYmd())
const rows = ref<DownloadRow[]>([])
const channelsLoading = ref(false)
const loadError = ref<string | null>(null)
const isQueueRunning = ref(false)
const CLOCK_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/

let abortController: AbortController | null = null

const selectedRows = computed(() => rows.value.filter((row) => row.selected))
const allSelected = computed(() => rows.value.length > 0 && rows.value.every((row) => row.selected))
const someSelected = computed(() => rows.value.some((row) => row.selected))
const canStartDownload = computed(
	() => !!props.nvrId && selectedRows.value.length > 0 && !isQueueRunning.value && !channelsLoading.value
)

const resolveSubTrackId = (channel: NvrVirtualChannel) =>
	channel.streamingProxyChannelIds.find((id) => id % 100 === 2) ??
	channel.streamingProxyChannelIds.find((id) => id !== channel.liveTrackId) ??
	(channel.channelId != null ? channel.channelId * 100 + 2 : null)

const normalizeClock = (value: string) => {
	const match = CLOCK_RE.exec(value.trim())
	if (!match) return null
	return `${match[1]}:${match[2]}:${match[3] ?? "00"}`
}

const toIso = (ymd: string, clock: string) =>
	new Date(`${ymd}T${normalizeClock(clock) || clock}+08:00`).toISOString()

const handleClockBlur = (row: DownloadRow, key: "startTime" | "endTime", event: Event) => {
	const input = event.target as HTMLInputElement
	const next = normalizeClock(input.value)
	if (next) {
		row[key] = next
		input.value = next
		return
	}
	input.value = row[key]
}

const triggerBlobDownload = (blob: Blob, filename: string) => {
	const url = URL.createObjectURL(blob)
	const link = document.createElement("a")
	link.href = url
	link.download = filename
	link.click()
	URL.revokeObjectURL(url)
}

const progressLabel = (row: DownloadRow) => {
	if (row.status === "downloading") {
		if (row.progress == null) return "下載中"
		return `${row.progress}%`
	}
	if (row.status === "done") return "完成"
	if (row.status === "empty") return "此時段無錄影"
	if (row.status === "cancelled") return "已停止"
	if (row.status === "error") return row.message || "失敗"
	return "—"
}

const buildRows = (channels: NvrVirtualChannel[]) => {
	const preselected = new Set(props.preselectedTrackIds)
	const next: DownloadRow[] = []
	for (const channel of channels) {
		if (channel.liveTrackId == null && channel.channelId == null) continue
		const mainTrackId =
			channel.liveTrackId ?? (channel.channelId != null ? channel.channelId * 100 + 1 : 0)
		if (mainTrackId <= 0) continue
		next.push({
			key: `${channel.nvrId}-${channel.channelId ?? mainTrackId}`,
			label: `[D${channel.channelId ?? mainTrackId}] ${channel.name}`,
			mainTrackId,
			subTrackId: resolveSubTrackId(channel),
			selected: preselected.has(mainTrackId),
			startDate: props.selectedDate,
			startTime: "00:00:00",
			endDate: props.selectedDate,
			endTime: "23:59:59",
			progress: null,
			status: "idle",
			stream: "main",
			message: "",
		})
	}
	rows.value = next
}

const loadChannels = async () => {
	if (!props.nvrId) {
		rows.value = []
		loadError.value = null
		return
	}
	channelsLoading.value = true
	loadError.value = null
	try {
		const channels = await nvrApi.listChannels(props.nvrId)
		buildRows(channels)
	} catch (error) {
		loadError.value = error instanceof Error ? error.message : "載入通道失敗"
		rows.value = []
	} finally {
		channelsLoading.value = false
	}
}

const handleToggleAll = (event: Event) => {
	const checked = (event.target as HTMLInputElement).checked
	rows.value.forEach((row) => {
		row.selected = checked
	})
}

const handleStopDownload = () => {
	abortController?.abort()
}

const handleStartDownload = async () => {
	if (!props.nvrId || selectedRows.value.length === 0 || isQueueRunning.value) return
	isQueueRunning.value = true
	emit("update:running", true)
	abortController = new AbortController()
	const nvrId = props.nvrId
	try {
		for (const row of selectedRows.value) {
			if (abortController.signal.aborted) {
				row.status = "cancelled"
				row.progress = null
				continue
			}
			const trackId = row.stream === "sub" && row.subTrackId != null ? row.subTrackId : row.mainTrackId
			const startTime = toIso(row.startDate, row.startTime)
			const endTime = toIso(row.endDate, row.endTime)
			if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
				row.status = "error"
				row.message = "結束時間須晚於開始時間"
				continue
			}
			row.status = "downloading"
			row.progress = null
			row.message = ""
			try {
				const search = await nvrApi.searchRecordings(nvrId, { trackId, startTime, endTime })
				const match = (search.matches || []).find((item) => item.playbackURI) || search.matches?.[0]
				if (!match?.playbackURI) {
					row.status = "empty"
					row.progress = null
					continue
				}
				const playbackURI = rewritePlaybackUriTimes(match.playbackURI, startTime, endTime)
				const blob = await nvrApi.downloadRecording(
					nvrId,
					{ playbackURI, trackId, startTime, endTime },
					{
						signal: abortController.signal,
						onProgress: (loaded, total) => {
							row.progress = total && total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : null
						},
					}
				)
				const stamp = `${row.startDate}-${row.startTime.replace(/:/g, "")}`
				triggerBlobDownload(blob, `nvr-${nvrId}-ch-${trackId}-${stamp}.mp4`)
				row.status = "done"
				row.progress = 100
			} catch (error) {
				if (abortController.signal.aborted) {
					row.status = "cancelled"
					row.progress = null
					continue
				}
				row.status = "error"
				row.message = error instanceof Error ? error.message : "下載失敗"
				row.progress = null
			}
		}
	} finally {
		isQueueRunning.value = false
		emit("update:running", false)
		abortController = null
	}
}

const handleClose = () => {
	if (isQueueRunning.value) handleStopDownload()
	emit("update:modelValue", false)
}

watch(
	() => props.modelValue,
	async (open) => {
		if (!open) return
		await loadChannels()
	}
)
</script>
