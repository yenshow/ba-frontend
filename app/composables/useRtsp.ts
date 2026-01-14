import type { RTSPStreamInfo, RTSPStartResponse, RTSPStatusResponse, RTSPStopResponse, RTSPRefreshResponse, RTSPRefreshData } from "~/types/rtsp";
import { useApiBase } from "~/composables/useApiBase";

export const useRtspApi = () => {
	const { request } = useApiBase();

	/**
	 * 處理 RTSP API 的特殊回應格式（包含 error 欄位）
	 */
	const handleRtspResponse = <T>(response: any, errorMessage: string): T => {
		// RTSP API 使用特殊的回應格式，包含 error 欄位
		if (response?.error) {
			throw new Error(response.message || errorMessage);
		}
		return response?.data || response;
	};

	/**
	 * 啟動 RTSP 串流
	 * @param rtspUrl - RTSP 串流 URL
	 * @returns Promise<RTSPStreamInfo>
	 */
	const startStream = async (rtspUrl: string): Promise<RTSPStreamInfo> => {
		if (process.dev) {
			console.log(`[RTSP API] 啟動串流，URL: ${rtspUrl.replace(/:[^:@]+@/, ':****@')}`); // 隱藏密碼
		}
		
		const response = await request<RTSPStartResponse>("/rtsp/start", {
			method: "POST",
			body: JSON.stringify({ rtspUrl })
		});

		const streamInfo = handleRtspResponse<RTSPStreamInfo>(response, "啟動串流失敗");
		
		if (process.dev) {
			console.log(`[RTSP API] 串流啟動成功，Stream ID: ${streamInfo.streamId}, HLS URL: ${streamInfo.hlsUrl}`);
		}
		
		return streamInfo;
	};

	/**
	 * 停止 RTSP 串流
	 * @param streamId - 串流 ID
	 * @returns Promise<{ success: boolean; message: string }>
	 */
	const stopStream = async (streamId: string): Promise<{ success: boolean; message: string }> => {
		const response = await request<RTSPStopResponse>(`/rtsp/stop/${streamId}`, {
			method: "POST"
		});

		return handleRtspResponse<{ success: boolean; message: string }>(response, "停止串流失敗");
	};

	/**
	 * 獲取所有串流狀態
	 * @returns Promise<RTSPStreamInfo[]>
	 */
	const getAllStreamStatus = async (): Promise<RTSPStreamInfo[]> => {
		const response = await request<RTSPStatusResponse>("/rtsp/status");

		const data = handleRtspResponse<RTSPStreamInfo | RTSPStreamInfo[]>(response, "獲取串流狀態失敗");
		return Array.isArray(data) ? data : [data];
	};

	/**
	 * 獲取指定串流狀態
	 * @param streamId - 串流 ID
	 * @returns Promise<RTSPStreamInfo | null>
	 */
	const getStreamStatus = async (streamId: string): Promise<RTSPStreamInfo | null> => {
		try {
			const response = await request<RTSPStatusResponse>(`/rtsp/status/${streamId}`);
			const data = handleRtspResponse<RTSPStreamInfo | RTSPStreamInfo[]>(response, "獲取串流狀態失敗");
			return Array.isArray(data) ? data[0] : data;
		} catch (error) {
			// 如果錯誤訊息包含「不存在」，返回 null 而不是拋出錯誤
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
		if (process.dev) {
			console.log(`[RTSP API] 刷新 HLS URL，Stream ID: ${streamId}`);
		}
		
		const response = await request<RTSPRefreshResponse>(`/rtsp/refresh/${streamId}`, {
			method: "GET"
		});

		const refreshData = handleRtspResponse<RTSPRefreshData>(response, "獲取最新 URL 失敗");
		
		if (process.dev) {
			console.log(`[RTSP API] HLS URL 刷新成功，新 URL: ${refreshData.hlsUrl}`);
		}
		
		return refreshData;
	};

	return {
		startStream,
		stopStream,
		getAllStreamStatus,
		getStreamStatus,
		refreshHlsUrl
	};
};
