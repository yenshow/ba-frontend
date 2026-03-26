/**
 * 人流統計 API Composable
 * 地點/區域/單位/人員/進出場記錄對應後端與 baseacs.slot_card_records。
 * 時間語意：地點統計與進出場記錄為「今日」；單位人員為每人「最近一次進/出場」＋今日進出場時分。
 */

import type {
	PeopleCountingLocation,
	PeopleCountingPersonnel,
	PeopleCountingLog,
	PeopleCountingZone
} from "~/types/peopleCounting";
import { useApiBase } from "~/composables/core/useApiBase";
import { usePeopleCountingLocationApi } from "~/composables/location/api/usePeopleCountingLocationApi";
import { buildPathWithQuery } from "~/utils/apiUtils";
import { logger } from "~/utils/logger";
import { formatDateTime } from "~/utils/dateUtils";
import { extractRegionFromZoneName, convertApiLogToFrontend } from "~/utils/peopleCountingAdapter";

const apiLogger = logger.createLogger("PeopleCounting API");

export const usePeopleCountingApi = () => {
	const { request } = useApiBase();
	const peopleCountingLocationApi = usePeopleCountingLocationApi();

	const getLocations = async (existingZones?: {
		zones: PeopleCountingZone[];
	}): Promise<{
		locations: PeopleCountingLocation[];
		zones: PeopleCountingZone[];
	}> => {
		try {
			const [locationsResponse, zonesResponse] = await Promise.all([
				request<{
					sites: Array<{
						id: number;
						name: string;
						entryCount: number;
						exitCount: number;
						units: Array<{
							id: number;
							name: string;
							currentCount: number;
							totalCount: number;
						}>;
					}>;
				}>("/people-counting/sites"),
				existingZones
					? Promise.resolve(existingZones)
					: peopleCountingLocationApi.getZones().catch(error => {
							apiLogger.warn("無法載入地點管理系統，使用預設區域", { error });
							return { zones: [] };
						})
			]);

			const zones = zonesResponse.zones || [];
			const locationMap = new Map<number, { zoneName: string }>();

			zones.forEach(zone => {
				zone.locations?.forEach(location => {
					const locationId = location.id ? Number(location.id) : undefined;
					if (locationId) {
						locationMap.set(locationId, { zoneName: zone.name });
					}
				});
			});

			const locations = locationsResponse.sites.map(site => {
				const locationInfo = locationMap.get(site.id);
				const region = locationInfo
					? extractRegionFromZoneName(locationInfo.zoneName) || "未分類"
					: "未分類";

				return {
					locationId: site.id,
					name: site.name,
					region,
					status: "active" as const,
					entryCount: site.entryCount,
					exitCount: site.exitCount,
					units: site.units.map(unit => ({
						id: unit.id,
						locationId: site.id,
						name: unit.name,
						capacity: unit.totalCount,
						currentCount: unit.currentCount
					}))
				} as PeopleCountingLocation;
			});

			return { locations, zones };
		} catch (error) {
			apiLogger.error("取得地點列表失敗", { error });
			throw error;
		}
	};

	const getLocationDetail = async (
		locationId: number,
		existingLocations?: PeopleCountingLocation[]
	): Promise<PeopleCountingLocation> => {
		try {
			if (existingLocations) {
				const location = existingLocations.find(l => l.locationId === locationId);
				if (location) {
					return location;
				}
			}

			const locationsResponse = await request<{
				sites: Array<{
					id: number;
					name: string;
					entryCount: number;
					exitCount: number;
					units: Array<{
						id: number;
						name: string;
						currentCount: number;
						totalCount: number;
					}>;
				}>;
			}>("/people-counting/sites");

			const site = locationsResponse.sites.find(s => s.id === locationId);
			if (!site) {
				throw new Error(`找不到地點 ID: ${locationId}`);
			}

			return {
				locationId: site.id,
				name: site.name,
				region: "未分類",
				status: "active" as const,
				entryCount: site.entryCount,
				exitCount: site.exitCount,
				units: site.units.map(unit => ({
					id: unit.id,
					locationId: site.id,
					name: unit.name,
					capacity: unit.totalCount,
					currentCount: unit.currentCount
				}))
			} as PeopleCountingLocation;
		} catch (error) {
			apiLogger.error("取得地點詳情失敗", { locationId, error });
			throw error;
		}
	};

	const getPersonnelList = async (locationId?: number): Promise<PeopleCountingPersonnel[]> => {
		const params: Record<string, unknown> = {};
		if (locationId != null) params.locationId = locationId;
		const path = buildPathWithQuery("/people-counting/personnel", params);
		const res = await request<{ personnel: PeopleCountingPersonnel[] }>(path);
		return Array.isArray(res?.personnel) ? res.personnel : [];
	};

	const getUnitPersonnel = async (unitId: number, locationId?: number): Promise<PeopleCountingPersonnel[]> => {
		const params: Record<string, unknown> = {};
		if (locationId != null) params.locationId = locationId;
		const path = buildPathWithQuery(`/people-counting/units/${unitId}/personnel`, params);
		const res = await request<{ personnel: PeopleCountingPersonnel[] }>(path);
		return Array.isArray(res?.personnel) ? res.personnel : [];
	};

	/**
	 * 取得地點進出場記錄（YSCP / access_control 同一 API）
	 * startTime / endTime 未傳時，後端預設為今日範圍
	 */
	const getLocationLogs = async (
		locationId: number,
		options?: {
			limit?: number;
			unitId?: number;
			startTime?: string;
			endTime?: string;
			offset?: number;
		}
	): Promise<PeopleCountingLog[]> => {
		try {
			const q: Record<string, string> = {};
			if (options?.limit) q.limit = String(options.limit);
			if (options?.unitId) q.unitId = String(options.unitId);
			if (options?.startTime) q.startTime = options.startTime;
			if (options?.endTime) q.endTime = options.endTime;
			if (options?.offset != null && options.offset > 0) q.offset = String(options.offset);
			const queryString = new URLSearchParams(q).toString();
			const url = `/people-counting/sites/${locationId}/logs${queryString ? `?${queryString}` : ""}`;

			const response = await request<{
				logs: Array<{
					id: string;
					personId: number;
					personName: string;
					unitId: number | null;
					unitName: string;
					employeeId?: string | null;
					eventType: "entry" | "exit" | "failed";
					timestamp: string;
					deviceScreenshotUrl: string;
					deviceName?: string;
				}>;
			}>(url);

			const logs = response.logs || [];
			return logs.map(log => convertApiLogToFrontend(log, locationId));
		} catch (error) {
			apiLogger.error("取得進出場記錄失敗", { locationId, options, error });
			throw error;
		}
	};

	return {
		getLocations,
		getLocationDetail,
		getPersonnelList,
		getUnitPersonnel,
		getLocationLogs
	};
};

