import { useApiBase } from "~/composables/core/useApiBase"
import type {
	AccessSecurityInviteResult,
	AccessSecurityMainStation,
	AccessSecuritySiteZone,
} from "~/types/accessSecurity"

/** 接聽等待 45s + 音檔約 30s + SIP 緩衝；須大於後端 ACCESS_SECURITY_ALERT_ANSWER_MS */
const RING_REQUEST_TIMEOUT_MS = 120_000

export const useAccessSecurityApi = () => {
	const { request } = useApiBase()

	const getSites = () =>
		request<{ zones: AccessSecuritySiteZone[] }>("/access-security/sites")

	const getMainStations = () =>
		request<{ stations: AccessSecurityMainStation[] }>(
			"/access-security/main-stations"
		)

	const ringLocation = (locationId: number) =>
		request<{
			locationId: number
			deviceId: number
			invite: AccessSecurityInviteResult
		}>(`/access-security/locations/${locationId}/ring`, {
			method: "POST",
			timeout: RING_REQUEST_TIMEOUT_MS,
		})

	return {
		getSites,
		getMainStations,
		ringLocation,
	}
}
