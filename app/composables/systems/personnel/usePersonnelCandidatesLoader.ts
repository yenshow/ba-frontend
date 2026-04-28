import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import type { Person } from "~/types/personnel"
import { fetchAllPaged } from "~/utils/pagingUtils"

export const PERSONNEL_CANDIDATES_PAGE_SIZE = 200

export const fetchAllPersonnelCandidates = async (params: {
	personnelApi: PersonnelApi
	query?: string
}) => {
	const q = String(params.query || "").trim()
	const personnelApi = params.personnelApi

	const items = await fetchAllPaged<Person>(
		({ limit, offset }) =>
			personnelApi.getPersons({
				q: q || undefined,
				sortBy: "employeeNo",
				sortOrder: "asc",
				limit: Math.min(limit, PERSONNEL_CANDIDATES_PAGE_SIZE),
				offset,
			}),
		PERSONNEL_CANDIDATES_PAGE_SIZE
	)

	return Array.isArray(items) ? items : []
}

