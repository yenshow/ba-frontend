/**
 * YSOP 網頁對講：瀏覽器耳麥 PCM ↔ Socket.IO ↔ 後端 SIP sendrecv
 */
import { onScopeDispose, ref } from "vue"
import { useWebSocket } from "~/composables/websocket/useWebSocket"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useToast } from "~/composables/core/useToast"
import { logger } from "~/utils/logger"

export type AccessSecurityTalkPhase = "idle" | "ringing" | "talking"

const talkLogger = logger.createLogger("AccessSecurityTalk")

const EVENT_START = "access-security:talk:start"
const EVENT_PCM = "access-security:talk:pcm"
const EVENT_HANGUP = "access-security:talk:hangup"
const EVENT_STATUS = "access-security:talk:status"

const FRAME_SAMPLES = 160
const CAPTURE_WORKLET = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch && ch.length) this.port.postMessage(ch)
    return true
  }
}
registerProcessor('pcm-capture', PcmCaptureProcessor)
`

type TalkStatusPayload = {
	phase?: string
	locationId?: number
	deviceId?: number
	message?: string
	reason?: string
}

const toUint8 = (payload: unknown): Uint8Array | null => {
	if (payload instanceof ArrayBuffer) return new Uint8Array(payload)
	if (ArrayBuffer.isView(payload)) {
		const copy = new Uint8Array(payload.byteLength)
		copy.set(new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength))
		return copy
	}
	if (
		payload &&
		typeof payload === "object" &&
		(payload as { type?: string }).type === "Buffer" &&
		Array.isArray((payload as { data?: unknown }).data)
	) {
		return Uint8Array.from((payload as { data: number[] }).data)
	}
	return null
}

const toInt16 = (payload: unknown): Int16Array | null => {
	const bytes = toUint8(payload)
	if (!bytes || bytes.byteLength < 2) return null
	const even = bytes.byteLength - (bytes.byteLength % 2)
	const copy = bytes.subarray(0, even)
	const aligned = new ArrayBuffer(copy.byteLength)
	new Uint8Array(aligned).set(copy)
	return new Int16Array(aligned)
}

const downsampleTo8k = (input: Float32Array, inputRate: number): Int16Array => {
	if (input.length === 0) return new Int16Array(0)
	const ratio = inputRate / 8000
	const outCount = Math.floor(input.length / ratio)
	const out = new Int16Array(outCount)
	for (let i = 0; i < outCount; i += 1) {
		const start = Math.floor(i * ratio)
		const end = Math.min(input.length, Math.floor((i + 1) * ratio))
		let acc = 0
		const n = Math.max(1, end - start)
		for (let j = start; j < end; j += 1) acc += input[j] || 0
		const s = acc / n
		out[i] = Math.max(-32768, Math.min(32767, Math.round(s * 32767)))
	}
	return out
}

export const useAccessSecurityTalk = () => {
	const { isConnected, emit, on, off } = useWebSocket()
	const { handleError } = useErrorHandler()
	const toast = useToast()

	const talkingLocationId = ref<number | null>(null)
	const talkPhase = ref<AccessSecurityTalkPhase>("idle")

	let mediaStream: MediaStream | null = null
	let captureCtx: AudioContext | null = null
	let playCtx: AudioContext | null = null
	let captureNode: AudioWorkletNode | ScriptProcessorNode | null = null
	let pendingCapture: Float32Array = new Float32Array(0)
	let playAt = 0
	let workletUrl: string | null = null
	let startedLocationId: number | null = null

	const stopLocalMedia = async () => {
		pendingCapture = new Float32Array(0)
		playAt = 0
		try {
			captureNode?.disconnect()
		} catch {
			/* ignore */
		}
		captureNode = null
		mediaStream?.getTracks().forEach((track) => track.stop())
		mediaStream = null
		if (workletUrl) {
			URL.revokeObjectURL(workletUrl)
			workletUrl = null
		}
		if (captureCtx) {
			try {
				await captureCtx.close()
			} catch {
				/* ignore */
			}
			captureCtx = null
		}
		if (playCtx) {
			try {
				await playCtx.close()
			} catch {
				/* ignore */
			}
			playCtx = null
		}
	}

	const resetTalkState = () => {
		talkingLocationId.value = null
		talkPhase.value = "idle"
		startedLocationId = null
	}

	const handleHangup = () => {
		if (talkPhase.value === "idle") return
		emit(EVENT_HANGUP)
		void stopLocalMedia()
		resetTalkState()
	}

	const playInboundPcm = (pcm16: Int16Array) => {
		if (!playCtx || pcm16.length === 0) return
		try {
			const targetRate = playCtx.sampleRate || 8000
			let samples: Float32Array
			if (targetRate === 8000) {
				samples = new Float32Array(pcm16.length)
				for (let i = 0; i < pcm16.length; i += 1) {
					samples[i] = (pcm16[i] || 0) / 32768
				}
			} else {
				const ratio = targetRate / 8000
				samples = new Float32Array(Math.max(1, Math.floor(pcm16.length * ratio)))
				for (let i = 0; i < samples.length; i += 1) {
					const srcIndex = Math.min(pcm16.length - 1, Math.floor(i / ratio))
					samples[i] = (pcm16[srcIndex] || 0) / 32768
				}
			}
			const buffer = playCtx.createBuffer(1, samples.length, targetRate)
			buffer.getChannelData(0).set(samples)
			const src = playCtx.createBufferSource()
			src.buffer = buffer
			src.connect(playCtx.destination)
			const now = playCtx.currentTime
			if (playAt < now) playAt = now
			src.start(playAt)
			playAt += samples.length / targetRate
		} catch {
			/* 瀏覽器拒絕非預期 sampleRate 時略過此幀 */
		}
	}

	const handleCaptureFloat = (chunk: Float32Array) => {
		if (talkPhase.value === "idle" || !captureCtx) return
		const merged = new Float32Array(pendingCapture.length + chunk.length)
		merged.set(pendingCapture)
		merged.set(chunk, pendingCapture.length)
		const ratio = captureCtx.sampleRate / 8000
		const needed = Math.max(FRAME_SAMPLES, Math.ceil(FRAME_SAMPLES * ratio))
		let offset = 0
		while (merged.length - offset >= needed) {
			const slice = merged.subarray(offset, offset + needed)
			const down = downsampleTo8k(slice, captureCtx.sampleRate)
			if (down.length >= FRAME_SAMPLES) {
				emit(EVENT_PCM, down.slice(0, FRAME_SAMPLES).buffer)
			}
			offset += needed
		}
		pendingCapture = merged.slice(offset)
	}

	const connectMutedCapture = (source: MediaStreamAudioSourceNode, node: AudioNode) => {
		if (!captureCtx) return
		const mute = captureCtx.createGain()
		mute.gain.value = 0
		source.connect(node)
		node.connect(mute)
		mute.connect(captureCtx.destination)
	}

	const startCaptureGraph = async (stream: MediaStream) => {
		const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
		if (!Ctx) throw new Error("瀏覽器不支援音訊")
		captureCtx = new Ctx()
		playCtx = new Ctx({ sampleRate: 8000 })
		if (captureCtx.state === "suspended") await captureCtx.resume()
		if (playCtx.state === "suspended") await playCtx.resume()
		playAt = playCtx.currentTime
		const source = captureCtx.createMediaStreamSource(stream)

		try {
			workletUrl = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: "application/javascript" }))
			await captureCtx.audioWorklet.addModule(workletUrl)
			const node = new AudioWorkletNode(captureCtx, "pcm-capture")
			node.port.onmessage = (ev: MessageEvent<Float32Array>) => {
				if (ev.data) handleCaptureFloat(ev.data)
			}
			connectMutedCapture(source, node)
			captureNode = node
		} catch (err) {
			talkLogger.warn("AudioWorklet 不可用，改用 ScriptProcessor", { error: err })
			if (typeof captureCtx.createScriptProcessor !== "function") {
				throw new Error("瀏覽器不支援音訊擷取")
			}
			const processor = captureCtx.createScriptProcessor(4096, 1, 1)
			processor.onaudioprocess = (ev) => {
				const channel = ev.inputBuffer.getChannelData(0)
				if (channel) handleCaptureFloat(channel)
			}
			connectMutedCapture(source, processor)
			captureNode = processor
		}
	}

	const handleStatus = (raw: unknown) => {
		const payload = (raw || {}) as TalkStatusPayload
		const phase = String(payload.phase || "")
		const locationId = Number(payload.locationId) || startedLocationId
		if (phase === "ringing") {
			talkPhase.value = "ringing"
			if (locationId) talkingLocationId.value = locationId
			toast.info("室內機響鈴中，請在室內機接聽")
			return
		}
		if (phase === "answered") {
			talkPhase.value = "talking"
			if (locationId) talkingLocationId.value = locationId
			toast.success("對講已接通")
			return
		}
		if (phase === "error") {
			void stopLocalMedia()
			resetTalkState()
			handleError(new Error(payload.message || "對講失敗"), "對講失敗")
			return
		}
		if (phase === "ended") {
			const reason = String(payload.reason || "")
			void stopLocalMedia()
			resetTalkState()
			if (reason === "no-answer") toast.warning("室內機未接聽")
			else if (reason === "remote-bye") toast.success("對方已掛斷")
			else if (reason === "timeout") toast.warning("對講已逾時")
			else if (reason === "disconnect") toast.warning("連線中斷，對講已結束")
			else if (reason === "error") toast.warning("對講失敗")
		}
	}

	const handlePcm = (raw: unknown) => {
		if (talkPhase.value !== "talking") return
		const pcm = toInt16(raw)
		if (pcm) playInboundPcm(pcm)
	}

	on(EVENT_STATUS, handleStatus)
	on(EVENT_PCM, handlePcm)
	onScopeDispose(() => {
		off(EVENT_STATUS, handleStatus)
		off(EVENT_PCM, handlePcm)
		if (talkPhase.value !== "idle") emit(EVENT_HANGUP)
		void stopLocalMedia()
	})

	const startTalk = async (locationId: number) => {
		if (talkPhase.value !== "idle") return
		if (!isConnected.value) {
			toast.warning("即時連線未就緒，請稍後再試")
			return
		}
		if (typeof window !== "undefined" && !window.isSecureContext) {
			toast.warning(
				"目前不是安全連線，瀏覽器無法開啟麥克風。請以 HTTPS 開啟系統（安裝精靈可啟用前端 HTTPS），或於伺服器本機使用 localhost 捷徑。"
			)
			return
		}
		const getUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices)
		if (!getUserMedia) {
			toast.warning("無法使用麥克風")
			return
		}
		try {
			mediaStream = await getUserMedia({ audio: true })
			talkingLocationId.value = locationId
			talkPhase.value = "ringing"
			startedLocationId = locationId
			await startCaptureGraph(mediaStream)
			emit(EVENT_START, { locationId })
		} catch (error) {
			void stopLocalMedia()
			resetTalkState()
			handleError(error, "無法使用麥克風")
		}
	}

	return {
		talkingLocationId,
		talkPhase,
		startTalk,
		hangupTalk: handleHangup,
	}
}
