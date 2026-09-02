<template>
	<DeviceManageDialogShell
		:model-value="modelValue"
		:title="dialogTitle"
		:title-meta="locationName"
		title-id="pc-access-manage-title"
		:is-ui-locked="isUiLocked"
		@close="handleClose"
	>
		<div v-if="locationId == null" class="py-12 text-center text-white/60">請先選擇地點</div>

		<LocationMembersGroupPanel
			v-else
			:group-tree="groupTree"
			:selected-child-group-id="selectedChildGroupId"
			:member-count-by-child-id="memberCountByChildId"
			:has-ungrouped-candidates="hasUngroupedCandidates"
			:selected-group-label="selectedGroupLabel"
			:is-group-tree-loading="isGroupTreeLoading"
			:group-tree-error="groupTreeError"
			:members-query="membersQuery"
			search-input-id="people-counting-access-members-search"
			:filtered-candidates="filteredCandidates"
			:has-filtered-candidates="hasFilteredCandidates"
			:can-edit-members="canEditMembers"
			:is-applying-members="isApplyingMembers"
			:is-loading-members="isLoadingMembers || isSyncCandidatesLoading"
			:members-error="membersError"
			:is-all-filtered-kept="isAllFilteredKept"
			:is-member-kept="isMemberKept"
			@update:members-query="membersQuery = $event"
			@search="handleSearchMembers"
			@select-child="selectChildGroup"
			@toggle-select-all="handleToggleSelectAllFiltered"
			@toggle-member="toggleMember"
			@apply="handleApplyMembers"
		>
			<template #toolbar>
				<DeviceSyncStep2Toolbar
					:description="panelDescription"
					:warnings-count="syncWarnings.length"
					:can-resync="canDeviceSync"
					:is-resync-disabled="isSyncButtonDisabled"
					:is-resyncing="isCurrentlySyncing"
					:entry-devices="deviceLabels.entry"
					:exit-devices="deviceLabels.exit"
					:camera-devices="deviceLabels.cameras"
					:resync-aria-label="resyncAriaLabel"
					@open-warnings="openWarningsDialog"
					@resync="handleSync"
				/>
			</template>
			<template #person-indicators="{ person }">
				<PersonnelSyncCredentialIndicators :items="syncIndicatorsForPerson(person)" />
			</template>
		</LocationMembersGroupPanel>
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
import DeviceManageDialogShell from "~/components/personnel/device-sync/DeviceManageDialogShell.vue"
import DeviceSyncStep2Toolbar from "~/components/personnel/device-sync/DeviceSyncStep2Toolbar.vue"
import LocationMembersGroupPanel from "~/components/personnel/LocationMembersGroupPanel.vue"
import PersonnelSyncCredentialIndicators from "~/components/personnel/PersonnelSyncCredentialIndicators.vue"
import PersonnelSyncWarningsDialog from "~/components/personnel/dialogs/PersonnelSyncWarningsDialog.vue"
import type { useLocationAccessSync } from "~/composables/systems/personnel/useLocationAccessSync"
import { useLocationMembersGroupPicker } from "~/composables/systems/personnel/useLocationMembersGroupPicker"
import { buildLocationMemberSyncIndicators } from "~/utils/syncCredentialIcons"

const props = defineProps<{
	modelValue: boolean
	locationId: number | null
	locationName?: string | null
	dataSource?: "yscp" | "access_control" | "isapi_camera" | string | null
	canEditMembers: boolean
	canDeviceSync: boolean
	accessSync: ReturnType<typeof useLocationAccessSync>
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	synced: []
	membersUpdated: []
}>()

const isCameraSource = computed(() => props.dataSource === "isapi_camera")
const dialogTitle = "門禁管理"
const panelDescription = computed(() =>
	isCameraSource.value
		? "勾選允許此地點辨識的人員；套用後自動同步人臉至攝影機，狀態以圖示顯示於右側。"
		: "勾選允許進出此地點的人員；套用後自動同步至設備，狀態以圖示顯示於右側。",
)
const resyncAriaLabel = computed(() =>
	isCameraSource.value ? "重新同步此地點至攝影機" : "重新同步此地點至門禁設備",
)

const {
	isSingleLocationSyncing,
	showWarningsDialog,
	syncWarnings,
	syncWarningTypeLabel,
	openWarningsDialog,
	getLocationDevicesLabel,
	prepareLocationDialog,
	syncOneLocation,
	isSyncLocationCandidatesLoading,
	isLocationCurrentlySyncing,
	isLocationSyncButtonDisabled,
} = props.accessSync

const handleClose = () => emit("update:modelValue", false)

const {
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
	membersQuery,
	isApplyingMembers,
	isLoadingMembers,
	membersError,
	isMemberKept,
	toggleMember,
	isAllFilteredKept,
	handleToggleSelectAllFiltered,
	handleSearchMembers,
	applyMembers,
	prepareGroupPicker,
} = useLocationMembersGroupPicker({
	locationId: toRef(props, "locationId"),
	membersSync: toRef(props, "accessSync"),
})

const deviceLabels = computed(() =>
	props.locationId != null
		? getLocationDevicesLabel(props.locationId)
		: { entry: [], exit: [], cameras: [] },
)

const isUiLocked = computed(() => isSingleLocationSyncing.value)

const isSyncCandidatesLoading = computed(() =>
	props.locationId != null ? isSyncLocationCandidatesLoading(props.locationId) : false,
)

const isCurrentlySyncing = computed(() =>
	props.locationId != null ? isLocationCurrentlySyncing(props.locationId) : false,
)

const isSyncButtonDisabled = computed(() =>
	props.locationId != null ? isLocationSyncButtonDisabled(props.locationId) : true,
)

const locationSyncRows = computed(() =>
	props.locationId != null ? props.accessSync.getSyncStepRowsForLocation(props.locationId) : [],
)

const syncIndicatorsForPerson = (person: Person) => {
	if (props.locationId == null) return []
	void locationSyncRows.value
	void isCurrentlySyncing.value
	const row = props.accessSync.getSyncRowByEmployeeNo(props.locationId, person.employee_no)
	return buildLocationMemberSyncIndicators({
		row,
		mode: isCameraSource.value ? "isapi_camera" : "access_control",
		isKept: isMemberKept(person.id),
	})
}

const handleApplyMembers = async () => {
	if (!(await applyMembers())) return
	emit("membersUpdated")
	if (props.locationId != null) {
		await props.accessSync.prepareLocationDialog(props.locationId)
	}
}

const handleSync = async () => {
	if (props.locationId == null) return
	await syncOneLocation(props.locationId)
	if (props.locationId != null) {
		await props.accessSync.prepareLocationDialog(props.locationId)
	}
	emit("synced")
}

watch(
	() => props.modelValue,
	(open) => {
		if (!open) return
		if (props.locationId == null) return
		void (async () => {
			await prepareLocationDialog(props.locationId!)
			await prepareGroupPicker()
		})()
	},
)
</script>
