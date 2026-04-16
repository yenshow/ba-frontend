import { reactive } from "vue"
import type { Alert } from "~/types/alert"
import { useAlertEventBus } from "~/composables/monitoring/alertMonitor/useAlertEventBus"
import { useAlertRuleIntegrationsStore } from "~/composables/systems/alerts/useAlertRuleIntegrationsStore"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import type {
	CameraPopupItem,
	CameraStreamState,
} from "~/components/alerts/AlertCameraLinkagePopup.vue"
import type { AlertNewEvent } from "~/types/websocket"

const normalizeCameraDeviceIds = (ids: number[]): number[] =>
	[...new Set(ids.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0))].slice(0, 4)

const buildSignature = (ruleId: number, cameraDeviceIds: number[]) =>
	`${ruleId}:${normalizeCameraDeviceIds(cameraDeviceIds).join(",")}`

const state = reactive({
	open: false,
	items: [] as CameraPopupItem[],
	activeIndex: 0,
	streams: [] as CameraStreamState[],
})

let started = false

export const useAlertCameraLinkagePopup = () => {
	const integrationsStore = useAlertRuleIntegrationsStore()
	const deviceApi = useDeviceApi()
	const { onAlertNew, offAlertNew } = useAlertEventBus()

	const handleClose = () => {
		state.open = false
		state.items = []
		state.activeIndex = 0
		state.streams = []
	}

	const loadStreamsForActiveItem = async () => {
		const item = state.items[state.activeIndex]
		if (!item) {
			state.streams = []
			return
		}

		const ids = normalizeCameraDeviceIds(item.cameraDeviceIds)
		state.streams = ids.map((deviceId) => ({
			deviceId,
			deviceName: "",
			webrtcUrl: "",
			streamStatus: "loading",
			error: "",
		}))

		for (const s of state.streams) {
			try {
				const deviceRes = await deviceApi.getDevice(s.deviceId)
				s.deviceName = deviceRes?.device?.name?.trim?.() || `設備 ${s.deviceId}`

				const status = await deviceApi.getStreamStatus(s.deviceId)
				if (status.status !== "running") {
					const startedRes = await deviceApi.startStream(s.deviceId)
					s.webrtcUrl = startedRes.webrtcUrl || ""
					s.streamStatus = "running"
				} else {
					s.webrtcUrl = status.webrtcUrl || ""
					s.streamStatus = status.status
				}
			} catch (e) {
				s.streamStatus = "error"
				s.error = e instanceof Error ? e.message : "啟動攝影機串流失敗"
			}
		}
	}

	const setActiveIndex = async (nextIndex: number) => {
		const idx = Math.max(0, Math.min(nextIndex, state.items.length - 1))
		state.activeIndex = idx
		await loadStreamsForActiveItem()
	}

	const handlePrev = () => void setActiveIndex(state.activeIndex - 1)
	const handleNext = () => void setActiveIndex(state.activeIndex + 1)
	const handleReload = () => void setActiveIndex(state.activeIndex)

	const enqueue = async (cameraDeviceIds: number[], ruleId: number) => {
		const ids = normalizeCameraDeviceIds(cameraDeviceIds)
		if (ids.length === 0) return

		const now = Date.now()
		const signature = buildSignature(ruleId, ids)
		const existIndex = state.items.findIndex((it) => buildSignature(it.ruleId, it.cameraDeviceIds) === signature)
		if (existIndex >= 0) {
			const exist = state.items[existIndex]
			exist.count = Math.max(1, Number(exist.count || 1)) + 1
			exist.createdAt = now
			state.items.splice(existIndex, 1)
			state.items.unshift(exist)
		} else {
			const key = `${signature}:${now}`
			state.items.unshift({ key, ruleId, cameraDeviceIds: ids, createdAt: now, count: 1 })
		}

		state.items = state.items.slice(0, 20)
		state.open = true
		state.activeIndex = 0
		await loadStreamsForActiveItem()
	}

	const maybeOpenByRule = async (
		ruleId: number,
		_alert?: Pick<Alert, "zone_name" | "source_name" | "source_display_name" | "location_name">
	) => {
		const next = await integrationsStore.ensureCameraLinkage(ruleId)
		if (!next.enabled || next.cameraDeviceIds.length === 0) return
		await enqueue(next.cameraDeviceIds, ruleId)
	}

	const handleAlertNew = (alert: AlertNewEvent) => {
		const ruleId = alert.rule_id != null ? Number(alert.rule_id) : null
		if (!ruleId || !Number.isFinite(ruleId)) return
		void maybeOpenByRule(ruleId, alert)
	}

	const start = () => {
		if (started) return
		started = true
		onAlertNew(handleAlertNew)
	}

	const stop = () => {
		if (!started) return
		started = false
		offAlertNew(handleAlertNew)
		handleClose()
	}

	return {
		state,
		start,
		stop,
		handleClose,
		handlePrev,
		handleNext,
		handleReload,
	}
}

