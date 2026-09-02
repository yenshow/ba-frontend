import { computed, unref, type ComputedRef, type Ref } from "vue"
import { usePersonnelCandidateGroupFilter } from "~/composables/systems/personnel/usePersonnelCandidateGroupFilter"
import {
	useLocationMembersPicker,
	type LocationMembersPickerSync,
} from "~/composables/systems/personnel/useLocationMembersStep"

type MaybeRef<T> = Ref<T> | ComputedRef<T>

export const useLocationMembersGroupPicker = (params: {
	locationId: MaybeRef<number | null>
	membersSync: MaybeRef<LocationMembersPickerSync | undefined>
}) => {
	const basePicker = useLocationMembersPicker({
		locationId: params.locationId,
		membersSync: params.membersSync,
	})

	const memberCandidates = computed(() => {
		const id = unref(params.locationId)
		const sync = unref(params.membersSync)
		if (id == null || !sync) return []
		return sync.getLocationCandidatesItems(id)
	})

	const groupFilter = usePersonnelCandidateGroupFilter({ candidates: memberCandidates })

	const isAllFilteredKept = computed(() => {
		if (groupFilter.groupFilteredCandidates.value.length === 0) return false
		return groupFilter.groupFilteredCandidates.value.every((p) => basePicker.isMemberKept(p.id))
	})

	const handleToggleSelectAllFiltered = () => {
		const id = unref(params.locationId)
		const sync = unref(params.membersSync)
		if (id == null || !sync) return
		const personIds = groupFilter.groupFilteredCandidates.value.map((p) => p.id)
		sync.toggleManyLocationMembers(id, personIds, !isAllFilteredKept.value)
	}

	const prepareGroupPicker = async () => {
		await groupFilter.prepareGroupFilter()
	}

	return {
		...basePicker,
		groupTree: groupFilter.groupTree,
		isGroupTreeLoading: groupFilter.isGroupTreeLoading,
		groupTreeError: groupFilter.groupTreeError,
		selectedChildGroupId: groupFilter.selectedChildGroupId,
		selectedGroupLabel: groupFilter.selectedGroupLabel,
		memberCountByChildId: groupFilter.memberCountByChildId,
		hasUngroupedCandidates: groupFilter.hasUngroupedCandidates,
		filteredCandidates: groupFilter.groupFilteredCandidates,
		hasFilteredCandidates: groupFilter.hasGroupFilteredCandidates,
		selectChildGroup: groupFilter.selectChildGroup,
		isAllFilteredKept,
		handleToggleSelectAllFiltered,
		prepareGroupPicker,
	}
}
