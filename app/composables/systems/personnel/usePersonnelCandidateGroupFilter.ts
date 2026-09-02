import { computed, ref, unref, watch, type ComputedRef, type Ref } from "vue"
import type { Person } from "~/types/personnel"
import {
	ALL_PERSON_GROUP_FILTER_ID,
	UNGROUPED_PERSON_GROUP_ID,
	resolvePersonGroupBrowseLabel,
	resolvePersonGroupId,
} from "~/utils/personnelUtils"
import { usePersonnelGroupTree } from "~/composables/systems/personnel/usePersonnelGroupTree"

type MaybeRef<T> = Ref<T> | ComputedRef<T>

/** 人員候選清單的 client-side 群組篩選（不含地點名單 SSOT） */
export const usePersonnelCandidateGroupFilter = (params: { candidates: MaybeRef<Person[]> }) => {
	const { groupTree, isLoading: isGroupTreeLoading, errorMessage: groupTreeError, refresh } =
		usePersonnelGroupTree()

	const selectedChildGroupId = ref<number>(ALL_PERSON_GROUP_FILTER_ID)

	const memberCountByChildId = computed(() => {
		const list = unref(params.candidates)
		const counts: Record<number, number> = {
			[ALL_PERSON_GROUP_FILTER_ID]: list.length,
		}
		for (const person of list) {
			const gid = resolvePersonGroupId(person)
			counts[gid] = (counts[gid] ?? 0) + 1
		}
		return counts
	})

	const hasUngroupedCandidates = computed(
		() => (memberCountByChildId.value[UNGROUPED_PERSON_GROUP_ID] ?? 0) > 0,
	)

	const groupFilteredCandidates = computed(() => {
		const list = unref(params.candidates)
		if (selectedChildGroupId.value === ALL_PERSON_GROUP_FILTER_ID) return list
		return list.filter((p) => resolvePersonGroupId(p) === selectedChildGroupId.value)
	})

	const hasGroupFilteredCandidates = computed(() => groupFilteredCandidates.value.length > 0)

	const selectedGroupLabel = computed(() =>
		resolvePersonGroupBrowseLabel(groupTree.value, selectedChildGroupId.value),
	)

	const selectChildGroup = (childId: number) => {
		selectedChildGroupId.value = childId
	}

	const resetGroupFilter = () => {
		selectedChildGroupId.value = ALL_PERSON_GROUP_FILTER_ID
	}

	const prepareGroupFilter = async () => {
		await refresh()
		resetGroupFilter()
	}

	watch(
		() => unref(params.candidates),
		() => {
			if (selectedChildGroupId.value === ALL_PERSON_GROUP_FILTER_ID) return
			const count = memberCountByChildId.value[selectedChildGroupId.value] ?? 0
			if (count === 0) resetGroupFilter()
		},
		{ deep: true },
	)

	return {
		groupTree,
		isGroupTreeLoading,
		groupTreeError,
		selectedChildGroupId,
		selectedGroupLabel,
		memberCountByChildId,
		hasUngroupedCandidates,
		groupFilteredCandidates,
		hasGroupFilteredCandidates,
		selectChildGroup,
		prepareGroupFilter,
	}
}
