import { useApiBase } from "~/composables/core/useApiBase"

export type MonitoringOverviewStatusResponse = {
	systems: Record<
		string,
		{
			zones: unknown[]
			items: unknown[]
		}
	>
}

export const useMonitoringOverviewApi = () => {
	const { request } = useApiBase()

	const getOverviewStatus = (options?: { syncAlerts?: boolean }) => {
		const params = new URLSearchParams()
		if (options?.syncAlerts !== undefined) {
			params.set("syncAlerts", options.syncAlerts ? "true" : "false")
		}
		const q = params.toString() ? `?${params.toString()}` : ""
		return request<MonitoringOverviewStatusResponse>(`/monitoring/overview/status${q}`, {
			timeout: 30_000,
		})
	}

	return { getOverviewStatus }
}

