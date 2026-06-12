<template>
	<DeviceManageDialogShell
		:model-value="modelValue"
		title="車牌管理"
		title-id="vehicle-isapi-manage-title"
		step-nav-aria-label="車牌管理步驟切換"
		:manage-step="manageStep"
		step1-label="人員權限"
		step2-label="設備同步"
		:is-ui-locked="isUiLocked"
		@update:manage-step="manageStep = $event"
		@close="handleClose"
	>
		<div v-if="locationId == null" class="py-12 text-center text-white/60">無法解析地點</div>

		<LocationMembersStepPanel
			v-else-if="manageStep === 1"
			title="步驟 1：人員權限"
			description="勾選允許進出此地點的人員。套用後系統將自動同步至設備；可至步驟 2 檢視狀態。"
			search-input-id="vehicle-access-members-search"
			:members-query="membersQuery"
			:has-member-candidates="hasMemberCandidates"
			:can-edit-members="canEditMembers"
			:is-applying-members="isApplyingMembers"
			:is-loading-members="isLoadingMembers"
			:member-candidate-groups="memberCandidateGroups"
			:members-error="membersError"
			:is-all-members-page-kept="isAllMembersPageKept"
			:is-member-kept="isMemberKept"
			:list-min-height-class="LOCATION_MEMBERS_PANEL_MIN_HEIGHT"
			list-scroll-class="max-h-[480px]"
			@update:members-query="membersQuery = $event"
			@search="handleSearchMembers"
			@toggle-select-all-page="handleToggleSelectAllMembersPage"
			@toggle-member="toggleMember"
			@apply="handleApplyMembers"
		/>

		<div v-else class="space-y-4 rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5">
			<DeviceSyncStep2Toolbar
				title="步驟 2：設備同步"
				description="顯示名單內車牌與同步狀態；編輯儲存後自動推送至攝影機，亦可手動重新同步。"
				:warnings-count="plateSyncWarnings.length"
				:can-resync="canDeviceSync"
				:is-resync-disabled="isSyncButtonDisabled"
				:is-resyncing="isCurrentlySyncing"
				resync-aria-label="重新同步車牌至攝影機"
				@open-warnings="handleOpenWarnings"
				@resync="handleResync"
			>
				<template #actions>
					<PermissionActionButton
						v-if="canCreatePlate"
						:allowed="!isSavingPlate && !isPlatesLoading"
						class="rounded-xl border border-white/20 bg-cyan-600/80 px-4 py-2 text-sm text-white enabled:hover:bg-cyan-500 2xl:text-base"
						aria-label="新增車牌"
						@click="openPlateForm()"
					>
						新增車牌
					</PermissionActionButton>
				</template>
			</DeviceSyncStep2Toolbar>

			<DeviceLocationDeviceBadges
				:location-name="locationName"
				:entry="deviceLabels.entry"
				:exit="deviceLabels.exit"
			/>

			<AsyncPanel
				:loading="isPlatesLoading"
				:empty="!isPlatesLoading && platesPaged.total === 0"
				empty-title="尚無車牌資料"
				empty-description="請先於步驟 1 套用名單，或為名單內人員新增車牌。"
				:min-height-class="SYNC_TABLE_PANEL_MIN_HEIGHT"
			>
				<template #loading>
					<ContentSkeleton variant="table" />
				</template>
				<div class="overflow-x-auto rounded-lg border border-white/10">
					<table class="min-w-full text-left text-sm text-white/90 2xl:text-base">
						<thead class="bg-white/5 text-xs text-white/60 2xl:text-sm">
							<tr>
								<th class="px-3 py-2 font-medium">人員</th>
								<th class="px-3 py-2 font-medium">車牌</th>
								<th class="px-3 py-2 font-medium">名單</th>
								<th class="px-3 py-2 font-medium">效期開始</th>
								<th class="px-3 py-2 font-medium">效期結束</th>
								<th class="px-3 py-2 font-medium">同步</th>
								<th class="px-3 py-2 font-medium text-end">操作</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="row in platesPaged.rows"
								:key="row.id"
								class="border-t border-white/10 hover:bg-white/5"
							>
								<td class="px-3 py-2">{{ row.full_name || "—" }}</td>
								<td class="px-3 py-2 font-mono">{{ row.plate_number }}</td>
								<td class="px-3 py-2">
									{{ licensePlateListTypeShortLabel(row.list_type ?? "allowList") }}
								</td>
								<td class="px-3 py-2 text-xs text-white/70">
									{{ formatLicensePlateDisplayTime(row.effective_begin) }}
								</td>
								<td class="px-3 py-2 text-xs text-white/70">
									{{ formatLicensePlateDisplayTime(row.effective_end) }}
								</td>
								<td class="px-3 py-2">
									<SyncStatusPill variant="plate" :status="row.isapi_sync_status" />
								</td>
								<td class="px-3 py-2 text-end">
									<div class="flex justify-end gap-2">
										<button
											v-if="canUpdatePlate"
											type="button"
											class="text-cyan-300 hover:text-cyan-200"
											:aria-label="`編輯車牌 ${row.plate_number}`"
											@click="openPlateForm(row)"
										>
											編輯
										</button>
										<button
											v-if="canDeletePlate"
											type="button"
											class="text-rose-300 hover:text-rose-200"
											:aria-label="`刪除車牌 ${row.plate_number}`"
											@click="handleDeletePlate(row)"
										>
											刪除
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
					<Pagination
						:total="platesPaged.total"
						:offset="platesPaged.offset"
						:limit="platesPaged.limit"
						:disabled="isUiLocked || isPlatesLoading"
						:show="platesPaged.total > platesPaged.limit"
						@previous="handlePrevPlatesPage"
						@next="handleNextPlatesPage"
					/>
				</div>
			</AsyncPanel>
			<p v-if="platesError" class="form-error-text" role="alert">{{ platesError }}</p>
		</div>
	</DeviceManageDialogShell>

	<PersonnelSyncWarningsDialog
		v-model="showWarningsDialog"
		:sync-warnings="plateSyncWarnings"
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
import { computed, ref, toRef, watch } from "vue"
import type { VehicleAccessLocation } from "~/types/vehicleAccess"
import type { LocationLicensePlateRow } from "~/types/personnel"
import DeviceManageDialogShell from "~/components/personnel/device-sync/DeviceManageDialogShell.vue"
import DeviceSyncStep2Toolbar from "~/components/personnel/device-sync/DeviceSyncStep2Toolbar.vue"
import DeviceLocationDeviceBadges from "~/components/personnel/device-sync/DeviceLocationDeviceBadges.vue"
import SyncStatusPill from "~/components/personnel/device-sync/SyncStatusPill.vue"
import LocationMembersStepPanel from "~/components/personnel/location-access/LocationMembersStepPanel.vue"
import PersonnelSyncWarningsDialog from "~/components/personnel/dialogs/PersonnelSyncWarningsDialog.vue"
import VehicleAccessIsapiPlateFormDialog from "~/components/vehicle-access/VehicleAccessIsapiPlateFormDialog.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import ContentSkeleton from "~/components/common/ContentSkeleton.vue"
import Pagination from "~/components/common/Pagination.vue"
import type { LocationPlateSync } from "~/composables/systems/personnel/useLocationPlateSync"
import {
	useLocationMembersPicker,
	LOCATION_MEMBERS_PANEL_MIN_HEIGHT,
	SYNC_TABLE_PANEL_MIN_HEIGHT,
} from "~/composables/systems/personnel/useLocationMembersPicker"
import { parseLocationNumericId } from "~/utils/personnelUtils"
import {
	formatLicensePlateDisplayTime,
	licensePlateListTypeShortLabel,
} from "~/utils/licensePlateFormUtils"

