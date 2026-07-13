import type {
	OperationalEventFilters,
	OperationalEventListResponse,
} from "~/types/operationalEvent"
import { useApiBase } from "~/composables/core/useApiBase"
import { buildPathWithQuery } from "~/utils/apiUtils"

export const useOperationalEventApi = () => {
	const { request } = useApiBase()

	const getEvents = async (
		filters?: OperationalEventFilters,
	): Promise<OperationalEventListResponse> => {
		const path = buildPathWithQuery(
			"/operational-events",
			filters as Record<string, unknown>,
		)
		return await request<OperationalEventListResponse>(path)
	}

	return { getEvents }
}
