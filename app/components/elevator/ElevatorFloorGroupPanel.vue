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
			<ElevatorFloorBrowseList
				:floors="floors"
				:selected-floor-index="selectedFloorIndex"
				:selected-count-for-floor="selectedCountForFloor"
				:loading="isLoading"
				:error="errorText"
				:can-edit="canEditFloors"
				:is-saving-floor-name="isSavingFloorName"
				:panel-height-class="panelHeightClass"
				@select-floor="emit('selectFloor', $event)"
				@update-floor-name="(floorIndex, name) => emit('updateFloorName', floorIndex, name)"
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
					:is-empty="!isLoading && (selectedFloorIndex == null || filteredCandidates.length === 0)"
					:empty-title="membersEmptyTitle"
					:can-select-all="hasFilteredCandidates && canEditFloors && selectedFloorIndex != null"
					:is-all-selected="isAllSelectedFloorKept"
					context-label="目前樓層"
					:context-value="selectedFloorContextValue"
					context-placeholder="請先選擇樓層"
					@update:query="emit('update:candidatesQuery', $event)"
					@search="emit('search')"
					@toggle-select-all="emit('toggleSelectAll')"
					@toggle="(personId, checked) => {
						if (selectedFloorIndex != null) {
							emit('togglePerson', selectedFloorIndex, personId, checked)
						}
					}"
				>
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
import type { Person } from "~/types/personnel"
import type { ElevatorFloorAccessSlot } from "~/types/elevator"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import ElevatorFloorBrowseList from "~/components/elevator/ElevatorFloorBrowseList.vue"
import PersonnelMemberPickerPanel from "~/components/personnel/PersonnelMemberPickerPanel.vue"
import { LOCATION_MEMBERS_PANEL_HEIGHT } from "~/composables/systems/personnel/useLocationMembersStep"

const props = withDefaults(
	defineProps<{
		floors: ElevatorFloorAccessSlot[]
		selectedFloorIndex: number | null
		candidatesQuery: string
		searchInputId: string
		filteredCandidates: Person[]
		hasFilteredCandidates: boolean
		canEditFloors: boolean
		isApplying: boolean
		isSavingFloorName?: boolean
		isLoading: boolean
		errorText: string | null
		defaultsApplied?: boolean
		isAllSelectedFloorKept: boolean
		isPersonChecked: (floorIndex: number, personId: number) => boolean
		selectedCountForFloor: (floorIndex: number) => number
		applyLabel?: string
		panelHeightClass?: string
	}>(),
	{
		applyLabel: "套用權限",
		isSavingFloorName: false,
		panelHeightClass: LOCATION_MEMBERS_PANEL_HEIGHT,
	},
)

const selectedFloorContextValue = computed(() => {
	if (props.selectedFloorIndex == null) return null
	const floor = props.floors.find((f) => f.index === props.selectedFloorIndex)
	if (!floor) return null
	const name = String(floor.name ?? "").trim()
	return name ? `${floor.code} ${name}` : floor.code
})

const membersEmptyTitle = computed(() =>
	props.selectedFloorIndex == null ? "請先選擇左側樓層" : "此樓層尚無可選人員",
)

const emit = defineEmits<{
	"update:candidatesQuery": [value: string]
	search: []
	selectFloor: [floorIndex: number]
	toggleSelectAll: []
	togglePerson: [floorIndex: number, personId: number, checked: boolean]
	updateFloorName: [floorIndex: number, name: string]
	apply: []
}>()
</script>
