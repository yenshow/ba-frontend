/**
 * 影像監視狀態統一管理（WebRTC 串流 + reference counting）
 * - 一般攝影機：viewKey = cam:{deviceId}
 * - NVR 虛擬通道：viewKey = nvr:{nvrId}:{proxyChannelId}
 */

import type { MonitorView } from "~/types/surveillance"
import { useCameraStreamStatus } from "./streamStatus/useCameraStreamStatus"
import { useMonitorViews } from "./streamStatus/useMonitorViews"
import { useSurveillanceApi } from "~/composables/systems/surveillance/useSurveillanceApi"
import { useNvrApi } from "~/composables/systems/surveillance/useNvrApi"
import {
	cameraViewKey,
	nvrChannelViewKey,
	parseSurveillanceViewKey,
} from "~/utils/surveillanceViewKey"

export type AddMonitorViewInput =
	| { kind: "camera"; deviceId: number }
	| {
			kind: "nvr"
			nvrId: number
			proxyChannelId: number
			title?: string
			/** 回放模式佔格，不啟動即時串流 */
			deferStart?: boolean
	  }

export const useStreamStatus = () => {
	const surveillanceApi = useSurveillanceApi()
	const nvrApi = useNvrApi()
	const cameraStream = useCameraStreamStatus()
	const monitorViews = useMonitorViews()

	const markMonitorViewError = (viewKey: string) => {
		monitorViews.updateMonitorView(viewKey, {
			webrtcUrl: "",
			webrtcPort: undefined,
			streamId: undefined,
			streamStatus: "error",
		})
	}

	const STREAM_START_ERROR = "啟動串流失敗，請確認設備設定與 MediaMTX 已啟動"

	const resolveViewKey = (input: AddMonitorViewInput): string => {
		if (input.kind === "camera") return cameraViewKey(input.deviceId)
		return nvrChannelViewKey(input.nvrId, input.proxyChannelId)
	}

	const startStreamForInput = async (input: AddMonitorViewInput) => {
		if (input.kind === "camera") {
			return await surveillanceApi.startCameraStream(input.deviceId)
		}
		return await nvrApi.startChannelStream(input.nvrId, input.proxyChannelId)
	}

	const stopStreamForViewKey = async (viewKey: string) => {
		const parsed = parseSurveillanceViewKey(viewKey)
		if (!parsed) return
		if (parsed.kind === "camera") {
			await surveillanceApi.stopCameraStream(parsed.deviceId)
			return
		}
		await nvrApi.stopChannelStream(parsed.nvrId, parsed.proxyChannelId)
	}

	const addMonitorView = async (input: AddMonitorViewInput): Promise<void> => {
		const viewKey = resolveViewKey(input)
		const views = monitorViews.monitorViews.value
		if (input.kind === "nvr" && input.deferStart) {
			monitorViews.addMonitorView({
				viewKey,
				deviceId: input.nvrId,
				proxyChannelId: input.proxyChannelId,
				title: input.title,
				position: views.length,
			})
			return
		}
		const existing = views.find((v) => v.viewKey === viewKey)
		if (existing?.webrtcUrl) {
			monitorViews.addMonitorView({
				viewKey,
				deviceId: input.kind === "camera" ? input.deviceId : input.nvrId,
				proxyChannelId: input.kind === "nvr" ? input.proxyChannelId : undefined,
				title: input.kind === "nvr" ? input.title : undefined,
				position: views.length,
				webrtcUrl: existing.webrtcUrl,
				webrtcPort: existing.webrtcPort,
				streamId: existing.streamId,
				streamStatus: "running",
			})
			return
		}

		const base: MonitorView = {
			viewKey,
			deviceId: input.kind === "camera" ? input.deviceId : input.nvrId,
			proxyChannelId: input.kind === "nvr" ? input.proxyChannelId : undefined,
			title: input.kind === "nvr" ? input.title : undefined,
			position: views.length,
			streamStatus: "loading",
		}
		monitorViews.addMonitorView(base)
		try {
			const data = await startStreamForInput(input)
			monitorViews.updateMonitorView(viewKey, {
				webrtcUrl: data.webrtcUrl,
				webrtcPort: data.webrtcPort,
				streamId: data.streamId,
				streamStatus: "running",
			})
		} catch {
			markMonitorViewError(viewKey)
			throw new Error(STREAM_START_ERROR)
		}
	}

	const reloadMonitorView = async (viewKey: string): Promise<void> => {
		const existing = monitorViews.monitorViews.value.find((v) => v.viewKey === viewKey)
		if (!existing) return
		const parsed = parseSurveillanceViewKey(viewKey)
		if (!parsed) return

		monitorViews.updateMonitorView(viewKey, {
			webrtcUrl: "",
			webrtcPort: undefined,
			streamId: undefined,
			streamStatus: "loading",
		})
		try {
			await stopStreamForViewKey(viewKey).catch(() => {})
			const data =
				parsed.kind === "camera"
					? await surveillanceApi.startCameraStream(parsed.deviceId)
					: await nvrApi.startChannelStream(parsed.nvrId, parsed.proxyChannelId)
			monitorViews.updateMonitorView(viewKey, {
				webrtcUrl: data.webrtcUrl,
				webrtcPort: data.webrtcPort,
				streamId: data.streamId,
				streamStatus: "running",
			})
		} catch {
			markMonitorViewError(viewKey)
			throw new Error(STREAM_START_ERROR)
		}
	}

	const removeMonitorView = (viewKey: string): void => {
		monitorViews.removeMonitorView(viewKey)
		const stillUsed = monitorViews.monitorViews.value.some((v) => v.viewKey === viewKey)
		if (!stillUsed) {
			stopStreamForViewKey(viewKey).catch(() => {})
		}
	}

	const clearAllMonitorViews = (): void => {
		while (monitorViews.monitorViews.value.length > 0) {
			const first = monitorViews.monitorViews.value[0]
			if (!first) break
			removeMonitorView(first.viewKey)
		}
	}

	const detachMonitorViewStream = (viewKey: string): void => {
		stopStreamForViewKey(viewKey).catch(() => {})
		monitorViews.updateMonitorView(viewKey, {
			webrtcUrl: "",
			webrtcPort: undefined,
			streamId: undefined,
			playbackSessionId: undefined,
			streamStatus: undefined,
		})
	}

	return {
		cameras: cameraStream.cameras,
		monitorViews: monitorViews.monitorViews,
		loadCameras: cameraStream.loadCameras,
		addMonitorView,
		reloadMonitorView,
		removeMonitorView,
		clearAllMonitorViews,
		detachMonitorViewStream,
		updateMonitorView: monitorViews.updateMonitorView,
		reorderMonitorViews: monitorViews.reorderMonitorViews,
	}
}
