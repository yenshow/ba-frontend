<template>
	<div>
		<AsyncPanel
			:loading="isLoading"
			:error="loadError"
			:empty="rules.length === 0"
			empty-title="尚未新增任何規則"
			empty-description="點擊右上角「新增規則」開始建立。"
			error-title="載入記錄轉存規則失敗"
			panel-size="compact"
			loading-min-height-class="min-h-[240px] 2xl:min-h-[280px]"
			empty-min-height-class="min-h-[240px] 2xl:min-h-[280px]"
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
						{{ r.outputFormat.toUpperCase() }} / {{ r.storageType.toUpperCase() }}
					</span>
					<span class="text-sm text-white/60">每日 {{ r.exportTime }}</span>

					<div class="flex flex-wrap items-center gap-2 ml-auto">
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
							@click="() => handleDelete(r.id)"
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

						<form class="grid grid-cols-2 gap-4 2xl:gap-6" @submit.prevent="handleSaveDialog">
							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>規則名稱<span class="required-mark">*</span></span>
								<input
									v-model="dialog.form.name"
									type="text"
									required
									class="form-input-small"
									:disabled="dialogBusy"
								/>
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>匯出時間<span class="required-mark">*</span></span>
								<input
									v-model="dialog.form.exportTime"
									type="text"
									placeholder="00:00"
									class="form-input-small"
									:disabled="dialogBusy"
									required
								/>
							</label>

							<label class="col-span-2 flex flex-col gap-2 text-base text-white/80">
								<span>描述</span>
								<input
									v-model="dialog.form.description"
									type="text"
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
											:options="dateFormatOptions"
											text-size="text-sm 2xl:text-base"
										/>
									</div>
									<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
										<FilterDropdown
											v-model="dialog.form.timeFormat"
											:options="timeFormatOptions"
											text-size="text-sm 2xl:text-base"
										/>
									</div>
								</div>
							</div>

							<div class="col-span-2 flex flex-col gap-3 text-sm text-white/80 2xl:text-base">
								<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
									<label class="flex flex-col gap-2">
										<span>檔案格式</span>
										<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
											<FilterDropdown
												v-model="dialog.form.outputFormat"
												:options="outputFormatOptions"
												text-size="text-sm 2xl:text-base"
											/>
										</div>
									</label>

									<label class="flex flex-col gap-2">
										<span>儲存方式</span>
										<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
											<FilterDropdown
												v-model="dialog.form.storageType"
												:options="storageTypeOptions"
												text-size="text-sm 2xl:text-base"
											/>
										</div>
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

							<div class="col-span-2 flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
								<p>人員群組<span class="required-mark">*</span></p>
								<PersonnelGroupPicker
									v-model="dialog.form.groupIds"
									:groups="groupTree"
									:loading="groupTreeLoading"
									:disabled="dialogBusy"
								/>
							</div>

							<div class="col-span-2 flex flex-col gap-2">
								<p class="text-sm font-medium text-white/85 2xl:text-base">輸出欄位</p>
								<div class="overflow-hidden rounded-xl border border-white/10">
									<div
										class="mapping-grid mapping-grid-header border-b border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/55"
										aria-hidden="true"
									>
										<span>平台欄位</span>
										<span>輸出表頭</span>
										<span>格式</span>
									</div>

									<div
										v-for="field in fields"
										:key="field.key"
										class="mapping-grid border-b border-white/10 px-3 py-2.5 last:border-b-0"
									>
										<span class="text-sm text-white/85">{{ field.label }}</span>
										<input
											v-model="dialog.form.fieldConfigs[field.key].headerLabel"
											type="text"
											class="form-input-small min-w-0 w-full"
											:disabled="dialogBusy"
											:placeholder="field.label"
											:aria-label="`${field.label} 輸出表頭`"
										/>
										<input
											v-if="field.requiresFormat"
											v-model="dialog.form.fieldConfigs[field.key].format"
											type="text"
											class="form-input-small min-w-0 w-full"
											:disabled="dialogBusy"
											:placeholder="getExportFieldFormatPlaceholder(field.key)"
											:aria-label="`${field.label} 格式`"
										/>
										<span v-else class="text-sm text-white/25" aria-hidden="true">—</span>
									</div>
								</div>
							</div>

							<footer class="col-span-2 mt-2 flex gap-3 2xl:gap-4">
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
	</div>
</template>

<script setup lang="ts">
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import PersonnelGroupPicker from "~/components/common/PersonnelGroupPicker.vue"
import { useRecordExportRulesForm } from "~/composables/core/useRecordExportRulesForm"
import { getExportFieldFormatPlaceholder } from "~/utils/externalIntegration"

const {
	rules,
	fields,
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
	dateFormatOptions,
	timeFormatOptions,
	outputFormatOptions,
	storageTypeOptions,
	handleCreate,
	handleEdit,
	handleCloseDialog,
	handleSaveDialog,
	handleDelete,
} = useRecordExportRulesForm()

defineExpose({
	openDialog: handleCreate,
	actionLabel,
	actionDisabled: formDisabled,
})
</script>

<style scoped>
.required-mark {
	margin-left: 0.125rem;
	color: rgb(253 230 138 / 0.9);
}

.mapping-grid {
	display: grid;
	grid-template-columns: minmax(6.5rem, 1.15fr) 1.35fr 1fr;
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
