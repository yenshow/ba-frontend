import type { Person } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { fetchAllPaged } from "~/utils/pagingUtils"

export const PERSONNEL_CANDIDATES_PAGE_SIZE = 200

export const clampOffset = (params: { offset: number; total: number; limit: number }) => {
	const { offset, total, limit } = params
	const safeLimit = Math.max(1, Math.trunc(limit) || 1)
	const safeTotal = Math.max(0, Math.trunc(total) || 0)
	const maxOffset = Math.max(0, Math.floor((Math.max(0, safeTotal - 1)) / safeLimit) * safeLimit)
	return Math.min(Math.max(0, Math.trunc(offset) || 0), maxOffset)
}

export const getPrevOffset = (params: { offset: number; limit: number }) => {
	const { offset, limit } = params
	const safeLimit = Math.max(1, Math.trunc(limit) || 1)
	return Math.max(0, (Math.trunc(offset) || 0) - safeLimit)
}

export const getNextOffset = (params: { offset: number; total: number; limit: number }) => {
	const { offset, total, limit } = params
	const safeLimit = Math.max(1, Math.trunc(limit) || 1)
	const safeOffset = Math.max(0, Math.trunc(offset) || 0)
	const safeTotal = Math.max(0, Math.trunc(total) || 0)
	if (safeOffset + safeLimit >= safeTotal) return safeOffset
	return safeOffset + safeLimit
}

export const fetchAllPersonnelCandidates = async (params: {
	personnelApi: PersonnelApi
	query?: string
}) => {
	const q = String(params.query || "").trim()
	const items = await fetchAllPaged<Person>(
		({ limit, offset }) =>
			params.personnelApi.getPersons({
				q: q || undefined,
				sortOrder: "asc",
				limit: Math.min(limit, PERSONNEL_CANDIDATES_PAGE_SIZE),
				offset,
			}),
		PERSONNEL_CANDIDATES_PAGE_SIZE
	)
	return Array.isArray(items) ? items : []
}
