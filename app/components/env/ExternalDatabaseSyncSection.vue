<template>
	<div>
		<AsyncPanel
			:loading="isLoading"
			:error="loadError"
			:empty="configs.length === 0"
			empty-title="尚未設定資料庫對接"
			empty-description="點擊右上角「新增設定」選擇事件類型並建立連線。"
			error-title="載入資料庫對接設定失敗"
			loading-min-height-class="min-h-[180px]"
			empty-min-height-class="min-h-[180px]"
		>
			<div class="min-h-[172px] space-y-3">
				<div
					v-for="cfg in configs"
					:key="cfg.id"
					class="flex flex-wrap items-center gap-3 rounded-xl border border-white/15 bg-black/20 p-4"
				>
					<p class="text-base font-semibold text-white/90">
						{{ eventTypeLabel(cfg.eventType) }}
					</p>
					<span
						class="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-sm text-white/70"
					>
						{{ getDbTypeLabel(cfg.dbType) }}
					</span>
					<span class="text-sm text-white/60">每日 {{ cfg.pushTime }}</span>
					<span class="text-sm text-white/50">{{ cfg.host }}:{{ cfg.port }}</span>

					<div class="ml-auto flex flex-wrap items-center gap-2">
						<button
							type="button"
							class="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm text-white/85 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
							:disabled="formDisabled"
							aria-label="編輯對接設定"
							@click="() => handleEdit(cfg)"
						>
							編輯
						</button>
						<button
							type="button"
							class="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
							:disabled="formDisabled || isDeletingEventType === cfg.eventType"
							aria-label="刪除對接設定"
							@click="() => confirmDeleteConfig(cfg)"
						>
							{{ isDeletingEventType === cfg.eventType ? "刪除中…" : "刪除" }}
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
						class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:gap-6 2xl:p-8"
					>
						<header class="flex items-center justify-between gap-3">
							<h3 class="min-w-0 truncate text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
								{{ dialog.mode === "create" ? "新增資料庫對接" : "編輯資料庫對接" }}
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

						<form class="grid grid-cols-2 gap-4 2xl:gap-6" @submit.prevent="handleSave">
							<label v-if="dialog.mode === 'create'" class="flex flex-col gap-2 text-base text-white/80">
								<span>事件類型<span class="required-mark">*</span></span>
								<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
									<FilterDropdown
										v-model="dialog.form.eventType"
										:options="createEventTypeOptions"
										text-size="text-sm 2xl:text-base"
										@update:model-value="handleDialogEventTypeChanged"
									/>
								</div>
								<p class="text-xs text-white/50 2xl:text-sm">
									每種事件類型僅能設定一組對接；已設定的類型不會出現在清單中。
								</p>
							</label>

							<div v-else class="flex flex-col gap-2 text-base text-white/80">
								<span>事件類型</span>
								<p class="form-input-small text-white/90">
									{{ eventTypeLabel(dialog.form.eventType) }}
								</p>
							</div>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>固定推播時間<span class="required-mark">*</span></span>
								<div
									class="flex min-w-0 items-center gap-2"
									:class="{ 'pointer-events-none opacity-50': dialogBusy }"
								>
									<FilterDropdown
										v-model="pushTimeHour"
										:options="pushTimeHourOptions"
										text-size="text-sm 2xl:text-base"
									/>
									<span class="shrink-0 text-white/70" aria-hidden="true">:</span>
									<FilterDropdown
										v-model="pushTimeMinute"
										:options="pushTimeMinuteOptions"
										text-size="text-sm 2xl:text-base"
									/>
								</div>
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>資料庫類型<span class="required-mark">*</span></span>
								<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
									<FilterDropdown
										v-model="dialog.form.dbType"
										:options="dbTypeOptions"
										text-size="text-sm 2xl:text-base"
										@update:model-value="handleDbTypeChanged"
									/>
								</div>
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>資料庫名稱<span class="required-mark">*</span></span>
								<input
									v-model="dialog.form.database"
									type="text"
									class="form-input-small"
									:disabled="dialogBusy"
									aria-label="資料庫名稱"
									required
								/>
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>伺服器 IP/網域<span class="required-mark">*</span></span>
								<input
									v-model="dialog.form.host"
									type="text"
									class="form-input-small"
									:disabled="dialogBusy"
									aria-label="伺服器 IP/網域"
									required
								/>
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>Port<span class="required-mark">*</span></span>
								<input
									v-model="dialog.form.port"
									type="text"
									inputmode="numeric"
									class="form-input-small"
									:disabled="dialogBusy"
									aria-label="Port"
									required
								/>
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>使用者名稱<span class="required-mark">*</span></span>
								<input
									v-model="dialog.form.username"
									type="text"
									class="form-input-small"
									:disabled="dialogBusy"
									aria-label="使用者名稱"
									required
								/>
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span> 密碼<span v-if="dialog.mode === 'create'" class="required-mark">*</span> </span>
								<input
									v-model="dialog.form.password"
									type="password"
									autocomplete="off"
									class="form-input-small"
									:disabled="dialogBusy"
									:placeholder="dialog.mode === 'edit' ? '留空表示不變更' : '第三方資料庫密碼'"
									:required="dialog.mode === 'create'"
									aria-label="密碼"
								/>
							</label>

							<div class="col-span-2">
								<button
									type="button"
									class="btn-secondary whitespace-nowrap"
									:disabled="dialogBusy || isTesting"
									aria-label="測試連線"
									@click="handleTestConnection"
								>
									{{ isTesting ? "測試中…" : "測試連線" }}
								</button>
							</div>

							<label v-if="exportMode" class="col-span-2 flex flex-col gap-2 text-base text-white/80">
								<span>匯出粒度</span>
								<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
									<FilterDropdown
										v-model="dialog.form.grain"
										:options="exportMode.options"
										text-size="text-sm 2xl:text-base"
									/>
								</div>
							</label>

							<div class="col-span-2 flex flex-col gap-2">
								<p class="text-sm font-medium text-white/85 2xl:text-base">欄位映射</p>
								<p class="text-xs text-white/50 2xl:text-sm">
									勾選要輸出的欄位；「空白欄」無資料、值為空，請把第三方欄位名改成預留欄名稱。
								</p>
								<div class="overflow-hidden rounded-xl border border-white/10">
									<div
										class="mapping-grid mapping-grid-header border-b border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/55"
										aria-hidden="true"
									>
										<span>選</span>
										<span>平台欄位</span>
										<span>第三方欄位名</span>
										<span>格式</span>
									</div>

									<div class="mapping-grid border-b border-white/10 px-3 py-2.5">
										<span class="text-sm text-white/25" aria-hidden="true">—</span>
										<span class="text-sm text-white/85">
											目標資料表<span class="required-mark">*</span>
										</span>
										<input
											v-model="dialog.form.targetTable"
											type="text"
											class="form-input-small w-full min-w-0"
											:disabled="dialogBusy"
											placeholder="例：access_log"
											aria-label="第三方資料庫表格名稱"
											required
										/>
										<span class="text-sm text-white/25" aria-hidden="true">—</span>
									</div>

									<div
										v-for="field in fields"
										:key="field.key"
										class="mapping-grid border-b border-white/10 px-3 py-2.5 last:border-b-0"
										:class="{ 'opacity-55': !dialog.form.mappings[field.key]?.enabled }"
									>
										<input
											type="checkbox"
											class="h-4 w-4 accent-teal-400"
											:checked="dialog.form.mappings[field.key]?.enabled"
											:disabled="dialogBusy || field.required"
											:aria-label="`輸出 ${field.label}`"
											@change="handleToggleField(field, ($event.target as HTMLInputElement).checked)"
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
											v-model="dialog.form.mappings[field.key].targetColumn"
											type="text"
											class="form-input-small w-full min-w-0"
											:disabled="dialogBusy || !dialog.form.mappings[field.key]?.enabled"
											:aria-label="`${field.label} 第三方欄位名`"
											:required="Boolean(field.required || dialog.form.mappings[field.key]?.enabled)"
										/>
										<div
											v-if="field.requiresFormat"
											:class="{
												'pointer-events-none opacity-50':
													dialogBusy || !dialog.form.mappings[field.key]?.enabled
											}"
										>
											<FilterDropdown
												v-model="dialog.form.mappings[field.key].format"
												:options="getFormatOptionsForField(field)"
												text-size="text-sm 2xl:text-base"
											/>
										</div>
										<span v-else class="text-sm text-white/25" aria-hidden="true">—</span>
									</div>
								</div>
							</div>

							<footer class="col-span-2 mt-2 flex items-center gap-3 2xl:gap-4">
								<button type="button" class="btn-secondary" @click="handleCloseDialog">取消</button>
								<div class="flex-1"></div>
								<button type="submit" class="btn-primary" :disabled="dialogBusy">
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
			@confirm="handleConfirmDelete"
		/>
	</div>
