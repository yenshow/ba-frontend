<template>
	<div>
		<AsyncPanel
			:loading="isLoading"
			:error="loadError"
			:empty="rules.length === 0"
			empty-title="尚未新增任何規則"
			empty-description="點擊右上角「新增規則」開始建立。"
			error-title="載入記錄轉存規則失敗"
			loading-min-height-class="min-h-[180px]"
			empty-min-height-class="min-h-[180px]"
		>
			<div class="space-y-3 min-h-[172px]">
				<div
					v-for="r in rules"
					:key="r.id"
					class="flex flex-wrap items-center gap-3 rounded-xl border border-white/15 bg-black/20 p-4"
				>
					<p class="text-base font-semibold text-white/90">{{ r.name }}</p>
					<span
						class="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-sm text-white/70"
					>
						{{ eventTypeLabel(r.eventType || "access_control") }}
					</span>
					<span
						class="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-sm text-white/70"
					>
						{{ r.outputFormat.toUpperCase() }} / {{ r.storageType.toUpperCase() }}
					</span>
					<span class="text-sm text-white/50"> 資料區間 {{ ruleSchedulePreview(r).window }} </span>

					<div class="ml-auto flex flex-wrap items-center gap-2">
						<button
							type="button"
							class="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm text-white/85 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
							:disabled="formDisabled"
							aria-label="編輯規則"
							@click="() => handleEdit(r)"
						>
							編輯
						</button>
						<button
							type="button"
							class="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
							:disabled="formDisabled || isDeletingId === r.id"
							aria-label="刪除規則"
							@click="() => confirmDeleteRule(r)"
						>
							{{ isDeletingId === r.id ? "刪除中…" : "刪除" }}
						</button>
					</div>
				</div>
			</div>
		</AsyncPanel>

		<Teleport to="body">
			<Transition name="dialog-fade">
				<div
					v-if="dialog.open"
					class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] p-4 backdrop-blur-[10px]"
				>
					<div
						class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-4xl flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:gap-6 2xl:p-8"
					>
						<header class="flex items-center justify-between gap-3">
							<h3
								class="min-w-0 truncate text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
							>
								{{ dialog.mode === "create" ? "新增規則" : "編輯規則" }}
							</h3>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉"
								@click="handleCloseDialog"
							>
								&times;
							</button>
						</header>

						<form class="grid grid-cols-2 gap-4 2xl:gap-6" @submit.prevent>
							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>事件類型<span class="required-mark">*</span></span>
								<div
									:class="{
										'pointer-events-none opacity-50': dialogBusy || dialog.mode === 'edit',
									}"
								>
									<FilterDropdown
										v-model="dialog.form.eventType"
										:options="eventTypeOptions"
										text-size="text-sm 2xl:text-base"
										@update:model-value="handleEventTypeChanged"
									/>
								</div>
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>排程頻率<span class="required-mark">*</span></span>
								<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
									<FilterDropdown
										v-model="dialog.form.scheduleFreq"
										:options="scheduleFreqOptions"
										text-size="text-sm 2xl:text-base"
										@update:model-value="handleScheduleFreqChanged"
									/>
								</div>
							</label>

							<label v-if="showWeekday" class="flex flex-col gap-2 text-base text-white/80">
								<span>星期<span class="required-mark">*</span></span>
								<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
									<FilterDropdown
										v-model="dialog.form.scheduleDay"
										:options="WEEKDAY_OPTIONS"
										text-size="text-sm 2xl:text-base"
									/>
								</div>
							</label>

							<label v-if="showMonthDay" class="flex flex-col gap-2 text-base text-white/80">
								<span>日期<span class="required-mark">*</span></span>
								<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
									<FilterDropdown
										v-model="dialog.form.scheduleDay"
										:options="MONTH_DAY_OPTIONS"
										text-size="text-sm 2xl:text-base"
									/>
								</div>
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>匯出時間<span class="required-mark">*</span></span>
								<div
									class="flex min-w-0 items-center gap-2"
									:class="{ 'pointer-events-none opacity-50': dialogBusy }"
								>
									<FilterDropdown
										v-model="exportTimeHour"
										:options="DAILY_TIME_HOUR_OPTIONS"
										text-size="text-sm 2xl:text-base"
									/>
									<span class="shrink-0 text-white/70" aria-hidden="true">:</span>
									<FilterDropdown
										v-model="exportTimeMinute"
										:options="DAILY_TIME_MINUTE_OPTIONS"
										text-size="text-sm 2xl:text-base"
									/>
								</div>
							</label>

							<p class="col-span-2 text-sm text-white/60 2xl:text-base">
								資料區間：{{ dialogSchedulePreview.window }}
							</p>

							<label class="col-span-2 flex flex-col gap-2 text-base text-white/80">
								<span>規則名稱<span class="required-mark">*</span></span>
								<input
									v-model="dialog.form.name"
									type="text"
									required
									class="form-input-small"
									:disabled="dialogBusy"
								/>
							</label>

							<div class="col-span-2 flex flex-col gap-2 text-base text-white/80">
								<span>檔名<span class="required-mark">*</span></span>
								<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
									<input
										v-model="dialog.form.filenamePrefix"
										type="text"
										class="form-input-small"
										:disabled="dialogBusy"
										placeholder="AcsRecord_Record"
										required
									/>
									<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
										<FilterDropdown
											v-model="dialog.form.dateFormat"
											:options="DATE_FORMAT_OPTIONS"
											text-size="text-sm 2xl:text-base"
										/>
									</div>
									<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
										<FilterDropdown
											v-model="dialog.form.timeFormat"
											:options="TIME_FORMAT_OPTIONS"
											text-size="text-sm 2xl:text-base"
										/>
									</div>
								</div>
							</div>

							<div class="col-span-2 flex flex-col gap-3 text-sm text-white/80 2xl:text-base">
								<div
									class="grid grid-cols-1 gap-3 sm:grid-cols-2"
									:class="{ 'lg:grid-cols-3': dialog.form.outputFormat === 'txt' }"
								>
									<label class="flex flex-col gap-2">
										<span>檔案格式</span>
										<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
											<FilterDropdown
												v-model="dialog.form.outputFormat"
												:options="OUTPUT_FORMAT_OPTIONS"
												text-size="text-sm 2xl:text-base"
												@update:model-value="handleOutputFormatChanged"
											/>
										</div>
									</label>

									<label class="flex flex-col gap-2">
										<span>儲存方式</span>
										<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
											<FilterDropdown
												v-model="dialog.form.storageType"
												:options="STORAGE_TYPE_OPTIONS"
												text-size="text-sm 2xl:text-base"
											/>
										</div>
									</label>

									<label
										v-if="dialog.form.outputFormat === 'txt'"
										class="flex flex-col gap-2"
									>
										<span>欄位分隔符</span>
										<input
											v-model="columnDelimiterInput"
											type="text"
											maxlength="4"
											class="form-input-small font-mono"
											:disabled="dialogBusy"
											placeholder="例如 \t 或 :"
											aria-label="欄位分隔符"
										/>
									</label>
								</div>

								<template v-if="dialog.form.storageType === 'local'">
									<label class="flex flex-col gap-2">
										<span>本機資料夾路徑<span class="required-mark">*</span></span>
										<input
											v-model="dialog.form.localDir"
											type="text"
											class="form-input-small"
											:disabled="dialogBusy"
											placeholder="例如：D:\YSOS\exports"
											required
										/>
									</label>
								</template>

								<template v-else>
									<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
										<label class="flex flex-col gap-2">
											<span>主機位址<span class="required-mark">*</span></span>
											<input
												v-model="dialog.form.sftp.host"
												type="text"
												class="form-input-small"
												:disabled="dialogBusy"
												placeholder="例如：192.168.1.100 或 sftp.example.com"
												required
											/>
										</label>
										<label class="flex flex-col gap-2">
											<span>連接埠<span class="required-mark">*</span></span>
											<input
												v-model="dialog.form.sftp.port"
												type="text"
												inputmode="numeric"
												class="form-input-small"
												:disabled="dialogBusy"
												placeholder="22（預設）"
												required
											/>
										</label>
										<label class="flex flex-col gap-2">
											<span>使用者名稱<span class="required-mark">*</span></span>
											<input
												v-model="dialog.form.sftp.username"
												type="text"
												class="form-input-small"
												:disabled="dialogBusy"
												placeholder="SFTP 登入帳號"
												required
											/>
										</label>
										<label class="flex flex-col gap-2">
											<span>密碼<span class="required-mark">*</span></span>
											<input
												v-model="dialog.form.sftp.password"
												type="text"
												autocomplete="off"
												class="form-input-small"
												:disabled="dialogBusy"
												:placeholder="dialog.mode === 'edit' ? '留空表示不變更' : 'SFTP 登入密碼'"
												aria-label="SFTP 密碼"
												:required="dialog.mode === 'create'"
											/>
										</label>
									</div>

									<label class="flex flex-col gap-2">
										<span>遠端資料夾路徑<span class="required-mark">*</span></span>
										<input
											v-model="dialog.form.sftp.remoteDir"
											type="text"
											class="form-input-small"
											:disabled="dialogBusy"
											placeholder="例如：/exports 或 /home/user/backup"
											required
										/>
									</label>
								</template>
							</div>

							<div
								v-if="filterKind === 'person_groups'"
								class="col-span-2 flex flex-col gap-2 text-sm text-white/80 2xl:text-base"
							>
								<p>
									{{
										filterLabel(
											"groupIds",
											groupFilterRequired ? "人員群組" : "人員群組（選填，空白=全部）"
										)
									}}<span v-if="groupFilterRequired" class="required-mark">*</span>
								</p>
								<PersonnelGroupPicker
									v-model="dialog.form.groupIds"
									:groups="groupTree"
									:loading="groupTreeLoading"
									:disabled="dialogBusy"
								/>
							</div>

							<label
								v-if="filterKind === 'devices'"
								class="col-span-2 flex flex-col gap-2 text-base text-white/80"
							>
								<span>{{ filterLabel("deviceIds", "設備 ID（選填，逗號分隔；空白=全部）") }}</span>
								<input
									v-model="dialog.form.deviceIdsText"
									type="text"
									class="form-input-small"
									:disabled="dialogBusy"
									placeholder="例如：1,2,3"
									aria-label="設備 ID 篩選"
								/>
							</label>

							<label
								v-if="filterKind === 'locations'"
								class="col-span-2 flex flex-col gap-2 text-base text-white/80"
							>
								<span>{{
									filterLabel("locationIds", "地點 ID（選填，逗號分隔；空白=全部）")
								}}</span>
								<input
									v-model="dialog.form.locationIdsText"
									type="text"
									class="form-input-small"
									:disabled="dialogBusy"
									placeholder="例如：1,2,3"
									aria-label="地點 ID 篩選"
								/>
							</label>

							<label
								v-if="exportMode"
								class="col-span-2 flex flex-col gap-2 text-base text-white/80"
							>
								<span>{{ filterLabel("grain", "匯出粒度") }}</span>
								<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
									<FilterDropdown
										v-model="dialog.form.grain"
										:options="exportMode.options"
										text-size="text-sm 2xl:text-base"
									/>
								</div>
							</label>

							<template v-if="filterKind === 'operational'">
								<label class="flex flex-col gap-2 text-base text-white/80">
									<span>{{ filterLabel("eventKinds", "事件種類（選填）") }}</span>
									<input
										v-model="dialog.form.eventKindsText"
										type="text"
										class="form-input-small"
										:disabled="dialogBusy"
										placeholder="例如：elevator,access"
										aria-label="營運事件種類篩選"
									/>
								</label>
								<label class="flex flex-col gap-2 text-base text-white/80">
									<span>{{ filterLabel("sources", "來源（選填）") }}</span>
									<input
										v-model="dialog.form.sourcesText"
										type="text"
										class="form-input-small"
										:disabled="dialogBusy"
										placeholder="例如：isapi,system"
										aria-label="營運事件來源篩選"
									/>
								</label>
							</template>

							<template v-if="filterKind === 'alerts'">
								<label class="flex flex-col gap-2 text-base text-white/80">
									<span>{{ filterLabel("sources", "來源（選填）") }}</span>
									<input
										v-model="dialog.form.sourcesText"
										type="text"
										class="form-input-small"
										:disabled="dialogBusy"
										placeholder="例如：environment,elevator"
										aria-label="警報來源篩選"
									/>
								</label>
								<label class="flex flex-col gap-2 text-base text-white/80">
									<span>{{ filterLabel("statuses", "狀態（選填）") }}</span>
									<input
										v-model="dialog.form.statusesText"
										type="text"
										class="form-input-small"
										:disabled="dialogBusy"
										placeholder="例如：active,resolved"
										aria-label="警報狀態篩選"
									/>
								</label>
							</template>

							<div class="col-span-2 flex flex-col gap-2">
								<p class="text-sm font-medium text-white/85 2xl:text-base">輸出欄位</p>
								<p class="text-xs text-white/50 2xl:text-sm">
									勾選要輸出的欄位；「空白欄」無資料、值為空，請把第三方欄位名改成預留欄名稱。拖曳左側握把可調整輸出順序。
								</p>
								<div class="w-full overflow-hidden rounded-xl border border-white/10">
									<div
										class="export-mapping-grid export-mapping-grid-header border-b border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/55"
										aria-hidden="true"
									>
										<span>順序</span>
										<span>選</span>
										<span>平台欄位</span>
										<span>輸出表頭</span>
										<span>格式</span>
									</div>

									<div
										v-for="field in orderedFields"
										:key="field.key"
										class="export-mapping-grid border-b border-white/10 px-3 py-2.5 last:border-b-0"
										:class="{
											'opacity-55': !dialog.form.fieldConfigs[field.key]?.enabled,
											'export-mapping-row--dragging': draggingFieldKey === field.key,
											'export-mapping-row--drag-over': dragOverFieldKey === field.key,
										}"
										@dragover="(e) => handleFieldDragOver(e, field.key)"
										@dragleave="handleFieldDragLeave(field.key)"
										@drop="(e) => handleFieldDrop(e, field.key)"
									>
										<button
											type="button"
											class="export-field-drag-handle"
											:class="{ 'export-field-drag-handle--disabled': dialogBusy }"
											:draggable="!dialogBusy"
											:aria-label="`${field.label} 拖曳調整順序`"
											@dragstart="(e) => handleFieldDragStart(e, field.key)"
											@dragend="handleFieldDragEnd"
										>
											<span aria-hidden="true">⋮⋮</span>
										</button>
										<input
											type="checkbox"
											class="h-4 w-4 accent-teal-400"
											:checked="dialog.form.fieldConfigs[field.key]?.enabled"
											:disabled="dialogBusy || field.required"
											:aria-label="`輸出 ${field.label}`"
											@change="
												handleToggleField(field, ($event.target as HTMLInputElement).checked)
											"
										/>
										<span class="text-sm text-white/85">
											{{ field.label }}<span v-if="field.required" class="required-mark">*</span>
											<span
												v-if="field.constantEmpty"
												class="ml-1 rounded border border-white/20 px-1 py-0.5 text-[10px] text-white/45"
											>
												空白
											</span>
										</span>
										<input
											v-model="dialog.form.fieldConfigs[field.key].headerLabel"
											type="text"
											class="form-input-small w-full"
											:disabled="dialogBusy || !dialog.form.fieldConfigs[field.key]?.enabled"
											:placeholder="field.label"
											:aria-label="`${field.label} 輸出表頭`"
										/>
										<div
											v-if="field.requiresFormat"
											class="export-mapping-format"
											:class="{
												'pointer-events-none opacity-50':
													dialogBusy || !dialog.form.fieldConfigs[field.key]?.enabled,
											}"
										>
											<FilterDropdown
												v-model="dialog.form.fieldConfigs[field.key].format"
												:options="getFormatOptionsForField(field)"
												text-size="text-sm 2xl:text-base"
											/>
										</div>
										<span v-else class="text-sm text-white/25" aria-hidden="true">—</span>
									</div>
								</div>
							</div>

							<footer class="col-span-2 mt-2 flex gap-3 2xl:gap-4">
								<button type="button" class="btn-secondary" @click="handleCloseDialog">取消</button>
								<div class="flex-1"></div>
								<button
									type="button"
									class="btn-primary"
									:disabled="dialogBusy"
									@click="requestSaveDialog"
								>
									{{ isSaving ? "儲存中…" : "儲存" }}
								</button>
							</footer>
						</form>
					</div>
				</div>
			</Transition>
		</Teleport>

		<ConfirmDialog
			v-model="showConfirmDialog"
			:title="confirmDialogConfig.title"
			:message="confirmDialogConfig.message"
			:details="confirmDialogConfig.details"
			:type="confirmDialogConfig.type"
			:confirm-text="confirmDialogConfig.confirmText"
			:cancel-text="confirmDialogConfig.cancelText"
			@confirm="handleConfirmDialog"
		/>
	</div>
