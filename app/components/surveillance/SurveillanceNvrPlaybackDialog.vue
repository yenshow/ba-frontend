<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[3100] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px] p-4"
				role="dialog"
				aria-modal="true"
				aria-label="NVR 錄影回放"
				@click.self="handleClose"
			>
				<div
					class="dialog-panel-bg mx-auto flex max-h-[92vh] w-full max-w-[min(88rem,94vw)] flex-col overflow-hidden rounded-3xl p-4 2xl:p-6"
				>
					<header class="mb-3 flex items-start justify-between gap-3 2xl:mb-4">
						<h3 class="min-w-0 text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
							錄影回放
							<span v-if="title" class="font-normal tracking-normal text-white/80">{{
								title
							}}</span>
						</h3>
						<button
							type="button"
							class="shrink-0 cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<div
						class="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] lg:min-h-[480px] 2xl:min-h-[560px]"
					>
						<section
							class="flex min-h-[240px] flex-col gap-3 overflow-hidden lg:min-h-0"
							aria-label="錄影搜尋"
						>
							<div
								class="grid shrink-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
							>
								<label
									class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>開始時間</span>
									<DateTimeLocal24Input
										v-model="startLocal"
										aria-label="搜尋開始時間"
									/>
								</label>
								<label
									class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
								>
									<span>結束時間</span>
									<DateTimeLocal24Input
										v-model="endLocal"
										aria-label="搜尋結束時間"
									/>
								</label>
								<button
									type="button"
									class="btn-secondary shrink-0 whitespace-nowrap"
									:disabled="isSearching || !canSearch"
									:aria-busy="isSearching"
									@click="handleSearch"
								>
									搜尋
								</button>
							</div>

							<p
								v-if="errorMessage"
								class="shrink-0 text-sm text-red-300 2xl:text-base"
							>
								{{ errorMessage }}
							</p>

							<div
								class="show-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-white/15 bg-black/30 p-2 2xl:p-3"
								aria-label="搜尋結果"
							>
								<p
									v-if="!isSearching && matches.length === 0 && !errorMessage"
									class="px-2 py-8 text-center text-sm text-white/50 2xl:text-base"
								>
									選擇時間後搜尋，結果會顯示於此
								</p>
								<p
									v-else-if="matches.length > 0"
									class="px-1 text-sm text-white/60 2xl:text-base"
								>
									找到 {{ matches.length }} 段
								</p>
								<button
									v-for="m in matches"
									:key="`${m.index}-${m.startTime}`"
									type="button"
									:class="[
										'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors 2xl:px-4 2xl:py-3 2xl:text-base',
										activeMatchKey === matchKey(m)
											? 'border-cyan-400/50 bg-cyan-500/20 text-white'
											: 'border-white/10 bg-white/5 text-white/90 hover:bg-white/10',
									]"
									@click="handlePlayMatch(m)"
								>
									<span class="min-w-0 flex-1 break-all pr-2">{{
										formatMatchLabel(m)
									}}</span>
									<span class="shrink-0 font-medium text-cyan-300">播放</span>
								</button>
							</div>
						</section>

						<section
							class="relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-black lg:min-h-0"
							aria-label="回放畫面"
						>
							<button
								v-if="playbackWebrtcUrl"
								type="button"
								class="absolute right-2 top-2 z-20 rounded bg-black/60 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-black/80 2xl:text-base"
								aria-label="全螢幕播放"
								@click="isFullscreenOpen = true"
							>
								全螢幕
							</button>
							<div v-if="playbackWebrtcUrl" class="absolute inset-0">
								<SurveillanceVideoPlayer
									:key="playbackSessionId || 'pb'"
									:webrtc-url="playbackWebrtcUrl"
									:webrtc-port="playbackWebrtcPort"
									stream-status="running"
									class="h-full w-full"
								/>
							</div>
							<div
								v-else
								class="flex flex-1 items-center justify-center px-4 text-center text-sm text-white/50 2xl:text-base"
							>
								{{ isStartingPlayback ? "正在啟動回放…" : "選擇左側錄影片段以播放" }}
							</div>
						</section>
					</div>

					<footer class="mt-4 flex justify-end border-t border-white/20 pt-4">
						<button type="button" class="btn-secondary" aria-label="關閉" @click="handleClose">
							關閉
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>

	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue && isFullscreenOpen && playbackWebrtcUrl"
				class="fixed inset-0 z-[3200] flex flex-col bg-black"
				role="dialog"
				aria-modal="true"
				aria-label="回放全螢幕"
			>
				<div class="flex items-center justify-between gap-3 bg-black/80 px-4 py-3">
					<p class="truncate text-sm text-white/90 2xl:text-base">
						{{ title || "錄影回放" }}
					</p>
					<button
						type="button"
						class="rounded bg-white/10 px-3 py-1.5 text-sm text-white/90 hover:bg-white/20"
						aria-label="關閉全螢幕"
						@click="isFullscreenOpen = false"
					>
						關閉
					</button>
				</div>
				<div class="min-h-0 flex-1">
					<SurveillanceVideoPlayer
						:key="`fs-${playbackSessionId || 'pb'}`"
						:webrtc-url="playbackWebrtcUrl"
						:webrtc-port="playbackWebrtcPort"
						stream-status="running"
						class="h-full w-full"
					/>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { NvrSearchMatch } from "~/types/surveillance"
