<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[3000] flex items-center justify-center"
				@click.self="handleCancel"
			>
				<div
					class="dialog-panel-bg flex max-w-md flex-col gap-4 rounded-3xl p-6 2xl:max-w-xl 2xl:gap-6 2xl:p-8"
				>
					<header class="flex items-center justify-between">
						<h3 class="text-xl font-semibold tracking-[2px] text-white 2xl:text-2xl">
							{{ title }}
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white/70 transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleCancel"
						>
							&times;
						</button>
					</header>

					<div class="flex items-start gap-3">
						<!-- 圖標 -->
						<div
							class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
							:class="iconClass"
						>
							<!-- Warning Icon -->
							<svg
								v-if="type === 'warning'"
								class="h-6 w-6"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
									clip-rule="evenodd"
								/>
							</svg>
							<!-- Danger Icon -->
							<svg
								v-else-if="type === 'danger'"
								class="h-6 w-6"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
									clip-rule="evenodd"
								/>
							</svg>
							<!-- Info Icon -->
							<svg v-else class="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<!-- 訊息內容 -->
						<div class="flex-1">
							<p class="text-base whitespace-pre-line leading-relaxed text-white/90 2xl:text-lg">
								{{ message }}
							</p>
							<!-- 詳細說明（可選） -->
							<p v-if="details" class="mt-2 text-sm text-white/60 2xl:text-base">
								{{ details }}
							</p>
						</div>
					</div>

					<footer class="flex items-center justify-end gap-3 border-t border-white/20 pt-4">
						<button type="button" class="btn-secondary" @click="handleCancel">
							{{ cancelText }}
						</button>
						<button
							type="button"
							class="btn-primary"
							:class="confirmButtonClass"
							@click="handleConfirm"
						>
							{{ confirmText }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
interface Props {
	modelValue: boolean
	title?: string
	message: string
	details?: string
	type?: "warning" | "danger" | "info"
	confirmText?: string
	cancelText?: string
}

const props = withDefaults(defineProps<Props>(), {
	title: "確認",
	type: "warning",
	confirmText: "確定",
	cancelText: "取消",
})

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void
	(e: "confirm"): void
	(e: "cancel"): void
}>()

const iconClass = computed(() => {
	const classes: Record<typeof props.type, string> = {
		warning: "bg-amber-500/20 text-amber-400",
		danger: "bg-rose-500/20 text-rose-400",
		info: "bg-blue-500/20 text-blue-400",
	}
	return classes[props.type]
})

const confirmButtonClass = computed(() => {
	if (props.type === "danger") {
		return "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700"
	}
	return ""
})

const handleConfirm = () => {
	emit("confirm")
	emit("update:modelValue", false)
}

const handleCancel = () => {
	emit("cancel")
	emit("update:modelValue", false)
}
</script>

<style scoped></style>
