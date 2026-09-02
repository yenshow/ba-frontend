<template>
	<div class="flex min-h-0 flex-1 flex-col rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5">
		<slot name="toolbar" />

		<p
			v-if="defaultsApplied"
			class="mt-3 text-xs text-amber-200/90 2xl:text-sm"
			role="status"
		>
			目前顯示人員主檔梯控卡預設樓層；套用後才會寫入此地點授權。
		</p>

		<div class="mt-4 grid min-h-0 flex-1 grid-cols-12 items-stretch gap-4 2xl:gap-5">
			<PersonnelGroupBrowseTree
				:group-tree="groupTree"
				:selected-child-id="selectedChildGroupId"
				:member-count-by-child-id="memberCountByChildId"
				:loading="isGroupTreeLoading"
				:error="groupTreeError"
				:show-ungrouped="hasUngroupedCandidates"
				:panel-height-class="panelHeightClass"
				@select-child="emit('selectChildGroup', $event)"
			/>

			<section
				class="col-span-12 flex min-h-0 flex-col lg:col-span-8"
				:class="panelHeightClass"
			>
				<PersonnelMemberPickerPanel
					:query="candidatesQuery"
					:search-input-id="searchInputId"
					:candidates="filteredCandidates"
					:is-checked="(personId) =>
						selectedFloorIndex != null && isPersonChecked(selectedFloorIndex, personId)"
					:can-edit="canEditFloors && selectedFloorIndex != null"
					:is-disabled="isApplying"
					:is-loading="isLoading"
					:is-empty="!isLoading && filteredCandidates.length === 0"
					:empty-title="membersEmptyTitle"
					:can-select-all="filteredCandidates.length > 0 && canEditFloors && selectedFloorIndex != null"
					:is-all-selected="isAllSelectedFloorKept"
					context-label="目前群組"
					:context-value="selectedGroupLabel ?? '全部'"
					@update:query="emit('update:candidatesQuery', $event)"
					@search="emit('search')"
					@toggle-select-all="emit('toggleSelectAll')"
					@toggle="(personId, checked) => {
						if (selectedFloorIndex != null) {
							emit('togglePerson', selectedFloorIndex, personId, checked)
						}
					}"
				>
					<template #context-trailing>
						<ElevatorFloorFilter
							:floors="floors"
							:selected-floor-index="selectedFloorIndex"
							:selected-count-for-floor="selectedCountForFloor"
							:loading="isLoading"
							:disabled="isApplying"
							@select="emit('selectFloor', $event)"
						/>
					</template>
					<template #person-indicators="{ person }">
						<slot name="person-indicators" :person="person" />
					</template>
				</PersonnelMemberPickerPanel>
			</section>
		</div>

		<p v-if="errorText && floors.length > 0" class="form-error-text mt-3" role="alert">
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
				{{ isApplying ? "處理中…" : applyLabel }}
			</PermissionActionButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { Person, PersonGroup } from "~/types/personnel"
import type { ElevatorFloorAccessSlot } from "~/types/elevator"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import ElevatorFloorFilter from "~/components/elevator/ElevatorFloorFilter.vue"
import PersonnelGroupBrowseTree from "~/components/personnel/PersonnelGroupBrowseTree.vue"
import PersonnelMemberPickerPanel from "~/components/personnel/PersonnelMemberPickerPanel.vue"
import { ALL_PERSON_GROUP_FILTER_ID } from "~/utils/personnelUtils"
import { LOCATION_MEMBERS_PANEL_HEIGHT } from "~/composables/systems/personnel/useLocationMembersStep"

const props = withDefaults(
	defineProps<{
		floors: ElevatorFloorAccessSlot[]
		selectedFloorIndex: number | null
		candidatesQuery: string
		searchInputId: string
		filteredCandidates: Person[]
		canEditFloors: boolean
		isApplying: boolean
		isLoading: boolean
		errorText: string | null
		defaultsApplied?: boolean
		isAllSelectedFloorKept: boolean
		isPersonChecked: (floorIndex: number, personId: number) => boolean
		selectedCountForFloor: (floorIndex: number) => number
		groupTree: PersonGroup[]
		selectedChildGroupId: number
		selectedGroupLabel?: string | null
		memberCountByChildId: Record<number, number>
		hasUngroupedCandidates: boolean
		isGroupTreeLoading?: boolean
		groupTreeError?: string | null
		applyLabel?: string
		panelHeightClass?: string
	}>(),
	{
		applyLabel: "套用權限",
		panelHeightClass: LOCATION_MEMBERS_PANEL_HEIGHT,
	},
)

const membersEmptyTitle = computed(() => {
	if (props.selectedChildGroupId !== ALL_PERSON_GROUP_FILTER_ID && props.filteredCandidates.length === 0) {
		return "此群組尚無人員"
	}
	return "尚無人員"
})

const emit = defineEmits<{
	"update:candidatesQuery": [value: string]
	search: []
	selectFloor: [floorIndex: number]
	selectChildGroup: [childId: number]
	toggleSelectAll: []
	togglePerson: [floorIndex: number, personId: number, checked: boolean]
	apply: []
}>()
</script>
