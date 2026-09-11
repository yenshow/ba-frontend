<template>
	<div class="flex min-h-0 flex-1 flex-col rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5">
		<slot name="toolbar" />

		<p
			v-if="defaultsApplied"
			class="mt-3 text-xs text-amber-200/90 2xl:text-sm"
			role="status"
		>
			目前顯示尚未套用的預設勾選；套用後才會寫入此地點授權並同步設備。
		</p>

		<div class="mt-4 grid min-h-0 flex-1 grid-cols-12 items-stretch gap-4 2xl:gap-5">
			<section
				class="col-span-12 flex min-h-0 flex-col lg:col-span-3"
				:class="panelHeightClass"
				aria-label="群組"
			>
				<PersonnelGroupBrowseTree
					header-label="群組"
					column-class="h-full w-full"
					:panel-height-class="panelHeightClass"
					:group-tree="groupTree"
					:selected-child-id="selectedChildGroupId"
					:member-count-by-child-id="memberCountByChildId"
					:loading="isGroupTreeLoading"
					:error="groupTreeError"
					:show-ungrouped="hasUngroupedCandidates"
					@select-child="emit('selectChildGroup', $event)"
				/>
			</section>

			<section
				class="col-span-12 flex min-h-0 flex-col lg:col-span-5"
				:class="panelHeightClass"
				aria-label="人員"
			>
				<PersonnelMemberPickerPanel
					:query="candidatesQuery"
					:search-input-id="searchInputId"
					:candidates="filteredCandidates"
					:is-checked="isPersonSelected"
					:can-edit="canEditFloors"
					:is-disabled="isApplying"
					:is-loading="isLoading"
					:is-empty="!isLoading && filteredCandidates.length === 0"
					:empty-title="membersEmptyTitle"
					:can-select-all="filteredCandidates.length > 0 && canEditFloors"
					:is-all-selected="isAllVisiblePeopleSelected"
					context-label="人員"
					:context-value="selectedGroupLabel ?? '全部'"
					:grid-columns="1"
					@update:query="emit('update:candidatesQuery', $event)"
					@search="emit('search')"
					@toggle-select-all="emit('toggleSelectAllPeople')"
					@toggle="(personId, checked) => emit('togglePerson', personId, checked)"
				>
					<template #person-indicators="{ person }">
						<slot name="person-indicators" :person="person" />
					</template>
				</PersonnelMemberPickerPanel>
			</section>

			<section
				class="col-span-12 flex min-h-0 flex-col lg:col-span-4"
				:class="panelHeightClass"
				aria-label="樓層"
			>
				<ElevatorFloorCheckboxPanel
					:floors="floors"
					:is-checked="isFloorFullyChecked"
					:is-indeterminate="isFloorPartiallyChecked"
					:selected-count-for-floor="selectedCountForFloor"
					:selected-person-count="selectedPersonCount"
					:can-edit="canEditFloors"
					:is-disabled="isApplying"
					:is-loading="isLoading"
					:can-select-all="selectedPersonCount > 0 && floors.length > 0 && canEditFloors"
					:is-all-selected="isAllFloorsCheckedForSelection"
					@toggle-select-all="emit('toggleSelectAllFloors')"
					@toggle="(floorIndex, checked) => emit('toggleFloor', floorIndex, checked)"
				/>
			</section>
		</div>

		<p v-if="errorText" class="form-error-text mt-3" role="alert">
			{{ errorText }}
		</p>

		<div class="mt-4 flex justify-end">
			<PermissionActionButton
				:allowed="canEditFloors"
				:disabled="isApplying"
				class="btn-action-emerald"
				aria-label="套用權限"
				@click="emit('apply')"
			>
				{{ isApplying ? "處理中…" : "套用權限" }}
			</PermissionActionButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { Person, PersonGroup } from "~/types/personnel"
import type { ElevatorFloorAccessSlot } from "~/types/elevator"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import ElevatorFloorCheckboxPanel from "~/components/elevator/ElevatorFloorCheckboxPanel.vue"
import PersonnelGroupBrowseTree from "~/components/personnel/PersonnelGroupBrowseTree.vue"
import PersonnelMemberPickerPanel from "~/components/personnel/PersonnelMemberPickerPanel.vue"
import { ALL_PERSON_GROUP_FILTER_ID } from "~/utils/personnelUtils"
import { LOCATION_MEMBERS_PANEL_HEIGHT } from "~/composables/systems/personnel/useLocationMembersStep"

const props = defineProps<{
	floors: ElevatorFloorAccessSlot[]
	candidatesQuery: string
	searchInputId: string
	filteredCandidates: Person[]
	canEditFloors: boolean
	isApplying: boolean
	isLoading: boolean
	errorText: string | null
	defaultsApplied?: boolean
	isPersonSelected: (personId: number) => boolean
	isAllVisiblePeopleSelected: boolean
	selectedPersonCount: number
	isFloorFullyChecked: (floorIndex: number) => boolean
	isFloorPartiallyChecked: (floorIndex: number) => boolean
	selectedCountForFloor: (floorIndex: number) => number
	isAllFloorsCheckedForSelection: boolean
	groupTree: PersonGroup[]
	selectedChildGroupId: number
	selectedGroupLabel?: string | null
	memberCountByChildId: Record<number, number>
	hasUngroupedCandidates: boolean
	isGroupTreeLoading?: boolean
	groupTreeError?: string | null
}>()

const panelHeightClass = LOCATION_MEMBERS_PANEL_HEIGHT

const membersEmptyTitle = computed(() => {
	if (props.selectedChildGroupId !== ALL_PERSON_GROUP_FILTER_ID && props.filteredCandidates.length === 0) {
		return "此群組尚無人員"
	}
	return "尚無人員"
})

const emit = defineEmits<{
	"update:candidatesQuery": [value: string]
	search: []
	selectChildGroup: [childId: number]
	toggleSelectAllPeople: []
	togglePerson: [personId: number, checked: boolean]
	toggleSelectAllFloors: []
	toggleFloor: [floorIndex: number, checked: boolean]
	apply: []
}>()
</script>
