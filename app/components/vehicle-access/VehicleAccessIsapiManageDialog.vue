<template>
	<DeviceManageDialogShell
		:model-value="modelValue"
		title="車牌管理"
		:title-meta="locationTitleMeta"
		title-id="vehicle-isapi-manage-title"
		:is-ui-locked="isUiLocked"
		@close="handleClose"
	>
		<div v-if="locationId == null" class="py-12 text-center text-white/60">無法解析地點</div>

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
			search-input-id="vehicle-access-members-search"
			:filtered-candidates="filteredCandidates"
			:has-filtered-candidates="hasFilteredCandidates"
			:can-edit-members="canEditMembers"
			:is-applying-members="isApplyingMembers"
			:is-loading-members="isLoadingMembers || isPlatesLoading"
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
					description="勾選允許進出此地點的人員；車牌同步狀態以圖示顯示，可於人員卡片管理車牌。"
					:warnings-count="syncWarnings.length"
					:can-resync="canResyncPlates"
					:is-resync-disabled="isSyncButtonDisabled"
					:is-resyncing="isCurrentlySyncing"
					:entry-devices="deviceLabels.entry"
					:exit-devices="deviceLabels.exit"
					resync-aria-label="重新同步車牌至攝影機"
					@open-warnings="handleOpenWarnings"
					@resync="handleResync"
				>
					<template #actions>
						<PermissionActionButton
							:allowed="canCreatePlate"
							:disabled="isSavingPlate || isPlatesLoading"
							class="rounded-xl border border-white/20 bg-cyan-600/80 px-4 py-2.5 text-base text-white enabled:hover:bg-cyan-500 2xl:text-lg"
							aria-label="新增車牌"
							@click="openPlateForm()"
						>
							新增車牌
						</PermissionActionButton>
					</template>
				</DeviceSyncStep2Toolbar>
			</template>
			<template #person-indicators="{ person }">
				<PersonnelSyncCredentialIndicators
					:items="plateIndicatorsForPerson(person)"
					aria-label="車牌同步狀態"
				/>
			</template>
			<template #person-extra="{ person }">
				<ul
					v-if="platesForPerson(person).length > 0"
					class="mt-2 space-y-1 border-t border-white/10 pt-2 ps-6"
				>
					<li
						v-for="plate in platesForPerson(person)"
						:key="plate.id"
						class="flex items-center justify-between gap-2 text-xs text-white/75 2xl:text-sm"
					>
						<span class="min-w-0 truncate font-mono">{{ plate.plate_number }}</span>
						<div class="flex shrink-0 items-center gap-2">
							<PersonnelSyncCredentialIndicators
								:items="plateRowIndicators(plate)"
								aria-label="車牌同步狀態"
							/>
							<button
								v-if="canUpdatePlate"
								type="button"
								class="text-cyan-300 hover:text-cyan-200"
								:aria-label="`編輯車牌 ${plate.plate_number}`"
								@click.stop="openPlateForm(plate)"
							>
								編輯
							</button>
							<button
								v-if="canDeletePlate"
								type="button"
								class="text-rose-300 hover:text-rose-200"
								:aria-label="`刪除車牌 ${plate.plate_number}`"
								@click.stop="handleDeletePlate(plate)"
							>
								刪除
							</button>
						</div>
					</li>
				</ul>
			</template>
		</LocationMembersGroupPanel>
	</DeviceManageDialogShell>

	<PersonnelSyncWarningsDialog
		v-model="showWarningsDialog"
		:sync-warnings="syncWarnings"
		:sync-warning-type-label="syncWarningTypeLabel"
	/>

	<VehicleAccessIsapiPlateFormDialog
		v-if="showPlateForm"
		v-model:form="plateForm"
		:mode="plateFormMode"
		:person-bind-options="personBindOptions"
		:is-loading-person-options="isLoadingPersonOptions"
		:is-saving="isSavingPlate"
		:error-message="plateFormError"
		@save="handleSavePlate"
		@cancel="cancelPlateForm"
	/>
</template>

<script setup lang="ts">
import { computed, toRef, watch } from "vue"
import type { VehicleAccessLocation } from "~/types/vehicleAccess"
import type { LocationLicensePlateRow, Person } from "~/types/personnel"
import DeviceManageDialogShell from "~/components/personnel/device-sync/DeviceManageDialogShell.vue"
import DeviceSyncStep2Toolbar from "~/components/personnel/device-sync/DeviceSyncStep2Toolbar.vue"
import LocationMembersGroupPanel from "~/components/personnel/LocationMembersGroupPanel.vue"
import PersonnelSyncCredentialIndicators from "~/components/personnel/PersonnelSyncCredentialIndicators.vue"
import PersonnelSyncWarningsDialog from "~/components/personnel/dialogs/PersonnelSyncWarningsDialog.vue"
import VehicleAccessIsapiPlateFormDialog from "~/components/vehicle-access/VehicleAccessIsapiPlateFormDialog.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import type { LocationPlateSync } from "~/composables/systems/personnel/useLocationPlateSync"
import { useLocationMembersGroupPicker } from "~/composables/systems/personnel/useLocationMembersGroupPicker"
import { parseLocationNumericId } from "~/utils/personnelUtils"
import { plateSyncStatusToUiStatus } from "~/utils/licensePlateFormUtils"
import { buildPlateSyncIndicators } from "~/utils/syncCredentialIcons"