</template>

<script setup lang="ts">
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import PersonnelGroupPicker from "~/components/common/PersonnelGroupPicker.vue"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { useRecordExportRulesForm } from "~/composables/core/useRecordExportRulesForm"
import {
	DAILY_TIME_HOUR_OPTIONS,
	DAILY_TIME_MINUTE_OPTIONS,
	DATE_FORMAT_OPTIONS,
	getFormatOptionsForField,
	MONTH_DAY_OPTIONS,
	OUTPUT_FORMAT_OPTIONS,
	STORAGE_TYPE_OPTIONS,
	TIME_FORMAT_OPTIONS,
	WEEKDAY_OPTIONS,
} from "~/utils/externalIntegration"

type RuleListItem = {
	id: number
	name: string
	eventType?: string
}

const confirmDialog = useConfirmDialog()
const showConfirmDialog = confirmDialog.showDialog
const confirmDialogConfig = confirmDialog.config
const confirmAction = ref<"delete" | "save">("delete")
const pendingDeleteRuleId = ref<number | null>(null)

const {
	rules,
	orderedFields,
	isLoading,
	isSaving,
	loadError,
	isDeletingId,
	dialog,
	dialogBusy,
	formDisabled,
	actionLabel,
	groupTree,
	groupTreeLoading,
	eventTypeOptions,
	exportTimeHour,
	exportTimeMinute,
	filterKind,
	filterLabel,
	groupFilterRequired,
	exportMode,
	scheduleFreqOptions,
	showWeekday,
	showMonthDay,
	ruleSchedulePreview,
	dialogSchedulePreview,
	handleScheduleFreqChanged,
	eventTypeLabel,
	handleToggleField,
	draggingFieldKey,
	dragOverFieldKey,
	handleFieldDragStart,
	handleFieldDragEnd,
	handleFieldDragOver,
	handleFieldDragLeave,
	handleFieldDrop,
	handleOutputFormatChanged,
	columnDelimiterInput,
	handleCreate,
	handleEdit,
	handleEventTypeChanged,
	handleCloseDialog,
	openSaveConfirmDialog,
	handleSaveDialog,
	handleDelete,
} = useRecordExportRulesForm()

const requestSaveDialog = () => {
	confirmAction.value = "save"
	openSaveConfirmDialog(confirmDialog.show)
}

const confirmDeleteRule = (rule: RuleListItem) => {
	confirmAction.value = "delete"
	pendingDeleteRuleId.value = rule.id
	confirmDialog.show({
		title: "確認刪除",
		message: `確定要刪除規則「${rule.name}」嗎？`,
		details: "此操作無法復原。",
		type: "danger",
		confirmText: "刪除",
	})
}

const handleConfirmDialog = async () => {
	if (confirmAction.value === "save") {
		await handleSaveDialog()
		return
	}
	const id = pendingDeleteRuleId.value
	if (id == null) return
	pendingDeleteRuleId.value = null
	await handleDelete(id)
}

defineExpose({
	openDialog: handleCreate,
	actionLabel,
	actionDisabled: formDisabled,
})
</script>
