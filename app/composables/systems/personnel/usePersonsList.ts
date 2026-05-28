import type { Person, Paged } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import {
	PERSONNEL_API_ERROR_OPTS,
	type PersonnelHandleApiError,
} from "~/composables/systems/personnel/usePersonnelApi"
import { DATA_LOADER_MIN_LOADING_DELAY_MS } from "~/composables/monitoring/useDataLoader"

type EmployeeNoSort = "asc" | "desc"

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

	const persons = ref<Person[]>([])
	const isLoadingPersons = ref(false)
	const personsLoadError = ref<string | null>(null)
	const personFilter = reactive<{ q: string }>({ q: "" })
	const groupFilter = ref<PersonsGroupFilter>({ mode: "all" })
	const personsTotal = ref(0)
	const personsOffset = ref(0)

	const employeeNoSort = ref<EmployeeNoSort>("asc")
	const employeeNoSortOptions = computed(() => [
		{ value: "asc", label: "ID（由小到大）" },
		{ value: "desc", label: "ID（由大到小）" },
	])

	const selectedEmployeeNoSort = computed<string>({
		get: () => employeeNoSort.value,
		set: (v) => {
			const next = (v === "asc" || v === "desc" ? v : "asc") as EmployeeNoSort
			if (next === employeeNoSort.value) return
			employeeNoSort.value = next
			personsOffset.value = 0
			void loadPersons()
		},
	})

	const resolveGroupParams = () => {
		const f = groupFilter.value
		if (f.mode === "ungrouped") return { ungroupedOnly: true as const }
		if (f.mode === "main") return { mainGroupId: f.id }
		if (f.mode === "child") return { personGroupId: f.id }
		return {}
	}

	const applyGroupFilter = (next: PersonsGroupFilter) => {
		groupFilter.value = next
		personsOffset.value = 0
		void loadPersons()
	}

	const loadPersons = async () => {
		isLoadingPersons.value = true
		personsLoadError.value = null
		const startTime = Date.now()
		try {
			const res = (await personnelApi.getPersons({
				q: personFilter.q?.trim() || undefined,
				sortOrder: employeeNoSort.value,
				limit: PAGE_SIZE,
				offset: personsOffset.value,
				...resolveGroupParams(),
			})) as Paged<Person>
			const elapsed = Date.now() - startTime
			const remainingDelay = Math.max(0, DATA_LOADER_MIN_LOADING_DELAY_MS - elapsed)
			if (remainingDelay > 0) {
				await new Promise((resolve) => setTimeout(resolve, remainingDelay))
			}

			persons.value = Array.isArray(res.items) ? res.items : []
			personsTotal.value = Number.isFinite(Number(res.total)) ? Number(res.total) : 0
		} catch (err) {
			const fromHandler = handleApiError(err, "載入人員失敗", PERSONNEL_API_ERROR_OPTS)
			personsLoadError.value =
				(typeof fromHandler === "string" && fromHandler.trim()) ||
				(err instanceof Error && err.message) ||
				"載入人員失敗"
			persons.value = []
			personsTotal.value = 0
		} finally {
			isLoadingPersons.value = false
		}
	}

	const handleSearch = () => {
		personsOffset.value = 0
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
		goPrevPage: () => {
			if (personsOffset.value <= 0) return
			personsOffset.value = Math.max(0, personsOffset.value - PAGE_SIZE)
			void loadPersons()
		},
		goNextPage: () => {
			if (personsOffset.value + PAGE_SIZE >= personsTotal.value) return
			personsOffset.value = personsOffset.value + PAGE_SIZE
			void loadPersons()
		},
	}
}
