import type { EnvironmentZone, EnvironmentLocation, SensorReading } from "~/types/environment";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";
import { useErrorTrackingApiFactory } from "~/composables/factories/useErrorTrackingApiFactory";
import { useSystemLocationApiFactory } from "~/composables/systems/location/useSystemLocationApiFactory";
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

export interface GetReadingsOptions {
	startTime?: string;
	endTime?: string;
	limit?: number;
}

export type AggregatedBucket = "hour" | "day" | "month";

export interface GetReadingsAggregatedOptions {
	bucket: AggregatedBucket;
	startTime?: string;
	endTime?: string;
}

export const useEnvironmentApi = () => {
	const { request } = useApiBase();

	const zoneApi = useSystemLocationApiFactory<EnvironmentZone, EnvironmentLocation>({
		systemType: "environment",
		unifiedToSystemZone: unifiedToEnvironmentZone,
		systemToUnifiedZone: (zone) => environmentToUnifiedZone(zone, "environment"),
		locationToUnified: environmentLocationToUnified
	});

	const errorTrackingApi = useErrorTrackingApiFactory(
		"/environment/systems",
		"無法讀取感測器資料"
	);

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
		getReadings: (locationId: string, options?: GetReadingsOptions) => {
			const params: Record<string, unknown> = {};
			if (options?.startTime) params.startTime = options.startTime;
			if (options?.endTime) params.endTime = options.endTime;
			if (options?.limit) params.limit = options.limit;

			const path = buildPathWithQuery(`/environment/readings/${locationId}`, params);
			return request<{ readings: SensorReading[] }>(path);
		},
		getReadingsAggregated: (locationId: string, options: GetReadingsAggregatedOptions) => {
			const params: Record<string, unknown> = { bucket: options.bucket };
			if (options.startTime) params.startTime = options.startTime;
			if (options.endTime) params.endTime = options.endTime;
			const path = buildPathWithQuery(`/environment/readings/${locationId}/aggregated`, params);
			return request<{ readings: SensorReading[] }>(path);
		},

		reportError: errorTrackingApi.reportError,
		clearError: errorTrackingApi.clearError
	};
};
