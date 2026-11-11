<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2200] flex items-center justify-center bg-[rgba(5,24,40,0.8)] px-4 backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="alert-nvr-clip-title"
				@click.self="handleClose"
			>
				<div
					class="dialog-panel-bg flex max-h-[92vh] w-full max-w-[min(56rem,94vw)] flex-col gap-4 overflow-hidden rounded-3xl p-5 2xl:gap-5 2xl:p-6"
				>
					<header class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<h3
								id="alert-nvr-clip-title"
								class="truncate text-lg font-semibold tracking-[2px] text-white 2xl:text-xl"
							>
								警報錄影回放
							</h3>
							<p class="mt-1 truncate text-xs text-white/70 2xl:text-sm">
								{{ headerSubtitle }}
							</p>
						</div>
						<button
							type="button"
							class="shrink-0 cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉回放"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<div
						v-if="targets.length > 1"
						class="flex flex-wrap gap-2"
						role="tablist"
						aria-label="NVR 通道切換"
					>
						<button
							v-for="(t, i) in targets"
							:key="`${t.nvrId}-${t.trackId}`"
							type="button"
							class="rounded-lg px-3 py-1.5 text-sm transition-colors"
							:class="
								i === activeIndex
									? 'bg-cyan-500/30 text-cyan-50'
									: 'bg-white/10 text-white/70 hover:bg-white/15'
							"
							:aria-selected="i === activeIndex"
							role="tab"
							@click="handleSelectTarget(i)"
						>
							{{ t.label || `NVR ${t.nvrId} · ${t.trackId}` }}
						</button>
					</div>

					<div
						class="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/15 bg-black"
						:aria-busy="phase === 'loading' || phase === 'idle'"
					>
						<VideoPlayer
							v-if="phase === 'playing'"
							class="absolute inset-0"
							:webrtc-url="webrtcUrl"
							:webrtc-port="webrtcPort"
							stream-status="running"
							:external-error="''"
							@reload="handleReloadPlayback"
						/>
						<div
							v-if="phase === 'loading' || phase === 'idle'"
							class="absolute inset-0 flex items-center justify-center text-sm text-white/70"
						>
							載入錄影中…
						</div>
						<div
							v-else-if="phase === 'empty'"
							class="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white/60"
						>
							此時段無錄影
						</div>
						<div
							v-else-if="phase === 'error'"
							class="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-amber-200"
						>
							{{ errorMessage || "回放失敗" }}
						</div>
					</div>

					<footer class="flex items-center gap-3">
						<p v-if="clipRangeLabel" class="min-w-0 flex-1 truncate text-xs text-white/60">
							{{ clipRangeLabel }}
						</p>
						<div v-else class="flex-1" />
						<button
							type="button"
							class="btn-primary"
							:disabled="!canDownload || isDownloading"
							aria-label="下載此錄影片段"
							@click="handleDownload"
						>
							{{ isDownloading ? `下載中 ${downloadProgress}%` : "下載片段" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import VideoPlayer from "~/components/surveillance/VideoPlayer.vue"
import { useNvrApi } from "~/composables/systems/surveillance/useNvrApi"
import type { NvrSearchMatch } from "~/types/surveillance"
import {
	formatTaipeiYmd,
	parseIsoMs,
	taipeiDayEndMs,
	taipeiDayStartMs,
} from "~/utils/nvrPlaybackTime"
import { formatDateTime } from "~/utils/dateUtils"
import type { AlertNvrClipTarget } from "~/utils/alertNvrClip"

export type { AlertNvrClipTarget }

type Phase = "idle" | "loading" | "playing" | "empty" | "error"

interface Props {
	modelValue: boolean
	targets: AlertNvrClipTarget[]
	alertAt: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void
}>()

const nvrApi = useNvrApi()

const activeIndex = ref(0)
const phase = ref<Phase>("idle")
const errorMessage = ref("")
const webrtcUrl = ref("")
const webrtcPort = ref<number | undefined>(undefined)
const sessionId = ref("")
const activeNvrId = ref<number | null>(null)
const matchedClip = ref<NvrSearchMatch | null>(null)
const isDownloading = ref(false)
const downloadProgress = ref(0)
let objectUrl = ""

const activeTarget = computed(() => props.targets[activeIndex.value] ?? null)

const headerSubtitle = computed(() => {
	const t = activeTarget.value
	const when = props.alertAt ? formatDateTime(props.alertAt) : "—"
	if (!t) return when
	return `${t.label || `NVR #${t.nvrId}`} · 警報 ${when}`
})

const clipRangeLabel = computed(() => {
	const m = matchedClip.value
	if (!m?.startTime || !m?.endTime) return ""
	return `${formatDateTime(m.startTime)} ～ ${formatDateTime(m.endTime)}`
})

const canDownload = computed(
	() =>
		phase.value === "playing" &&
		!!matchedClip.value?.startTime &&
		!!matchedClip.value?.endTime &&
		!!activeTarget.value
)

const revokeObjectUrl = () => {
	if (!objectUrl) return
	URL.revokeObjectURL(objectUrl)
	objectUrl = ""
}

const triggerBrowserDownload = (url: string, filename: string) => {
	if (!import.meta.client || !url || !filename) return
	const anchor = document.createElement("a")
	anchor.href = url
	anchor.download = filename
	anchor.rel = "noopener"
	document.body.appendChild(anchor)
	anchor.click()
	anchor.remove()
}

const stopCurrentSession = async () => {
	const nvrId = activeNvrId.value
	const sid = sessionId.value
	sessionId.value = ""
	activeNvrId.value = null
	webrtcUrl.value = ""
	webrtcPort.value = undefined
	if (nvrId != null && sid) {
		try {
			await nvrApi.stopPlayback(nvrId, sid)
		} catch {
			// ignore stop errors on close/switch
		}
	}
}

const findContainingMatch = (matches: NvrSearchMatch[], alertMs: number) => {
	for (const m of matches || []) {
		const start = parseIsoMs(m.startTime)
		const end = parseIsoMs(m.endTime)
		if (start == null || end == null) continue
		if (start <= alertMs && alertMs <= end) return m
	}
	return null
}

const loadActiveClip = async () => {
	const target = activeTarget.value
	if (!target || !props.alertAt) {
		phase.value = "empty"
		matchedClip.value = null
		return
	}
	phase.value = "loading"
	errorMessage.value = ""
	matchedClip.value = null
	await stopCurrentSession()

	const alertMs = new Date(props.alertAt).getTime()
	if (!Number.isFinite(alertMs)) {
		phase.value = "error"
		errorMessage.value = "警報時間無效"
		return
	}

	const ymd = formatTaipeiYmd(new Date(alertMs))
	const startTime = new Date(taipeiDayStartMs(ymd)).toISOString()
	const endTime = new Date(taipeiDayEndMs(ymd)).toISOString()

	try {
		const search = await nvrApi.searchRecordings(target.nvrId, {
			trackId: target.trackId,
			startTime,
			endTime,
		})
		const match = findContainingMatch(search.matches || [], alertMs)
		if (!match) {
			phase.value = "empty"
			return
		}
		matchedClip.value = match

		const playbackBody = match.playbackURI
			? { playbackURI: match.playbackURI }
			: {
					trackId: target.trackId,
					startTime: String(match.startTime),
					endTime: String(match.endTime),
				}
		const res = await nvrApi.startPlayback(target.nvrId, playbackBody)
		activeNvrId.value = target.nvrId
		sessionId.value = res.sessionId || ""
		webrtcUrl.value = res.webrtcUrl || ""
		webrtcPort.value = res.webrtcPort
		phase.value = "playing"
	} catch (e) {
		phase.value = "error"
		errorMessage.value = e instanceof Error ? e.message : "回放失敗"
	}
}

const handleSelectTarget = (index: number) => {
	if (index === activeIndex.value) return
	activeIndex.value = index
	void loadActiveClip()
}

const handleReloadPlayback = () => {
	void loadActiveClip()
}

const handleDownload = async () => {
	const target = activeTarget.value
	const match = matchedClip.value
	if (!target || !match?.startTime || !match?.endTime || isDownloading.value) return
	isDownloading.value = true
	downloadProgress.value = 0
	revokeObjectUrl()
	try {
		const blob = await nvrApi.downloadRecording(
			target.nvrId,
			{
				trackId: target.trackId,
				startTime: String(match.startTime),
				endTime: String(match.endTime),
			},
			{
				onProgress: (loaded, total) => {
					downloadProgress.value =
						total && total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 0
				},
			}
		)
		const stamp = formatTaipeiYmd(new Date(props.alertAt))
		const filename = `alert-nvr-${target.nvrId}-ch-${target.trackId}-${stamp}.mp4`
		objectUrl = URL.createObjectURL(blob)
		downloadProgress.value = 100
		triggerBrowserDownload(objectUrl, filename)
	} catch (e) {
		errorMessage.value = e instanceof Error ? e.message : "下載失敗"
	} finally {
		isDownloading.value = false
	}
}

const handleClose = () => {
	emit("update:modelValue", false)
}

watch(
	() => props.modelValue,
	async (open) => {
		if (!open) {
			await stopCurrentSession()
			phase.value = "idle"
			matchedClip.value = null
			errorMessage.value = ""
			revokeObjectUrl()
			return
		}
		activeIndex.value = 0
		await loadActiveClip()
	}
)

watch(
	() => props.targets,
	() => {
		if (!props.modelValue) return
		activeIndex.value = 0
		void loadActiveClip()
	}
)

onBeforeUnmount(() => {
	void stopCurrentSession()
	revokeObjectUrl()
})
</script>
