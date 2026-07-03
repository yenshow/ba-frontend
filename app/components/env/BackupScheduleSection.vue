<template>
	<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
		<div class="my-4 flex flex-wrap items-center gap-x-4">
			<h2 class="text-lg font-semibold text-white 2xl:text-xl">備份排程</h2>
			<span v-if="isSaving" class="text-sm text-white/60" aria-live="polite">儲存中…</span>
		</div>

		<AsyncPanel
			:loading="isLoading"
			:error="loadError"
			:empty="!isLoading && !loadError && !schema"
			empty-title="無可顯示的設定"
			error-title="載入營運設定失敗"
			loading-min-height-class="min-h-[168px] 2xl:min-h-[188px]"
			empty-min-height-class="min-h-[168px] 2xl:min-h-[188px]"
		>
			<div v-if="schema" class="space-y-6">
				<div
					v-for="section in schema.sections"
					:key="section.title"
					class="grid grid-cols-1 gap-4 sm:grid-cols-2"
				>
					<template
						v-for="(item, itemIdx) in getSectionGridFields(section)"
						:key="`${section.title}-${itemIdx}`"
					>
						<div v-if="item.type === 'schema'" class="flex min-w-0 flex-col gap-1">
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

						<div v-else-if="item.type === 'backupDailyTime'" class="flex min-w-0 flex-col gap-1">
							<label
								class="text-sm font-medium text-white/85 2xl:text-base"
								for="runtime-field-backup-daily-time"
							>
								每日備份時刻
							</label>
							<input
								id="runtime-field-backup-daily-time"
								v-model="form[RUNTIME_FORM_EXTRA_KEYS.backupDailyTime]"
								type="text"
								inputmode="numeric"
								placeholder="00:00"
								spellcheck="false"
								autocomplete="off"
								:class="RUNTIME_FIELD_INPUT_CLASS"
								:disabled="formDisabled"
								aria-label="每日備份時刻"
							/>
						</div>
					</template>
				</div>
			</div>
		</AsyncPanel>
	</section>
</template>

<script setup lang="ts">
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import { useRuntimeConfigPage } from "~/composables/core/useRuntimeConfigPage"
import {
	RUNTIME_FIELD_INPUT_CLASS,
	RUNTIME_FORM_EXTRA_KEYS,
	getSectionGridFields,
} from "~/utils/runtimeConfigForm"

const { schema, form, isLoading, isSaving, loadError, formDisabled } = useRuntimeConfigPage({
	autoSave: true,
})
</script>
