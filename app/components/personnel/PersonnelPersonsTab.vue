<template>
	<section class="section-card flex h-full min-h-0 flex-col">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-2">
				<h2 class="text-xl font-semibold text-theme-primary 2xl:text-2xl">人員列表</h2>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<SearchInput
					v-model="personFilter.q"
					input-id="personnel-persons-search"
					label="搜尋 ID 或姓名"
					placeholder="搜尋 ID / 姓名"
					aria-label="搜尋 ID 或姓名"
					@search="handleSearch"
				/>
				<PermissionActionButton
					:allowed="canCreatePerson"
					aria-label="批次匯入"
					class="rounded-xl bg-white/20 px-4 py-2 text-sm text-white enabled:hover:bg-white/30 2xl:px-6 2xl:py-3 2xl:text-base"
					@click="openImportDialog"
				>
					批次匯入
				</PermissionActionButton>
				<PermissionActionButton
					:allowed="canCreatePerson"
					aria-label="新增人員"
					class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white enabled:hover:bg-emerald-400 2xl:px-6 2xl:py-3 2xl:text-base"
					@click="openPersonCreate"
				>
					新增人員
				</PermissionActionButton>
			</div>
		</div>

		<AsyncPanel
			class="min-h-0 flex-1"
			panel-size="compact"
			:loading="isLoadingPersons"
			:empty="!isLoadingPersons && persons.length === 0"
			:error="personsLoadError"
			empty-title="尚無人員"
		>
			<div class="table-scroll">
				<table class="w-full min-w-[720px] text-center">
					<thead>
						<tr class="border-b border-white/20">
							<th class="table-th">頭像</th>
							<th class="table-th">
								<div class="mx-auto max-w-[160px] 2xl:max-w-[200px]">
									<FilterDropdown
										v-model="localEmployeeNoSort"
										:options="employeeNoSortOptions"
										placeholder="ID（由小到大）"
										text-size="text-sm 2xl:text-base"
									/>
								</div>
							</th>
							<th class="table-th">姓名</th>
							<th class="table-th">群組</th>
							<th class="table-th">資料（平台）</th>
							<th class="table-th">狀態</th>
							<th class="table-th">操作</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="p in persons"
							:key="p.id"
							class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
						>
							<td class="table-td">
								<div class="flex justify-center">
									<img
										v-if="getFaceImageSrc(p.face_url)"
										:src="getFaceImageSrc(p.face_url)!"
										:alt="p.full_name || p.employee_no"
										class="h-10 w-10 rounded-full object-cover 2xl:h-12 2xl:w-12"
										@error="handleImageError"
									/>
									<div
										v-else
										class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg text-white/60 2xl:h-12 2xl:w-12"
										aria-hidden="true"
									>
										{{ (p.full_name || p.employee_no).charAt(0) || "?" }}
									</div>
								</div>
							</td>
							<td class="table-td">{{ p.employee_no }}</td>
							<td class="table-td">{{ p.full_name || "—" }}</td>
							<td class="table-td">{{ p.group_name?.trim() || "未分組" }}</td>
							<td class="table-td">
								<PersonnelAccessDataIndicators
									:summary="getPersonAccessControlDataSummary(p)"
									:on-icon-click="(tab) => handlePlatformIconClick(p, tab)"
								/>
							</td>
							<td class="table-td">
								<span
									:class="[
										getPersonStatusBadgeClass(p.status),
										'rounded px-2 py-1 2xl:px-3 2xl:py-1.5 whitespace-nowrap',
									]"
								>
									{{ personStatusLabels[p.status] }}
								</span>
							</td>
							<td class="table-td">
								<div class="flex justify-center gap-2 2xl:gap-3 whitespace-nowrap">
									<button
										v-if="personHasAnyAccessCard(p)"
										type="button"
										class="rounded bg-violet-500/80 px-3 py-1 text-white hover:bg-violet-400 2xl:px-4 2xl:py-2"
										aria-label="檢視卡號二維碼"
										@click="openCardQrDialog(p)"
									>
										QR 碼
									</button>
									<PermissionActionButton
										:allowed="canUpdatePerson"
										aria-label="編輯人員"
										class="rounded bg-blue-500/80 px-3 py-1 text-white enabled:hover:bg-blue-400 2xl:px-4 2xl:py-2"
										@click="editPerson(p)"
									>
										編輯
									</PermissionActionButton>
									<PermissionActionButton
										:allowed="canDeletePerson"
										aria-label="刪除人員"
										class="rounded bg-red-500/80 px-3 py-1 text-white enabled:hover:bg-red-400 2xl:px-4 2xl:py-2"
										@click="confirmDeletePerson(p)"
									>
										刪除
									</PermissionActionButton>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<Pagination
				:total="personsTotal"
				:offset="personsOffset"
				:limit="PAGE_SIZE"
				:disabled="isLoadingPersons"
				:show="personsTotal > PAGE_SIZE"
				@previous="goPrevPage"
				@next="goNextPage"
			/>
		</AsyncPanel>

		<PersonnelPersonDialog
			v-model="showPersonDialog"
			v-model:active-section="personDialogSection"
			:group-tree="groupTree"
			:state="personDialogState"
			@submit="props.personsTab.submitPerson"
			@face-file-change="props.personsTab.handleFaceFileChange"
			@clear-face="props.personsTab.clearFaceUrl"
			@capture-face="props.personsTab.handleCaptureFace"
			@capture-card="(idx) => props.personsTab.handleCaptureCard(idx)"
			@generate-virtual-card="(idx) => props.personsTab.handleGenerateVirtualCard(idx)"
			@capture-fingerprint="(idx) => props.personsTab.handleCaptureFingerPrint(idx)"
		/>

		<ImageCropDialog
			v-model="showFaceCropDialog"
			:file="faceCropSourceFile"
			v-bind="faceCropDialogProps"
			@confirm="applyCroppedFace"
		/>

		<PersonnelImportDialog
			v-model="showImportDialog"
			:error="importError"
			:result="importResult"
			:is-importing="isImporting"
			@submit="submitImport"
		/>

		<ConfirmDialog
			v-model="showConfirmDialog"
			:title="confirmDialogConfig.title"
			:message="confirmDialogConfig.message"
			:details="confirmDialogConfig.details"
			:type="confirmDialogConfig.type"
			@confirm="handleConfirmDelete"
		/>

		<ConfirmDialog
			v-model="showPersonCloseConfirmDialog"
			:title="personCloseConfirmConfig.title"
			:message="personCloseConfirmConfig.message"
			:details="personCloseConfirmConfig.details"
			:type="personCloseConfirmConfig.type"
			@confirm="confirmPersonDialogDismiss"
		/>

		<PersonnelCardQrDialog
			v-if="cardQrTarget"
			v-model="showCardQrDialog"
			:employee-no="cardQrTarget.employee_no"
			:full-name="cardQrTarget.full_name"
			:cards="cardQrTarget.cards"
		/>
	</section>
