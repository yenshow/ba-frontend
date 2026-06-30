<template>
	<DeviceManageDialogShell
		:model-value="modelValue"
		title="樓層管理"
		title-id="elevator-floor-manage-title"
		step-nav-aria-label="樓層管理步驟切換"
		:manage-step="manageStep"
		step1-label="樓層權限"
		step2-label="設備同步"
		:is-ui-locked="isUiLocked"
		@update:manage-step="manageStep = $event"
		@close="handleClose"
	>
		<div v-if="locationId == null" class="py-12 text-center text-white/60">請先選擇地點</div>

		<ElevatorFloorAccessStepPanel
			v-else-if="manageStep === 1"
			description="展開各樓層，勾選允許使用該層的人員。套用後系統將自動同步至設備；可至步驟 2 檢視狀態。"
			search-input-id="elevator-floor-members-search"
			:candidates-query="candidatesQuery"
			:can-select-all="canSelectAllOnExpandedFloors"
			:can-edit-floors="canEditFloors"
			:is-applying="isApplying"
			:is-loading="isLoading"
			:floors="floors"
			:candidate-groups="candidateGroups"
			:error-text="errorText"
			:defaults-applied="defaultsApplied"
			:is-all-expanded-floors-kept="isAllExpandedFloorsKept"
			:is-person-checked="isPersonChecked"
			:selected-count-for-floor="selectedCountForFloor"
			:is-floor-expanded="isFloorExpanded"
			@update:candidates-query="candidatesQuery = $event"
			@search="handleSearchCandidates"
			@toggle-select-all="toggleSelectAllOnExpandedFloors"
			@toggle-floor="toggleFloorExpanded"
			@toggle-person="togglePersonOnFloor"
			@apply="handleApplyFloorAccess"
		/>

		<div v-else class="space-y-4 rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5">
			<DeviceSyncStep2Toolbar
				title="步驟 2：設備同步"
				description="將人員梯控卡與樓層授權寫入梯控設備；若地點已設定門禁設備，亦會同步人員主檔至門禁。"
				:warnings-count="syncWarnings.length"
				:can-resync="canDeviceSync"
				:is-resync-disabled="isSyncButtonDisabled"
				:is-resyncing="isCurrentlySyncing"
				:location-name="locationName"
				:entry-devices="deviceLabels.entry"
				:exit-devices="deviceLabels.exit"
				entry-prefix="梯控"
				exit-prefix="門禁"
				resync-aria-label="重新同步至梯控與門禁設備"
				@open-warnings="openWarningsDialog"
				@resync="handleSync"
			/>

			<AsyncPanel
				:loading="isSyncCandidatesLoading"
				:empty="!isSyncCandidatesLoading && syncRows.length === 0"
				empty-title="此地點尚無樓層授權人員，請先完成步驟 1"
				:min-height-class="SYNC_TABLE_PANEL_MIN_HEIGHT"
			>
				<template #loading>
					<p class="sr-only">載入同步狀態</p>
					<ContentSkeleton :columns="showAccessSyncColumns ? 9 : 5" :rows="8" />
				</template>
				<div class="overflow-x-auto">
					<table
						class="w-full text-left text-sm text-white/90 2xl:text-base"
						:class="showAccessSyncColumns ? 'min-w-[960px]' : 'min-w-[640px]'"
					>
						<thead>
							<tr class="border-b border-white/15 text-white/70">
								<th class="py-2 pe-2">ID</th>
								<th class="py-2 pe-2">姓名</th>
								<th class="py-2 pe-2">授權樓層</th>
								<th class="py-2 pe-2">已同步</th>
								<th class="py-2 pe-2">梯控卡</th>
								<template v-if="showAccessSyncColumns">
									<th class="py-2 pe-2">人員</th>
									<th class="py-2 pe-2">圖片</th>
									<th class="py-2 pe-2">門禁卡</th>
									<th class="py-2 pe-2">指紋</th>
								</template>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="row in syncRows"
								:key="row.employee_no"
								class="border-b border-white/10"
							>
								<td class="py-2 pe-2 font-mono">{{ row.employee_no }}</td>
								<td class="py-2 pe-2">{{ row.full_name || "—" }}</td>
								<td class="py-2 pe-2 text-xs">
									{{ row.authorized_floor_labels.join(", ") || "—" }}
								</td>
								<td class="py-2 pe-2">
									<SyncStatusPill variant="lastSync" :label="getLastSyncLabel(row)" />
								</td>
								<td class="py-2 pe-2">
									<SyncStatusPill variant="lastSync" :label="cardStepLabel(row)" />
								</td>
								<template v-if="showAccessSyncColumns">
									<td class="py-2 pe-2">
										<SyncStatusPill
											variant="step"
											:status="row.last_sync?.access?.user_info?.status"
											:label="accessStepShortLabel(row.last_sync?.access?.user_info)"
										/>
									</td>
									<td class="py-2 pe-2">
										<SyncStatusPill
											variant="step"
											:status="row.last_sync?.access?.face?.status"
											:label="accessStepShortLabel(row.last_sync?.access?.face)"
										/>
									</td>
									<td class="py-2 pe-2">
										<SyncStatusPill
											variant="step"
											:status="row.last_sync?.access?.card?.status"
											:label="accessStepShortLabel(row.last_sync?.access?.card)"
										/>
									</td>
									<td class="py-2 pe-2">
										<SyncStatusPill
											variant="step"
											:status="row.last_sync?.access?.fingerprint?.status"
											:label="accessStepShortLabel(row.last_sync?.access?.fingerprint)"
										/>
									</td>
								</template>
							</tr>
						</tbody>
					</table>
					<Pagination
						:total="syncPaged.total"
						:offset="syncPaged.offset"
						:limit="syncPaged.limit"
						:disabled="isUiLocked || isSyncCandidatesLoading"
						:show="syncPaged.total > syncPaged.limit"
						@previous="handlePrevSyncPage"
						@next="handleNextSyncPage"
					/>
				</div>
			</AsyncPanel>
		</div>
	</DeviceManageDialogShell>

	<PersonnelSyncWarningsDialog
		v-model="showWarningsDialog"
		:sync-warnings="syncWarnings"
		:sync-warning-type-label="syncWarningTypeLabel"
	/>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from "vue"
