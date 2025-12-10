export interface RTSPStreamInfo {
	streamId: string;
	rtspUrl: string;
	hlsUrl: string;
	status: "running" | "stopped";
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
