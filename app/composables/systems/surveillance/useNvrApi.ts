import type { NvrSearchMatch, NvrVirtualChannel } from "~/types/surveillance"
import type { DeviceStreamStartResponse } from "~/types/device"
import { logger } from "~/utils/logger"
import { useApiBase } from "~/composables/core/useApiBase"

const nvrLogger = logger.createLogger("NVR API")

type NvrChannelsResponse = {
	nvrId: number
	nvrName: string
	host: string
	rtspPort: number
	channels: Array<{
		id: number | null
		name?: string
		ipAddress?: string
		online: boolean
		chanDetectResult?: string
		streamingProxyChannelIds: number[]
		liveTrackId: number | null
	}>
}

type NvrSearchResponse = {
	nvrId: number
	trackId: number
	matches: NvrSearchMatch[]
	numOfMatches?: string
	totalMatches?: string
}

type NvrPlaybackStartResponse = {
	sessionId: string
	pathName: string
	webrtcUrl: string
	webrtcPort: number
	expiresAt: string
	status: string
}

export const useNvrApi = () => {
	const { request } = useApiBase()

	const listChannels = async (nvrId: number): Promise<NvrVirtualChannel[]> => {
		try {
			const data = await request<NvrChannelsResponse>(`/devices/${nvrId}/nvr/channels`)
			const nvrName = data.nvrName || `NVR #${nvrId}`
			return (data.channels || []).map((ch) => ({
				nvrId,
				nvrName,
				channelId: ch.id,
				name: ch.name || (ch.id != null ? `通道 ${ch.id}` : "通道"),
				ipAddress: ch.ipAddress || "",
				online: ch.online === true,
				chanDetectResult: ch.chanDetectResult,
				streamingProxyChannelIds: ch.streamingProxyChannelIds || [],
				liveTrackId: ch.liveTrackId,
			}))
		} catch (error) {
			nvrLogger.error("載入 NVR 通道失敗", { nvrId, error })
			throw error
		}
	}

	const startChannelStream = async (
		nvrId: number,
		proxyChannelId: number
	): Promise<DeviceStreamStartResponse> => {
		try {
			return await request<DeviceStreamStartResponse>(
				`/devices/${nvrId}/nvr/channels/${proxyChannelId}/stream/start`,
				{ method: "POST" }
			)
		} catch (error) {
			nvrLogger.error("啟動 NVR 通道串流失敗", { nvrId, proxyChannelId, error })
			throw error
		}
	}

	const stopChannelStream = async (
		nvrId: number,
		proxyChannelId: number
	): Promise<void> => {
		try {
			await request(`/devices/${nvrId}/nvr/channels/${proxyChannelId}/stream/stop`, {
				method: "POST",
			})
		} catch (error) {
			nvrLogger.error("停止 NVR 通道串流失敗", { nvrId, proxyChannelId, error })
			throw error
		}
	}

	const searchRecordings = async (
		nvrId: number,
		body: {
			trackId: number
			startTime: string
			endTime: string
			maxResults?: number
		}
	): Promise<NvrSearchResponse> => {
		try {
			return await request<NvrSearchResponse>(`/devices/${nvrId}/nvr/search`, {
				method: "POST",
				body: JSON.stringify(body),
			})
		} catch (error) {
			nvrLogger.error("NVR 錄影搜尋失敗", { nvrId, error })
			throw error
		}
	}

	const startPlayback = async (
		nvrId: number,
		body: { playbackURI: string }
	): Promise<NvrPlaybackStartResponse> => {
		try {
			return await request<NvrPlaybackStartResponse>(
				`/devices/${nvrId}/nvr/playback/start`,
				{
					method: "POST",
					body: JSON.stringify(body),
				}
			)
		} catch (error) {
			nvrLogger.error("NVR 回放啟動失敗", { nvrId, error })
			throw error
		}
	}

	const stopPlayback = async (nvrId: number, sessionId: string): Promise<void> => {
		try {
			await request(`/devices/${nvrId}/nvr/playback/stop`, {
				method: "POST",
				body: JSON.stringify({ sessionId }),
			})
		} catch (error) {
			nvrLogger.error("NVR 回放停止失敗", { nvrId, sessionId, error })
			throw error
		}
	}

	return {
		listChannels,
		startChannelStream,
		stopChannelStream,
		searchRecordings,
		startPlayback,
		stopPlayback,
	}
}