import Pagination from "~/components/common/Pagination.vue"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import ContentSkeleton from "~/components/common/ContentSkeleton.vue"
import ElevatorFloorAccessStepPanel from "~/components/elevator/ElevatorFloorAccessStepPanel.vue"
import DeviceManageDialogShell from "~/components/personnel/device-sync/DeviceManageDialogShell.vue"
import DeviceSyncStep2Toolbar from "~/components/personnel/device-sync/DeviceSyncStep2Toolbar.vue"
import SyncStatusPill from "~/components/personnel/device-sync/SyncStatusPill.vue"
import PersonnelSyncWarningsDialog from "~/components/personnel/dialogs/PersonnelSyncWarningsDialog.vue"
import type { ElevatorFloorSync } from "~/composables/systems/elevator/useElevatorSyncEngine"
import { useElevatorFloorAccess } from "~/composables/systems/elevator/useElevatorFloorAccess"
import { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useToast } from "~/composables/core/useToast"
import { SYNC_TABLE_PANEL_MIN_HEIGHT } from "~/composables/systems/personnel/useLocationMembersStep"

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

const manageStep = ref<1 | 2>(1)
const elevatorApi = useElevatorApi()
const personnelApi = usePersonnelApi()
const toast = useToast()

const {
	syncWarnings,
	showWarningsDialog,
	openWarningsDialog,
	syncWarningTypeLabel,
	ensureStep2Data,
	getLocationDevicesLabel,
	isSyncCandidatesLoading: isSyncLocationCandidatesLoading,
	getPagedSyncCandidates,
	syncOneLocation,
	isUiLocked: isFloorSyncUiLocked,
	isLocationSyncJobRunning,
	watchApplySyncJob,
	isLocationSyncButtonDisabled,
	getLastSyncLabel,
	cardStepLabel,
	hasAccessDevicesForLocation,
	accessStepShortLabel,
	goPrevSyncPage,
	goNextSyncPage,
} = props.floorSync

const {
	floors,
	defaultsApplied,
	candidatesQuery,
	candidateGroups,
	canSelectAllOnExpandedFloors,
	isAllExpandedFloorsKept,
	toggleSelectAllOnExpandedFloors,
	isLoading,
	isApplying,
	errorText,
	isPersonChecked,
	togglePersonOnFloor,
	selectedCountForFloor,
	isFloorExpanded,
	toggleFloorExpanded,
	loadFloorAccess,
	applyFloorAccess,
	handleSearchCandidates,
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

const deviceLabels = computed(() =>
	props.locationId != null ? getLocationDevicesLabel(props.locationId) : { entry: [], exit: [] },
)

const syncPaged = computed(() =>
	props.locationId != null
		? getPagedSyncCandidates(props.locationId)
		: { rows: [], total: 0, offset: 0, limit: 10 }
)
const syncRows = computed(() => syncPaged.value.rows)
const isSyncCandidatesLoading = computed(() =>
	props.locationId != null ? isSyncLocationCandidatesLoading(props.locationId) : false
)
const showAccessSyncColumns = computed(() =>
	props.locationId != null ? hasAccessDevicesForLocation(props.locationId) : false
)
const isCurrentlySyncing = computed(() =>
	props.locationId != null ? isLocationSyncJobRunning(props.locationId) : false
)
const isSyncButtonDisabled = computed(() =>
	props.locationId != null ? isLocationSyncButtonDisabled(props.locationId) : true
)

const handleSync = async () => {
	if (props.locationId == null) return
	await syncOneLocation(props.locationId)
	emit("synced")
}

const handlePrevSyncPage = () => {
	if (props.locationId == null) return
	goPrevSyncPage(props.locationId)
}
const handleNextSyncPage = () => {
	if (props.locationId == null) return
	goNextSyncPage(props.locationId)
}

watch(manageStep, async (step) => {
	if (step !== 2 || !props.modelValue || props.locationId == null) return
	await ensureStep2Data(props.locationId)
})

watch(
	() => props.modelValue,
	(open) => {
		if (!open) return
		manageStep.value = 1
		if (props.locationId == null) return
		void loadFloorAccess()
	}
)
</script>
