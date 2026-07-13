import { reactive } from "vue"
import type { Alert } from "~/types/alert"
import { useAlertEventBus } from "~/composables/monitoring/alertMonitor/useAlertEventBus"
import { useAlertRuleIntegrationsStore } from "~/composables/systems/alerts/useAlertRuleIntegrationsStore"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useLocationApi } from "~/composables/location/api/useLocationApi"
import { alertSourceToSystemType } from "~/utils/alertUtils"
import { getSystemCoordinates } from "~/utils/locationAdapter"
import type {
	CameraPopupItem,
	CameraStreamState,
	CameraLocationContext,
} from "~/components/alerts/AlertCameraLinkagePopup.vue"
import type { AlertNewEvent } from "~/types/websocket"

const normalizeCameraDeviceIds = (ids: number[]): number[] =>
	[...new Set(ids.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0))].slice(0, 4)

const buildSignature = (ruleId: number, cameraDeviceIds: number[]) =>
	`${ruleId}:${normalizeCameraDeviceIds(cameraDeviceIds).join(",")}`

const emptyLocationContext = (): CameraLocationContext => ({
	loading: false,
	zoneName: "",
	locationName: "",
	imageUrl: "",
	x: null,
	y: null,
	error: "",
})

type AlertMeta = Pick<
	Alert,
	| "message"
	| "source"
	| "source_id"
	| "zone_name"
	| "source_name"
	| "source_display_name"
	| "location_name"
	| "device_name"
>

const state = reactive({
	open: false,
	items: [] as CameraPopupItem[],
	activeIndex: 0,
	streams: [] as CameraStreamState[],
	locationContext: emptyLocationContext(),
})

let started = false
let locationLoadToken = 0

