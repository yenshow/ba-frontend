<template>
	<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<h2 class="text-xl font-semibold text-white 2xl:text-2xl">人員列表</h2>
			<div class="flex flex-wrap items-center gap-2">
				<div class="flex items-center gap-2">
					<input
						:value="personFilter.q"
						type="text"
						class="form-input w-[220px] border-white/30 bg-white/10 py-1.5 text-sm text-white placeholder:text-white/40 2xl:w-[260px] 2xl:py-2 2xl:text-base"
						placeholder="搜尋工號 / 姓名"
						aria-label="搜尋工號或姓名"
						@input="handleFilterQInput"
						@keydown.enter="handleSearch"
					/>
					<button
						type="button"
						class="rounded-xl bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30 2xl:px-6 2xl:py-3 2xl:text-base"
						@click="handleSearch"
					>
						搜尋
					</button>
				</div>
				<button
					v-if="canEdit"
					type="button"
					class="rounded-xl bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30 2xl:px-6 2xl:py-3 2xl:text-base"
					@click="showImportDialog = true"
				>
					批次匯入
				</button>
				<button
					v-if="canEdit"
					type="button"
					class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 2xl:px-6 2xl:py-3 2xl:text-base"
					@click="openPersonCreate"
				>
					新增人員
				</button>
			</div>
		</div>

		<div class="min-h-[300px]">
			<table class="w-full text-center">
				<thead>
					<tr class="border-b border-white/20">
						<th :class="tableHeaderClass">頭像</th>
						<th :class="tableHeaderClass">
							<div class="mx-auto max-w-[200px]">
								<FilterDropdown
									v-model="localEmployeeNoSort"
									:options="employeeNoSortOptions"
									placeholder="工號（由小到大）"
									text-size="text-sm 2xl:text-base"
								/>
							</div>
						</th>
						<th :class="tableHeaderClass">姓名</th>
						<th :class="tableHeaderClass">資料（平台）</th>
						<th :class="tableHeaderClass">狀態</th>
						<th v-if="canEdit" :class="tableHeaderClass">操作</th>
					</tr>
				</thead>
				<tbody>
					<template v-if="persons.length > 0">
						<tr
							v-for="p in persons"
							:key="p.id"
							class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
						>
							<td :class="tableCellClass">
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
							<td :class="tableCellClass">{{ p.employee_no }}</td>
							<td :class="tableCellClass">{{ p.full_name || "—" }}</td>
							<td :class="tableCellClass">
								<div class="flex flex-wrap items-center justify-center gap-1.5">
									<span
										class="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold 2xl:text-sm"
										:class="dataPillClass(getPersonAccessControlDataSummary(p).hasPassword)"
										:title="
											getPersonAccessControlDataSummary(p).hasPassword
												? '有設定門禁密碼'
												: '未設定門禁密碼'
										"
									>
										密碼
									</span>
									<span
										class="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold 2xl:text-sm"
										:class="dataPillClass(getPersonAccessControlDataSummary(p).hasCard)"
										:title="getPersonAccessControlDataSummary(p).hasCard ? '有設定卡號' : '未設定卡號'"
									>
										卡片
									</span>
									<span
										class="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold 2xl:text-sm"
										:class="dataPillClass(getPersonAccessControlDataSummary(p).hasFingerprint)"
										:title="
											getPersonAccessControlDataSummary(p).hasFingerprint ? '有指紋模板' : '未設定指紋模板'
										"
									>
										指紋
									</span>
								</div>
							</td>
							<td :class="tableCellClass">
								<span
									:class="[
										getPersonStatusBadgeClass(p.status),
										'rounded px-2 py-1 2xl:px-3 2xl:py-1.5',
									]"
								>
									{{ personStatusLabels[p.status] }}
								</span>
							</td>
							<td v-if="canEdit" :class="tableCellClass">
								<div class="flex flex-wrap justify-center gap-2 2xl:gap-3">
									<button
										type="button"
										class="rounded bg-blue-500/80 px-3 py-1 text-white hover:bg-blue-400 2xl:px-4 2xl:py-2"
										@click="editPerson(p)"
									>
										編輯
									</button>
									<button
										type="button"
										class="rounded bg-red-500/80 px-3 py-1 text-white hover:bg-red-400 2xl:px-4 2xl:py-2"
										@click="confirmDeletePerson(p)"
									>
										刪除
									</button>
								</div>
							</td>
						</tr>
					</template>
					<tr v-else class="text-white/60">
						<td :colspan="canEdit ? 6 : 5" class="py-12 text-center text-base 2xl:text-lg">
							{{ isLoadingPersons ? "載入中..." : "尚無人員" }}
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

		<PersonnelPersonDialog
			v-model="showPersonDialog"
			:editing-person="editingPerson"
			:form="personForm"
			:access-control-devices="accessControlDevices"
			v-model:capture-device-id="captureDeviceId"
			:is-capturing-face="isCapturingFace"
			:capture-error-message="captureErrorMessage"
			v-model:card-device-id="cardDeviceId"
			:is-capturing-card="isCapturingCard"
			:card-error-message="cardErrorMessage"
			v-model:card-no="cardNo"
			v-model:password="personPassword"
			v-model:finger-device-id="fingerDeviceId"
			v-model:finger-print-data="fingerPrintData"
			v-model:is-long-term="isLongTerm"
			v-model:valid-begin-date="validBeginDate"
			v-model:valid-end-date="validEndDate"
			:is-capturing-finger-print="isCapturingFingerPrint"
			:finger-print-error-message="fingerPrintErrorMessage"
			:face-preview-url="personFormFacePreview"
			:is-submitting="isSubmitting"
			:error-message="errorMessage"
			@submit="submitPerson"
			@face-file-change="handleFaceFileChange"
			@clear-face="clearFaceUrl"
			@capture-face="handleCaptureFace"
			@capture-card="handleCaptureCard"
			@capture-fingerprint="handleCaptureFingerPrint"
		/>

		<PersonnelImportDialog
			v-model="showImportDialog"
			:error="importError"
			:result="importResult"
			:is-importing="isImporting"
			@submit="submitImport"
		/>
	</section>
