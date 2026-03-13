/**
 * 攝影機列表狀態（載入設備列表，串流由 useStreamStatus 管理）
 */

import type { SurveillanceCamera } from "~/types/surveillance";
import { logger } from "~/utils/logger";
import { useSurveillanceApi } from "~/composables/systems/useSurveillanceApi";

const loggerSurveillance = logger.createLogger("Surveillance");

export const useCameraStreamStatus = () => {
	const surveillanceApi = useSurveillanceApi();
	const cameras = ref<SurveillanceCamera[]>([]);

	const loadCameras = async (): Promise<SurveillanceCamera[]> => {
		try {
			const list = await surveillanceApi.getCamerasWithStreamInfo();
			cameras.value = list;
			return list;
		} catch (error) {
			loggerSurveillance.error("載入攝影機失敗", { error });
			throw error;
		}
	};

	return {
		cameras: readonly(cameras),
		loadCameras
	};
};
