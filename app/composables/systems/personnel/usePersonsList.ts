import type { Person, Paged } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { DATA_LOADER_MIN_LOADING_DELAY_MS } from "~/composables/monitoring/useDataLoader"

type EmployeeNoSort = "asc" | "desc"

export const usePersonsList = (params: {
	personnelApi: PersonnelApi
	handleApiError: (err: unknown, fallbackMessage: string) => string | void | null
	pageSize?: number
}) => {
	const { personnelApi, handleApiError } = params
	const PAGE_SIZE = Math.max(1, Math.trunc(Number(params.pageSize ?? 10) || 10))

	const persons = ref<Person[]>([])
	const isLoadingPersons = ref(false)
	const personsLoadError = ref<string | null>(null)
	const personFilter = reactive<{ q: string }>({ q: "" })
	const groupFilter = ref<
		| { mode: "all"; ids: number[] }
		| { mode: "single"; ids: number[] }
		| { mode: "multiple"; ids: number[] }
		| { mode: "main"; id: number }
	>({ mode: "all", ids: [] })
	const personsTotal = ref(0)
	const personsOffset = ref(0)

	const employeeNoSort = ref<EmployeeNoSort>("asc")
	const employeeNoSortOptions = computed(() => [
		{ value: "asc", label: "工號（由小到大）" },
		{ value: "desc", label: "工號（由大到小）" },
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
		if (groupFilter.value.mode === "main") return { mainGroupId: groupFilter.value.id }
		const groupIds = groupFilter.value.ids.filter((x) => Number.isFinite(Number(x)))
		if (groupFilter.value.mode === "single" && groupIds.length === 1) return { personGroupId: groupIds[0] }
		if (groupFilter.value.mode === "multiple" && groupIds.length > 0) return { personGroupIds: groupIds }
		return {}
	}

	const loadPersons = async () => {
		isLoadingPersons.value = true
		personsLoadError.value = null
		const startTime = Date.now()
		try {
			const params = {
				q: personFilter.q?.trim() || undefined,
				sortBy: "employeeNo" as const,
				sortOrder: employeeNoSort.value,
				limit: PAGE_SIZE,
				offset: personsOffset.value,
				...resolveGroupParams(),
			}
			const res = (await personnelApi.getPersons(params)) as Paged<Person>
			const elapsed = Date.now() - startTime
			const remainingDelay = Math.max(0, DATA_LOADER_MIN_LOADING_DELAY_MS - elapsed)
			if (remainingDelay > 0) {
				await new Promise((resolve) => setTimeout(resolve, remainingDelay))
			}

			persons.value = Array.isArray(res.items) ? res.items : []
			personsTotal.value = Number.isFinite(Number(res.total)) ? Number(res.total) : 0
		} catch (err) {
			const fromHandler = handleApiError(err, "載入人員失敗")
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

	const setGroupFilterAll = () => {
		groupFilter.value = { mode: "all", ids: [] }
		personsOffset.value = 0
		void loadPersons()
	}

	const goPrevPage = () => {
		if (personsOffset.value <= 0) return
		personsOffset.value = Math.max(0, personsOffset.value - PAGE_SIZE)
		void loadPersons()
	}

	const goNextPage = () => {
		if (personsOffset.value + PAGE_SIZE >= personsTotal.value) return
		personsOffset.value = personsOffset.value + PAGE_SIZE
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
		setGroupFilterAll,
		goPrevPage,
		goNextPage,
	}
}

