import { computed, ref, unref, watch, type ComputedRef, type Ref } from "vue"
import type { Person } from "~/types/personnel"
import {
	ALL_PERSON_GROUP_FILTER_ID,
	UNGROUPED_PERSON_GROUP_ID,
	resolvePersonGroupBrowseLabel,
} from "~/utils/personnelUtils"
import { usePersonnelGroupTree } from "~/composables/systems/personnel/usePersonnelGroupTree"
import {
	useLocationMembersPicker,
	type LocationMembersPickerSync,
} from "~/composables/systems/personnel/useLocationMembersStep"

type MaybeRef<T> = Ref<T> | ComputedRef<T>

const resolvePersonGroupId = (person: Person): number => {
	if (person.person_group_id != null && Number.isFinite(Number(person.person_group_id))) {
		return Number(person.person_group_id)
	}
	return UNGROUPED_PERSON_GROUP_ID
}

export const useLocationMembersGroupPicker = (params: {
	locationId: MaybeRef<number | null>
	membersSync: MaybeRef<LocationMembersPickerSync | undefined>
}) => {
	const { groupTree, isLoading: isGroupTreeLoading, errorMessage: groupTreeError, refresh } =
		usePersonnelGroupTree()

	const selectedChildGroupId = ref<number>(ALL_PERSON_GROUP_FILTER_ID)

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

	const memberCountByChildId = computed(() => {
		const counts: Record<number, number> = {
			[ALL_PERSON_GROUP_FILTER_ID]: memberCandidates.value.length,
		}
		for (const person of memberCandidates.value) {
			const gid = resolvePersonGroupId(person)
			counts[gid] = (counts[gid] ?? 0) + 1
		}
		return counts
	})

	const hasUngroupedCandidates = computed(
		() => (memberCountByChildId.value[UNGROUPED_PERSON_GROUP_ID] ?? 0) > 0,
	)

	const filteredCandidates = computed(() => {
		if (selectedChildGroupId.value === ALL_PERSON_GROUP_FILTER_ID) {
			return memberCandidates.value
		}
		return memberCandidates.value.filter(
			(p) => resolvePersonGroupId(p) === selectedChildGroupId.value,
		)
	})

	const hasFilteredCandidates = computed(() => filteredCandidates.value.length > 0)

	const selectedGroupLabel = computed(() =>
		resolvePersonGroupBrowseLabel(groupTree.value, selectedChildGroupId.value),
	)

	const pickDefaultChildGroup = () => {
		selectedChildGroupId.value = ALL_PERSON_GROUP_FILTER_ID
	}

	const selectChildGroup = (childId: number) => {
		selectedChildGroupId.value = childId
	}

	const isAllFilteredKept = computed(() => {
		if (filteredCandidates.value.length === 0) return false
		return filteredCandidates.value.every((p) => basePicker.isMemberKept(p.id))
	})

	const handleToggleSelectAllFiltered = () => {
		const id = unref(params.locationId)
		const sync = unref(params.membersSync)
		if (id == null || !sync) return
		const personIds = filteredCandidates.value.map((p) => p.id)
		sync.toggleManyLocationMembers(id, personIds, !isAllFilteredKept.value)
	}

	const prepareGroupPicker = async () => {
		await refresh()
		pickDefaultChildGroup()
	}

	watch(memberCandidates, () => {
		if (selectedChildGroupId.value === ALL_PERSON_GROUP_FILTER_ID) return
		const count = memberCountByChildId.value[selectedChildGroupId.value] ?? 0
		if (count === 0) pickDefaultChildGroup()
	})

	return {
		...basePicker,
		groupTree,
		isGroupTreeLoading,
		groupTreeError,
		selectedChildGroupId,
		selectedGroupLabel,
		memberCountByChildId,
		hasUngroupedCandidates,
		filteredCandidates,
		hasFilteredCandidates,
		selectChildGroup,
		isAllFilteredKept,
		handleToggleSelectAllFiltered,
		prepareGroupPicker,
	}
}
