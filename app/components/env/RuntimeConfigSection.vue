<template>
	<section class="section-card h-full">
		<div class="my-4 flex flex-wrap items-center gap-x-4">
			<h2 class="text-lg font-semibold text-theme-primary 2xl:text-xl">營運設定</h2>
			<span v-if="isSaving" class="text-sm text-theme-muted" aria-live="polite">儲存中…</span>
		</div>

		<AsyncPanel
			:loading="isLoading"
			:error="loadError"
			:empty="!isLoading && !loadError && !schema"
			empty-title="無可顯示的設定"
			error-title="載入營運設定失敗"
			loading-min-height-class="min-h-[180px]"
			empty-min-height-class="min-h-[180px]"
		>
			<div v-if="schema" class="space-y-8">
				<div
					v-for="section in schema.sections"
					:key="section.title"
					class="space-y-4"
				>
					<h3 class="text-base font-medium text-white/90 2xl:text-lg">{{ section.title }}</h3>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

								<label
									v-if="item.field.kind === 'boolean'"
									class="inline-flex min-h-[42px] cursor-pointer items-center gap-3 rounded-lg border border-white/20 bg-black/30 px-3 py-2"
									:for="`runtime-field-${item.field.key}`"
								>
									<input
										:id="`runtime-field-${item.field.key}`"
										type="checkbox"
										class="h-4 w-4 rounded border-white/30 bg-black/40 text-teal-400 focus:ring-teal-400/40"
										:checked="isRuntimeBooleanTrue(form[item.field.key])"
										:disabled="formDisabled"
										:aria-label="item.field.label"
										@change="
											form[item.field.key] = setRuntimeBooleanValue(
												form[item.field.key],
												($event.target as HTMLInputElement).checked,
											)
										"
									/>
									<span class="text-sm text-white/85 2xl:text-base">
										{{ isRuntimeBooleanTrue(form[item.field.key]) ? "已啟用" : "已停用" }}
									</span>
								</label>

								<input
									v-else
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
								v-else-if="item.type === 'dailyTime'"
								class="flex min-w-0 flex-col gap-1"
							>
								<label
									class="text-sm font-medium text-white/85 2xl:text-base"
									:for="`runtime-field-${item.binding.extraKey}`"
								>
									{{ item.binding.label }}
								</label>
								<input
									:id="`runtime-field-${item.binding.extraKey}`"
									v-model="form[item.binding.extraKey]"
									type="text"
									inputmode="numeric"
									placeholder="00:00"
									spellcheck="false"
									autocomplete="off"
									:class="RUNTIME_FIELD_INPUT_CLASS"
									:disabled="formDisabled"
									:aria-label="item.binding.label"
								/>
							</div>
						</template>
					</div>
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
	getSectionGridFields,
	isRuntimeBooleanTrue,
	setRuntimeBooleanValue,
} from "~/utils/runtimeConfigForm"

const { schema, form, isLoading, isSaving, loadError, formDisabled } = useRuntimeConfigPage({
	autoSave: true,
})
</script>
