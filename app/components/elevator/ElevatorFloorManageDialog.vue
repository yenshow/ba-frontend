<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="elevator-floor-manage-title"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-6xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
					:aria-busy="isUiLocked || undefined"
				>
					<header class="flex items-center justify-between gap-3 pr-7 2xl:pr-8">
						<div class="min-w-0">
							<h3
								id="elevator-floor-manage-title"
								class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
							>
								樓層管理
							</h3>
						</div>

						<nav class="flex items-center gap-2 pr-7 2xl:pr-8" aria-label="樓層管理步驟切換">
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
								<span>樓層權限</span>
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
									<h4 class="text-lg font-medium text-white 2xl:text-xl">步驟 1：樓層權限</h4>
									<p class="text-sm text-white/60 2xl:text-base">
										展開各樓層，勾選允許使用該層的人員。套用後請至步驟 2 同步至梯控與門禁設備。
									</p>
									<p
										v-if="defaultsApplied"
										class="text-xs text-amber-200/90 2xl:text-sm"
										role="status"
									>
										目前顯示人員主檔梯控卡預設樓層；套用後才會寫入此地點授權。
									</p>
								</div>
								<div class="flex min-w-0 shrink-0 items-center gap-2 lg:max-w-sm">
									<SearchInput
										v-model="candidatesQuery"
										input-id="elevator-floor-members-search"
										label="搜尋人員"
										placeholder="搜尋 ID / 姓名"
										aria-label="搜尋人員"
										wrapper-class="min-w-0 flex-1"
										input-wrapper-class="min-w-0 flex-1"
										input-class="!w-full min-w-0"
										:disabled="isApplying"
										:clearable="!isApplying"
										@search="handleSearchCandidates"
										@clear="handleSearchCandidates"
									/>
								</div>
							</div>

							<AsyncPanel
								class="mt-4"
								:loading="isLoading"
								:empty="!isLoading && floors.length === 0"
								empty-title="此地點尚未設定樓層，請先於地點管理設定"
								:min-height-class="FLOOR_PANEL_MIN_HEIGHT"
							>
								<template #loading>
									<p class="sr-only">載入樓層授權</p>
									<ContentSkeleton variant="member-list" />
								</template>

								<div class="space-y-3">
									<section
										v-for="floor in floors"
										:key="floor.index"
										class="overflow-hidden rounded-lg border border-white/20 bg-white/10 transition-all"
										:class="{ 'bg-white/15': isFloorExpanded(floor.index) }"
									>
										<div
											class="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-white/10"
											role="button"
											tabindex="0"
											:aria-expanded="isFloorExpanded(floor.index)"
											:aria-controls="`elevator-floor-panel-${floor.index}`"
											:aria-label="`${floor.name} 人員授權`"
											@click="handleToggleFloor(floor.index)"
											@keydown.enter="handleToggleFloor(floor.index)"
											@keydown.space.prevent="handleToggleFloor(floor.index)"
										>
											<div class="flex min-w-0 flex-1 items-center gap-4">
												<svg
													class="h-5 w-5 shrink-0 text-white/70 transition-transform"
													:class="{ 'rotate-90': isFloorExpanded(floor.index) }"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													aria-hidden="true"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M9 5l7 7-7 7"
													/>
												</svg>
												<div
													class="flex h-16 min-w-[80px] max-w-[12rem] items-center justify-center rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-3 shadow-lg"
												>
													<h4
														class="truncate text-xl font-bold tracking-wider text-white 2xl:text-2xl"
													>
														{{ floor.name }}
													</h4>
												</div>
												<span
													class="inline-block min-w-[4.5rem] rounded-full bg-white/25 px-3 py-1 text-center text-sm font-medium text-white 2xl:text-base"
												>
													{{ selectedCountForFloor(floor.index) }} 人
												</span>
											</div>
										</div>

										<Transition name="expand">
											<div
												v-if="isFloorExpanded(floor.index)"
												:id="`elevator-floor-panel-${floor.index}`"
												class="space-y-3 border-t border-white/10 p-4"
											>
												<div
													v-if="candidateGroups.length === 0"
													class="py-6 text-center text-sm text-white/50"
												>
													尚無可選人員
												</div>
												<div
													v-else
													class="show-scrollbar max-h-[min(280px,40vh)] space-y-4 overflow-y-auto pe-1"
												>
													<div
														v-for="group in candidateGroups"
														:key="`${floor.index}-${group.groupId}`"
													>
														<h5 class="mb-2 text-xs font-medium text-white/55 2xl:text-sm">
															{{ group.groupName }}
															<span class="text-white/40">
																（{{ group.members.length }}）
															</span>
														</h5>
														<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
															<label
																v-for="person in group.members"
																:key="`${floor.index}-${person.id}`"
																class="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
															>
																<input
																	type="checkbox"
																	class="h-4 w-4 shrink-0 accent-cyan-400"
																	:checked="isPersonChecked(floor.index, person.id)"
																	:disabled="!canEditFloors || isApplying"
																	@change="
																		togglePersonOnFloor(
																			floor.index,
																			person.id,
																			($event.target as HTMLInputElement).checked,
																		)
																	"
																/>
																<span
																	class="flex min-w-0 flex-1 items-center gap-2 truncate text-sm text-white/90 2xl:text-base"
																>
																	<span class="min-w-0 truncate">
																		<span class="font-mono">{{
																			person.employee_no
																		}}</span>
																		<span class="ms-2">{{
																			person.full_name || "—"
																		}}</span>
																	</span>
																	<span
																		v-if="!personHasAccessCard(person)"
																		class="shrink-0 rounded border border-amber-400/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-100 2xl:text-xs"
																		title="請於人員主檔「卡片設定」填寫卡號"
																	>
																		未設定卡號
																	</span>
																</span>
															</label>
														</div>
													</div>
												</div>
											</div>
										</Transition>
									</section>
								</div>
							</AsyncPanel>

							<p v-if="errorText" class="form-error-text mt-3" role="alert">
								{{ errorText }}
							</p>

							<div class="mt-4 flex justify-end">
								<PermissionActionButton
									:allowed="canEditFloors && !isApplying"
									class="rounded-xl border border-white/20 bg-emerald-500/85 px-4 py-2 text-sm text-white enabled:hover:bg-emerald-500 2xl:text-base"
									aria-label="套用樓層權限"
									@click="handleApplyFloorAccess"
								>
									{{ isApplying ? "處理中…" : "套用樓層權限" }}
								</PermissionActionButton>
							</div>
						</div>

						<div v-else class="space-y-4 rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5">
							<div class="flex flex-wrap items-center gap-2">
								<div class="space-y-2">
									<h4 class="text-lg font-medium text-white 2xl:text-xl">步驟 2：設備同步</h4>
									<p class="text-sm text-white/60 2xl:text-base">
										將人員梯控卡與樓層授權寫入梯控設備；若地點已設定門禁設備，亦會同步人員主檔至門禁。
									</p>
								</div>
								<button
									type="button"
									class="ml-auto rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90 hover:bg-white/20 disabled:opacity-50 2xl:text-base"
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
									aria-label="同步至設備"
									@click="handleSync"
								>
									{{ isCurrentlySyncing ? "同步中…" : "同步至設備" }}
								</PermissionActionButton>
							</div>

							<p v-if="locationName" class="truncate text-base 2xl:text-lg">
								{{ locationName }}
							</p>

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
												<td class="py-2 pe-2 font-mono text-xs">
													{{ (row.authorized_floors || []).join(", ") || "—" }}
												</td>
												<td class="py-2 pe-2">
													<span
														class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
														:class="lastSyncPillClass(getLastSyncLabel(row))"
													>
														{{ getLastSyncLabel(row) }}
													</span>
												</td>
												<td class="py-2 pe-2">
													<span
														class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
														:class="cardStepPillClass(row)"
													>
														{{ cardStepLabel(row) }}
													</span>
												</td>
												<template v-if="showAccessSyncColumns">
													<td class="py-2 pe-2">
														<span
															class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
															:class="
																accessStepPillClass(row.last_sync?.access?.user_info)
															"
														>
															{{ accessStepShortLabel(row.last_sync?.access?.user_info) }}
														</span>
													</td>
													<td class="py-2 pe-2">
														<span
															class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
															:class="accessStepPillClass(row.last_sync?.access?.face)"
														>
															{{ accessStepShortLabel(row.last_sync?.access?.face) }}
														</span>
													</td>
													<td class="py-2 pe-2">
														<span
															class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
															:class="accessStepPillClass(row.last_sync?.access?.card)"
														>
															{{ accessStepShortLabel(row.last_sync?.access?.card) }}
														</span>
													</td>
													<td class="py-2 pe-2">
														<span
															class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
															:class="
																accessStepPillClass(row.last_sync?.access?.fingerprint)
															"
														>
															{{
																accessStepShortLabel(row.last_sync?.access?.fingerprint)
															}}
														</span>
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
import type { ElevatorFloorSync } from "~/composables/systems/elevator/useElevatorFloorSync"
import { useElevatorFloorAccess } from "~/composables/systems/elevator/useElevatorFloorAccess"
import { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useToast } from "~/composables/core/useToast"
import { useWizardStepNav } from "~/composables/core/useWizardStepNav"
import { personHasAccessCard } from "~/utils/personnelUtils"
import { SYNC_TABLE_PANEL_MIN_HEIGHT } from "~/composables/systems/personnel/useLocationMembersPicker"