</template>

<script setup lang="ts">
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import Pagination from "~/components/common/Pagination.vue"
import SearchInput from "~/components/common/SearchInput.vue"
import type { usePersonnelPersonsTab } from "~/composables/systems/personnel/usePersonnelPersonsTab"
import PersonnelImportDialog from "~/components/personnel/dialogs/PersonnelImportDialog.vue"
import ImageCropDialog from "~/components/common/ImageCropDialog.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import PersonnelPersonDialog from "~/components/personnel/dialogs/PersonnelPersonDialog.vue"
import PersonnelCardQrDialog from "~/components/personnel/dialogs/PersonnelCardQrDialog.vue"
import type { PersonnelPersonDialogState, Person } from "~/types/personnel"
import PersonnelAccessDataIndicators, {
	type PersonnelAccessDataTabKey,
} from "~/components/personnel/PersonnelAccessDataIndicators.vue"
import type { PersonCardFormItem } from "~/utils/cardFormUtils"
import { resolveAccessControlCardsFromPerson, personHasAnyAccessCard } from "~/utils/cardFormUtils"
import { usePersonnelGroupTree } from "~/composables/systems/personnel/usePersonnelGroupTree"

const props = defineProps<{
	canCreatePerson: boolean
	canUpdatePerson: boolean
	canDeletePerson: boolean
	personStatusLabels: Record<string, string>
	getPersonStatusBadgeClass: (status: string) => string
	personsTab: ReturnType<typeof usePersonnelPersonsTab>
}>()

const { groupTree } = usePersonnelGroupTree()

const {
	persons,
	isLoadingPersons,
	personsLoadError,
	personFilter,
	selectedEmployeeNoSort,
	employeeNoSortOptions,
	PAGE_SIZE,
	personsTotal,
	personsOffset,
	getFaceImageSrc,
	handleImageError,
	getPersonAccessControlDataSummary,
	goPrevPage,
	goNextPage,
	openPersonCreate,
	editPerson,
	showPersonDialog,
	personDialogSection,
	showImportDialog,
	importError,
	importResult,
	isImporting,
	submitImport,

	showFaceCropDialog,
	faceCropSourceFile,
	faceCropDialogProps,
	applyCroppedFace,
	showPersonCloseConfirmDialog,
	personCloseConfirmConfig,
	confirmPersonDialogDismiss,
} = props.personsTab

