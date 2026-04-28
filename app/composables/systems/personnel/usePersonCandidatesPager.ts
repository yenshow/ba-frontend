import type { Ref } from "vue"
import type { Person } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"

export const resolvePageSize = (pageSize?: number, fallback = 10) => {
	const n = Number(pageSize)
	if (Number.isFinite(n) && n > 0) return Math.trunc(n)
	return Math.trunc(fallback) > 0 ? Math.trunc(fallback) : 10
}

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

export const usePersonCandidatesPager = (params: {
	personnelApi: PersonnelApi
	pageSize?: number
	enabled: Ref<boolean>
}) => {
	const { personnelApi, enabled } = params
	const PAGE_SIZE = resolvePageSize(params.pageSize, 10)

	const query = ref("")
	const items = ref<Person[]>([])
	const total = ref(0)
	const offset = ref(0)
	const isLoading = ref(false)
	const errorText = ref<string | null>(null)

	const load = async () => {
		if (!enabled.value) return
		isLoading.value = true
		errorText.value = null
		try {
			const res = await personnelApi.getPersons({
				q: query.value.trim() || undefined,
				sortBy: "employeeNo",
				sortOrder: "asc",
				limit: PAGE_SIZE,
				offset: offset.value,
			})
			items.value = Array.isArray(res.items) ? res.items : []
			total.value = Number.isFinite(Number(res.total)) ? res.total : 0
		} catch (err) {
			items.value = []
			total.value = 0
			errorText.value = err instanceof Error ? err.message : "載入人員失敗"
		} finally {
			isLoading.value = false
		}
	}

	const search = () => {
		offset.value = 0
		void load()
	}

	const goPrev = () => {
		if (offset.value === 0) return
		offset.value = getPrevOffset({ offset: offset.value, limit: PAGE_SIZE })
		void load()
	}

	const goNext = () => {
		offset.value = getNextOffset({ offset: offset.value, total: total.value, limit: PAGE_SIZE })
		void load()
	}

	return {
		PAGE_SIZE,
		query,
		items,
		total,
		offset,
		isLoading,
		errorText,
		load,
		search,
		goPrev,
		goNext,
	}
}
