import { TOAST } from "~/config/toastCatalog"
import { computed, reactive, ref, type ComputedRef, type Ref } from "vue"
import type { Person } from "~/types/personnel"
import type { ElevatorFloorAccessSlot } from "~/types/elevator"
import type { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { fetchAllPersonnelCandidates } from "~/composables/systems/personnel/personnelList"
import { usePersonnelCandidateGroupFilter } from "~/composables/systems/personnel/usePersonnelCandidateGroupFilter"
import { resolveFormApiError } from "~/utils/apiError"

type ElevatorApi = ReturnType<typeof useElevatorApi>

export const useElevatorFloorAccess = (params: {
	locationId: Ref<number | null> | ComputedRef<number | null>
	elevatorApi: ElevatorApi
	personnelApi: PersonnelApi
	toast: { success: (msg: string) => void }
}) => {
	const { locationId, elevatorApi, personnelApi, toast } = params

	const floors = ref<ElevatorFloorAccessSlot[]>([])
	const defaultsApplied = ref(false)
	const candidates = ref<Person[]>([])
	const candidatesQuery = ref("")
	const groupFilter = usePersonnelCandidateGroupFilter({ candidates })
	const isLoading = ref(false)
	const isApplying = ref(false)
	const errorText = ref<string | null>(null)
	const checkedByFloor = reactive<Record<number, Set<number>>>({})
	const selectedPersonIdSet = ref<Set<number>>(new Set())

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
		const base = groupFilter.groupFilteredCandidates.value
		if (!q) return base
		return base.filter((p) => {
			const emp = String(p.employee_no || "").toLowerCase()
			const name = String(p.full_name || "").toLowerCase()
			return emp.includes(q) || name.includes(q)
		})
	})

	const isPersonChecked = (floorIndex: number, personId: number) =>
		checkedByFloor[floorIndex]?.has(personId) ?? false

	const togglePersonOnFloor = (floorIndex: number, personId: number, checked: boolean) => {
		if (!checkedByFloor[floorIndex]) checkedByFloor[floorIndex] = new Set()
		if (checked) checkedByFloor[floorIndex].add(personId)
		else checkedByFloor[floorIndex].delete(personId)
	}

	const selectedCountForFloor = (floorIndex: number) => checkedByFloor[floorIndex]?.size ?? 0

	const isPersonSelected = (personId: number) => selectedPersonIdSet.value.has(personId)

	const selectedPersonCount = computed(() => selectedPersonIdSet.value.size)

	const togglePersonSelection = (personId: number, checked: boolean) => {
		const next = new Set(selectedPersonIdSet.value)
		if (checked) next.add(personId)
		else next.delete(personId)
		selectedPersonIdSet.value = next
	}

	const isAllVisiblePeopleSelected = computed(() => {
		if (filteredCandidates.value.length === 0) return false
		return filteredCandidates.value.every((p) => selectedPersonIdSet.value.has(p.id))
	})

	const toggleSelectAllPeople = () => {
		const checked = !isAllVisiblePeopleSelected.value
		const next = new Set(selectedPersonIdSet.value)
		for (const person of filteredCandidates.value) {
			if (checked) next.add(person.id)
			else next.delete(person.id)
		}
		selectedPersonIdSet.value = next
	}

	const selectedOnFloorCount = (floorIndex: number) => {
		let hit = 0
		for (const personId of selectedPersonIdSet.value) {
			if (isPersonChecked(floorIndex, personId)) hit += 1
		}
		return hit
	}

	const isFloorFullyChecked = (floorIndex: number) => {
		const total = selectedPersonIdSet.value.size
		return total > 0 && selectedOnFloorCount(floorIndex) === total
	}

	const isFloorPartiallyChecked = (floorIndex: number) => {
		const total = selectedPersonIdSet.value.size
		if (total === 0) return false
		const hit = selectedOnFloorCount(floorIndex)
		return hit > 0 && hit < total
	}

	const toggleFloorForSelection = (floorIndex: number, checked: boolean) => {
		for (const personId of selectedPersonIdSet.value) {
			togglePersonOnFloor(floorIndex, personId, checked)
		}
	}

	const isAllFloorsCheckedForSelection = computed(() => {
		if (selectedPersonIdSet.value.size === 0 || floors.value.length === 0) return false
		return floors.value.every((floor) => isFloorFullyChecked(floor.index))
	})

	const toggleSelectAllFloors = () => {
		if (selectedPersonIdSet.value.size === 0) return
		const checked = !isAllFloorsCheckedForSelection.value
		for (const floor of floors.value) {
			toggleFloorForSelection(floor.index, checked)
		}
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
		selectedPersonIdSet.value = new Set()
		try {
			const [accessRes] = await Promise.all([
				elevatorApi.getFloorAccess(locId),
				loadCandidates(),
				groupFilter.prepareGroupFilter(),
			])
			floors.value = accessRes.floors || []
			defaultsApplied.value = Boolean(accessRes.defaultsApplied)
			syncCheckedFromFloors(floors.value)
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
			const jobId = res.deviceSync?.jobId ?? null
			if (!jobId) toast.success(TOAST.ELEVATOR_FLOOR_ACCESS_APPLIED)
			return { ok: true as const, jobId }
		} catch (err) {
			errorText.value = resolveFormApiError(err, "儲存樓層授權失敗")
			return { ok: false as const, jobId: null }
		} finally {
			isApplying.value = false
		}
	}

	return {
		floors,
		defaultsApplied,
		candidatesQuery,
		isLoading,
		isApplying,
		errorText,
		selectedCountForFloor,
		loadFloorAccess,
		applyFloorAccess,
		handleSearchCandidates: loadCandidates,
		filteredCandidates,
		isPersonSelected,
		togglePersonSelection,
		selectedPersonCount,
		isAllVisiblePeopleSelected,
		toggleSelectAllPeople,
		isFloorFullyChecked,
		isFloorPartiallyChecked,
		toggleFloorForSelection,
		isAllFloorsCheckedForSelection,
		toggleSelectAllFloors,
		groupTree: groupFilter.groupTree,
		isGroupTreeLoading: groupFilter.isGroupTreeLoading,
		groupTreeError: groupFilter.groupTreeError,
		selectedChildGroupId: groupFilter.selectedChildGroupId,
		selectedGroupLabel: groupFilter.selectedGroupLabel,
		memberCountByChildId: groupFilter.memberCountByChildId,
		hasUngroupedCandidates: groupFilter.hasUngroupedCandidates,
		selectChildGroup: groupFilter.selectChildGroup,
	}
}
