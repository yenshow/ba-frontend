import type { RTSPStreamInfo, RTSPRefreshData } from "~/types/rtsp";
import { useApiBase } from "~/composables/core/useApiBase";

/**
 * RTSP API Composable
 * 響應格式由 useApiBase 統一處理
 */
export const useRtspApi = () => {
	const { request } = useApiBase();

	/**
	 * 啟動 RTSP 串流
	 * @param rtspUrl - RTSP 串流 URL
	 * @returns Promise<RTSPStreamInfo>
	 */
	const startStream = async (rtspUrl: string): Promise<RTSPStreamInfo> => {
		return request<RTSPStreamInfo>("/rtsp/start", {
			method: "POST",
			body: JSON.stringify({ rtspUrl })
		});
	};

	/**
	 * 停止 RTSP 串流
	 * @param streamId - 串流 ID
	 * @returns Promise<{ success: boolean; message: string }>
	 */
	const stopStream = async (streamId: string): Promise<{ success: boolean; message: string }> => {
		return request<{ success: boolean; message: string }>(`/rtsp/stop/${streamId}`, {
			method: "POST"
		});
	};

	/**
	 * 獲取所有串流狀態
	 * @returns Promise<RTSPStreamInfo[]>
	 */
	const getAllStreamStatus = async (): Promise<RTSPStreamInfo[]> => {
		const data = await request<RTSPStreamInfo[]>("/rtsp/status");
		return Array.isArray(data) ? data : [];
	};

	/**
	 * 獲取指定串流狀態
	 * @param streamId - 串流 ID
	 * @returns Promise<RTSPStreamInfo | null>
	 */
	const getStreamStatus = async (streamId: string): Promise<RTSPStreamInfo | null> => {
		try {
			const data = await request<RTSPStreamInfo>(`/rtsp/status/${streamId}`);
			return data || null;
		} catch (error) {
			if (error instanceof Error && error.message.includes("不存在")) {
				return null;
			}
			throw error;
		}
	};

	/**
	 * 獲取最新的 HLS URL（帶時間戳，防止緩存）
	 * 用於前端頁面重新載入或刷新時獲取最新的播放 URL
	 * @param streamId - 串流 ID
	 * @returns Promise<RTSPRefreshData>
	 */
	const refreshHlsUrl = async (streamId: string): Promise<RTSPRefreshData> => {
		return request<RTSPRefreshData>(`/rtsp/refresh/${streamId}`);
	};

	return {
		startStream,
		stopStream,
		getAllStreamStatus,
		getStreamStatus,
		refreshHlsUrl
	};
};
