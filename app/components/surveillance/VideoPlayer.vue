<template>
	<div class="video-player-container relative h-full w-full overflow-hidden">
		<video
			v-show="webrtcUrl && !showFailureUi"
			ref="videoRef"
			autoplay
			playsinline
			muted
			class="webrtc-frame h-full w-full object-contain"
			aria-label="攝影機串流播放中"
		/>
		<div
			v-if="streamStatus === 'loading' && !showFailureUi && !webrtcUrl"
			class="flex h-full w-full items-center justify-center text-white/70"
		>
			<p class="text-sm 2xl:text-base">連線中…</p>
		</div>
		<div
			v-else-if="!webrtcUrl && streamStatus !== 'loading' && !showFailureUi"
			class="flex h-full w-full items-center justify-center text-white/70"
		>
			<p class="text-sm 2xl:text-base">無串流</p>
		</div>

		<div
			v-if="showFailureUi"
			class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 p-4"
			role="alert"
		>
			<p class="text-center text-sm text-red-400 2xl:text-base">{{ failureMessage }}</p>
			<button
				v-if="showReload"
				type="button"
				class="rounded-lg border-2 border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/15 2xl:text-base"
				aria-label="重新載入串流"
				@click="emit('reload')"
			>
				重新載入
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	webrtcUrl?: string
	webrtcPort?: number
	streamStatus?: "running" | "stopped" | "loading" | "error"
	/** 父層啟動串流失敗訊息（與內部 WebRTC 錯誤合併顯示） */
	externalError?: string
	showReload?: boolean
	paused?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	webrtcUrl: "",
	webrtcPort: undefined,
	streamStatus: "stopped",
	externalError: "",
	showReload: true,
	paused: false,
})

const emit = defineEmits<{
	reload: []
	needPlay: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const error = ref("")
let pc: RTCPeerConnection | null = null
let frameWaitGen = 0

const showFailureUi = computed(
	() => props.streamStatus === "error" || Boolean(error.value) || Boolean(props.externalError)
)

const failureMessage = computed(
	() =>
		String(props.externalError || "").trim() ||
		String(error.value || "").trim() ||
		"串流失敗"
)

let sampleCanvas: HTMLCanvasElement | null = null

const sampleIsPainted = (el: HTMLVideoElement) => {
	if (el.videoWidth <= 0) return false
	try {
		if (!sampleCanvas) sampleCanvas = document.createElement("canvas")
		sampleCanvas.width = 32
		sampleCanvas.height = 18
		const ctx = sampleCanvas.getContext("2d", { willReadFrequently: true })
		if (!ctx) return false
		ctx.drawImage(el, 0, 0, 32, 18)
		const data = ctx.getImageData(0, 0, 32, 18).data
		for (let i = 0; i < data.length; i += 4) {
			if (data[i] + data[i + 1] + data[i + 2] > 24) return true
		}
		return false
	} catch {
		return el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && el.videoWidth > 0
	}
}

const holdFirstFrame = (el: HTMLVideoElement) => {
	const gen = ++frameWaitGen
	if (sampleIsPainted(el)) {
		el.pause()
		return
	}
	const finish = (painted: boolean) => {
		if (gen !== frameWaitGen) return
		if (painted) {
			if (props.paused) el.pause()
			return
		}
		emit("needPlay")
	}
	el.play().catch(() => {})
	if ("requestVideoFrameCallback" in el) {
		const onFrame = () => {
			if (gen !== frameWaitGen) return
			if (sampleIsPainted(el)) {
				finish(true)
				return
			}
			el.requestVideoFrameCallback(onFrame)
		}
		el.requestVideoFrameCallback(onFrame)
	}
	const timer = window.setInterval(() => {
		if (gen !== frameWaitGen) {
			window.clearInterval(timer)
			return
		}
		if (sampleIsPainted(el)) {
			window.clearInterval(timer)
			finish(true)
		}
	}, 250)
	window.setTimeout(() => {
		window.clearInterval(timer)
		finish(sampleIsPainted(el))
	}, 6000)
}

const syncPauseState = () => {
	const el = videoRef.value
	if (!el) return
	if (typeof document !== "undefined" && document.hidden) {
		frameWaitGen += 1
		el.pause()
		return
	}
	if (props.paused) {
		holdFirstFrame(el)
		return
	}
	frameWaitGen += 1
	el.play().catch(() => {})
}

const connectWhep = async (whepUrl: string, previousPc: RTCPeerConnection | null) => {
	if (!videoRef.value) return
	const nextPc = new RTCPeerConnection()
	nextPc.ontrack = (e) => {
		if (videoRef.value && e.streams[0]) {
			videoRef.value.srcObject = e.streams[0]
			void nextTick(() => syncPauseState())
		}
		previousPc?.close()
	}
	nextPc.addTransceiver("video", { direction: "recvonly" })
	nextPc.addTransceiver("audio", { direction: "recvonly" })
	const offer = await nextPc.createOffer()
	await nextPc.setLocalDescription(offer)
	const response = await fetch(whepUrl, {
		method: "POST",
		headers: { "Content-Type": "application/sdp" },
		body: offer.sdp,
	})
	if (!response.ok) {
		nextPc.close()
		throw new Error(`WHEP 失敗: ${response.status}`)
	}
	const answerSdp = await response.text()
	await nextPc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answerSdp }))
	pc = nextPc
}

const teardownPc = (clearVideo = true) => {
	if (pc) {
		pc.close()
		pc = null
	}
	if (clearVideo && videoRef.value) {
		videoRef.value.srcObject = null
	}
}

watch(
	() => [props.webrtcUrl, props.webrtcPort] as const,
	async ([url, port]) => {
		error.value = ""
		if (!url) {
			teardownPc(true)
			return
		}
		const previousPc = pc
		pc = null
		await nextTick()
		if (!videoRef.value) {
			previousPc?.close()
			return
		}
		try {
			await connectWhep(resolveWebrtcWhepUrl(url), previousPc)
		} catch (e) {
			pc = previousPc
			error.value = e instanceof Error ? e.message : "WebRTC 連線失敗，請檢查 MediaMTX"
		}
	},
	{ immediate: true }
)

watch(
	() => props.paused,
	() => {
		syncPauseState()
	}
)

onMounted(() => {
	if (typeof document === "undefined") return
	document.addEventListener("visibilitychange", syncPauseState)
	syncPauseState()
})

onBeforeUnmount(() => {
	frameWaitGen += 1
	if (typeof document !== "undefined") {
		document.removeEventListener("visibilitychange", syncPauseState)
	}
	teardownPc()
})
</script>

<style scoped>
.video-player-container {
	transform: translateZ(0);
	will-change: transform;
}
.webrtc-frame {
	transform: translateZ(0);
	backface-visibility: hidden;
}
</style>
