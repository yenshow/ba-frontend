/**
 * 人流統計 API Composable
 * 地點/區域/單位/人員/進出場記錄對應後端與 baseacs.slot_card_records。
 * 時間語意：地點統計與進出場記錄為「今日」；單位人員為每人「最近一次進/出場」＋今日進出場時分。
 */

import type {
	PeopleCountingLocation,
	PeopleCountingPersonnel,
	PeopleCountingLog,
	PeopleCountingZone,
} from "~/types/peopleCounting"
import { useApiBase } from "~/composables/core/useApiBase"
import { usePeopleCountingLocationApi } from "~/composables/location/api/usePeopleCountingLocationApi"
import { logger } from "~/utils/logger"
import {
	extractRegionFromZoneName,
	convertApiLogToFrontend,
	mapUnitPersonnelFromApi,
	type UnitPersonnelApiRow,
} from "~/utils/peopleCountingAdapter"
import { normalizeLogDisplayColumns } from "~/utils/peopleCountingLogColumns"
import { normalizePeopleCountingCameraMode } from "~/utils/peopleCountingCameraMode"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import { isPeopleCountingLocationVisible } from "~/utils/peopleCountingDataSource"

/** 完整報表單次上限（與後端 ENTRY_EXIT_MAX_RECORDS 一致） */
export { ENTRY_EXIT_FULL_REPORT_LIMIT as PEOPLE_COUNTING_FULL_REPORT_LIMIT } from "~/utils/entryExitTimeRange"

const apiLogger = logger.createLogger("PeopleCounting API")

