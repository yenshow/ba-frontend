<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				@click.self="handleClose"
			>
				<div
					class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:p-8"
				>
					<header class="flex items-center justify-between">
						<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">批次匯入</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>
					<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
						<span>JSON 陣列（每筆含 employeeNo；可選 fullName, personGroupId, locationIds）</span>
						<textarea
							:model-value="jsonText"
							class="form-input-small min-h-[200px] font-mono text-sm"
							placeholder='[{"employeeNo":"A001","fullName":"王小明","personGroupId":1,"locationIds":[1,2]}]'
							@input="handleInput"
						></textarea>
					</label>
					<p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
					<div v-if="result" class="rounded border border-white/20 bg-white/5 p-3 text-sm text-white/90">
						<p>成功：{{ result.created }} 筆</p>
						<p v-if="result.errors?.length" class="mt-2 text-amber-300">
							錯誤：{{ result.errors.length }} 筆 —
							{{ result.errors.map(e => `第${e.row}行 ${e.message}`).join("；") }}
						</p>
					</div>
					<footer class="mt-2 flex gap-3 2xl:gap-4">
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="btn-primary"
							:disabled="isImporting || !jsonText.trim()"
							@click="handleSubmit"
						>
							{{ isImporting ? "匯入中..." : "匯入" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { ImportResult } from "~/types/personnel";

defineProps<{
	modelValue: boolean;
	jsonText: string;
	error: string;
	result: ImportResult | null;
	isImporting: boolean;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
	"update:jsonText": [value: string];
	submit: [];
}>();

const handleClose = () => emit("update:modelValue", false);
const handleInput = (e: Event) => emit("update:jsonText", (e.target as HTMLTextAreaElement).value);
const handleSubmit = () => emit("submit");
</script>
