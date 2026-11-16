import { useApiBase } from "~/composables/core/useApiBase"
import type {
	IntercomLog,
	IntercomInviteResult,
	IntercomMainStation,
	IntercomSiteZone,
} from "~/types/intercom"

/** 接聽等待 45s + 音檔約 30s + SIP 緩衝；須大於後端 INTERCOM_ALERT_ANSWER_MS */
const RING_REQUEST_TIMEOUT_MS = 120_000

export const useIntercomApi = () => {
	const { request } = useApiBase()

	const getSites = () =>
		request<{ zones: IntercomSiteZone[] }>("/intercom/sites")

	const getMainStations = () =>
		request<{ stations: IntercomMainStation[] }>(
			"/intercom/main-stations"
		)

	const ringLocation = (locationId: number) =>
		request<{
			locationId: number
			deviceId: number
			invite: IntercomInviteResult
		}>(`/intercom/locations/${locationId}/ring`, {
			method: "POST",
			timeout: RING_REQUEST_TIMEOUT_MS,
		})

	const getZoneLogsLatest = (zoneId: number) =>
		request<{ logs: IntercomLog[] }>(
			`/intercom/zones/${zoneId}/logs/latest`
		)

	return {
		getSites,
		getMainStations,
		ringLocation,
		getZoneLogsLatest,
	}
}
