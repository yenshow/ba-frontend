<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="pc-access-manage-title"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-6xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
					:aria-busy="isUiLocked || undefined"
				>
					<header class="flex items-center justify-between gap-3 pr-7 2xl:pr-8">
						<div class="min-w-0">
							<h3
								id="pc-access-manage-title"
								class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
							>
								門禁管理
							</h3>
						</div>

						<nav class="flex items-center gap-2 pr-7 2xl:pr-8" aria-label="門禁管理步驟切換">
							<button
								type="button"
								class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors 2xl:text-base"
								:class="getPillButtonClass(manageStep === 1)"
								:aria-current="manageStep === 1 ? 'step' : undefined"
								@click="manageStep = 1"
							>
								<span
									class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ring-1 2xl:h-7 2xl:w-7 2xl:text-sm"
									:class="getStepCircleClass(manageStep === 1)"
									aria-hidden="true"
								>
									1
								</span>
								<span>人員權限</span>
							</button>

							<div class="h-px w-[300px] bg-white/10" aria-hidden="true" />

							<button
								type="button"
								class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors 2xl:text-base"
								:class="getPillButtonClass(manageStep === 2)"
								:aria-current="manageStep === 2 ? 'step' : undefined"
								@click="manageStep = 2"
							>
								<span
									class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ring-1 2xl:h-7 2xl:w-7 2xl:text-sm"
									:class="getStepCircleClass(manageStep === 2)"
									aria-hidden="true"
								>
									2
								</span>
								<span>設備同步</span>
							</button>
						</nav>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉對話框"
							tabindex="0"
							@click="handleClose"
							@keydown.enter="handleClose"
							@keydown.space.prevent="handleClose"
						>
							&times;
						</button>
					</header>

					<div class="show-scrollbar relative min-h-[320px] flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div v-if="locationId == null" class="py-12 text-center text-white/60">
							請先選擇地點
						</div>

						<div
							v-else-if="manageStep === 1"
							class="rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5"
						>
							<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
								<div class="min-w-0 space-y-2">
									<h4 class="text-lg font-medium text-white 2xl:text-xl">步驟 1：人員權限</h4>
									<p class="text-sm text-white/60 2xl:text-base">
										勾選允許進出此地點的人員。套用後請至步驟 2，將人員資料同步至入口／出口門禁設備。
									</p>
								</div>
								<div class="flex min-w-0 shrink-0 items-center gap-2 lg:max-w-sm">
									<SearchInput
										v-model="membersQuery"
										input-id="people-counting-access-members-search"
										label="搜尋可進出人員"
										placeholder="搜尋 ID / 姓名"
										aria-label="搜尋可進出人員"
										wrapper-class="min-w-0 flex-1"
										input-wrapper-class="min-w-0 flex-1"
										input-class="!w-full min-w-0"
										:disabled="isApplyingMembers"
										:clearable="!isApplyingMembers"
										@search="handleSearchMembers"
										@clear="handleSearchMembers"
									/>
									<button
										type="button"
										class="btn-secondary shrink-0 whitespace-nowrap text-xs 2xl:text-sm"
										:disabled="!hasMemberCandidates || !canEditMembers || isApplyingMembers"
										@click="handleToggleSelectAllMembersPage"
									>
										{{ isAllMembersPageKept ? "取消" : "全選" }}
									</button>
								</div>
							</div>
							<AsyncPanel
								class="mt-4"
								:loading="isLoadingMembers"
								:empty="!isLoadingMembers && memberCandidateGroups.length === 0"
								empty-title="尚無可選人員"
								:min-height-class="LOCATION_MEMBERS_PANEL_MIN_HEIGHT"
							>
								<template #loading>
									<p class="sr-only">載入人員清單</p>
									<ContentSkeleton variant="member-list" />
								</template>
								<div class="show-scrollbar max-h-[min(360px,50vh)] space-y-4 overflow-y-auto pe-1">
									<section v-for="group in memberCandidateGroups" :key="group.groupId">
										<h5 class="mb-2 text-xs font-medium text-white/55 2xl:text-sm">
											{{ group.groupName }}
											<span class="text-white/40">（{{ group.members.length }}）</span>
										</h5>
										<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
											<label
												v-for="person in group.members"
												:key="person.id"
												class="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
											>
												<input
													type="checkbox"
													class="h-4 w-4 shrink-0 accent-cyan-400"
													:checked="isMemberKept(person.id)"
													:disabled="!canEditMembers || isApplyingMembers"
													@change="toggleMember(person.id, $event)"
												/>
												<span class="min-w-0 truncate text-sm text-white/90 2xl:text-base">
													<span class="font-mono">{{ person.employee_no }}</span>
													<span class="ms-2">{{ person.full_name || "—" }}</span>
												</span>
											</label>
										</div>
									</section>
								</div>
							</AsyncPanel>
							<p v-if="membersError" class="form-error-text mt-3" role="alert">
								{{ membersError }}
							</p>
							<p v-else-if="membersSuccess" class="mt-3 text-sm text-emerald-200" role="status">
								{{ membersSuccess }}。請至步驟 2 同步至門禁設備。
							</p>
							<div class="mt-4 flex justify-end">
								<PermissionActionButton
									:allowed="canEditMembers && !isApplyingMembers"
									class="rounded-xl border border-white/20 bg-emerald-500/85 px-4 py-2 text-sm text-white enabled:hover:bg-emerald-500 2xl:text-base"
									aria-label="套用可進出人員"
									@click="handleApplyMembers"
								>
									{{ isApplyingMembers ? "處理中…" : "套用名單" }}
								</PermissionActionButton>
							</div>
						</div>

						<div v-else class="space-y-4 rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5">
							<div class="flex items-center gap-2">
								<div class="space-y-2">
									<h4 class="text-lg font-medium text-white 2xl:text-xl">步驟 2：設備同步</h4>
									<p class="text-sm text-white/60 2xl:text-base">
										將名單內人員的臉部、卡片、指紋等資料寫入門禁設備，並檢視各項同步狀態。
									</p>
								</div>
								<button
									type="button"
									class="ml-auto rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm 2xl:text-base text-white/90 hover:bg-white/20 disabled:opacity-50"
									:disabled="syncWarnings.length === 0"
									@click="openWarningsDialog"
								>
									查看警告
									<span v-if="syncWarnings.length > 0" class="ms-1 text-amber-200">
										({{ syncWarnings.length }})
									</span>
								</button>
								<PermissionActionButton
									:allowed="canDeviceSync && !isSyncButtonDisabled"
									class="rounded-xl border border-white/20 bg-emerald-500/85 px-4 py-2 text-sm text-white enabled:hover:bg-emerald-500 2xl:text-base"
									aria-label="同步此地點至門禁設備"
									@click="handleSync"
								>
									{{ isCurrentlySyncing ? "同步中…" : "同步設備" }}
								</PermissionActionButton>
							</div>
							<p v-if="locationName" class="truncate text-base 2xl:text-lg">
								{{ locationName }}
							</p>
							<div class="flex flex-wrap gap-2 text-xs text-white/75 2xl:text-sm">
								<span
									v-for="name in deviceLabels.entry"
									:key="`entry-${name}`"
									class="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5"
								>
									入口：{{ name }}
								</span>
								<span
									v-for="name in deviceLabels.exit"
									:key="`exit-${name}`"
									class="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-0.5"
								>
									出口：{{ name }}
								</span>
							</div>

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
													<span
														class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
														:class="lastSyncPillClass(getLastSyncLabel(row.employeeNo))"
													>
														{{ getLastSyncLabel(row.employeeNo) }}
													</span>
												</td>
												<td class="py-2 pe-2">
													<span
														class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
														:class="syncStepPillClass(row.person.status)"
													>
														{{ syncStepShortLabel(row.person) }}
													</span>
												</td>
												<td class="py-2 pe-2">
													<span
														class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
														:class="syncStepPillClass(row.face.status)"
													>
														{{ syncStepShortLabel(row.face) }}
													</span>
												</td>
												<td class="py-2 pe-2">
													<span
														class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
														:class="syncStepPillClass(row.card.status)"
													>
														{{ syncStepShortLabel(row.card) }}
													</span>
												</td>
												<td class="py-2 pe-2">
													<span
														class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
														:class="syncStepPillClass(row.fingerprint.status)"
													>
														{{ syncStepShortLabel(row.fingerprint) }}
													</span>
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

						<div
							v-if="isUiLocked"
							class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
							role="status"
						>
							<div
								class="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-sm"
							>
								<div
									class="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
									aria-hidden="true"
								/>
								<p class="text-white/85">同步中，請稍候…</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>

	<PersonnelSyncWarningsDialog
		v-model="showWarningsDialog"
		:sync-warnings="syncWarnings"
		:sync-warning-type-label="syncWarningTypeLabel"
	/>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from "vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import SearchInput from "~/components/common/SearchInput.vue"
