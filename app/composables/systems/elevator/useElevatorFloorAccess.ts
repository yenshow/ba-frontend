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
	toast: { success: (msg: string) => void; warning: (msg: string, duration?: number) => void }
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
	const selectedFloorIndex = ref<number | null>(null)

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
				groupFilter.prepareGroupFilter(),
			])
			floors.value = accessRes.floors || []
			defaultsApplied.value = Boolean(accessRes.defaultsApplied)
			syncCheckedFromFloors(floors.value)
			selectedFloorIndex.value = floors.value[0]?.index ?? null
		} catch (err) {
			floors.value = []
			selectedFloorIndex.value = null
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

	const handleSearchCandidates = async () => {
		await loadCandidates()
	}

	const selectFloor = (floorIndex: number) => {
		selectedFloorIndex.value = floorIndex
	}

	const isAllSelectedFloorKept = computed(() => {
		if (selectedFloorIndex.value == null || filteredCandidates.value.length === 0) return false
		return filteredCandidates.value.every((p) =>
			isPersonChecked(selectedFloorIndex.value!, p.id),
		)
	})

	const toggleSelectAllOnSelectedFloor = () => {
		if (selectedFloorIndex.value == null) return
		const checked = !isAllSelectedFloorKept.value
		for (const person of filteredCandidates.value) {
			togglePersonOnFloor(selectedFloorIndex.value, person.id, checked)
		}
	}

	return {
		floors,
		defaultsApplied,
		candidatesQuery,
		isLoading,
		isApplying,
		errorText,
		isPersonChecked,
		togglePersonOnFloor,
		selectedCountForFloor,
		loadFloorAccess,
		applyFloorAccess,
		handleSearchCandidates,
		selectedFloorIndex,
		selectFloor,
		isAllSelectedFloorKept,
		toggleSelectAllOnSelectedFloor,
		filteredCandidates,
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
