import { reactive, ref, computed } from "vue"
import { useWebSocketEventSubscription } from "~/composables/websocket/useWebSocket"
import { useAccessGate } from "~/composables/core/useAccessGate"
import { useLicense } from "~/composables/core/useLicense"
import { useApiBase } from "~/composables/core/useApiBase"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { PERM } from "~/config/permissionCodes"
import type { AccessEventCameraPopupItem } from "~/components/people-counting/AccessEventCameraPopup.vue"
import type { CameraStreamState } from "~/components/alerts/AlertCameraStreamSlots.vue"
import {
	ACCESS_EVENT_CAMERA_POPUP_MS_DEFAULT,
	ACCESS_EVENT_CAMERA_POPUP_SETTING_KEY,
	parseAccessEventCameraPopupMs,
} from "~/utils/realtimeTiming"

const ACCESS_CONTROL_EVENT = "people-counting:access-control:event"

type AccessControlWsPayload = {
	source?: string
	locationId?: number
	deviceId?: number
	deviceRole?: "entry" | "exit"
	eventCameraDeviceId?: number
	zoneName?: string
	locationName?: string
	eventLabel?: string
}

const toPositiveInt = (value: unknown): number | null => {
	const n = Number(value)
	return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
}

const resolveEventLabel = (payload: AccessControlWsPayload): string => {
	const raw = String(payload.eventLabel || "").trim()
	if (raw) return raw
	if (payload.source === "manual") return "手動開門"
	return payload.deviceRole === "exit" ? "離開" : "進入"
}

const state = reactive({
	open: false,
	item: null as AccessEventCameraPopupItem | null,
	streams: [] as CameraStreamState[],
	autoCloseMs: ACCESS_EVENT_CAMERA_POPUP_MS_DEFAULT,
	autoCloseEpoch: 0,
	isFullscreen: false,
})

/** ref：供 WS subscription watch 感知 start/stop */
const started = ref(false)

let autoCloseTimer: ReturnType<typeof setTimeout> | null = null
let streamLoadToken = 0

export const useAccessEventCameraPopup = () => {
	const deviceApi = useDeviceApi()
	const { request } = useApiBase()
	const { hasFeature } = useLicense()
	const { useWsModuleGate } = useAccessGate()
	const canSubscribe = useWsModuleGate("people_counting", {
		permissionCode: PERM.peopleCounting.module,
	})
	const canShowPopup = computed(
		() => started.value && canSubscribe.value && hasFeature("surveillance")
	)

	const clearAutoCloseTimer = () => {
		if (!autoCloseTimer) return
		clearTimeout(autoCloseTimer)
		autoCloseTimer = null
	}

	const handleClose = () => {
		clearAutoCloseTimer()
		state.isFullscreen = false
		state.open = false
		state.item = null
		state.streams = []
		streamLoadToken += 1
	}

	const scheduleAutoClose = () => {
		clearAutoCloseTimer()
		if (!state.open || state.isFullscreen) return
		state.autoCloseEpoch += 1
		autoCloseTimer = setTimeout(() => handleClose(), state.autoCloseMs)
	}

	const setFullscreen = (next: boolean) => {
		if (!next) {
			handleClose()
			return
		}
		state.isFullscreen = true
		clearAutoCloseTimer()
	}

	const loadPopupDuration = async () => {
		try {
			const response = await request<{ setting: { value: string } | null }>(
				`/settings/${ACCESS_EVENT_CAMERA_POPUP_SETTING_KEY}`
			)
			state.autoCloseMs = parseAccessEventCameraPopupMs(response?.setting?.value)
		} catch {
			state.autoCloseMs = ACCESS_EVENT_CAMERA_POPUP_MS_DEFAULT
		}
	}

	const startStreamOnState = async (s: CameraStreamState, token: number) => {
		s.streamStatus = "loading"
		s.error = ""
		s.webrtcUrl = ""
		s.webrtcPort = undefined
		try {
			const deviceRes = await deviceApi.getDevice(s.deviceId)
			if (token !== streamLoadToken) return
			s.deviceName = deviceRes?.device?.name?.trim?.() || `設備 ${s.deviceId}`

			const status = await deviceApi.getStreamStatus(s.deviceId)
			if (token !== streamLoadToken) return
			if (status.status !== "running") {
				const startedRes = await deviceApi.startStream(s.deviceId)
				if (token !== streamLoadToken) return
				s.webrtcUrl = startedRes.webrtcUrl || ""
				s.webrtcPort = startedRes.webrtcPort
				s.streamStatus = "running"
			} else {
				s.webrtcUrl = status.webrtcUrl || ""
				s.webrtcPort = status.webrtcPort
				s.streamStatus = status.status
			}
		} catch (e) {
			if (token !== streamLoadToken) return
			s.streamStatus = "error"
			s.error = e instanceof Error ? e.message : "啟動攝影機串流失敗"
		}
	}

	const loadStreamsForItem = async (cameraDeviceId: number) => {
		const token = ++streamLoadToken
		state.streams = [
			{
				deviceId: cameraDeviceId,
				deviceName: "",
				webrtcUrl: "",
				webrtcPort: undefined,
				streamStatus: "loading",
				error: "",
			},
		]
		await startStreamOnState(state.streams[0]!, token)
	}

	const handleReloadStream = (deviceId: number) => {
		const target = state.streams.find((s) => s.deviceId === deviceId)
		if (!target) {
			const camId = state.item?.cameraDeviceId
			if (camId != null) void loadStreamsForItem(camId)
			return
		}
		void startStreamOnState(target, streamLoadToken)
	}

	const enqueue = async (payload: AccessControlWsPayload) => {
		if (!canShowPopup.value) return

		const cameraDeviceId = toPositiveInt(payload.eventCameraDeviceId)
		const locationId = toPositiveInt(payload.locationId)
		const deviceId = toPositiveInt(payload.deviceId)
		if (cameraDeviceId == null || locationId == null || deviceId == null) return

		const now = Date.now()
		const signature = `${locationId}:${deviceId}:${cameraDeviceId}`
		const eventLabel = resolveEventLabel(payload)
		const zoneName = String(payload.zoneName || "").trim()
		const locationName = String(payload.locationName || "").trim()

		const sameItem =
			state.item &&
			state.item.locationId === locationId &&
			state.item.deviceId === deviceId &&
			state.item.cameraDeviceId === cameraDeviceId

		if (sameItem && state.item) {
			state.item.count += 1
			state.item.eventLabel = eventLabel
			if (zoneName) state.item.zoneName = zoneName
			if (locationName) state.item.locationName = locationName
			state.item.key = `${signature}:${now}`
			if (!state.isFullscreen) scheduleAutoClose()
			return
		}

		state.item = {
			key: `${signature}:${now}`,
			locationId,
			deviceId,
			cameraDeviceId,
			zoneName,
			locationName,
			eventLabel,
			count: 1,
		}
		state.open = true
		state.isFullscreen = false
		await loadStreamsForItem(cameraDeviceId)
		scheduleAutoClose()
	}

	const start = () => {
		if (started.value) return
		started.value = true
		if (process.client) void loadPopupDuration()
	}

	const stop = () => {
		if (!started.value) return
		started.value = false
		handleClose()
	}

	useWebSocketEventSubscription(
		ACCESS_CONTROL_EVENT,
		(...args: unknown[]) => {
			void enqueue((args[0] ?? {}) as AccessControlWsPayload)
		},
		{ enabled: canShowPopup }
	)

	return {
		state,
		start,
		stop,
		handleClose,
		handleReloadStream,
		setFullscreen,
	}
}