import Pagination from "~/components/common/Pagination.vue"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import ContentSkeleton from "~/components/common/ContentSkeleton.vue"
import PersonnelSyncWarningsDialog from "~/components/personnel/dialogs/PersonnelSyncWarningsDialog.vue"
import type { useLocationAccessSync } from "~/composables/systems/personnel/useLocationAccessSync"
import {
	useLocationMembersPicker,
	LOCATION_MEMBERS_PANEL_MIN_HEIGHT,
	SYNC_TABLE_PANEL_MIN_HEIGHT,
} from "~/composables/systems/personnel/useLocationMembersPicker"
import { useWizardStepNav } from "~/composables/core/useWizardStepNav"
import { lastSyncPillClass } from "~/utils/personnelUtils"

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
const { getPillButtonClass, getStepCircleClass } = useWizardStepNav()

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
	syncStepPillClass,
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
	membersSuccess,
	isMemberKept,
	toggleMember,
	isAllMembersPageKept,
	handleToggleSelectAllMembersPage,
	handleSearchMembers,
	applyMembers,
} = useLocationMembersPicker({
	locationId: toRef(props, "locationId"),
	accessSync: toRef(props, "accessSync"),
})

const handleApplyMembers = async () => {
	if (!(await applyMembers())) return
	emit("membersUpdated")
}

const deviceLabels = computed(() =>
	props.locationId != null ? getLocationDevicesLabel(props.locationId) : { entry: [], exit: [] }
)

const isUiLocked = computed(() => isSingleLocationSyncing.value)

watch(manageStep, async (step) => {
	if (step !== 2 || !props.modelValue || props.locationId == null) return
	await ensureSyncCandidates(props.locationId)
})

const isSyncCandidatesLoading = computed(() =>
	props.locationId != null ? isSyncLocationCandidatesLoading(props.locationId) : false
)
const syncPaged = computed(() =>
	props.locationId != null
		? getPagedSyncStepRowsForLocation(props.locationId)
		: { rows: [], total: 0, offset: 0, limit: 10 }
)
const syncRows = computed(() => syncPaged.value.rows)
const isCurrentlySyncing = computed(() =>
	props.locationId != null ? isLocationCurrentlySyncing(props.locationId) : false
)
const isSyncButtonDisabled = computed(() =>
	props.locationId != null ? isLocationSyncButtonDisabled(props.locationId) : true
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
	}
)
</script>
