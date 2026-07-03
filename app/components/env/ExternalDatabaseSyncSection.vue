<template>
	<div>
		<AsyncPanel
			:loading="isLoading"
			:error="loadError"
			:empty="!savedConfig"
			empty-title="尚未設定資料庫對接"
			empty-description="點擊右上角「新增設定」開始建立。"
			error-title="載入資料庫對接設定失敗"
			loading-min-height-class="min-h-[180px]"
			empty-min-height-class="min-h-[180px]"
		>
			<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:gap-6">
				<div
					v-for="item in summaryItems"
					:key="item.label"
					class="flex min-w-0 flex-col gap-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
				>
					<dt class="text-xs font-medium text-white/60 2xl:text-sm">{{ item.label }}</dt>
					<dd class="truncate text-sm text-white/90 2xl:text-base">{{ item.value }}</dd>
				</div>
			</dl>
		</AsyncPanel>

		<Teleport to="body">
			<Transition name="dialog-fade">
				<div
					v-if="dialogOpen"
					class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] p-4 backdrop-blur-[10px]"
				>
					<div
						class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:gap-6 2xl:p-8"
					>
						<header class="flex items-center justify-between gap-3">
							<h3
								class="min-w-0 truncate text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
							>
								{{ savedConfig ? "編輯資料庫對接" : "新增資料庫對接" }}
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
							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>固定推播時間<span class="required-mark">*</span></span>
								<input
									v-model="form.pushTime"
									type="text"
									inputmode="numeric"
									placeholder="18:00"
									class="form-input-small"
									:disabled="dialogBusy"
									aria-label="推播時間"
									required
								/>
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>資料庫類型<span class="required-mark">*</span></span>
								<div :class="{ 'pointer-events-none opacity-50': dialogBusy }">
									<FilterDropdown
										v-model="form.dbType"
										:options="dbTypeOptions"
										text-size="text-sm 2xl:text-base"
										@update:model-value="handleDbTypeChanged"
									/>
								</div>
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>伺服器 IP/網域<span class="required-mark">*</span></span>
								<input
									v-model="form.host"
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
									v-model="form.port"
									type="text"
									inputmode="numeric"
									class="form-input-small"
									:disabled="dialogBusy"
									aria-label="Port"
									required
								/>
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>資料庫名稱<span class="required-mark">*</span></span>
								<input
									v-model="form.database"
									type="text"
									class="form-input-small"
									:disabled="dialogBusy"
									aria-label="資料庫名稱"
									required
								/>
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>使用者名稱<span class="required-mark">*</span></span>
								<input
									v-model="form.username"
									type="text"
									class="form-input-small"
									:disabled="dialogBusy"
									aria-label="使用者名稱"
									required
								/>
							</label>

							<label class="col-span-2 flex flex-col gap-2 text-base text-white/80">
								<span>密碼<span class="required-mark">*</span></span>
								<div class="flex gap-2">
									<input
										v-model="form.password"
										type="text"
										autocomplete="off"
										class="form-input-small min-w-0 flex-1"
										:disabled="dialogBusy"
										aria-label="密碼"
										required
									/>
									<button
										type="button"
										class="btn-secondary shrink-0 whitespace-nowrap"
										:disabled="dialogBusy || isTesting"
										@click="handleTestConnection"
									>
										{{ isTesting ? "測試中…" : "測試連線" }}
									</button>
								</div>
							</label>

							<div class="col-span-2 flex flex-col gap-2">
								<p class="text-sm font-medium text-white/85 2xl:text-base">欄位映射</p>
								<div class="overflow-hidden rounded-xl border border-white/10">
									<div
										class="mapping-grid mapping-grid-header border-b border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/55"
										aria-hidden="true"
									>
										<span>平台欄位</span>
										<span>第三方欄位名</span>
										<span>格式</span>
									</div>

									<div class="mapping-grid border-b border-white/10 px-3 py-2.5">
										<span class="text-sm text-white/85">
											目標資料表<span class="required-mark">*</span>
										</span>
										<input
											v-model="form.targetTable"
											type="text"
											class="form-input-small min-w-0 w-full"
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
									>
										<span class="text-sm text-white/85">
											{{ field.label }}<span v-if="field.required" class="required-mark">*</span>
										</span>
										<input
											v-model="form.mappings[field.key].targetColumn"
											type="text"
											class="form-input-small min-w-0 w-full"
											:disabled="dialogBusy"
											:aria-label="`${field.label} 第三方欄位名`"
											:required="field.required"
										/>
										<input
											v-if="field.requiresFormat"
											v-model="form.mappings[field.key].format"
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

							<footer class="col-span-2 mt-2 flex items-center gap-3 2xl:gap-4">
								<button type="button" class="btn-secondary" @click="handleCloseDialog">取消</button>
								<div class="flex-1"></div>
								<button type="submit" class="btn-primary" :disabled="isSaving">
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
import {
	DB_SYNC_DB_TYPE_OPTIONS,
	useExternalDatabaseSyncForm,
} from "~/composables/core/useExternalDatabaseSyncForm"
import { getExportFieldFormatPlaceholder } from "~/utils/externalIntegration"

const dbTypeOptions = [...DB_SYNC_DB_TYPE_OPTIONS]

const {
	form,
	fields,
	savedConfig,
	isLoading,
	isSaving,
	isTesting,
	loadError,
	dialogOpen,
	formDisabled,
	dialogBusy,
	summaryItems,
	actionLabel,
	handleDbTypeChanged,
	handleOpenDialog,
	handleCloseDialog,
	handleTestConnection,
	handleSave,
} = useExternalDatabaseSyncForm()

defineExpose({
	openDialog: handleOpenDialog,
	actionLabel,
	actionDisabled: formDisabled,
})
</script>

<style scoped>
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
