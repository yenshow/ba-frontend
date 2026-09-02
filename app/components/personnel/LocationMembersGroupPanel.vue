<template>
	<div class="flex min-h-0 flex-1 flex-col rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5">
		<slot name="toolbar" />

		<div class="mt-4 grid min-h-0 flex-1 grid-cols-12 items-stretch gap-4 2xl:gap-5">
			<PersonnelGroupBrowseTree
				:group-tree="groupTree"
				:selected-child-id="selectedChildGroupId"
				:member-count-by-child-id="memberCountByChildId"
				:loading="isGroupTreeLoading"
				:error="groupTreeError"
				:show-ungrouped="hasUngroupedCandidates"
				:panel-height-class="panelHeightClass"
				@select-child="emit('selectChild', $event)"
			/>

			<section
				class="col-span-12 flex min-h-0 flex-col lg:col-span-8"
				:class="panelHeightClass"
			>
				<PersonnelMemberPickerPanel
					:query="membersQuery"
					:search-input-id="searchInputId"
					:candidates="filteredCandidates"
					:is-checked="isMemberKept"
					:can-edit="canEditMembers"
					:is-disabled="isApplyingMembers"
					:is-loading="isLoadingMembers"
					:is-empty="!isLoadingMembers && filteredCandidates.length === 0"
					:empty-title="emptyTitle"
					:can-select-all="hasFilteredCandidates && canEditMembers"
					:is-all-selected="isAllFilteredKept"
					context-label="目前群組"
					:context-value="selectedGroupLabel ?? '全部'"
					@update:query="emit('update:membersQuery', $event)"
					@search="emit('search')"
					@toggle-select-all="emit('toggleSelectAll')"
					@toggle="(personId, checked) => emit('toggleMember', personId, checked)"
				>
					<template #person-indicators="{ person }">
						<slot name="person-indicators" :person="person" />
					</template>
					<template #person-extra="{ person }">
						<slot name="person-extra" :person="person" />
					</template>
				</PersonnelMemberPickerPanel>
			</section>
		</div>

		<p v-if="membersError" class="form-error-text mt-3" role="alert">
			{{ membersError }}
		</p>

		<div class="mt-4 flex justify-end">
			<PermissionActionButton
				:allowed="canEditMembers"
				:disabled="isApplyingMembers"
				class="btn-action-emerald"
				:aria-label="applyAriaLabel"
				@click="emit('apply')"
			>
				{{ isApplyingMembers ? "處理中…" : applyLabel }}
			</PermissionActionButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Person, PersonGroup } from "~/types/personnel"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import PersonnelGroupBrowseTree from "~/components/personnel/PersonnelGroupBrowseTree.vue"
import PersonnelMemberPickerPanel from "~/components/personnel/PersonnelMemberPickerPanel.vue"
import { LOCATION_MEMBERS_PANEL_HEIGHT } from "~/composables/systems/personnel/useLocationMembersStep"

withDefaults(
	defineProps<{
		groupTree: PersonGroup[]
		selectedChildGroupId: number | null
		memberCountByChildId: Record<number, number>
		hasUngroupedCandidates: boolean
		isGroupTreeLoading?: boolean
		groupTreeError?: string | null
		membersQuery: string
		searchInputId: string
		filteredCandidates: Person[]
		hasFilteredCandidates: boolean
		canEditMembers: boolean
		isApplyingMembers: boolean
		isLoadingMembers: boolean
		membersError: string | null
		isAllFilteredKept: boolean
		isMemberKept: (personId: number) => boolean
		selectedGroupLabel?: string | null
		applyLabel?: string
		applyAriaLabel?: string
		emptyTitle?: string
		panelHeightClass?: string
	}>(),
	{
		applyLabel: "套用權限",
		applyAriaLabel: "套用權限",
		emptyTitle: "尚無人員",
		panelHeightClass: LOCATION_MEMBERS_PANEL_HEIGHT,
	},
)

const emit = defineEmits<{
	"update:membersQuery": [value: string]
	search: []
	selectChild: [childId: number]
	toggleSelectAll: []
	toggleMember: [personId: number, checked: boolean]
	apply: []
}>()
</script>
