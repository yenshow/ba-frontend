import type {
	ElevatorLocation,
	ElevatorLog,
	ElevatorZone,
	ElevatorLiveState,
	ElevatorCallCommand,
	ElevatorDoorControlCommand,
	ElevatorFloorAccessResponse,
	ElevatorSyncCandidate,
	ElevatorSyncJob,
} from "~/types/elevator"
import { useApiBase } from "~/composables/core/useApiBase"
import { useElevatorLocationApi } from "~/composables/location/api/useElevatorLocationApi"
import { buildPathWithQuery } from "~/utils/apiUtils"
import { normalizeElevatorLogDisplayColumns } from "~/utils/elevatorLogColumns"
import type { ElevatorDeviceRole } from "~/utils/elevatorFloorModel"

type ElevatorSiteListItem = {
	id: number
	name: string
	ladderDevice?: ElevatorDeviceRole | null
	callDevice?: ElevatorDeviceRole | null
	floors?: ElevatorLocation["floors"]
	panel?: ElevatorLocation["panel"]
	todayEventCount: number
	live?: ElevatorLiveState
}

type ElevatorSiteDetailResponse = {
	location: {
		name: string
		id?: string | number
		elevatorConfig?: Partial<ElevatorLocation>
	}
	live?: ElevatorLiveState
	latestLogs?: ElevatorLog[]
}

const mergeSiteWithConfig = (
	site: ElevatorSiteListItem,
	cfg?: Partial<ElevatorLocation>,
): ElevatorLocation => ({
	locationId: site.id,
	id: String(site.id),
	name: site.name,
	panel: site.panel ?? cfg?.panel,
	floors: site.floors ?? cfg?.floors,
	ladderDevice: cfg?.ladderDevice ?? site.ladderDevice ?? null,
	callDevice: cfg?.callDevice ?? site.callDevice ?? null,
	floorDetection: cfg?.floorDetection ?? null,
	callCommandType: "visitor",
	accessDeviceIds: cfg?.accessDeviceIds ?? [],
	todayEventCount: site.todayEventCount,
	logDisplayColumns: normalizeElevatorLogDisplayColumns(cfg?.logDisplayColumns),
	live: site.live ?? cfg?.live,
})

export const ELEVATOR_FULL_REPORT_LIMIT = 500

export const useElevatorApi = () => {
	const { request } = useApiBase()
	const elevatorLocationApi = useElevatorLocationApi()

	const getLocations = async (existingZones?: { zones: ElevatorZone[] }) => {
		const [sitesResponse, zonesResponse] = await Promise.all([
			request<{ sites: ElevatorSiteListItem[] }>("/elevator/sites"),
			existingZones
				? Promise.resolve(existingZones)
				: elevatorLocationApi.getZones().catch(() => ({ zones: [] as ElevatorZone[] })),
		])

		const configMap = new Map<number, ElevatorLocation>()
		for (const zone of zonesResponse.zones || []) {
			for (const loc of zone.locations || []) {
				const locationId = loc.id ? Number(loc.id) : NaN
				if (Number.isFinite(locationId)) {
					configMap.set(locationId, loc)
				}
			}
		}

		return {
			locations: sitesResponse.sites.map((site) =>
				mergeSiteWithConfig(site, configMap.get(site.id)),
			),
			zones: zonesResponse.zones || [],
		}
	}

	const getLocationDetail = async (
		locationId: number,
		existingLocations: ElevatorLocation[] = [],
	): Promise<ElevatorLocation & { latestLogs?: ElevatorLog[]; live?: ElevatorLiveState }> => {
		const base = existingLocations.find((l) => l.locationId === locationId)
		const detailRes = await request<ElevatorSiteDetailResponse>(`/elevator/sites/${locationId}`)
		const elevatorConfig = detailRes.location?.elevatorConfig

		return {
			...(base ?? { locationId, id: String(locationId), name: detailRes.location?.name ?? "" }),
			...elevatorConfig,
			name: detailRes.location?.name ?? base?.name ?? "",
			locationId,
			id: String(locationId),
			callCommandType: "visitor",
			latestLogs: detailRes.latestLogs,
			live: detailRes.live ?? base?.live,
		}
	}

	const getLiveState = (locationId: number) =>
		request<{ live: ElevatorLiveState }>(`/elevator/sites/${locationId}/live`)

	const postControl = <T = unknown>(
		deviceId: number,
		payload: { gatewayIndex: number; command: string },
		options?: { locationId?: number; targetLogicalIndex?: number },
	) =>
		request<T>(`/ladder-sdk/devices/${deviceId}/control`, {
			method: "POST",
			body: JSON.stringify({
				...payload,
				...(options?.locationId != null ? { locationId: options.locationId } : {}),
				...(options?.targetLogicalIndex != null
					? { targetLogicalIndex: options.targetLogicalIndex }
					: {}),
			}),
		})

	const callElevatorToFloor = (params: {
		callDeviceId: number
		gatewayIndex: number
		command: ElevatorCallCommand
		locationId?: number
		targetLogicalIndex: number
	}) =>
		postControl<{ live?: ElevatorLiveState }>(
			params.callDeviceId,
			{ gatewayIndex: params.gatewayIndex, command: params.command },
			{
				locationId: params.locationId,
				targetLogicalIndex: params.targetLogicalIndex,
			},
		)

	const controlLadderDoor = (params: {
		ladderDeviceId: number
		gatewayIndex: number
		command: ElevatorDoorControlCommand
	}) =>
		postControl(params.ladderDeviceId, {
			gatewayIndex: params.gatewayIndex,
			command: params.command,
		})

	const getFloorAccess = (locationId: number) =>
		request<ElevatorFloorAccessResponse>(`/elevator/locations/${locationId}/floor-access`)

	const replaceFloorAccess = (
		locationId: number,
		assignments: Array<{ floorIndex: number; personIds: number[] }>,
	) =>
		request<ElevatorFloorAccessResponse>(`/elevator/locations/${locationId}/floor-access`, {
			method: "PUT",
			body: JSON.stringify({ assignments }),
		})

	const getSyncCandidates = (locationId: number) =>
		request<{ persons: ElevatorSyncCandidate[]; hasAccessDevices?: boolean }>(
			`/elevator/locations/${locationId}/sync-candidates`,
		)

	const startFloorSyncJob = (locationId: number) =>
		request<{ jobId: string }>(`/elevator/sync-location/${locationId}/job`, { method: "POST" })

	const getFloorSyncJob = (jobId: string) =>
		request<{ job: ElevatorSyncJob }>(`/elevator/sync-location/jobs/${jobId}`)

	const getLogs = (params?: {
		siteId?: number
		limit?: number
		offset?: number
		startTime?: string
		endTime?: string
		timeRange?: string
		search?: string
	}) => request(buildPathWithQuery("/elevator/logs", params ?? {}))

	return {
		getLocations,
		getLocationDetail,
		getLiveState,
		callElevatorToFloor,
		controlLadderDoor,
		getFloorAccess,
		replaceFloorAccess,
		getSyncCandidates,
		startFloorSyncJob,
		getFloorSyncJob,
		getLogs,
	}
}
