<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				@click.self="handleClose"
			>
				<div
					class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:p-8"
				>
					<header class="flex items-center justify-between">
						<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
							{{ editingGroup ? "編輯群組" : "新增群組" }}
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>
					<form class="flex flex-col gap-4 2xl:gap-6" @submit.prevent="handleSubmit">
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<span>名稱 *</span>
							<input v-model="form.name" type="text" required class="form-input-small" />
						</label>
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<span>說明</span>
							<input v-model="form.description" type="text" class="form-input-small" />
						</label>
						<p v-if="errorMessage" class="text-sm text-rose-300">{{ errorMessage }}</p>
						<footer class="mt-2 flex gap-3 2xl:gap-4">
							<button type="button" class="btn-secondary" @click="handleClose">取消</button>
							<div class="flex-1"></div>
							<button type="submit" class="btn-primary" :disabled="isSubmitting">
								{{ isSubmitting ? "處理中..." : editingGroup ? "更新" : "建立" }}
							</button>
						</footer>
					</form>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { PersonGroup } from "~/types/personnel";

defineProps<{
	modelValue: boolean;
	editingGroup: PersonGroup | null;
	form: { name: string; description: string };
	isSubmitting: boolean;
	errorMessage: string | null;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
	submit: [];
}>();

const handleClose = () => emit("update:modelValue", false);
const handleSubmit = () => emit("submit");
</script>
