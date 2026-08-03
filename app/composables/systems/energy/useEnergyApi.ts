import { useApiBase } from "~/composables/core/useApiBase"
import type {
	EnergyDashboardSummary,
	EnergyDistributionItem,
	EnergyReadingRow,
	EnergySettingsResponse,
	EnergyTrendPoint,
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
		request<{ totalEnergyKwh: number; items: EnergyDistributionItem[] }>(
			"/energy/dashboard/distribution"
		)

	const getRanking = (limit = 5) =>
		request<{ items: EnergyDistributionItem[] }>(
			`/energy/dashboard/ranking?limit=${limit}`
		)

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
		getReadings,
	}
}