const FLOOR_PANEL_MIN_HEIGHT = "min-h-[min(360px,50vh)]"

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
const { getPillButtonClass, getStepCircleClass } = useWizardStepNav()
const elevatorApi = useElevatorApi()
const personnelApi = usePersonnelApi()
const toast = useToast()

const {
	syncWarnings,
	showWarningsDialog,
	openWarningsDialog,
	syncWarningTypeLabel,
	ensureSyncCandidates,
	isSyncCandidatesLoading: isSyncLocationCandidatesLoading,
	getPagedSyncCandidates,
	syncOneLocation,
	isPollingSyncJob,
	isLocationSyncJobRunning,
	isLocationSyncButtonDisabled,
	getLastSyncLabel,
	lastSyncPillClass,
	cardStepPillClass,
	cardStepLabel,
	hasAccessDevicesForLocation,
	accessStepShortLabel,
	accessStepPillClass,
	goPrevSyncPage,
	goNextSyncPage,
} = props.floorSync

const {
	floors,
	defaultsApplied,
	candidatesQuery,
	candidateGroups,
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
	if (!(await applyFloorAccess())) return
	emit("floorsUpdated")
}

const isUiLocked = computed(() => isPollingSyncJob.value)

const syncPaged = computed(() =>
	props.locationId != null
		? getPagedSyncCandidates(props.locationId)
		: { rows: [], total: 0, offset: 0, limit: 10 },
)
const syncRows = computed(() => syncPaged.value.rows)
const isSyncCandidatesLoading = computed(() =>
	props.locationId != null ? isSyncLocationCandidatesLoading(props.locationId) : false,
)
const showAccessSyncColumns = computed(() =>
	props.locationId != null ? hasAccessDevicesForLocation(props.locationId) : false,
)
const handleToggleFloor = (floorIndex: number) => {
	toggleFloorExpanded(floorIndex)
}
const isCurrentlySyncing = computed(() =>
	props.locationId != null ? isLocationSyncJobRunning(props.locationId) : false,
)
const isSyncButtonDisabled = computed(() =>
	props.locationId != null ? isLocationSyncButtonDisabled(props.locationId) : true,
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
	await ensureSyncCandidates(props.locationId)
})

watch(
	() => props.modelValue,
	(open) => {
		if (!open) return
		manageStep.value = 1
		if (props.locationId == null) return
		void loadFloorAccess()
	},
)
</script>
