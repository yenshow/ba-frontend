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
}

const props = withDefaults(defineProps<Props>(), {
	webrtcUrl: "",
	webrtcPort: undefined,
	streamStatus: "stopped",
	externalError: "",
	showReload: true,
})

const emit = defineEmits<{
	reload: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const error = ref("")
let pc: RTCPeerConnection | null = null

const showFailureUi = computed(
	() => props.streamStatus === "error" || Boolean(error.value) || Boolean(props.externalError)
)

const failureMessage = computed(
	() =>
		String(props.externalError || "").trim() ||
		String(error.value || "").trim() ||
		"串流失敗"
)

const updatePausedByVisibility = () => {
	if (!videoRef.value) return
	if (document.hidden) {
		videoRef.value.pause()
	} else {
		videoRef.value.play().catch(() => {})
	}
}

const connectWhep = async (whepUrl: string) => {
	if (!videoRef.value) return
	pc = new RTCPeerConnection()
	pc.ontrack = (e) => {
		if (videoRef.value && e.streams[0]) {
			videoRef.value.srcObject = e.streams[0]
		}
	}
	pc.addTransceiver("video", { direction: "recvonly" })
	pc.addTransceiver("audio", { direction: "recvonly" })
	const offer = await pc.createOffer()
	await pc.setLocalDescription(offer)
	const response = await fetch(whepUrl, {
		method: "POST",
		headers: { "Content-Type": "application/sdp" },
		body: offer.sdp,
	})
	if (!response.ok) {
		throw new Error(`WHEP 失敗: ${response.status}`)
	}
	const answerSdp = await response.text()
	await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answerSdp }))
}

const teardownPc = () => {
	if (pc) {
		pc.close()
		pc = null
	}
	if (videoRef.value) {
		videoRef.value.srcObject = null
	}
}

watch(
	() => [props.webrtcUrl, props.webrtcPort] as const,
	async ([url, port]) => {
		error.value = ""
		teardownPc()
		if (!url) return
		await nextTick()
		if (!videoRef.value) return
		try {
			await connectWhep(resolveWebrtcWhepUrl(url, port))
		} catch (e) {
			error.value = e instanceof Error ? e.message : "WebRTC 連線失敗，請檢查 MediaMTX"
		}
	},
	{ immediate: true }
)

onMounted(() => {
	if (typeof document === "undefined") return
	document.addEventListener("visibilitychange", updatePausedByVisibility)
	updatePausedByVisibility()
})

onBeforeUnmount(() => {
	if (typeof document !== "undefined") {
		document.removeEventListener("visibilitychange", updatePausedByVisibility)
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
