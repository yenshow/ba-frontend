import { computed, reactive, ref, type ComputedRef, type Ref } from "vue"
import type { Person } from "~/types/personnel"
import type { ElevatorFloorAccessSlot } from "~/types/elevator"
import type { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { fetchAllPersonnelCandidates } from "~/composables/systems/personnel/personnelList"
import { groupPersonsByPersonGroup } from "~/utils/personnelUtils"
import { resolveFormApiError, resolveFormApiErrorPreferOriginal } from "~/utils/errorUtils"

type ElevatorApi = ReturnType<typeof useElevatorApi>

export const useElevatorFloorAccess = (params: {
	locationId: Ref<number | null> | ComputedRef<number | null>
	elevatorApi: ElevatorApi
	personnelApi: PersonnelApi
	toast: { success: (msg: string) => void; warning: (msg: string, duration?: number) => void }
}) => {
	const { locationId, elevatorApi, personnelApi, toast } = params

	const floors = ref<ElevatorFloorAccessSlot[]>([])
	const defaultsApplied = ref(false)
	const candidates = ref<Person[]>([])
	const candidatesQuery = ref("")
	const expandedFloorIndexes = ref<Set<number>>(new Set())
	const isLoading = ref(false)
	const isApplying = ref(false)
	const errorText = ref<string | null>(null)
	const checkedByFloor = reactive<Record<number, Set<number>>>({})

	const syncCheckedFromFloors = (slots: ElevatorFloorAccessSlot[]) => {
		for (const key of Object.keys(checkedByFloor)) {
			delete checkedByFloor[Number(key)]
		}
		for (const slot of slots) {
			checkedByFloor[slot.index] = new Set(
				(slot.personIds || [])
					.map((id) => Number(id))
					.filter((n) => Number.isFinite(n) && n > 0),
			)
		}
	}

	const filteredCandidates = computed(() => {
		const q = candidatesQuery.value.trim().toLowerCase()
		if (!q) return candidates.value
		return candidates.value.filter((p) => {
			const emp = String(p.employee_no || "").toLowerCase()
			const name = String(p.full_name || "").toLowerCase()
			return emp.includes(q) || name.includes(q)
		})
	})

	const candidateGroups = computed(() => groupPersonsByPersonGroup(filteredCandidates.value))

	const isPersonChecked = (floorIndex: number, personId: number) =>
		checkedByFloor[floorIndex]?.has(personId) ?? false

	const togglePersonOnFloor = (floorIndex: number, personId: number, checked: boolean) => {
		if (!checkedByFloor[floorIndex]) checkedByFloor[floorIndex] = new Set()
		if (checked) checkedByFloor[floorIndex].add(personId)
		else checkedByFloor[floorIndex].delete(personId)
	}

	const selectedCountForFloor = (floorIndex: number) => checkedByFloor[floorIndex]?.size ?? 0

	const isFloorExpanded = (floorIndex: number) => expandedFloorIndexes.value.has(floorIndex)

	const toggleFloorExpanded = (floorIndex: number) => {
		const next = new Set(expandedFloorIndexes.value)
		if (next.has(floorIndex)) next.delete(floorIndex)
		else next.add(floorIndex)
		expandedFloorIndexes.value = next
	}

	const loadCandidates = async () => {
		candidates.value = await fetchAllPersonnelCandidates({
			personnelApi,
			query: candidatesQuery.value,
		})
	}

	const loadFloorAccess = async () => {
		const locId = locationId.value
		if (locId == null) return

		errorText.value = null
		isLoading.value = true
		try {
			const [accessRes] = await Promise.all([
				elevatorApi.getFloorAccess(locId),
				loadCandidates(),
			])
			floors.value = accessRes.floors || []
			defaultsApplied.value = Boolean(accessRes.defaultsApplied)
			syncCheckedFromFloors(floors.value)

			if (expandedFloorIndexes.value.size === 0 && floors.value.length > 0) {
				expandedFloorIndexes.value = new Set([floors.value[0]!.index])
			}
		} catch (err) {
			floors.value = []
			errorText.value = resolveFormApiError(err, "載入樓層授權失敗")
		} finally {
			isLoading.value = false
		}
	}

	const applyFloorAccess = async () => {
		const locId = locationId.value
		if (locId == null) return false

		errorText.value = null
		isApplying.value = true
		try {
			const assignments = floors.value.map((floor) => ({
				floorIndex: floor.index,
				personIds: Array.from(checkedByFloor[floor.index] || []),
			}))
			const res = await elevatorApi.replaceFloorAccess(locId, assignments)
			floors.value = res.floors || []
			defaultsApplied.value = false
			syncCheckedFromFloors(floors.value)
			toast.success("已儲存樓層授權")
			return true
		} catch (err) {
			toast.warning(resolveFormApiErrorPreferOriginal(err, "儲存樓層授權失敗"), 6000)
			return false
		} finally {
			isApplying.value = false
		}
	}

	const handleSearchCandidates = async () => {
		await loadCandidates()
	}

	return {
		floors,
		defaultsApplied,
		candidatesQuery,
		candidateGroups,
		expandedFloorIndexes,
		isLoading,
		isApplying,
		errorText,
		isPersonChecked,
		togglePersonOnFloor,
		selectedCountForFloor,
		isFloorExpanded,
		toggleFloorExpanded,
		loadFloorAccess,
		applyFloorAccess,
		handleSearchCandidates,
	}
}
