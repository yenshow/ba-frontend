import type { RTSPStreamInfo, RTSPStartResponse, RTSPStatusResponse, RTSPStopResponse } from "~/types/rtsp";

export const useRtspApi = () => {
	const config = useRuntimeConfig();
	const fetcher = useRequestFetch();
	const apiBase = config.public.apiBase || "http://localhost:4000/api";
	const rtspApiBase = `${apiBase}/rtsp`;

	/**
	 * 啟動 RTSP 串流
	 * @param rtspUrl - RTSP 串流 URL
	 * @returns Promise<RTSPStreamInfo>
	 */
	const startStream = async (rtspUrl: string): Promise<RTSPStreamInfo> => {
		try {
			const response = await fetcher<RTSPStartResponse>(`${rtspApiBase}/start`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json"
				},
				body: JSON.stringify({ rtspUrl }),
				credentials: "include"
			});

			if (response.error) {
				throw new Error(response.message || "啟動串流失敗");
			}

			return response.data;
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`RTSP API 請求失敗: ${error.message}`);
			}
			throw error;
		}
	};

	/**
	 * 停止 RTSP 串流
	 * @param streamId - 串流 ID
	 * @returns Promise<{ success: boolean; message: string }>
	 */
	const stopStream = async (streamId: string): Promise<{ success: boolean; message: string }> => {
		try {
			const response = await fetcher<RTSPStopResponse>(`${rtspApiBase}/stop/${streamId}`, {
				method: "POST",
				headers: {
					Accept: "application/json"
				},
				credentials: "include"
			});

			if (response.error) {
				throw new Error(response.message || "停止串流失敗");
			}

			return response.data;
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`RTSP API 請求失敗: ${error.message}`);
			}
			throw error;
		}
	};

	/**
	 * 獲取所有串流狀態
	 * @returns Promise<RTSPStreamInfo[]>
	 */
	const getAllStreamStatus = async (): Promise<RTSPStreamInfo[]> => {
		try {
			const response = await fetcher<RTSPStatusResponse>(`${rtspApiBase}/status`, {
				headers: {
					Accept: "application/json"
				},
				credentials: "include"
			});

			if (response.error) {
				throw new Error(response.message || "獲取串流狀態失敗");
			}

			return Array.isArray(response.data) ? response.data : [response.data];
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`RTSP API 請求失敗: ${error.message}`);
			}
			throw error;
		}
	};

	/**
	 * 獲取指定串流狀態
	 * @param streamId - 串流 ID
	 * @returns Promise<RTSPStreamInfo | null>
	 */
	const getStreamStatus = async (streamId: string): Promise<RTSPStreamInfo | null> => {
		try {
			const response = await fetcher<RTSPStatusResponse>(`${rtspApiBase}/status/${streamId}`, {
				headers: {
					Accept: "application/json"
				},
				credentials: "include"
			});

			if (response.error) {
				if (response.message?.includes("不存在")) {
					return null;
				}
				throw new Error(response.message || "獲取串流狀態失敗");
			}

			return Array.isArray(response.data) ? response.data[0] : response.data;
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`RTSP API 請求失敗: ${error.message}`);
			}
			throw error;
		}
	};

	return {
		startStream,
		stopStream,
		getAllStreamStatus,
		getStreamStatus
	};
};