export const usePeopleCountingApi = () => {
	const { request } = useApiBase()
	const peopleCountingLocationApi = usePeopleCountingLocationApi()
	const { enableYscpPeopleCounting } = useModuleRegistry()

	/**
	 * 取得所有地點列表（含統計）
	 * @param existingZones - 可選的現有區域列表，如果提供則直接使用，避免重複 API 調用
	 */
	const getLocations = async (existingZones?: {
		zones: PeopleCountingZone[]
	}): Promise<{
		locations: PeopleCountingLocation[]
		zones: PeopleCountingZone[]
	}> => {
		try {
			const [locationsResponse, zonesResponse] = await Promise.all([
				request<{
					sites: Array<{
						id: number
						name: string
						dataSource?: "yscp" | "access_control" | "isapi_camera"
						cameraMode?: "people_counting" | "face_recognition"
						entryCount: number
						exitCount: number
						currentCount?: number
						units: Array<{
							id: number
							name: string
							currentCount: number
							totalCount: number
							entryCount?: number
							exitCount?: number
						}>
					}>
				}>("/people-counting/sites"),
				existingZones
					? Promise.resolve(existingZones)
					: peopleCountingLocationApi.getZones().catch((error) => {
							apiLogger.warn("無法載入地點管理系統，使用預設區域", { error })
							return { zones: [] }
						}),
			])

			const zones = zonesResponse.zones || []
			const locationConfigMap = new Map<number, PeopleCountingLocation & { zoneName: string }>()

			zones.forEach((zone) => {
				zone.locations?.forEach((location) => {
					const locationId = location.id ? Number(location.id) : undefined
					if (locationId) {
						locationConfigMap.set(locationId, { ...location, zoneName: zone.name })
					}
				})
			})

			const yscpOn = enableYscpPeopleCounting.value

			const locations = locationsResponse.sites
				.filter((site) =>
					isPeopleCountingLocationVisible(
						site.dataSource ?? locationConfigMap.get(site.id)?.dataSource,
						yscpOn
					)
				)
				.map((site) => {
					const cfg = locationConfigMap.get(site.id)
					const region = cfg ? extractRegionFromZoneName(cfg.zoneName) || "未分類" : "未分類"

					return {
						locationId: site.id,
						name: site.name,
						dataSource: site.dataSource ?? cfg?.dataSource,
						cameraMode:
							(site.dataSource ?? cfg?.dataSource) === "isapi_camera"
								? normalizePeopleCountingCameraMode(
										(site as { cameraMode?: unknown }).cameraMode ?? cfg?.cameraMode
									)
								: undefined,
						logDisplayColumns: normalizeLogDisplayColumns(cfg?.logDisplayColumns),
						entryDeviceIds: cfg?.entryDeviceIds,
						exitDeviceIds: cfg?.exitDeviceIds,
						entryEventCameraDeviceId: cfg?.entryEventCameraDeviceId,
						exitEventCameraDeviceId: cfg?.exitEventCameraDeviceId,
						zoneName: cfg?.zoneName,
						region,
						status: "active" as const,
						entryCount: site.entryCount,
						exitCount: site.exitCount,
						currentCount: site.currentCount,
						units: site.units.map((unit) => ({
							id: unit.id,
							locationId: site.id,
							name: unit.name,
							capacity: unit.totalCount,
							currentCount: unit.currentCount,
							entryCount: unit.entryCount,
							exitCount: unit.exitCount,
						})),
					} as PeopleCountingLocation
				})

			const filteredZones = zones.map((zone) => ({
				...zone,
				locations: (zone.locations || []).filter((loc) =>
					isPeopleCountingLocationVisible(loc.dataSource, yscpOn)
				),
			}))

			return { locations, zones: filteredZones }
		} catch (error) {
			apiLogger.error("取得地點列表失敗", { error })
			throw error
		}
	}

	/**
	 * 取得單一地點詳情
	 * @param locationId - 地點 ID
	 * @param existingLocations - 可選的現有地點列表，如果提供則直接使用
	 */
	const getLocationDetail = async (
		locationId: number,
		existingLocations?: PeopleCountingLocation[]
	): Promise<PeopleCountingLocation> => {
		try {
			if (existingLocations) {
				const location = existingLocations.find((l) => l.locationId === locationId)
				if (location) {
					return location
				}
			}

			const locationsResponse = await request<{
				sites: Array<{
					id: number
					name: string
					dataSource?: "yscp" | "access_control" | "isapi_camera"
					cameraMode?: "people_counting" | "face_recognition"
					entryCount: number
					exitCount: number
					currentCount?: number
					units: Array<{
						id: number
						name: string
						currentCount: number
						totalCount: number
						entryCount?: number
						exitCount?: number
					}>
				}>
			}>("/people-counting/sites")

			const site = locationsResponse.sites.find((s) => s.id === locationId)
			if (!site) {
				throw new Error(`找不到地點 ID: ${locationId}`)
			}

			return {
				locationId: site.id,
				name: site.name,
				dataSource: site.dataSource,
				cameraMode:
					site.dataSource === "isapi_camera"
						? normalizePeopleCountingCameraMode(
								(site as { cameraMode?: unknown }).cameraMode
							)
						: undefined,
				region: "未分類",
				status: "active" as const,
				entryCount: site.entryCount,
				exitCount: site.exitCount,
				currentCount: site.currentCount,
				units: site.units.map((unit) => ({
					id: unit.id,
					locationId: site.id,
					name: unit.name,
					capacity: unit.totalCount,
					currentCount: unit.currentCount,
					entryCount: unit.entryCount,
					exitCount: unit.exitCount,
				})),
			} as PeopleCountingLocation
		} catch (error) {
			apiLogger.error("取得地點詳情失敗", { locationId, error })
			throw error
		}
	}

	/** 取得單位人員列表（後端僅辨識 query `siteId`；此處的 `locationId` 對應 `siteId`） */
	const getUnitPersonnel = async (
		unitId: number,
		locationId?: number
	): Promise<PeopleCountingPersonnel[]> => {
		try {
			const url = locationId
				? `/people-counting/units/${unitId}/personnel?siteId=${locationId}`
				: `/people-counting/units/${unitId}/personnel`

			const response = await request<{
				personnel: UnitPersonnelApiRow[]
				entryCount: number
				exitCount: number
			}>(url)

			const { personnel } = response
			if (!Array.isArray(personnel)) return []

			return personnel.map((person) => mapUnitPersonnelFromApi(person, unitId))
		} catch (error) {
			apiLogger.error("取得單位人員失敗", { unitId, locationId, error })
			throw error
		}
	}

	type PeopleCountingApiLogRow = {
		id: string
		personId: number
		personName: string
		unitId: number | null
		unitName: string
		employeeId?: string | null
		eventType: "entry" | "exit" | "failed"
		eventLabel?: string | null
		verifyMethod?: string | null
		similarity?: number | null
		timestamp: string
		deviceScreenshotUrl: string
		deviceName?: string
		count?: number
		locationId?: number
	}

	const mapApiLogsToFrontend = (
		logs: PeopleCountingApiLogRow[],
		defaultLocationId?: number
	): PeopleCountingLog[] =>
		logs.map((log) => {
			const locId =
				log.locationId != null
					? Number(log.locationId)
					: defaultLocationId != null
						? defaultLocationId
						: 0
			return convertApiLogToFrontend(log, locId)
		})

	/**
	 * 取得地點進出場記錄（完整報表用，可分頁/時間區間）
	 * startTime / endTime 未傳時，後端預設為今日範圍
	 */
	const getLocationLogs = async (
		locationId: number,
		options?: {
			limit?: number
			unitId?: number
			startTime?: string
			endTime?: string
			timeRange?: "today" | "yesterday" | "last7days"
			offset?: number
		}
	): Promise<{ logs: PeopleCountingLog[]; total: number }> => {
		try {
			const q: Record<string, string> = {}
			if (options?.limit) q.limit = String(options.limit)
			if (options?.unitId != null) q.unitId = String(options.unitId)
			if (options?.startTime) q.startTime = options.startTime
			if (options?.endTime) q.endTime = options.endTime
			if (options?.timeRange) q.timeRange = options.timeRange
			if (options?.offset != null && options.offset > 0) q.offset = String(options.offset)
			const queryString = new URLSearchParams(q).toString()
			const url = `/people-counting/sites/${locationId}/logs${queryString ? `?${queryString}` : ""}`

			const response = await request<{ logs: PeopleCountingApiLogRow[]; total?: number }>(url)
			const logs = mapApiLogsToFrontend(response.logs || [], locationId)
			const total =
				response.total != null && Number.isFinite(Number(response.total))
					? Number(response.total)
					: logs.length
			return { logs, total }
		} catch (error) {
			apiLogger.error("取得進出場記錄失敗", { locationId, options, error })
			throw error
		}
	}

	/**
	 * 跨地點進出場記錄（完整報表）
	 */
	const getAllLocationLogs = async (options?: {
		limit?: number
		siteId?: number
		startTime?: string
		endTime?: string
		timeRange?: "today" | "yesterday" | "last7days"
		offset?: number
		search?: string
	}): Promise<PeopleCountingLog[]> => {
		try {
			const q: Record<string, string> = {}
			if (options?.limit) q.limit = String(options.limit)
			if (options?.siteId) q.siteId = String(options.siteId)
			if (options?.startTime) q.startTime = options.startTime
			if (options?.endTime) q.endTime = options.endTime
			if (options?.timeRange) q.timeRange = options.timeRange
			if (options?.offset != null && options.offset > 0) q.offset = String(options.offset)
			if (options?.search?.trim()) q.search = options.search.trim()
			const queryString = new URLSearchParams(q).toString()
			const url = `/people-counting/logs${queryString ? `?${queryString}` : ""}`
			const response = await request<{ logs: PeopleCountingApiLogRow[] }>(url)
			return mapApiLogsToFrontend(response.logs || [])
		} catch (error) {
			apiLogger.error("取得跨地點進出場記錄失敗", { options, error })
			throw error
		}
	}

	const resetSiteStats = async (
		siteId: number
	): Promise<{ statsResetAt: string }> =>
		request(`/people-counting/sites/${siteId}/reset`, { method: "POST" })

	return {
		getLocations,
		getLocationDetail,
		getUnitPersonnel,
		getLocationLogs,
		getAllLocationLogs,
		resetSiteStats,
	}
}
