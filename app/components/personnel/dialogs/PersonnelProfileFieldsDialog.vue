<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="dialog.showDialog.value"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:gap-6 2xl:p-8"
				>
					<header class="flex items-center justify-between gap-3">
						<div class="flex min-w-0 items-center gap-3">
							<h3 class="min-w-0 truncate text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
								管理欄位
							</h3>
							<FormChangeIndicator
								v-if="dialog.hasUnsavedChanges.value"
								:has-changes="dialog.hasUnsavedChanges.value"
								:changed-fields="dialog.changedFieldsList.value"
							/>
						</div>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<p v-if="dialog.errorMessage.value" class="form-error-text-lg" role="alert">
						{{ dialog.errorMessage.value }}
					</p>

					<section class="flex flex-col gap-3">
						<div class="flex items-center justify-between gap-3">
							<h4 class="text-base font-semibold text-white 2xl:text-lg">人員資料欄位</h4>
							<span class="text-sm text-white/70 2xl:text-base">
								{{ dialog.enabledCount.value }} / {{ maxFields }}
							</span>
						</div>
						<p class="text-sm text-white/60 2xl:text-base">
							勾選常見欄位或新增自訂標籤；最多 5 個。值僅存平台，不下發門禁設備。
						</p>

						<div class="flex flex-col gap-2">
							<label
								v-for="preset in dialog.presetKeys"
								:key="preset"
								class="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
							>
								<input
									type="checkbox"
									class="h-4 w-4 accent-cyan-400"
									:checked="dialog.isPresetEnabled(preset)"
									:disabled="!dialog.isPresetEnabled(preset) && dialog.atFieldLimit.value"
									:aria-label="presetCatalog[preset].label"
									@change="handleTogglePreset(preset, ($event.target as HTMLInputElement).checked)"
								/>
								<span class="w-28 shrink-0 text-sm text-white/85 2xl:text-base">
									{{ presetCatalog[preset].label }}
								</span>
								<input
									v-if="dialog.isPresetEnabled(preset)"
									type="text"
									class="form-input-small flex-1"
									:maxlength="labelMax"
									:value="fieldLabel(preset)"
									:aria-label="`${presetCatalog[preset].label}標頭`"
									@input="handleUpdateLabel(preset, ($event.target as HTMLInputElement).value)"
								/>
							</label>
						</div>

						<div class="mt-2 flex flex-col gap-2">
							<div
								v-for="field in dialog.customFields.value"
								:key="field.key"
								class="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
							>
								<span class="w-28 shrink-0 text-sm text-white/85 2xl:text-base">自訂</span>
								<input
									type="text"
									class="form-input-small flex-1"
									:maxlength="labelMax"
									:value="field.label"
									:aria-label="`自訂欄位標頭 ${field.key}`"
									@input="handleUpdateLabel(field.key, ($event.target as HTMLInputElement).value)"
								/>
								<button
									type="button"
									class="rounded-lg px-2 py-1 text-sm text-red-200 hover:bg-white/10"
									aria-label="移除自訂欄位"
									@click="dialog.removeCustomField(field.key)"
								>
									移除
								</button>
							</div>
							<button
								type="button"
								class="self-start rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white enabled:hover:bg-white/20 disabled:opacity-40"
								:disabled="dialog.atFieldLimit.value"
								aria-label="新增自訂欄位"
								@click="dialog.addCustomField()"
							>
								＋ 新增自訂欄位
							</button>
						</div>
					</section>

					<section class="flex flex-col gap-3">
						<h4 class="text-base font-semibold text-white 2xl:text-lg">列表顯示欄位</h4>
						<p class="text-sm text-white/60 2xl:text-base">
							ID、姓名、操作固定顯示。其餘欄位可開關。
						</p>
						<div class="grid grid-cols-2 gap-2 md:grid-cols-3">
							<label
								v-for="locked in lockedColumns"
								:key="locked.key"
								class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/50"
							>
								<input type="checkbox" checked disabled class="h-4 w-4 accent-cyan-400" :aria-label="locked.label" />
								{{ locked.label }}
							</label>
							<label
								v-for="column in toggleableColumns"
								:key="column"
								class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
							>
								<input
									type="checkbox"
									class="h-4 w-4 accent-cyan-400"
									:checked="dialog.draft.value.listColumns[column]"
									:aria-label="toggleableLabels[column]"
									@change="dialog.setListColumn(column, ($event.target as HTMLInputElement).checked)"
								/>
								{{ toggleableLabels[column] }}
							</label>
							<label
								v-for="field in dialog.draft.value.fields"
								:key="`list-${field.key}`"
								class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
							>
								<input
									type="checkbox"
									class="h-4 w-4 accent-cyan-400"
									:checked="dialog.draft.value.listColumns.custom.includes(field.key)"
									:aria-label="field.label"
									@change="dialog.setCustomListVisible(field.key, ($event.target as HTMLInputElement).checked)"
								/>
								{{ field.label || "自訂欄位" }}
							</label>
						</div>
					</section>

					<footer class="mt-2 flex gap-3 2xl:gap-4">
						<button type="button" class="btn-secondary" @click="handleClose">取消</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="btn-primary"
							:disabled="dialog.isSaving.value"
							@click="dialog.save()"
						>
							{{ dialog.isSaving.value ? "處理中..." : "儲存" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>

	<ConfirmDialog
		v-model="dialog.showCloseConfirmDialog.value"
		:title="dialog.closeConfirmConfig.value.title"
		:message="dialog.closeConfirmConfig.value.message"
		:details="dialog.closeConfirmConfig.value.details"
		:type="dialog.closeConfirmConfig.value.type"
		@confirm="dialog.confirmClose()"
	/>
</template>

<script setup lang="ts">
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue"
import type { usePersonnelProfileFieldsDialog } from "~/composables/systems/personnel/usePersonnelProfileFieldsDialog"
import {
	PERSONNEL_LOCKED_LIST_COLUMNS,
	PERSONNEL_MAX_PROFILE_FIELDS,
	PERSONNEL_PROFILE_LABEL_MAX,
	PERSONNEL_PROFILE_PRESET_CATALOG,
	PERSONNEL_TOGGLEABLE_LIST_COLUMN_LABELS,
	PERSONNEL_TOGGLEABLE_LIST_COLUMNS,
	type PersonnelProfilePresetKey,
} from "~/utils/personnelProfileFields"

const props = defineProps<{
	dialog: ReturnType<typeof usePersonnelProfileFieldsDialog>
}>()

const maxFields = PERSONNEL_MAX_PROFILE_FIELDS
const labelMax = PERSONNEL_PROFILE_LABEL_MAX
const presetCatalog = PERSONNEL_PROFILE_PRESET_CATALOG
const lockedColumns = PERSONNEL_LOCKED_LIST_COLUMNS
const toggleableColumns = PERSONNEL_TOGGLEABLE_LIST_COLUMNS
const toggleableLabels = PERSONNEL_TOGGLEABLE_LIST_COLUMN_LABELS

const handleClose = () => {
	props.dialog.requestClose()
}

const fieldLabel = (key: string) =>
	props.dialog.draft.value.fields.find((field) => field.key === key)?.label || ""

const handleTogglePreset = (preset: PersonnelProfilePresetKey, enabled: boolean) => {
	props.dialog.togglePreset(preset, enabled)
}

const handleUpdateLabel = (key: string, label: string) => {
	props.dialog.updateFieldLabel(key, label)
}
</script>
