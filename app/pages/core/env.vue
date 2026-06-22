<template>
	<div class="space-y-6 2xl:space-y-8">
		<header class="flex flex-wrap items-end justify-between gap-4 2xl:gap-6">
			<div class="space-y-2 2xl:space-y-4">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">環境設定</h1>
				<p class="text-base text-white/80 2xl:text-xl">編輯 YSCP、警報日界線、備份設定。</p>
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
						v-for="(row, rowIdx) in sectionRows"
						:key="`runtime-row-${rowIdx}`"
						class="grid gap-4 lg:items-stretch"
						:class="row.length > 1 ? 'lg:grid-cols-2' : ''"
					>
						<div
							v-for="section in row"
							:key="section.title"
							class="flex h-full min-h-0 min-w-0 flex-col space-y-4 rounded-xl border border-white/15 bg-black/20 p-4 2xl:p-6"
						>
							<h2 class="text-lg font-semibold text-white 2xl:text-xl">{{ section.title }}</h2>
							<div class="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
								<div v-for="field in section.fields" :key="field.key" class="flex min-w-0 flex-col gap-1">
									<label
										class="text-sm font-medium text-white/85 2xl:text-base"
										:for="`runtime-field-${field.key}`"
									>
										{{ field.label }}
									</label>
									<EnvDeploymentPasswordInput
										v-if="field.kind === 'password'"
										:model-value="form[field.key] ?? ''"
										:input-id="`runtime-field-${field.key}`"
										:ariaLabel="field.label"
										:disabled="formDisabled"
										@update:model-value="v => (form[field.key] = v)"
									/>
									<input
										v-else
										:id="`runtime-field-${field.key}`"
										v-model="form[field.key]"
										:inputmode="field.kind === 'number' ? 'numeric' : undefined"
										:pattern="field.kind === 'number' ? '[0-9]*' : undefined"
										spellcheck="false"
										autocomplete="off"
										class="rounded-lg border border-white/20 bg-black/30 px-3 py-2 font-mono text-sm text-white focus:border-teal-400/60 focus:outline-none focus:ring-1 focus:ring-teal-400/40 2xl:text-base"
										:disabled="formDisabled"
										:aria-label="field.label"
									/>
								</div>
							</div>
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
import AsyncPanel from "~/components/common/AsyncPanel.vue";
import EnvDeploymentPasswordInput from "~/components/common/EnvDeploymentPasswordInput.vue";
import { useRuntimeConfigPage } from "~/composables/core/useRuntimeConfigPage";

definePageMeta({
	layout: "auxiliary"
});

const {
	schema,
	form,
	isLoading,
	isSaving,
	loadError,
	formDisabled,
	sectionRows,
	handleReload,
	handleSave
} = useRuntimeConfigPage();
</script>
