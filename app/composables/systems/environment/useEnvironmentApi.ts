import type { EnvironmentZone, EnvironmentLocation, SensorReading } from "~/types/environment";
import type { EnvironmentParametersResponse } from "~/types/environmentCatalog";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory";
import {
	unifiedToEnvironmentZone,
	environmentToUnifiedZone,
	environmentLocationToUnified
} from "~/utils/locationAdapter";

export interface CreateEnvironmentZoneData {
	name: string;
	locations?: Omit<EnvironmentLocation, "id">[];
}

export interface UpdateEnvironmentZoneData {
	name?: string;
	locations?: (EnvironmentLocation | Omit<EnvironmentLocation, "id">)[];
}

export type EnvironmentReadingsOrder = "asc" | "desc";

export interface GetReadingsOptions {
	startTime?: string;
	endTime?: string;
	limit?: number;
	/** 預設 asc（歷史序列）；即時快照請用 desc + limit 1 */
	order?: EnvironmentReadingsOrder;
	/** 完整報表模擬框；後端另檢查 system.environment.report.full */
	reportScope?: "full";
}

export type AggregatedBucket = "hour" | "day" | "month";

export interface GetReadingsAggregatedOptions {
	bucket: AggregatedBucket;
	startTime?: string;
	endTime?: string;
	/** 完整報表模擬框；後端另檢查 system.environment.report.full */
	reportScope?: "full";
}

export type EnvironmentAggregatedSource = "aggregated" | "raw_computed";

export interface EnvironmentReadingsAggregatedMeta {
	source: EnvironmentAggregatedSource;
	count: number;
}

export interface EnvironmentReadingsAggregatedResponse {
	readings: SensorReading[];
	meta?: EnvironmentReadingsAggregatedMeta;
}

export const useEnvironmentApi = () => {
	const { request } = useApiBase();

	const zoneApi = useSystemLocationApiFactory<EnvironmentZone, EnvironmentLocation>({
		systemType: "environment",
		unifiedToSystemZone: unifiedToEnvironmentZone,
		systemToUnifiedZone: zone => environmentToUnifiedZone(zone, "environment"),
		locationToUnified: environmentLocationToUnified
	});

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
		getParameters: () => request<EnvironmentParametersResponse>("/environment/parameters"),
		getReadings: (locationId: string, options?: GetReadingsOptions) => {
			const params: Record<string, unknown> = {};
			if (options?.startTime) params.startTime = options.startTime;
			if (options?.endTime) params.endTime = options.endTime;
			if (options?.limit) params.limit = options.limit;
			if (options?.order) params.order = options.order;
			if (options?.reportScope) params.reportScope = options.reportScope;

			const path = buildPathWithQuery(`/environment/readings/${locationId}`, params);
			return request<{ readings: SensorReading[] }>(path);
		},
		getReadingsAggregated: (locationId: string, options: GetReadingsAggregatedOptions) => {
			const params: Record<string, unknown> = { bucket: options.bucket };
			if (options.startTime) params.startTime = options.startTime;
			if (options.endTime) params.endTime = options.endTime;
			if (options.reportScope) params.reportScope = options.reportScope;
			const path = buildPathWithQuery(`/environment/readings/${locationId}/aggregated`, params);
			return request<EnvironmentReadingsAggregatedResponse>(path);
		}
	};
};
