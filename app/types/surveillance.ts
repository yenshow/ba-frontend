import type { Device, CameraDeviceConfig } from "./device"

/**
 * 攝影機設備資訊（擴展設備資訊）
 */
export interface SurveillanceCamera extends Device {
	config: CameraDeviceConfig
}

/** NVR 虛擬通道（ISAPI InputProxy；不建 devices 列） */
export interface NvrVirtualChannel {
	nvrId: number
	nvrName: string
	channelId: number | null
	name: string
	ipAddress: string
	online: boolean
	chanDetectResult?: string
	streamingProxyChannelIds: number[]
	/** 主碼流 proxy id（用於 live／search） */
	liveTrackId: number | null
}

/**
 * 監控畫面布局模式
 */
export type GridLayout = "1" | "4" | "9" | "16"

export type SurveillanceViewMode = "live" | "playback"

export type PlaybackZoomHours = 24 | 12 | 6

/**
 * 監控畫面配置（WebRTC：加入畫面時呼叫 stream/start 取得 webrtcUrl）
 * viewKey：`cam:{deviceId}` 或 `nvr:{nvrId}:{proxyChannelId}`
 */
export interface MonitorView {
	viewKey: string
	/** 一般攝影機＝device id；NVR 通道＝NVR device id（供名稱／回放） */
	deviceId: number
	proxyChannelId?: number
	title?: string
	position: number
	webrtcUrl?: string
	webrtcPort?: number
	/** 串流 path 名稱（與後端 MediaMTX path 對應） */
	streamId?: string
	/** 串流狀態 */
	streamStatus?: "running" | "stopped" | "loading" | "error"
	/** 回放 session（臨時 MediaMTX path） */
	playbackSessionId?: string
}

export type NvrSearchMatch = {
	index: number
	trackId?: string | null
	startTime?: string | null
	endTime?: string | null
	contentType?: string
	codecType?: string
	playbackURI: string
}
