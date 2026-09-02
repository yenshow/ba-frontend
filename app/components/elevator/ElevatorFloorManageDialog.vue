<template>
	<DeviceManageDialogShell
		:model-value="modelValue"
		title="樓層管理"
		:title-meta="locationName"
		title-id="elevator-floor-manage-title"
		:is-ui-locked="isUiLocked"
		@close="handleClose"
	>
		<div v-if="locationId == null" class="py-12 text-center text-white/60">請先選擇地點</div>

		<ElevatorFloorGroupPanel
			v-else
			:floors="floors"
			:selected-floor-index="selectedFloorIndex"
			:candidates-query="candidatesQuery"
			search-input-id="elevator-floor-members-search"
			:filtered-candidates="filteredCandidates"
			:can-edit-floors="canEditFloors"
			:is-applying="isApplying"
			:is-loading="isLoading || isSyncCandidatesLoading"
			:error-text="errorText"
			:defaults-applied="defaultsApplied"
			:is-all-selected-floor-kept="isAllSelectedFloorKept"
			:is-person-checked="isPersonChecked"
			:selected-count-for-floor="selectedCountForFloor"
			:group-tree="groupTree"
			:selected-child-group-id="selectedChildGroupId"
			:selected-group-label="selectedGroupLabel"
			:member-count-by-child-id="memberCountByChildId"
			:has-ungrouped-candidates="hasUngroupedCandidates"
			:is-group-tree-loading="isGroupTreeLoading"
			:group-tree-error="groupTreeError"
			@update:candidates-query="candidatesQuery = $event"
			@search="handleSearchCandidates"
			@select-floor="selectFloor"
			@select-child-group="selectChildGroup"
			@toggle-select-all="toggleSelectAllOnSelectedFloor"
			@toggle-person="togglePersonOnFloor"
			@apply="handleApplyFloorAccess"
		>
			<template #toolbar>
				<DeviceSyncStep2Toolbar
					description="勾選各樓層允許使用的人員；套用後自動同步至設備，狀態以圖示顯示於右側。"
					:warnings-count="syncWarnings.length"
					:can-resync="canDeviceSync"
					:is-resync-disabled="isSyncButtonDisabled"
					:is-resyncing="isCurrentlySyncing"
					resync-aria-label="重新同步至梯控與門禁設備"
					@open-warnings="openWarningsDialog"
					@resync="handleSync"
				/>
			</template>
			<template #person-indicators="{ person }">
				<PersonnelSyncCredentialIndicators :items="syncIndicatorsForPerson(person)" />
			</template>
		</ElevatorFloorGroupPanel>
	</DeviceManageDialogShell>

	<PersonnelSyncWarningsDialog
		v-model="showWarningsDialog"
		:sync-warnings="syncWarnings"
		:sync-warning-type-label="syncWarningTypeLabel"
	/>
</template>

<script setup lang="ts">
import { computed, toRef, watch } from "vue"
import type { Person } from "~/types/personnel"
import ElevatorFloorGroupPanel from "~/components/elevator/ElevatorFloorGroupPanel.vue"
import DeviceManageDialogShell from "~/components/personnel/device-sync/DeviceManageDialogShell.vue"
import DeviceSyncStep2Toolbar from "~/components/personnel/device-sync/DeviceSyncStep2Toolbar.vue"
import PersonnelSyncCredentialIndicators from "~/components/personnel/PersonnelSyncCredentialIndicators.vue"
import PersonnelSyncWarningsDialog from "~/components/personnel/dialogs/PersonnelSyncWarningsDialog.vue"
import type { ElevatorFloorSync } from "~/composables/systems/elevator/useElevatorSyncEngine"
import { useElevatorFloorAccess } from "~/composables/systems/elevator/useElevatorFloorAccess"
import { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useToast } from "~/composables/core/useToast"
import { buildElevatorMemberSyncIndicators } from "~/utils/syncCredentialIcons"

const props = defineProps<{
	modelValue: boolean
	locationId: number | null
	locationName?: string | null
	canEditFloors: boolean
	canDeviceSync: boolean
	floorSync: ElevatorFloorSync
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	synced: []
	floorsUpdated: []
}>()

const elevatorApi = useElevatorApi()
const personnelApi = usePersonnelApi()
const toast = useToast()

const {
	syncWarnings,
	showWarningsDialog,
	openWarningsDialog,
	syncWarningTypeLabel,
	prepareLocationDialog,
	isSyncCandidatesLoading: isSyncLocationCandidatesLoading,
	syncOneLocation,
	isUiLocked: isFloorSyncUiLocked,
	isLocationSyncJobRunning,
	watchApplySyncJob,
	isLocationSyncButtonDisabled,
	hasAccessDevicesForLocation,
	getSyncCandidatesForLocation,
} = props.floorSync

const {
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
	groupTree,
	isGroupTreeLoading,
	selectedChildGroupId,
	selectedGroupLabel,
	memberCountByChildId,
	hasUngroupedCandidates,
	groupTreeError,
	selectChildGroup,
} = useElevatorFloorAccess({
	locationId: toRef(props, "locationId"),
	elevatorApi,
	personnelApi,
	toast,
})

const handleClose = () => emit("update:modelValue", false)

const handleApplyFloorAccess = async () => {
	const result = await applyFloorAccess()
	if (result === false || !result.ok) return
	emit("floorsUpdated")
	if (result.jobId && props.locationId != null) {
		await watchApplySyncJob(props.locationId, result.jobId)
	}
}

const isUiLocked = computed(() => isFloorSyncUiLocked.value)

const isSyncCandidatesLoading = computed(() =>
	props.locationId != null ? isSyncLocationCandidatesLoading(props.locationId) : false,
)

const showAccessSyncColumns = computed(() =>
	props.locationId != null ? hasAccessDevicesForLocation(props.locationId) : false,
)

const isCurrentlySyncing = computed(() =>
	props.locationId != null ? isLocationSyncJobRunning(props.locationId) : false,
)

const isSyncButtonDisabled = computed(() =>
	props.locationId != null ? isLocationSyncButtonDisabled(props.locationId) : true,
)

const locationSyncCandidates = computed(() =>
	props.locationId != null ? getSyncCandidatesForLocation(props.locationId) : [],
)

const syncIndicatorsForPerson = (person: Person) => {
	if (props.locationId == null) return []
	void locationSyncCandidates.value
	void isCurrentlySyncing.value
	const candidate =
		locationSyncCandidates.value.find(
			(c) => String(c.employee_no) === String(person.employee_no),
		) ?? null
	return buildElevatorMemberSyncIndicators(candidate, showAccessSyncColumns.value, person)
}

const handleSync = async () => {
	if (props.locationId == null) return
	await syncOneLocation(props.locationId)
	emit("synced")
}

watch(
	() => props.modelValue,
	(open) => {
		if (!open) return
		if (props.locationId == null) return
		void (async () => {
			await loadFloorAccess()
			await prepareLocationDialog(props.locationId!)
		})()
	},
)
</script>
