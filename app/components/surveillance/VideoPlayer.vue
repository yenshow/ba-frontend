<template>
	<div class="video-player-container relative h-full w-full overflow-hidden">
		<video
			v-if="webrtcUrl"
			ref="videoRef"
			autoplay
			playsinline
			muted
			class="webrtc-frame h-full w-full bg-black object-contain"
			:aria-label="'攝影機串流 ' + (error ? '錯誤' : '播放中')"
		/>
		<div
			v-else-if="streamStatus === 'loading'"
			class="flex h-full w-full items-center justify-center bg-black text-white/70"
		>
			<p class="text-sm 2xl:text-base">連線中…</p>
		</div>
		<div
			v-else-if="streamStatus === 'error'"
			class="flex h-full w-full items-center justify-center bg-black text-red-400"
		>
			<p class="text-center text-sm 2xl:text-base">串流失敗</p>
		</div>
		<div v-else class="flex h-full w-full items-center justify-center bg-black text-white/70">
			<p class="text-sm 2xl:text-base">無串流</p>
		</div>
		<div v-if="error" class="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
			<p class="text-center text-sm text-red-400 2xl:text-base">{{ error }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	webrtcUrl?: string;
	streamStatus?: "running" | "stopped" | "loading" | "error";
}

const props = withDefaults(defineProps<Props>(), {
	webrtcUrl: "",
	streamStatus: "stopped"
});

const videoRef = ref<HTMLVideoElement | null>(null);
const error = ref<string>("");
let pc: RTCPeerConnection | null = null;

/** 分頁不可見時暫停 video，省 CPU／電量 */
const updatePausedByVisibility = () => {
	if (!videoRef.value) return;
	if (document.hidden) {
		videoRef.value.pause();
	} else {
		videoRef.value.play().catch(() => {});
	}
};

const connectWhep = async (whepUrl: string) => {
	if (!videoRef.value) return;
	pc = new RTCPeerConnection();
	pc.ontrack = e => {
		if (videoRef.value && e.streams[0]) {
			videoRef.value.srcObject = e.streams[0];
		}
	};
	pc.addTransceiver("video", { direction: "recvonly" });
	pc.addTransceiver("audio", { direction: "recvonly" });
	const offer = await pc.createOffer();
	await pc.setLocalDescription(offer);
	const response = await fetch(whepUrl, {
		method: "POST",
		headers: { "Content-Type": "application/sdp" },
		body: offer.sdp
	});
	if (!response.ok) {
		throw new Error(`WHEP 失敗: ${response.status}`);
	}
	const answerSdp = await response.text();
	await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answerSdp }));
};

watch(
	() => props.webrtcUrl,
	async url => {
		error.value = "";
		if (pc) {
			pc.close();
			pc = null;
		}
		if (videoRef.value) {
			videoRef.value.srcObject = null;
		}
		if (!url) return;
		await nextTick();
		if (!videoRef.value) return;
		try {
			await connectWhep(url);
		} catch (e) {
			error.value = e instanceof Error ? e.message : "WebRTC 連線失敗，請檢查 MediaMTX";
		}
	},
	{ immediate: true }
);

onMounted(() => {
	if (typeof document !== "undefined") {
		document.addEventListener("visibilitychange", updatePausedByVisibility);
		updatePausedByVisibility();
	}
});

onBeforeUnmount(() => {
	if (typeof document !== "undefined") {
		document.removeEventListener("visibilitychange", updatePausedByVisibility);
	}
	if (pc) {
		pc.close();
		pc = null;
	}
	if (videoRef.value) {
		videoRef.value.srcObject = null;
	}
});
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
