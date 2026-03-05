/**
 * 影像監視狀態統一管理（MJPEG 預覽）
 * - 攝影機列表
 * - 監控畫面（previewUrl），加入畫面時取得預覽 URL
 */

import type { MonitorView } from "~/types/surveillance";
import { useCameraStreamStatus } from "./streamStatus/useCameraStreamStatus";
import { useMonitorViews } from "./streamStatus/useMonitorViews";
import { useSurveillanceApi } from "~/composables/systems/useSurveillanceApi";

export const useStreamStatus = () => {
	const surveillanceApi = useSurveillanceApi();
	const cameraStream = useCameraStreamStatus();
	const monitorViews = useMonitorViews();

	/** 加入監控畫面：先取得預覽 URL 再加入 */
	const addMonitorView = async (deviceId: number): Promise<void> => {
		const data = await surveillanceApi.getPreviewUrl(deviceId);
		monitorViews.addMonitorView({
			deviceId: data.deviceId,
			position: monitorViews.monitorViews.value.length,
			previewUrl: data.url
		});
	};

	return {
		cameras: cameraStream.cameras,
		monitorViews: monitorViews.monitorViews,
		loadCameras: cameraStream.loadCameras,
		addMonitorView,
		removeMonitorView: monitorViews.removeMonitorView,
		updateMonitorView: monitorViews.updateMonitorView,
		reorderMonitorViews: monitorViews.reorderMonitorViews
	};
};
