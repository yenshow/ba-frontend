<template>
	<DeviceManageDialogShell
		:model-value="modelValue"
		title="門禁管理"
		title-id="pc-access-manage-title"
		step-nav-aria-label="門禁管理步驟切換"
		:manage-step="manageStep"
		step1-label="人員權限"
		step2-label="設備同步"
		:is-ui-locked="isUiLocked"
		@update:manage-step="manageStep = $event"
		@close="handleClose"
	>
		<div v-if="locationId == null" class="py-12 text-center text-white/60">請先選擇地點</div>

		<LocationMembersStepPanel
			v-else-if="manageStep === 1"
			title="步驟 1：人員權限"
			description="勾選允許進出此地點的人員。套用後系統將自動同步至設備；可至步驟 2 檢視狀態。"
			search-input-id="people-counting-access-members-search"
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
				description="將名單內人員的臉部、卡片、指紋等資料寫入門禁設備，並檢視各項同步狀態。"
				:warnings-count="syncWarnings.length"
				:can-resync="canDeviceSync"
				:is-resync-disabled="isSyncButtonDisabled"
				:is-resyncing="isCurrentlySyncing"
				:location-name="locationName"
				:entry-devices="deviceLabels.entry"
				:exit-devices="deviceLabels.exit"
				resync-aria-label="重新同步此地點至門禁設備"
				@open-warnings="openWarningsDialog"
				@resync="handleSync"
			/>

			<AsyncPanel
				:loading="isSyncCandidatesLoading"
				:empty="!isSyncCandidatesLoading && syncRows.length === 0"
				empty-title="此地點尚無門禁名單人員，請先完成步驟 1"
				:min-height-class="SYNC_TABLE_PANEL_MIN_HEIGHT"
			>
				<template #loading>
					<p class="sr-only">載入同步狀態</p>
					<ContentSkeleton :columns="7" :rows="8" />
				</template>
				<div class="overflow-x-auto">
					<table class="w-full min-w-[760px] text-left text-sm text-white/90 2xl:text-base">
						<thead>
							<tr class="border-b border-white/15 text-white/70">
								<th class="py-2 pe-2">ID</th>
								<th class="py-2 pe-2">姓名</th>
								<th class="py-2 pe-2">已同步</th>
								<th class="py-2 pe-2">人員</th>
								<th class="py-2 pe-2">圖片</th>
								<th class="py-2 pe-2">卡片</th>
								<th class="py-2 pe-2">指紋</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="row in syncRows"
								:key="row.employeeNo"
								class="border-b border-white/10"
							>
								<td class="py-2 pe-2 font-mono">{{ row.employeeNo }}</td>
								<td class="py-2 pe-2">{{ row.fullName || "—" }}</td>
								<td class="py-2 pe-2">
									<SyncStatusPill
										variant="lastSync"
										:label="getLastSyncLabel(row.employeeNo)"
									/>
								</td>
								<td class="py-2 pe-2">
									<SyncStatusPill
										variant="step"
										:status="row.person.status"
										:label="syncStepShortLabel(row.person)"
									/>
								</td>
								<td class="py-2 pe-2">
									<SyncStatusPill
										variant="step"
										:status="row.face.status"
										:label="syncStepShortLabel(row.face)"
									/>
								</td>
								<td class="py-2 pe-2">
									<SyncStatusPill
										variant="step"
										:status="row.card.status"
										:label="syncStepShortLabel(row.card)"
									/>
								</td>
								<td class="py-2 pe-2">
									<SyncStatusPill
										variant="step"
										:status="row.fingerprint.status"
										:label="syncStepShortLabel(row.fingerprint)"
									/>
								</td>
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
import DeviceManageDialogShell from "~/components/personnel/device-sync/DeviceManageDialogShell.vue"
import DeviceSyncStep2Toolbar from "~/components/personnel/device-sync/DeviceSyncStep2Toolbar.vue"
import SyncStatusPill from "~/components/personnel/device-sync/SyncStatusPill.vue"
import LocationMembersStepPanel from "~/components/personnel/location-access/LocationMembersStepPanel.vue"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import ContentSkeleton from "~/components/common/ContentSkeleton.vue"
import PersonnelSyncWarningsDialog from "~/components/personnel/dialogs/PersonnelSyncWarningsDialog.vue"
import type { useLocationAccessSync } from "~/composables/systems/personnel/useLocationAccessSync"
import {
	useLocationMembersPicker,
	LOCATION_MEMBERS_PANEL_MIN_HEIGHT,
	SYNC_TABLE_PANEL_MIN_HEIGHT,
} from "~/composables/systems/personnel/useLocationMembersStep"

const props = defineProps<{
	modelValue: boolean
	locationId: number | null
	locationName?: string | null
	canEditMembers: boolean
	canDeviceSync: boolean
	accessSync: ReturnType<typeof useLocationAccessSync>
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	synced: []
	membersUpdated: []
}>()

const manageStep = ref<1 | 2>(1)

const {
	isSingleLocationSyncing,
	showWarningsDialog,
	syncWarnings,
	syncWarningTypeLabel,
	openWarningsDialog,
	getLocationDevicesLabel,
	prepareLocationDialog,
	ensureSyncCandidates,
	syncOneLocation,
	isSyncLocationCandidatesLoading,
	getPagedSyncStepRowsForLocation,
	syncStepShortLabel,
	getCandidateLastSyncLabel,
	isLocationCurrentlySyncing,
	isLocationSyncButtonDisabled,
	goPrevSyncPage,
	goNextSyncPage,
} = props.accessSync

const handleClose = () => emit("update:modelValue", false)

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
	applyMembers,
} = useLocationMembersPicker({
	locationId: toRef(props, "locationId"),
	membersSync: toRef(props, "accessSync"),
})

const handleApplyMembers = async () => {
	if (!(await applyMembers())) return
	emit("membersUpdated")
}

const deviceLabels = computed(() =>
	props.locationId != null ? getLocationDevicesLabel(props.locationId) : { entry: [], exit: [] },
)

const isUiLocked = computed(() => isSingleLocationSyncing.value)

watch(manageStep, async (step) => {
	if (step !== 2 || !props.modelValue || props.locationId == null) return
	await ensureSyncCandidates(props.locationId)
})

const isSyncCandidatesLoading = computed(() =>
	props.locationId != null ? isSyncLocationCandidatesLoading(props.locationId) : false,
)
const syncPaged = computed(() =>
	props.locationId != null
		? getPagedSyncStepRowsForLocation(props.locationId)
		: { rows: [], total: 0, offset: 0, limit: 10 },
)
const syncRows = computed(() => syncPaged.value.rows)
const isCurrentlySyncing = computed(() =>
	props.locationId != null ? isLocationCurrentlySyncing(props.locationId) : false,
)
const isSyncButtonDisabled = computed(() =>
	props.locationId != null ? isLocationSyncButtonDisabled(props.locationId) : true,
)

const getLastSyncLabel = (employeeNo: string) =>
	props.locationId != null ? getCandidateLastSyncLabel(props.locationId, employeeNo) : "—"

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

watch(
	() => props.modelValue,
	(open) => {
		if (!open) return
		manageStep.value = 1
		if (props.locationId == null) return
		void prepareLocationDialog(props.locationId)
	},
)
</script>