const props = defineProps<{
	modelValue: boolean
	location: VehicleAccessLocation | null
	canCreatePlate?: boolean
	canUpdatePlate?: boolean
	canDeletePlate?: boolean
	canEditMembers: boolean
	canDeviceSync: boolean
	plateSync: LocationPlateSync
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	membersUpdated: []
}>()

const manageStep = ref<1 | 2>(1)

const locationId = computed(() =>
	parseLocationNumericId(props.location?.id ?? props.location?.locationId),
)
const locationName = computed(() => props.location?.name ?? null)

const {
	isSingleLocationSyncing,
	showWarningsDialog,
	syncWarningTypeLabel,
	openWarningsDialog,
	syncWarningsForLocation,
	getLocationDevicesLabel,
	setLocationDisplayName,
	prepareLocationDialog,
	ensureStep2Data,
	isPlatesLoading: isPlatesLoadingFn,
	getPlatesError,
	getPagedPlatesForLocation,
	goPrevPlatesPage,
	goNextPlatesPage,
	syncOneLocation,
	isLocationCurrentlySyncing,
	isLocationSyncButtonDisabled,
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
	hasMemberCandidates,
	memberCandidateGroups,
	membersQuery,
	isApplyingMembers,
	isLoadingMembers,
	membersError,
	isMemberKept,
	toggleMember,
	isAllMembersPageKept,
	handleToggleSelectAllMembersPage,
	handleSearchMembers,
} = useLocationMembersPicker({
	locationId,
	membersSync: toRef(props, "plateSync"),
})

