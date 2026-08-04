import { useApiBase } from "~/composables/core/useApiBase"
import type {
	EnergyBreakdownResponse,
	EnergyDashboardSummary,
	EnergyMeterRankingItem,
	EnergyReadingRow,
	EnergySettingsResponse,
	EnergySystemDistributionItem,
	EnergyTrendPoint,
	EnergyUsageAggregatedRow,
} from "~/types/energy"

export const useEnergyApi = () => {
	const { request } = useApiBase()

	const getSettings = () => request<EnergySettingsResponse>("/energy/settings")

	const updateSettings = (body: Record<string, unknown>) =>
		request<EnergySettingsResponse>("/energy/settings", {
			method: "PUT",
			body,
		})

	const getSummary = () =>
		request<EnergyDashboardSummary>("/energy/dashboard/summary")

	const getTrends = (range: string) =>
		request<{ range: string; bucketType?: string; series: EnergyTrendPoint[] }>(
			`/energy/dashboard/trends?range=${encodeURIComponent(range)}`
		)

	const getDistribution = () =>
		request<{ totalEnergyKwh: number; items: EnergySystemDistributionItem[] }>(
			"/energy/dashboard/distribution"
		)

	const getRanking = (limit = 5) =>
		request<{ items: EnergyMeterRankingItem[]; totalEnergyKwh?: number }>(
			`/energy/dashboard/ranking?limit=${limit}`
		)

	const getBreakdown = () =>
		request<EnergyBreakdownResponse>("/energy/dashboard/breakdown")

	const getUsageAggregated = (params: {
		startTime: string
		endTime?: string
		bucket?: string
		deviceId?: number
		reportScope?: string
	}) => {
		const q = new URLSearchParams()
		q.set("startTime", params.startTime)
		if (params.endTime) q.set("endTime", params.endTime)
		if (params.bucket) q.set("bucket", params.bucket)
		if (params.deviceId != null) q.set("deviceId", String(params.deviceId))
		if (params.reportScope) q.set("reportScope", params.reportScope)
		return request<{ readings: EnergyUsageAggregatedRow[]; meta?: { source?: string } }>(
			`/energy/usage/aggregated?${q.toString()}`
		)
	}

	const getReadings = (params: {
		startTime?: string
		endTime?: string
		deviceId?: number
		limit?: number
		reportScope?: string
	}) => {
		const q = new URLSearchParams()
		if (params.startTime) q.set("startTime", params.startTime)
		if (params.endTime) q.set("endTime", params.endTime)
		if (params.deviceId != null) q.set("deviceId", String(params.deviceId))
		if (params.limit != null) q.set("limit", String(params.limit))
		if (params.reportScope) q.set("reportScope", params.reportScope)
		return request<{ readings: EnergyReadingRow[] }>(
			`/energy/readings?${q.toString()}`
		)
	}

	return {
		getSettings,
		updateSettings,
		getSummary,
		getTrends,
		getDistribution,
		getRanking,
		getBreakdown,
		getUsageAggregated,
		getReadings,
	}
}
