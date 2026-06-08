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

	const getOverviewStatus = () =>
		request<MonitoringOverviewStatusResponse>(`/monitoring/overview/status`, {
			timeout: 30_000,
		})

	return { getOverviewStatus }
}
