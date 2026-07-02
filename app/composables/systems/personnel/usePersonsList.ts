import type { Person, Paged } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import {
	PERSONNEL_API_ERROR_OPTS,
	type PersonnelHandleApiError,
} from "~/composables/systems/personnel/usePersonnelApi"
import { useDataLoader } from "~/composables/monitoring/useDataLoader"

type EmployeeNoSort = "asc" | "desc"

type LoadParams = {
	q?: string
	sortOrder: EmployeeNoSort
	ungroupedOnly?: true
	mainGroupId?: number
	personGroupId?: number
	limit?: number
	offset?: number
}

export type PersonsGroupFilter =
	| { mode: "all" }
	| { mode: "ungrouped" }
	| { mode: "child"; id: number }
	| { mode: "main"; id: number }

export const usePersonsList = (params: {
	personnelApi: PersonnelApi
	handleApiError: PersonnelHandleApiError
	pageSize?: number
}) => {
	const { personnelApi, handleApiError } = params
	const PAGE_SIZE = Math.max(1, Math.trunc(Number(params.pageSize ?? 10) || 10))

	const personFilter = reactive<{ q: string }>({ q: "" })
	const groupFilter = ref<PersonsGroupFilter>({ mode: "all" })

	const employeeNoSort = ref<EmployeeNoSort>("asc")
	const employeeNoSortOptions = computed(() => [
		{ value: "asc", label: "ID（由小到大）" },
		{ value: "desc", label: "ID（由大到小）" },
	])

	const resolveGroupParams = (): Pick<
		LoadParams,
		"ungroupedOnly" | "mainGroupId" | "personGroupId"
	> => {
		const f = groupFilter.value
		if (f.mode === "ungrouped") return { ungroupedOnly: true as const }
		if (f.mode === "main") return { mainGroupId: f.id }
		if (f.mode === "child") return { personGroupId: f.id }
		return {}
	}

	const getLoadParams = (): LoadParams => ({
		q: personFilter.q?.trim() || undefined,
		sortOrder: employeeNoSort.value,
		...resolveGroupParams(),
	})

	const {
		data: persons,
		total: personsTotal,
		offset: personsOffset,
		isLoading: isLoadingPersons,
		errorMessage: personsLoadError,
		load,
		nextPage,
		prevPage,
		resetPage,
	} = useDataLoader<Person, LoadParams>({
		fetcher: async (loadParams) => {
			const res = (await personnelApi.getPersons({
				q: loadParams.q,
				sortOrder: loadParams.sortOrder,
				limit: loadParams.limit ?? PAGE_SIZE,
				offset: loadParams.offset ?? 0,
				...(loadParams.ungroupedOnly ? { ungroupedOnly: true } : {}),
				...(loadParams.mainGroupId != null ? { mainGroupId: loadParams.mainGroupId } : {}),
				...(loadParams.personGroupId != null ? { personGroupId: loadParams.personGroupId } : {}),
			})) as Paged<Person>
			return {
				items: Array.isArray(res.items) ? res.items : [],
				total: Number.isFinite(Number(res.total)) ? Number(res.total) : 0,
			}
		},
		pageSize: PAGE_SIZE,
		debounce: 0,
		onError: (err) =>
			handleApiError(err, "載入人員失敗", PERSONNEL_API_ERROR_OPTS) || "載入人員失敗",
	})

	const loadPersons = async () => {
		await load(getLoadParams(), true)
	}

	const selectedEmployeeNoSort = computed<string>({
		get: () => employeeNoSort.value,
		set: (v) => {
			const next = (v === "asc" || v === "desc" ? v : "asc") as EmployeeNoSort
			if (next === employeeNoSort.value) return
			employeeNoSort.value = next
			resetPage()
			void loadPersons()
		},
	})

	const applyGroupFilter = (next: PersonsGroupFilter) => {
		groupFilter.value = next
		resetPage()
		void loadPersons()
	}

	const handleSearch = () => {
		resetPage()
		void loadPersons()
	}

	return {
		PAGE_SIZE,
		persons,
		isLoadingPersons,
		personsLoadError,
		personFilter,
		groupFilter,
		personsTotal,
		personsOffset,
		employeeNoSortOptions,
		selectedEmployeeNoSort,
		loadPersons,
		handleSearch,
		setGroupFilterAll: () => applyGroupFilter({ mode: "all" }),
		setGroupFilterUngrouped: () => applyGroupFilter({ mode: "ungrouped" }),
		setGroupFilterByMainGroupId: (id: number) => {
			if (!Number.isFinite(id)) return
			applyGroupFilter({ mode: "main", id: Math.trunc(id) })
		},
		setGroupFilterByChildGroupId: (id: number) => {
			if (!Number.isFinite(id)) return
			applyGroupFilter({ mode: "child", id: Math.trunc(id) })
		},
		goPrevPage: () => prevPage(getLoadParams()),
		goNextPage: () => nextPage(getLoadParams()),
	}
}