import DateTimeLocal24Input from "~/components/common/DateTimeLocal24Input.vue"
import { useNvrApi } from "~/composables/systems/surveillance/useNvrApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"

interface Props {
	modelValue: boolean
	nvrId: number
	trackId: number
	title?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
	"update:modelValue": [value: boolean]
}>()

const nvrApi = useNvrApi()
const { handleError } = useErrorHandler()

const startLocal = ref("")
const endLocal = ref("")
const isSearching = ref(false)
const isStartingPlayback = ref(false)
const isFullscreenOpen = ref(false)
const errorMessage = ref<string | null>(null)
const matches = ref<NvrSearchMatch[]>([])
const playbackWebrtcUrl = ref("")
const playbackWebrtcPort = ref<number | undefined>(undefined)
const playbackSessionId = ref<string | null>(null)
const activeMatchKey = ref("")

const canSearch = computed(
	() => props.nvrId > 0 && props.trackId > 0 && !!startLocal.value && !!endLocal.value
)

const matchKey = (m: NvrSearchMatch): string => `${m.index}|${m.startTime || ""}|${m.endTime || ""}`

const toLocalInputValue = (d: Date): string => {
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const localInputToIso = (local: string): string => {
	const d = new Date(local)
	return d.toISOString()
}

const formatMatchLabel = (m: NvrSearchMatch): string => {
	const s = m.startTime || "?"
	const e = m.endTime || "?"
	return `${s} → ${e}`
}

const resetPlayback = async () => {
	const sid = playbackSessionId.value
	const nvrId = props.nvrId
	playbackWebrtcUrl.value = ""
	playbackWebrtcPort.value = undefined
	playbackSessionId.value = null
	activeMatchKey.value = ""
	isFullscreenOpen.value = false
	if (sid && nvrId > 0) {
		await nvrApi.stopPlayback(nvrId, sid).catch(() => {})
	}
}

const initDefaults = () => {
	const end = new Date()
	const start = new Date(end.getTime() - 24 * 3600_000)
	startLocal.value = toLocalInputValue(start)
	endLocal.value = toLocalInputValue(end)
	matches.value = []
	errorMessage.value = null
	activeMatchKey.value = ""
	isFullscreenOpen.value = false
}

const handleSearch = async () => {
	if (!canSearch.value) return
	isSearching.value = true
	errorMessage.value = null
	matches.value = []
	try {
		await resetPlayback()
		const res = await nvrApi.searchRecordings(props.nvrId, {
			trackId: props.trackId,
			startTime: localInputToIso(startLocal.value),
			endTime: localInputToIso(endLocal.value),
			maxResults: 40,
		})
		matches.value = res.matches || []
		if (matches.value.length === 0) {
			errorMessage.value = "此時間範圍無錄影"
		}
	} catch (error) {
		errorMessage.value = handleError(error, "搜尋錄影失敗") || "搜尋錄影失敗"
	} finally {
		isSearching.value = false
	}
}

const handlePlayMatch = async (m: NvrSearchMatch) => {
	if (!m.playbackURI) return
	isStartingPlayback.value = true
	errorMessage.value = null
	try {
		await resetPlayback()
		activeMatchKey.value = matchKey(m)
		const res = await nvrApi.startPlayback(props.nvrId, {
			playbackURI: m.playbackURI,
		})
		playbackSessionId.value = res.sessionId
		playbackWebrtcUrl.value = res.webrtcUrl
		playbackWebrtcPort.value = res.webrtcPort
	} catch (error) {
		errorMessage.value = handleError(error, "啟動回放失敗") || "啟動回放失敗"
		activeMatchKey.value = ""
	} finally {
		isStartingPlayback.value = false
	}
}

const handleClose = async () => {
	await resetPlayback()
	emit("update:modelValue", false)
}

watch(
	() => props.modelValue,
	async (open) => {
		if (open) {
			initDefaults()
			return
		}
		await resetPlayback()
	}
)
</script>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
	transition: opacity 0.15s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
	opacity: 0;
}
</style>