const plateSyncWarnings = computed(() =>
	locationId.value != null
		? syncWarningsForLocation(locationId.value, locationName.value)
		: [],
)

const deviceLabels = computed(() =>
	locationId.value != null ? getLocationDevicesLabel(locationId.value) : { entry: [], exit: [] },
)

const isUiLocked = computed(() => isSingleLocationSyncing.value)
const isPlatesLoading = computed(() =>
	locationId.value != null ? isPlatesLoadingFn(locationId.value) : false,
)
const platesError = computed(() =>
	locationId.value != null ? getPlatesError(locationId.value) : "",
)
const platesPaged = computed(() =>
	locationId.value != null
		? getPagedPlatesForLocation(locationId.value)
		: { rows: [], total: 0, offset: 0, limit: 10 },
)
const isCurrentlySyncing = computed(() =>
	locationId.value != null ? isLocationCurrentlySyncing(locationId.value) : false,
)
const isSyncButtonDisabled = computed(() =>
	locationId.value != null ? isLocationSyncButtonDisabled(locationId.value) : true,
)

const handleApplyMembers = async () => {
	if (locationId.value == null) return
	const res = await applyLocationMembers(locationId.value, locationName.value)
	if (res != null && !membersError.value) emit("membersUpdated")
}

const handleOpenWarnings = () => {
	if (locationId.value == null) return
	openWarningsDialog(locationId.value, locationName.value)
}

const handleResync = async () => {
	if (locationId.value == null) return
	await syncOneLocation(locationId.value, locationName.value)
}

const handleSavePlate = async () => {
	if (locationId.value == null) return
	await savePlate(locationId.value)
}

const handleDeletePlate = async (row: LocationLicensePlateRow) => {
	if (locationId.value == null) return
	await deletePlate(locationId.value, row)
}

const handlePrevPlatesPage = () => {
	if (locationId.value == null) return
	goPrevPlatesPage(locationId.value)
}

const handleNextPlatesPage = () => {
	if (locationId.value == null) return
	goNextPlatesPage(locationId.value)
}

const handleClose = () => {
	cancelPlateForm()
	emit("update:modelValue", false)
}

watch(manageStep, async (step) => {
	if (step !== 2 || !props.modelValue || locationId.value == null) return
	await ensureStep2Data(locationId.value)
})

watch(
	() => props.modelValue,
	async (open) => {
		if (!open) return
		manageStep.value = 1
		const id = locationId.value
		if (id == null) return
		if (locationName.value) setLocationDisplayName(id, locationName.value)
		await prepareLocationDialog(id)
	},
)
</script>