</template>

<script setup lang="ts">
import AsyncPanel from "~/components/common/AsyncPanel.vue";
import ConfirmDialog from "~/components/common/ConfirmDialog.vue";
import FilterDropdown from "~/components/common/FilterDropdown.vue";
import { useConfirmDialog } from "~/composables/core/useConfirmDialog";
import {
	DB_SYNC_DB_TYPE_OPTIONS,
	useExternalDatabaseSyncForm,
	type SyncConfig
} from "~/composables/core/useExternalDatabaseSyncForm";
import { DAILY_TIME_HOUR_OPTIONS, DAILY_TIME_MINUTE_OPTIONS } from "~/utils/externalIntegration";

const dbTypeOptions = DB_SYNC_DB_TYPE_OPTIONS;
const pushTimeHourOptions = DAILY_TIME_HOUR_OPTIONS;
const pushTimeMinuteOptions = DAILY_TIME_MINUTE_OPTIONS;

const confirmDialog = useConfirmDialog();
const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value;
	}
});
const confirmDialogConfig = computed(() => confirmDialog.config.value);
const pendingDeleteEventType = ref<string | null>(null);

const {
	configs,
	fields,
	dialog,
	isLoading,
	isSaving,
	isTesting,
	isDeletingEventType,
	loadError,
	formDisabled,
	dialogBusy,
	actionLabel,
	canCreateMore,
	createEventTypeOptions,
	pushTimeHour,
	pushTimeMinute,
	eventTypeLabel,
	getDbTypeLabel,
	exportMode,
	getFormatOptionsForField,
	handleToggleField,
	handleDbTypeChanged,
	handleDialogEventTypeChanged,
	handleCreate,
	handleEdit,
	handleCloseDialog,
	handleTestConnection,
	handleSave,
	handleDelete
} = useExternalDatabaseSyncForm();

const confirmDeleteConfig = (cfg: SyncConfig) => {
	pendingDeleteEventType.value = cfg.eventType;
	confirmDialog.show({
		title: "確認刪除",
		message: `確定要刪除「${eventTypeLabel(cfg.eventType)}」的資料庫對接設定嗎？`,
		details: "此操作無法復原。",
		type: "danger"
	});
};

const handleConfirmDelete = async () => {
	const eventType = pendingDeleteEventType.value;
	if (!eventType) return;
	pendingDeleteEventType.value = null;
	await handleDelete(eventType);
};

const actionDisabled = computed(() => formDisabled.value || !canCreateMore.value);

defineExpose({
	openDialog: handleCreate,
	actionLabel,
	actionDisabled
});
</script>

<style scoped>
.mapping-grid {
	display: grid;
	grid-template-columns: 2rem minmax(6.5rem, 1.15fr) 1.35fr 1fr;
	align-items: center;
	column-gap: 0.75rem;
}

@media (max-width: 639px) {
	.mapping-grid {
		grid-template-columns: 1fr;
		row-gap: 0.5rem;
	}

	.mapping-grid-header {
		display: none;
	}
}
</style>
