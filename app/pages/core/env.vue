<template>
	<div class="space-y-6 2xl:space-y-8">
		<header class="flex flex-wrap items-end justify-between gap-4 2xl:gap-6">
			<div class="space-y-2 2xl:space-y-4">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">環境設定</h1>
				<p class="text-base text-white/80 2xl:text-xl">編輯警報日界線、備份設定。</p>
			</div>
		</header>

		<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
			<AsyncPanel
				:loading="isLoading"
				:error="loadError"
				:empty="!isLoading && !loadError && !schema"
				empty-title="無可顯示的設定"
				error-title="載入營運設定失敗"
			>
				<div v-if="schema" class="space-y-6">
					<div
						v-for="section in schema.sections"
						:key="section.title"
						class="space-y-4 rounded-xl border border-white/15 bg-black/20 p-4 2xl:p-6"
					>
						<h2 class="text-lg font-semibold text-white 2xl:text-xl">{{ section.title }}</h2>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<template
								v-for="(item, itemIdx) in getSectionGridFields(section)"
								:key="`${section.title}-${itemIdx}`"
							>
								<div
									v-if="item.type === 'schema'"
									class="flex min-w-0 flex-col gap-1"
								>
									<label
										class="text-sm font-medium text-white/85 2xl:text-base"
										:for="`runtime-field-${item.field.key}`"
									>
										{{ item.field.label }}
									</label>
									<input
										:id="`runtime-field-${item.field.key}`"
										v-model="form[item.field.key]"
										:inputmode="item.field.kind === 'number' ? 'numeric' : undefined"
										:pattern="item.field.kind === 'number' ? '[0-9]*' : undefined"
										spellcheck="false"
										autocomplete="off"
										:class="RUNTIME_FIELD_INPUT_CLASS"
										:disabled="formDisabled"
										:aria-label="item.field.label"
									/>
								</div>

								<div
									v-else-if="item.type === 'alertRolloverTime'"
									class="flex min-w-0 flex-col gap-1"
								>
									<label
										class="text-sm font-medium text-white/85 2xl:text-base"
										for="runtime-field-alert-rollover-time"
									>
										每日切換時刻
									</label>
									<input
										id="runtime-field-alert-rollover-time"
										v-model="form[RUNTIME_FORM_EXTRA_KEYS.alertRolloverTime]"
										type="time"
										step="60"
										:class="RUNTIME_FIELD_INPUT_CLASS"
										:disabled="formDisabled"
										aria-label="每日切換時刻"
									/>
								</div>

								<div
									v-else-if="item.type === 'backupIntervalHours'"
									class="flex min-w-0 flex-col gap-1"
								>
									<label
										class="text-sm font-medium text-white/85 2xl:text-base"
										for="runtime-field-backup-interval-hours"
									>
										排程間隔（小時）
									</label>
									<input
										id="runtime-field-backup-interval-hours"
										v-model="form[RUNTIME_FORM_EXTRA_KEYS.backupIntervalHours]"
										inputmode="decimal"
										min="1"
										step="1"
										spellcheck="false"
										autocomplete="off"
										:class="RUNTIME_FIELD_INPUT_CLASS"
										:disabled="formDisabled"
										aria-label="備份排程間隔（小時）"
									/>
								</div>
							</template>
						</div>
					</div>

					<div class="flex flex-wrap items-center gap-3">
						<button
							type="button"
							class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 2xl:px-6 2xl:py-3 2xl:text-base"
							:disabled="formDisabled"
							aria-label="儲存營運設定"
							@click="handleSave"
						>
							{{ isSaving ? "儲存中…" : "儲存" }}
						</button>
						<button
							type="button"
							class="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm text-white/85 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
							:disabled="formDisabled"
							aria-label="重新載入"
							@click="handleReload"
						>
							重新載入
						</button>
					</div>
				</div>
			</AsyncPanel>
		</section>
	</div>
</template>

<script setup lang="ts">
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import { useRuntimeConfigPage } from "~/composables/core/useRuntimeConfigPage"
import {
	RUNTIME_FIELD_INPUT_CLASS,
	RUNTIME_FORM_EXTRA_KEYS,
	getSectionGridFields,
} from "~/utils/runtimeConfigForm"

definePageMeta({
	layout: "default",
})

const {
	schema,
	form,
	isLoading,
	isSaving,
	loadError,
	formDisabled,
	handleReload,
	handleSave,
} = useRuntimeConfigPage()
</script>
