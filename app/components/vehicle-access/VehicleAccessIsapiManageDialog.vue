<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="vehicle-isapi-manage-title"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-6xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between gap-3 pr-7 2xl:pr-8">
						<div class="min-w-0">
							<h3
								id="vehicle-isapi-manage-title"
								class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
							>
								車牌管理
							</h3>
						</div>

						<nav
							class="flex items-center justify-center gap-2 pr-7 2xl:pr-8"
							aria-label="車牌管理步驟切換"
						>
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
								<span>車牌管理</span>
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

					<div class="show-scrollbar flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div v-if="locationId == null" class="py-12 text-center text-white/60">
							無法解析地點
						</div>

						<LocationMembersStepPanel
							v-else-if="manageStep === 1"
							title="步驟 1：人員權限"
							description="勾選允許進出此地點的人員。套用後，系統會在背景依人員車牌同步至攝影機。"
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
							list-min-height-class="min-h-[min(360px,50vh)]"
							list-scroll-class="max-h-[min(360px,50vh)]"
							@update:members-query="membersQuery = $event"
							@search="handleSearchMembers"
							@toggle-select-all-page="handleToggleSelectAllMembersPage"
							@toggle-member="toggleMember"
							apply-label="套用名單並同步車牌"
							@apply="handleApplyMembers"
						/>

						<div v-else class="space-y-4 rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="space-y-2">
									<h4 class="text-lg font-medium text-white 2xl:text-xl">步驟 2：車牌管理</h4>
									<p class="text-sm text-white/60 2xl:text-base">
										顯示名單內車牌與同步狀態。編輯儲存或「重新同步」會推送至攝影機；失敗請查看錯誤。
									</p>
								</div>
								<div class="flex shrink-0 flex-wrap items-center gap-2">
									<PermissionActionButton
										:allowed="canEditMembers && !isLoadingPlates && !isResyncingPlates"
										class="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90 enabled:hover:bg-white/20 2xl:text-base"
										aria-label="重新同步車牌至攝影機"
										@click="handleResyncPlates"
									>
										{{ isResyncingPlates ? "同步中…" : "重新同步" }}
									</PermissionActionButton>
									<button
										type="button"
										class="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90 hover:bg-white/20 disabled:opacity-50 2xl:text-base"
										:disabled="plateSyncWarnings.length === 0"
										@click="showPlateSyncWarningsDialog = true"
									>
										查看錯誤
										<span v-if="plateSyncWarnings.length > 0" class="ms-1 text-amber-200">
											({{ plateSyncWarnings.length }})
										</span>
									</button>
									<PermissionActionButton
										v-if="canCreatePlate"
										:allowed="!isSavingPlate && !isLoadingPlates"
										class="rounded-xl border border-white/20 bg-cyan-600/80 px-4 py-2 text-sm text-white enabled:hover:bg-cyan-500 2xl:text-base"
										aria-label="新增車牌"
										@click="handleOpenPlateForm()"
									>
										新增車牌
									</PermissionActionButton>
								</div>
							</div>

							<AsyncPanel
								:loading="isLoadingPlates"
								:empty="!isLoadingPlates && locationPlates.length === 0"
								empty-title="尚無車牌資料"
								empty-description="請先於步驟 1 套用名單，或為名單內人員新增車牌。"
								min-height-class="min-h-[240px]"
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
												v-for="row in locationPlates"
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
													<span :class="getPlateSyncPill(row.isapi_sync_status).className">
														{{ getPlateSyncPill(row.isapi_sync_status).label }}
													</span>
												</td>
												<td class="px-3 py-2 text-end">
													<div class="flex justify-end gap-2">
														<button
															v-if="canUpdatePlate"
															type="button"
															class="text-cyan-300 hover:text-cyan-200"
															:aria-label="`編輯車牌 ${row.plate_number}`"
															@click="handleOpenPlateForm(row)"
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
								</div>
							</AsyncPanel>
							<p v-if="platesError" class="form-error-text" role="alert">{{ platesError }}</p>
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>

	<PersonnelSyncWarningsDialog
		v-model="showPlateSyncWarningsDialog"
		:sync-warnings="plateSyncWarnings"
		:sync-warning-type-label="plateSyncWarningTypeLabel"
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
		@cancel="handleCancelPlateForm"
	/>
</template>

