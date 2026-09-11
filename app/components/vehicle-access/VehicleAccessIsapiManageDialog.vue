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
			class="pr-7 2xl:pr-8"
			:group-tree="groupTree"
			:selected-child-group-id="selectedChildGroupId"
			:member-count-by-child-id="memberCountWithTemporary"
			:has-ungrouped-candidates="hasUngroupedCandidates"
			:show-temporary-vehicles="true"
			:show-apply-footer="!isTemporaryVehiclesView"
			:selected-group-label="selectedGroupLabel"
			:is-group-tree-loading="isGroupTreeLoading"
			:group-tree-error="groupTreeError"
			:members-query="membersQuery"
			search-input-id="vehicle-access-members-search"
			:filtered-candidates="filteredCandidates"
			:has-filtered-candidates="hasFilteredCandidates"
			:can-edit-members="canEditMembers"
			:is-applying-members="isApplyingMembers"
			:is-loading-members="isLoadingMembersPanel || isPlatesLoading"
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
					:description="toolbarDescription"
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
							class="btn-action-emerald"
							aria-label="新增車牌"
							@click="handleOpenAddPlate"
						>
							新增車牌
						</PermissionActionButton>
					</template>
				</DeviceSyncStep2Toolbar>
			</template>

			<template v-if="isTemporaryVehiclesView" #right-panel>
				<div
					class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5"
				>
					<div
						class="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3"
					>
						<p class="text-sm text-white/80 2xl:text-base">
							目前群組
							<span class="ms-2 font-medium text-white">臨時車輛</span>
						</p>
					</div>
					<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
						<p v-if="temporaryPlates.length === 0" class="py-10 text-center text-sm text-white/50">
							尚無臨時車牌；點「新增車牌」並選「臨時車輛」填寫姓名。
						</p>
						<ul v-else class="space-y-2">
							<li
								v-for="plate in temporaryPlates"
								:key="plate.id"
								class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/80"
							>
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<span class="font-mono text-white">{{ plate.plate_number }}</span>
										<span class="text-white/90">{{ plate.display_name }}</span>
										<span class="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/70">
											{{ licensePlateListTypeShortLabel(plate.list_type) }}
										</span>
									</div>
									<p class="mt-0.5 text-xs text-white/50">
										{{ formatLicensePlateDisplayTime(plate.effective_begin) }}
										～
										{{ formatLicensePlateDisplayTime(plate.effective_end) }}
									</p>
								</div>
								<div class="flex shrink-0 items-center gap-2">
									<PersonnelSyncCredentialIndicators
										:items="tempPlateRowIndicators(plate)"
										aria-label="臨時車牌同步狀態"
									/>
									<button
										v-if="canUpdatePlate"
										type="button"
										class="text-cyan-300 hover:text-cyan-200"
										:aria-label="`編輯臨時車牌 ${plate.plate_number}`"
										@click="handleOpenEditTemporaryPlate(plate)"
									>
										編輯
									</button>
									<button
										v-if="canDeletePlate"
										type="button"
										class="text-rose-300 hover:text-rose-200"
										:aria-label="`刪除臨時車牌 ${plate.plate_number}`"
										@click="handleDeleteTemporaryPlate(plate)"
									>
										刪除
									</button>
								</div>
							</li>
						</ul>
					</div>
				</div>
			</template>

			<template v-if="!isTemporaryVehiclesView" #person-indicators="{ person }">
				<PersonnelSyncCredentialIndicators
					:items="plateIndicatorsForPerson(person)"
					aria-label="車牌同步狀態"
				/>
			</template>
			<template v-if="!isTemporaryVehiclesView" #person-extra="{ person }">
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
								@click.stop="handleOpenEditBoundPlate(plate)"
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
		@bind-mode-change="handleBindModeChange"
	/>
</template>

