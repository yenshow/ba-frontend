import type { ElevatorLocation, ElevatorLog, ElevatorSyncJob, ElevatorZone } from "~/types/elevator"

type ElevatorSiteDetailResponse = {
	location: {
		name: string
		systems?: Array<{ systemType: string; config?: Record<string, unknown> }>
	}
	latestLogs?: ElevatorLog[]
}

type DeviceCardListItem = { cardNo: string; name?: string }

const normalizeDeviceCards = (res: unknown): DeviceCardListItem[] => {
	const raw =
		(res as { cards?: Array<{ cardNo?: string; name?: string }> })?.cards ??
		(Array.isArray(res) ? res : [])
	return raw
		.map((c) => ({
			cardNo: String(c.cardNo || "").trim(),
			name: c.name,
		}))
		.filter((c) => c.cardNo)
}
import { useApiBase } from "~/composables/core/useApiBase"
import { useElevatorLocationApi } from "~/composables/location/api/useElevatorLocationApi"
import { buildPathWithQuery } from "~/utils/apiUtils"
import { normalizeElevatorLogDisplayColumns } from "~/utils/elevatorLogColumns"
import { extractRegionFromZoneName } from "~/utils/peopleCountingAdapter"

export const ELEVATOR_FULL_REPORT_LIMIT = 500

export const useElevatorApi = () => {
	const { request } = useApiBase()
	const elevatorLocationApi = useElevatorLocationApi()

	const getLocations = async (existingZones?: { zones: ElevatorZone[] }) => {
		const [sitesResponse, zonesResponse] = await Promise.all([
			request<{
				sites: Array<{
					id: number
					name: string
					deviceIds: number[]
					todayEventCount: number
				}>
			}>("/elevator/sites"),
			existingZones
				? Promise.resolve(existingZones)
				: elevatorLocationApi.getZones().catch(() => ({ zones: [] as ElevatorZone[] })),
		])

		const zones = zonesResponse.zones || []
		const configMap = new Map<number, ElevatorLocation & { zoneName: string }>()
		zones.forEach((zone) => {
			zone.locations?.forEach((loc) => {
				const locationId = loc.id ? Number(loc.id) : undefined
				if (locationId) {
					configMap.set(locationId, { ...loc, zoneName: zone.name })
				}
			})
		})

		const locations: ElevatorLocation[] = sitesResponse.sites.map((site) => {
			const cfg = configMap.get(site.id)
			const region = cfg ? extractRegionFromZoneName(cfg.zoneName) || "未分類" : "未分類"
			return {
				locationId: site.id,
				id: String(site.id),
				name: site.name,
				region,
				deviceIds: site.deviceIds,
				todayEventCount: site.todayEventCount,
				logDisplayColumns: normalizeElevatorLogDisplayColumns(cfg?.logDisplayColumns),
			}
		})

		return { locations, zones }
	}

	const getLocationDetail = async (
		locationId: number,
		existingLocations: ElevatorLocation[] = [],
	): Promise<ElevatorLocation & { latestLogs?: ElevatorLog[] }> => {
		const base = existingLocations.find((l) => l.locationId === locationId)
		const detailRes = await request<ElevatorSiteDetailResponse>(`/elevator/sites/${locationId}`)

		const loc = detailRes.location
		const sys = loc.systems?.find((s) => s.systemType === "elevator")
		const config = (sys?.config || {}) as {
			deviceIds?: number[]
			logDisplayColumns?: string[]
		}

		return {
			...base,
			locationId,
			id: String(locationId),
			name: loc.name || base?.name || "",
			deviceIds: config.deviceIds || base?.deviceIds || [],
			logDisplayColumns: normalizeElevatorLogDisplayColumns(
				config.logDisplayColumns || base?.logDisplayColumns,
			),
			todayEventCount: base?.todayEventCount ?? 0,
			region: base?.region,
			latestLogs: detailRes.latestLogs ?? [],
		}
	}

	const getLocationLogs = async (
		locationId: number,
		options: {
			limit?: number
			offset?: number
			startTime?: string
			endTime?: string
			search?: string
		} = {},
	): Promise<ElevatorLog[]> => {
		const path = buildPathWithQuery(`/elevator/sites/${locationId}/logs`, options)
		const res = await request<{ logs: ElevatorLog[] }>(path)
		return res.logs || []
	}

	const getFullReportLogs = async (options: {
		siteId?: number
		startTime?: string
		endTime?: string
		search?: string
		limit?: number
		offset?: number
	}) => {
		const path = buildPathWithQuery("/elevator/logs", options)
		return request<{ logs: ElevatorLog[]; total: number }>(path)
	}

	const controlGateway = async (
		deviceId: number,
		payload: { gatewayIndex: number; command: string },
	) => {
		return request(`/ladder-sdk/devices/${deviceId}/control`, {
			method: "POST",
			body: payload,
		})
	}

	const startCardSyncJob = async (locationId: number) => {
		return request<{ jobId: string }>(`/elevator/sync-location/${locationId}/job`, {
			method: "POST",
		})
	}

	const getCardSyncJob = async (jobId: string) => {
		return request<{ job: ElevatorSyncJob }>(`/elevator/sync-location/jobs/${jobId}`)
	}

	const listDeviceCards = async (deviceId: number): Promise<DeviceCardListItem[]> => {
		const res = await request(`/ladder-sdk/devices/${deviceId}/cards`)
		return normalizeDeviceCards(res)
	}

	const deleteDeviceCard = async (deviceId: number, cardNo: string) => {
		return request(`/ladder-sdk/devices/${deviceId}/cards/${encodeURIComponent(cardNo)}`, {
			method: "DELETE",
		})
	}

	return {
		getZones: elevatorLocationApi.getZones,
		getLocations,
		getLocationDetail,
		getLocationLogs,
		getFullReportLogs,
		controlGateway,
		startCardSyncJob,
		getCardSyncJob,
		listDeviceCards,
		deleteDeviceCard,
	}
}