<script setup lang="ts">
import type { VehicleAccessLocation } from "~/types/vehicleAccess"
import type { LocationLicensePlateRow } from "~/types/personnel"
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useToast } from "~/composables/core/useToast"
import { resolveUserFacingCatchMessage } from "~/utils/errorUtils"
import {
	SYNC_WARNING_LABELS,
	formatPersonLabel,
	locationPlateRowsToSyncWarnings,
	parseLocationNumericId,
} from "~/utils/personnelUtils"
import PersonnelSyncWarningsDialog from "~/components/personnel/dialogs/PersonnelSyncWarningsDialog.vue"
import {
	createDefaultIsapiPlateForm,
	formatLicensePlateDisplayTime,
	getPlateSyncPill,
	isapiPlateFormFromLocationRow,
	licensePlateItemsToPayload,
	licensePlateListTypeShortLabel,
	mapPersonLicensePlatesToForm,
	validateLicensePlateFormItems,
	type IsapiPlateFormModel,
} from "~/utils/licensePlateFormUtils"
import VehicleAccessIsapiPlateFormDialog from "~/components/vehicle-access/VehicleAccessIsapiPlateFormDialog.vue"
import LocationMembersStepPanel from "~/components/personnel/location-access/LocationMembersStepPanel.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import ContentSkeleton from "~/components/common/ContentSkeleton.vue"
import type { LocationMembersSync } from "~/composables/systems/personnel/useLocationMembersOnly"
import { useLocationMembersPicker } from "~/composables/systems/personnel/useLocationMembersPicker"
import { useWizardStepNav } from "~/composables/core/useWizardStepNav"
const props = defineProps<{
	modelValue: boolean
	location: VehicleAccessLocation | null
	canCreatePlate?: boolean
	canUpdatePlate?: boolean
	canDeletePlate?: boolean
	canEditMembers: boolean
	membersSync?: LocationMembersSync
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	membersUpdated: []
}>()

const manageStep = ref<1 | 2>(1)
const { getPillButtonClass, getStepCircleClass } = useWizardStepNav()

const locationId = computed(() =>
	parseLocationNumericId(props.location?.id ?? props.location?.locationId)
)

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
	locationId,
	membersSync: toRef(props, "membersSync"),
})

const ensureStep2Data = async () => {
	await Promise.all([loadPersonBindOptions(), loadLocationPlates()])
}

const handleApplyMembers = async () => {
	if (!(await applyMembers())) return
	emit("membersUpdated")
	manageStep.value = 2
	await ensureStep2Data()
}

const personnelApi = usePersonnelApi()
const toast = useToast()
const { handleError } = useErrorHandler()

const locationPlates = ref<LocationLicensePlateRow[]>([])
const isLoadingPlates = ref(false)
const isResyncingPlates = ref(false)
const platesError = ref("")
const showPlateSyncWarningsDialog = ref(false)
const plateSyncWarningTypeLabel = (type: string) => SYNC_WARNING_LABELS[type] ?? type

const plateSyncWarnings = computed(() =>
	locationPlateRowsToSyncWarnings(
		locationPlates.value,
		props.location?.name ?? null,
	),
)

const showPlateForm = ref(false)
const plateFormMode = ref<"add" | "modify">("add")
const isSavingPlate = ref(false)
const plateForm = ref<IsapiPlateFormModel>(createDefaultIsapiPlateForm())
const plateFormError = ref("")
const editingPlateRow = ref<LocationLicensePlateRow | null>(null)

const personBindOptions = ref<Array<{ value: string; label: string }>>([])
const isLoadingPersonOptions = ref(false)

const loadPersonBindOptions = async () => {
	const id = locationId.value
	if (id == null) {
		personBindOptions.value = []
		return
	}
	isLoadingPersonOptions.value = true
	try {
		const res = await personnelApi.getLocationMembers(id, { limit: 500, offset: 0 })
		personBindOptions.value = (res.items ?? []).map((p) => ({
			value: String(p.id),
			label: formatPersonLabel(p.employee_no, p.full_name) || `人員 #${p.id}`,
		}))
	} catch {
		personBindOptions.value = []
	} finally {
		isLoadingPersonOptions.value = false
	}
}

const pushPersonPlatesToDevices = async (
	personId: number,
	plates: ReturnType<typeof licensePlateItemsToPayload>,
) => {
	await personnelApi.replacePersonLicensePlates(personId, plates, { syncToDevices: true })
	await loadLocationPlates()
}