<script setup lang="ts">
import { computed, toRef } from "vue"
import type { LocationTemporaryLicensePlate, VehicleAccessLocation } from "~/types/vehicleAccess"
import type { LocationLicensePlateRow, Person } from "~/types/personnel"
import DeviceManageDialogShell from "~/components/personnel/device-sync/DeviceManageDialogShell.vue"
import DeviceSyncStep2Toolbar from "~/components/personnel/device-sync/DeviceSyncStep2Toolbar.vue"
import LocationMembersGroupPanel from "~/components/personnel/LocationMembersGroupPanel.vue"
import PersonnelSyncCredentialIndicators from "~/components/personnel/PersonnelSyncCredentialIndicators.vue"
import PersonnelSyncWarningsDialog from "~/components/personnel/dialogs/PersonnelSyncWarningsDialog.vue"
import VehicleAccessIsapiPlateFormDialog from "~/components/vehicle-access/VehicleAccessIsapiPlateFormDialog.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import type { LocationPlateSync } from "~/composables/systems/personnel/useLocationPlateSync"
import { useLocationDeviceManageDialog } from "~/composables/systems/personnel/useLocationDeviceManageDialog"
import { parseLocationNumericId, TEMPORARY_VEHICLE_FILTER_ID } from "~/utils/personnelUtils"
import {
	formatLicensePlateDisplayTime,
	licensePlateListTypeShortLabel,
	plateSyncStatusToUiStatus,
} from "~/utils/licensePlateFormUtils"
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
	parseLocationNumericId(props.location?.id ?? props.location?.locationId)
)
const locationTitleMeta = computed(() => {
	const zone = String(props.location?.zoneName ?? "").trim()
	const name = String(props.location?.name ?? "").trim()
	if (zone && name) return `${zone} / ${name}`
	return name || zone || null
})
const locationName = computed(() => props.location?.name ?? null)

const toolbarDescription = "勾選允許進出此地點的人員；左欄「臨時車輛」管理不上人員主檔的車牌。"

const {
	showWarningsDialog,
	syncWarnings,
	syncWarningTypeLabel,
	openWarningsDialog,
	refreshSyncWarnings,
	setLocationDisplayName,
	syncOneLocation,
	isPlatesLoading: isPlatesLoadingFn,
	getPlatesForLocation,
	getTemporaryPlatesForLocation,
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
	ensurePersonBindOptions,
	savePlate,
	deletePlate,
	deleteTemporaryPlate,
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
	membersError,
	isMemberKept,
	toggleMember,
	isAllFilteredKept,
	handleToggleSelectAllFiltered,
	handleSearchMembers,
	deviceLabels,
	isUiLocked,
	isCurrentlySyncing,
	isSyncButtonDisabled,
	isLoadingMembersPanel,
} = useLocationDeviceManageDialog({
	modelValue: toRef(props, "modelValue"),
	locationId,
	syncEngine: toRef(props, "plateSync"),
	onDialogOpen: async (id) => {
		if (locationName.value) setLocationDisplayName(id, locationName.value)
		await props.plateSync.prepareLocationDialog(id)
	},
})

const isPlatesLoading = computed(() =>
	locationId.value != null ? isPlatesLoadingFn(locationId.value) : false
)

const locationPlates = computed(() =>
	locationId.value != null ? getPlatesForLocation(locationId.value) : []
)

const temporaryPlates = computed(() =>
	locationId.value != null ? getTemporaryPlatesForLocation(locationId.value) : []
)

const isTemporaryVehiclesView = computed(
	() => selectedChildGroupId.value === TEMPORARY_VEHICLE_FILTER_ID
)

const memberCountWithTemporary = computed(() => ({
	...memberCountByChildId.value,
	[TEMPORARY_VEHICLE_FILTER_ID]: temporaryPlates.value.length,
}))

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

const tempPlateRowIndicators = (plate: LocationTemporaryLicensePlate) =>
	buildPlateSyncIndicators(plateSyncStatusToUiStatus(plate.isapi_sync_status))

const handleApplyMembers = async () => {
	if (locationId.value == null || isTemporaryVehiclesView.value) return
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

const handleOpenAddPlate = () => {
	if (locationId.value == null) return
	const mode = isTemporaryVehiclesView.value ? "temporary" : "bound"
	void openPlateForm(undefined, locationId.value, undefined, mode)
}

const handleBindModeChange = (mode: "bound" | "temporary") => {
	if (mode !== "bound" || locationId.value == null) return
	void ensurePersonBindOptions(locationId.value)
}

const handleOpenEditBoundPlate = (plate: LocationLicensePlateRow) => {
	if (locationId.value == null) return
	void openPlateForm(plate, locationId.value)
}

const handleOpenEditTemporaryPlate = (plate: LocationTemporaryLicensePlate) => {
	if (locationId.value == null) return
	void openPlateForm(undefined, locationId.value, plate)
}

const handleSavePlate = async () => {
	if (locationId.value == null) return
	await savePlate(locationId.value)
}

const handleDeletePlate = async (row: LocationLicensePlateRow) => {
	if (locationId.value == null) return
	await deletePlate(locationId.value, row)
}

const handleDeleteTemporaryPlate = async (row: LocationTemporaryLicensePlate) => {
	if (locationId.value == null) return
	await deleteTemporaryPlate(locationId.value, row)
}

const handleClose = () => {
	cancelPlateForm()
	emit("update:modelValue", false)
}
</script>