const props = defineProps<{
	modelValue: boolean
	location: (VehicleAccessLocation & { zoneName?: string | null }) | null
	canCreatePlate?: boolean
	canUpdatePlate?: boolean
	canDeletePlate?: boolean
	canEditMembers: boolean
	canResyncPlates: boolean
	plateSync: LocationPlateSync
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	membersUpdated: []
	synced: []
}>()

const locationId = computed(() =>
	parseLocationNumericId(props.location?.id ?? props.location?.locationId),
)
const locationTitleMeta = computed(() => {
	const zone = String(props.location?.zoneName ?? "").trim()
	const name = String(props.location?.name ?? "").trim()
	if (zone && name) return `${zone} / ${name}`
	return name || zone || null
})
const locationName = computed(() => props.location?.name ?? null)

const {
	isSingleLocationSyncing,
	showWarningsDialog,
	syncWarnings,
	syncWarningTypeLabel,
	openWarningsDialog,
	refreshSyncWarnings,
	getLocationDevicesLabel,
	setLocationDisplayName,
	prepareLocationDialog,
	syncOneLocation,
	isPlatesLoading: isPlatesLoadingFn,
	isLocationCurrentlySyncing,
	isLocationSyncButtonDisabled,
	getPlatesForLocation,
	resolvePlatesForPerson,
	plateSyncIndicatorsForPerson,
	applyLocationMembers,
	showPlateForm,
	plateFormMode,
	isSavingPlate,
	plateForm,
	plateFormError,
	personBindOptions,
	isLoadingPersonOptions,
	openPlateForm,
	cancelPlateForm,
	savePlate,
	deletePlate,
} = props.plateSync

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
	prepareGroupPicker,
} = useLocationMembersGroupPicker({
	locationId,
	membersSync: toRef(props, "plateSync"),
})

const deviceLabels = computed(() =>
	locationId.value != null ? getLocationDevicesLabel(locationId.value) : { entry: [], exit: [] },
)

const isUiLocked = computed(() => isSingleLocationSyncing.value)
const isPlatesLoading = computed(() =>
	locationId.value != null ? isPlatesLoadingFn(locationId.value) : false,
)
const isCurrentlySyncing = computed(() =>
	locationId.value != null ? isLocationCurrentlySyncing(locationId.value) : false,
)
const isSyncButtonDisabled = computed(() =>
	locationId.value != null ? isLocationSyncButtonDisabled(locationId.value) : true,
)

const locationPlates = computed(() =>
	locationId.value != null ? getPlatesForLocation(locationId.value) : [],
)

const platesForPerson = (person: Person) => {
	if (locationId.value == null) return []
	void locationPlates.value
	return resolvePlatesForPerson(locationId.value, person)
}

const plateIndicatorsForPerson = (person: Person) => {
	if (locationId.value == null) return []
	void locationPlates.value
	return plateSyncIndicatorsForPerson(locationId.value, person)
}

const plateRowIndicators = (plate: LocationLicensePlateRow) =>
	buildPlateSyncIndicators(plateSyncStatusToUiStatus(plate.isapi_sync_status))

const handleApplyMembers = async () => {
	if (locationId.value == null) return
	const res = await applyLocationMembers(locationId.value, locationName.value)
	if (res != null && !membersError.value) emit("membersUpdated")
}

const handleOpenWarnings = () => {
	if (locationId.value == null) return
	refreshSyncWarnings(locationId.value, locationName.value)
	openWarningsDialog()
}

const handleResync = async () => {
	if (locationId.value == null) return
	await syncOneLocation(locationId.value, locationName.value)
	emit("synced")
}

const handleSavePlate = async () => {
	if (locationId.value == null) return
	await savePlate(locationId.value)
}

const handleDeletePlate = async (row: LocationLicensePlateRow) => {
	if (locationId.value == null) return
	await deletePlate(locationId.value, row)
}

const handleClose = () => {
	cancelPlateForm()
	emit("update:modelValue", false)
}

watch(
	() => props.modelValue,
	async (open) => {
		if (!open) return
		const id = locationId.value
		if (id == null) return
		if (locationName.value) setLocationDisplayName(id, locationName.value)
		await prepareLocationDialog(id)
		await prepareGroupPicker()
	},
)
</script>
