/**
 * 影像監視狀態統一管理（WebRTC 串流 + reference counting）
 * - 加入畫面：若該 deviceId 已有串流則共用 webrtcUrl，否則呼叫 stream/start
 * - 移除畫面：僅當無其他畫面使用同一 deviceId 時才呼叫 stream/stop
 */

import type { MonitorView } from "~/types/surveillance";
import { useCameraStreamStatus } from "./streamStatus/useCameraStreamStatus";
import { useMonitorViews } from "./streamStatus/useMonitorViews";
import { useSurveillanceApi } from "~/composables/systems/surveillance/useSurveillanceApi";

export const useStreamStatus = () => {
	const surveillanceApi = useSurveillanceApi();
	const cameraStream = useCameraStreamStatus();
	const monitorViews = useMonitorViews();

	/** 加入監控畫面：啟動串流（或共用既有）並取得 webrtcUrl */
	const addMonitorView = async (deviceId: number): Promise<void> => {
		const views = monitorViews.monitorViews.value;
		const existing = views.find((v) => v.deviceId === deviceId);
		if (existing?.webrtcUrl) {
			monitorViews.addMonitorView({
				deviceId,
				position: views.length,
				webrtcUrl: existing.webrtcUrl,
				webrtcPort: existing.webrtcPort,
				streamId: existing.streamId,
				streamStatus: "running"
			});
			return;
		}
		monitorViews.addMonitorView({
			deviceId,
			position: views.length,
			streamStatus: "loading"
		});
		try {
			const data = await surveillanceApi.startCameraStream(deviceId);
			monitorViews.updateMonitorView(deviceId, {
				webrtcUrl: data.webrtcUrl,
				webrtcPort: data.webrtcPort,
				streamId: data.streamId,
				streamStatus: "running"
			});
		} catch {
			monitorViews.updateMonitorView(deviceId, { streamStatus: "error" });
			monitorViews.removeMonitorView(deviceId);
			throw new Error("啟動串流失敗，請確認攝影機已設定 rtsp_url 且 MediaMTX 已啟動");
		}
	};

	/** 移除監控畫面；若無其他畫面使用同一 deviceId 則停止串流 */
	const removeMonitorView = (deviceId: number): void => {
		monitorViews.removeMonitorView(deviceId);
		const stillUsed = monitorViews.monitorViews.value.some((v) => v.deviceId === deviceId);
		if (!stillUsed) {
			surveillanceApi.stopCameraStream(deviceId).catch(() => {});
		}
	};

	/** 清空所有監控畫面並停止後端串流（頁面卸載時呼叫） */
	const clearAllMonitorViews = (): void => {
		while (monitorViews.monitorViews.value.length > 0) {
			const first = monitorViews.monitorViews.value[0];
			if (!first) break;
			removeMonitorView(first.deviceId);
		}
	};

	return {
		cameras: cameraStream.cameras,
		monitorViews: monitorViews.monitorViews,
		loadCameras: cameraStream.loadCameras,
		addMonitorView,
		removeMonitorView,
		clearAllMonitorViews,
		updateMonitorView: monitorViews.updateMonitorView,
		reorderMonitorViews: monitorViews.reorderMonitorViews
	};
};
