export interface RTSPStreamInfo {
	streamId: string;
	rtspUrl: string;
	hlsUrl: string;
	status: "running" | "stopped" | "unknown";
	startedAt: string;
}

export interface RTSPStartResponse {
	error: boolean;
	data: RTSPStreamInfo;
	message: string;
	timestamp: string;
}

export interface RTSPStatusResponse {
	error: boolean;
	data: RTSPStreamInfo | RTSPStreamInfo[];
	message: string;
	timestamp: string;
}

export interface RTSPStopResponse {
	error: boolean;
	data: {
		success: boolean;
		message: string;
	};
	message: string;
	timestamp: string;
}

export interface RTSPRefreshData {
	hlsUrl: string;
	timestamp: number;
	serverTime: number;
}

export interface RTSPRefreshResponse {
	error: boolean;
	data: RTSPRefreshData;
	message: string;
	timestamp: string;
}