const openImportDialog = () => {
	showImportDialog.value = true
}

const confirmDialog = useConfirmDialog()
const showConfirmDialog = confirmDialog.showDialog
const confirmDialogConfig = confirmDialog.config
const pendingDeletePersonId = ref<number | null>(null)

// 以 composable 的 refs 為 SSOT，收斂成單一 state
const personDialogState: PersonnelPersonDialogState = {
	editingPerson: props.personsTab.editingPerson,
	form: props.personsTab.personForm,
	accessControl: {
		accessControlDevices: props.personsTab.accessControlDevices,
		password: props.personsTab.personPassword,
		isLongTerm: props.personsTab.isLongTerm,
		validBeginDate: props.personsTab.validBeginDate,
		validEndDate: props.personsTab.validEndDate,
		cardItems: props.personsTab.cardItems,
		fingerPrintItems: props.personsTab.fingerPrintItems,
	},
	ladderCard: {
		elevatorLocationOptions: props.personsTab.elevatorLocationOptions,
		locationItems: props.personsTab.ladderLocationItems,
		toggleFloor: props.personsTab.toggleLadderFloor,
		isFloorChecked: props.personsTab.isLadderFloorChecked,
		addLocationRow: props.personsTab.addLadderLocationRow,
		removeLocationRow: props.personsTab.removeLadderLocationRow,
	},
	capture: {
		captureDeviceId: props.personsTab.captureDeviceId,
		isCapturingFace: props.personsTab.isCapturingFace,
		captureErrorMessage: props.personsTab.captureErrorMessage,

		cardDeviceId: props.personsTab.cardDeviceId,
		isCapturingCard: props.personsTab.isCapturingCard,
		cardErrorMessage: props.personsTab.cardErrorMessage,
		isGeneratingVirtualCard: props.personsTab.isGeneratingVirtualCard,

		fingerDeviceId: props.personsTab.fingerDeviceId,
		isCapturingFingerPrint: props.personsTab.isCapturingFingerPrint,
		fingerPrintErrorMessage: props.personsTab.fingerPrintErrorMessage,
	},
	ui: {
		facePreviewUrl: props.personsTab.personFormFacePreview,
		isSubmitting: props.personsTab.isSubmitting,
		errorMessage: props.personsTab.errorMessage,
		hasUnsavedChanges: props.personsTab.hasUnsavedPersonChanges,
		changedFieldsList: props.personsTab.personChangedFieldsList,
		requestClose: props.personsTab.requestClosePersonDialog,
	},
}

const localEmployeeNoSort = computed<string>({
	get: () => selectedEmployeeNoSort.value,
	set: (v) => (selectedEmployeeNoSort.value = v),
})

const handleSearch = () => props.personsTab.handleSearch()

const cardQrTarget = ref<{
	employee_no: string
	full_name?: string | null
	cards: PersonCardFormItem[]
} | null>(null)

const showCardQrDialog = computed({
	get: () => cardQrTarget.value !== null,
	set: (open: boolean) => {
		if (!open) cardQrTarget.value = null
	},
})

const openCardQrDialog = (p: Person) => {
	const cards = resolveAccessControlCardsFromPerson(p)
	if (!cards.length) return
	cardQrTarget.value = {
		employee_no: p.employee_no,
		full_name: p.full_name,
		cards,
	}
}

const handlePlatformIconClick = (person: Person, tab: PersonnelAccessDataTabKey) => {
	if (!props.canUpdatePerson) return
	void editPerson(person, tab)
}

const confirmDeletePerson = (p: { id: number; employee_no: string; full_name?: string | null }) => {
	pendingDeletePersonId.value = p.id
	confirmDialog.show({
		title: "確認刪除",
		message: `確定要刪除人員「${p.employee_no} ${p.full_name || ""}」嗎？`,
		details: "此操作無法復原。",
		type: "danger",
	})
}

const handleConfirmDelete = async () => {
	const id = pendingDeletePersonId.value
	if (id == null) return
	const p = persons.value.find((x) => x.id === id)
	if (!p) return
	await props.personsTab.deletePerson(p)
	pendingDeletePersonId.value = null
}
</script>