const handleResyncPlates = async () => {
	const id = locationId.value
	if (id == null) return
	isResyncingPlates.value = true
	try {
		await personnelApi.syncLocationLicensePlates(id)
		toast.success("已重新同步車牌至攝影機")
		await loadLocationPlates()
	} catch (e) {
		handleError(e, "重新同步失敗", { context: "sync" })
	} finally {
		isResyncingPlates.value = false
	}
}

const loadLocationPlates = async () => {
	const id = locationId.value
	if (id == null) {
		locationPlates.value = []
		return
	}
	isLoadingPlates.value = true
	platesError.value = ""
	try {
		const res = await personnelApi.getLocationLicensePlates(id)
		locationPlates.value = res.items ?? []
	} catch (e) {
		locationPlates.value = []
		platesError.value = resolveUserFacingCatchMessage(e, "載入車牌列表失敗")
	} finally {
		isLoadingPlates.value = false
	}
}

const handleOpenPlateForm = (row?: LocationLicensePlateRow) => {
	plateFormError.value = ""
	editingPlateRow.value = row ?? null
	if (row) {
		plateFormMode.value = "modify"
		plateForm.value = isapiPlateFormFromLocationRow(row)
	} else {
		plateFormMode.value = "add"
		plateForm.value = createDefaultIsapiPlateForm()
	}
	showPlateForm.value = true
}

const handleCancelPlateForm = () => {
	plateFormError.value = ""
	showPlateForm.value = false
	editingPlateRow.value = null
}

const resolvePersonIdFromForm = (): number | null => {
	const raw = plateForm.value.bindPersonId?.trim()
	if (!raw) return editingPlateRow.value?.person_id ?? null
	const n = Number.parseInt(raw, 10)
	return Number.isFinite(n) ? n : null
}

const handleSavePlate = async () => {
	plateFormError.value = ""
	const personId = resolvePersonIdFromForm()
	if (personId == null) {
		plateFormError.value = "請選擇綁定人員"
		return
	}

	const plateItem = {
		plateNumber: plateForm.value.licensePlate.trim(),
		listType: plateForm.value.listType,
		effectiveBegin: plateForm.value.createTimeLocal,
		effectiveEnd: plateForm.value.effectiveTimeLocal,
	}
	const formError = validateLicensePlateFormItems([plateItem])
	if (formError) {
		plateFormError.value = formError
		return
	}

	isSavingPlate.value = true
	try {
		const person = await personnelApi.getPersonById(personId)
		let items = mapPersonLicensePlatesToForm(person)

		if (plateFormMode.value === "modify" && editingPlateRow.value) {
			const norm = editingPlateRow.value.plate_normalized
			items = items.filter(
				(i) => i.plateNumber.trim().toUpperCase() !== norm && i.plateNumber.trim(),
			)
			items.push(plateItem)
		} else {
			items = [...items.filter((i) => i.plateNumber.trim()), plateItem]
		}

		await pushPersonPlatesToDevices(personId, licensePlateItemsToPayload(items))
		toast.success("已儲存車牌")
		handleCancelPlateForm()
	} catch (e) {
		plateFormError.value = resolveUserFacingCatchMessage(e, "儲存車牌失敗")
	} finally {
		isSavingPlate.value = false
	}
}

const handleDeletePlate = async (row: LocationLicensePlateRow) => {
	if (!window.confirm(`確定刪除車牌 ${row.plate_number}？`)) return
	try {
		const person = await personnelApi.getPersonById(row.person_id)
		const items = mapPersonLicensePlatesToForm(person).filter(
			(i) => i.plateNumber.trim().toUpperCase() !== row.plate_normalized,
		)
		await pushPersonPlatesToDevices(row.person_id, licensePlateItemsToPayload(items))
		toast.success("已刪除車牌")
	} catch (e) {
		handleError(e, "刪除車牌失敗", { context: "delete" })
	}
}

const handleClose = () => {
	handleCancelPlateForm()
	emit("update:modelValue", false)
}

watch(manageStep, async (step) => {
	if (step !== 2 || !props.modelValue) return
	await ensureStep2Data()
})

watch(
	() => props.modelValue,
	async (open) => {
		if (!open) return
		manageStep.value = 1
		const id = locationId.value
		if (id != null && props.membersSync) {
			await props.membersSync.prepareLocationDialog(id)
		}
	},
)
</script>