export const useAlertCameraLinkagePopup = () => {
	const integrationsStore = useAlertRuleIntegrationsStore()
	const deviceApi = useDeviceApi()
	const locationApi = useLocationApi()
	const { onAlertNew, offAlertNew } = useAlertEventBus()

	const handleClose = () => {
		state.open = false
		state.items = []
		state.activeIndex = 0
		state.streams = []
		state.locationContext = emptyLocationContext()
	}

	const patchLocationContext = (patch: Partial<CameraLocationContext>) => {
		Object.assign(state.locationContext, patch)
	}

	const loadLocationContextForActiveItem = async () => {
		const item = state.items[state.activeIndex]
		const token = ++locationLoadToken
		if (!item) {
			state.locationContext = emptyLocationContext()
			return
		}

		const zoneName = String(item.zoneName || "").trim()
		const locationName = String(item.locationName || item.deviceName || "").trim()
		state.locationContext = {
			...emptyLocationContext(),
			loading: true,
			zoneName,
			locationName,
		}

		const systemType = item.source ? alertSourceToSystemType(item.source) : null
		const sourceId = item.sourceId
		if (!systemType || sourceId == null || !Number.isFinite(sourceId)) {
			if (token === locationLoadToken) patchLocationContext({ loading: false })
			return
		}

		try {
			const { zones } = await locationApi.getZones(systemType)
			if (token !== locationLoadToken) return

			for (const zone of zones || []) {
				for (const loc of zone.locations || []) {
					const sys = loc.systems?.find(
						(s) => s.systemType === systemType && Number(s.id) === Number(sourceId)
					)
					if (!sys) continue
					const coords = getSystemCoordinates(loc, systemType)
					patchLocationContext({
						loading: false,
						zoneName: zone.name || zoneName,
						locationName: loc.name || locationName,
						imageUrl: String(zone.imageUrl || "").trim(),
						x: coords?.x ?? null,
						y: coords?.y ?? null,
						error: "",
					})
					return
				}
			}
			patchLocationContext({ loading: false })
		} catch (e) {
			if (token !== locationLoadToken) return
			patchLocationContext({
				loading: false,
				error: e instanceof Error ? e.message : "載入地點平面圖失敗",
			})
		}
	}

	const startStreamOnState = async (s: CameraStreamState) => {
		s.streamStatus = "loading"
		s.error = ""
		s.webrtcUrl = ""
		s.webrtcPort = undefined
		try {
			const deviceRes = await deviceApi.getDevice(s.deviceId)
			s.deviceName = deviceRes?.device?.name?.trim?.() || `設備 ${s.deviceId}`

			const status = await deviceApi.getStreamStatus(s.deviceId)
			if (status.status !== "running") {
				const startedRes = await deviceApi.startStream(s.deviceId)
				s.webrtcUrl = startedRes.webrtcUrl || ""
				s.webrtcPort = startedRes.webrtcPort
				s.streamStatus = "running"
			} else {
				s.webrtcUrl = status.webrtcUrl || ""
				s.webrtcPort = status.webrtcPort
				s.streamStatus = status.status
			}
		} catch (e) {
			s.streamStatus = "error"
			s.error = e instanceof Error ? e.message : "啟動攝影機串流失敗"
		}
	}

	const loadStreamsForActiveItem = async () => {
		const item = state.items[state.activeIndex]
		if (!item) {
			state.streams = []
			return
		}

		state.streams = normalizeCameraDeviceIds(item.cameraDeviceIds).map((deviceId) => ({
			deviceId,
			deviceName: "",
			webrtcUrl: "",
			webrtcPort: undefined,
			streamStatus: "loading" as const,
			error: "",
		}))

		await Promise.all(state.streams.map((s) => startStreamOnState(s)))
	}

	const loadActiveItem = async () => {
		await Promise.all([loadLocationContextForActiveItem(), loadStreamsForActiveItem()])
	}

	const setActiveIndex = async (nextIndex: number) => {
		state.activeIndex = Math.max(0, Math.min(nextIndex, state.items.length - 1))
		await loadActiveItem()
	}

	const handlePrev = () => void setActiveIndex(state.activeIndex - 1)
	const handleNext = () => void setActiveIndex(state.activeIndex + 1)

	const handleReloadStream = (deviceId: number) => {
		const target = state.streams.find((s) => s.deviceId === deviceId)
		if (!target) {
			void loadStreamsForActiveItem()
			return
		}
		void startStreamOnState(target)
	}

	const applyAlertMeta = (item: CameraPopupItem, alert?: AlertMeta) => {
		if (!alert) return
		const message = String(alert.message || "").trim()
		if (message) item.message = message
		if (alert.source) item.source = alert.source
		if (alert.source_id != null && Number.isFinite(Number(alert.source_id))) {
			item.sourceId = Number(alert.source_id)
		}
		const zoneName = String(alert.zone_name || "").trim()
		if (zoneName) item.zoneName = zoneName
		const locationName = String(
			alert.location_name || alert.source_display_name || alert.source_name || ""
		).trim()
		if (locationName) item.locationName = locationName
		const deviceName = String(alert.device_name || "").trim()
		if (deviceName) item.deviceName = deviceName
	}

	const enqueue = async (cameraDeviceIds: number[], ruleId: number, alert?: AlertMeta) => {
		const ids = normalizeCameraDeviceIds(cameraDeviceIds)
		if (ids.length === 0) return

		const now = Date.now()
		const signature = buildSignature(ruleId, ids)
		const existIndex = state.items.findIndex(
			(it) => buildSignature(it.ruleId, it.cameraDeviceIds) === signature
		)
		if (existIndex >= 0) {
			const exist = state.items[existIndex]
			exist.count = Math.max(1, Number(exist.count || 1)) + 1
			exist.createdAt = now
			applyAlertMeta(exist, alert)
			state.items.splice(existIndex, 1)
			state.items.unshift(exist)
		} else {
			const item: CameraPopupItem = {
				key: `${signature}:${now}`,
				ruleId,
				cameraDeviceIds: ids,
				createdAt: now,
				count: 1,
				message: "",
			}
			applyAlertMeta(item, alert)
			state.items.unshift(item)
		}

		state.items = state.items.slice(0, 20)
		state.open = true
		state.activeIndex = 0
		await loadActiveItem()
	}

	const maybeOpenByRule = async (ruleId: number, alert?: AlertMeta) => {
		const next = await integrationsStore.ensureCameraLinkage(ruleId)
		if (!next.enabled || next.cameraDeviceIds.length === 0) return
		await enqueue(next.cameraDeviceIds, ruleId, alert)
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
		handleReloadStream,
	}
}