</template>

<script setup lang="ts">
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import Pagination from "~/components/common/Pagination.vue"
import type { usePersonnelPersonsTab } from "~/composables/systems/personnel/usePersonnelPersonsTab"
import PersonnelImportDialog from "~/components/personnel/PersonnelImportDialog.vue"
import PersonnelPersonDialog from "~/components/personnel/PersonnelPersonDialog.vue"

const props = defineProps<{
	canEdit: boolean
	personStatusLabels: Record<string, string>
	tableHeaderClass: string
	tableCellClass: string
	getPersonStatusBadgeClass: (status: string) => string
	personsTab: ReturnType<typeof usePersonnelPersonsTab>
}>()

const {
	persons,
	isLoadingPersons,
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
	confirmDeletePerson,
	showImportDialog,
	importError,
	importResult,
	isImporting,
	submitImport,

	showPersonDialog,
	editingPerson,
	personForm,
	accessControlDevices,
	captureDeviceId,
	isCapturingFace,
	captureErrorMessage,
	cardDeviceId,
	isCapturingCard,
	cardErrorMessage,
	cardNo,
	personPassword,
	fingerDeviceId,
	fingerPrintData,
	isCapturingFingerPrint,
	fingerPrintErrorMessage,
	isLongTerm,
	validBeginDate,
	validEndDate,
	personFormFacePreview,
	isSubmitting,
	errorMessage,
	submitPerson,
	handleFaceFileChange,
	clearFaceUrl,
	handleCaptureFace,
	handleCaptureCard,
	handleCaptureFingerPrint,
} = props.personsTab

const handleFilterQInput = (e: Event) => {
	const value = (e.target as HTMLInputElement | null)?.value ?? ""
	personFilter.q = value
}

const localEmployeeNoSort = computed<string>({
	get: () => selectedEmployeeNoSort.value,
	set: (v) => (selectedEmployeeNoSort.value = v),
})

const handleSearch = () => props.personsTab.handleSearch()

const dataPillClass = (hasData: boolean) => {
	if (hasData) return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
	return "border-white/15 bg-white/5 text-white/60"
}
</script>
