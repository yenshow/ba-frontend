import type {
	ElevatorFloorAccessResponse,
	ElevatorLocation,
	ElevatorLog,
	ElevatorSyncCandidate,
	ElevatorSyncJob,
	ElevatorZone,
} from "~/types/elevator"
import { useApiBase } from "~/composables/core/useApiBase"
import { useElevatorLocationApi } from "~/composables/location/api/useElevatorLocationApi"
import { buildPathWithQuery } from "~/utils/apiUtils"
import { normalizeElevatorLogDisplayColumns } from "~/utils/elevatorLogColumns"

type ElevatorSiteDetailResponse = {
	location: {
		name: string
		systems?: Array<{ systemType: string; config?: Record<string, unknown> }>
	}
	latestLogs?: ElevatorLog[]
}

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
			return {
				locationId: site.id,
				id: String(site.id),
				name: site.name,
				deviceIds: site.deviceIds,
				floorCount: cfg?.floorCount,
				floorStart: cfg?.floorStart,
				floorEnd: cfg?.floorEnd,
				floorNames: cfg?.floorNames,
				floorOpenDurations: cfg?.floorOpenDurations,
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
			accessDeviceIds?: number[]
			floorCount?: number
			floorStart?: number
			floorEnd?: number
			floorNames?: string[]
			floorOpenDurations?: number[]
			logDisplayColumns?: string[]
		}

		return {
			...base,
			locationId,
			id: String(locationId),
			name: loc.name || base?.name || "",
			deviceIds: config.deviceIds || base?.deviceIds || [],
			accessDeviceIds: config.accessDeviceIds || base?.accessDeviceIds || [],
			floorCount: config.floorCount ?? base?.floorCount,
			floorStart: config.floorStart ?? base?.floorStart,
			floorEnd: config.floorEnd ?? base?.floorEnd,
			floorNames: config.floorNames ?? base?.floorNames,
			floorOpenDurations: config.floorOpenDurations ?? base?.floorOpenDurations,
			logDisplayColumns: normalizeElevatorLogDisplayColumns(
				config.logDisplayColumns || base?.logDisplayColumns,
			),
			todayEventCount: base?.todayEventCount ?? 0,
			latestLogs: detailRes.latestLogs ?? [],
		}
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

	const getFloorAccess = async (locationId: number) => {
		return request<ElevatorFloorAccessResponse>(`/elevator/locations/${locationId}/floor-access`)
	}

	const replaceFloorAccess = async (
		locationId: number,
		assignments: Array<{ floorIndex: number; personIds: number[] }>,
	) => {
		return request<ElevatorFloorAccessResponse>(`/elevator/locations/${locationId}/floor-access`, {
			method: "PUT",
			body: { assignments },
		})
	}

	const getSyncCandidates = async (locationId: number) => {
		return request<{ persons: ElevatorSyncCandidate[]; hasAccessDevices?: boolean }>(
			`/elevator/locations/${locationId}/sync-candidates`,
		)
	}

	const startFloorSyncJob = async (locationId: number) => {
		return request<{ jobId: string }>(`/elevator/sync-location/${locationId}/job`, {
			method: "POST",
		})
	}

	const getFloorSyncJob = async (jobId: string) => {
		return request<{ job: ElevatorSyncJob }>(`/elevator/sync-location/jobs/${jobId}`)
	}

	return {
		getLocations,
		getLocationDetail,
		getFullReportLogs,
		controlGateway,
		getFloorAccess,
		replaceFloorAccess,
		getSyncCandidates,
		startFloorSyncJob,
		getFloorSyncJob,
	}
}
