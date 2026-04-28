<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				aria-label="同步結果與警告"
				role="dialog"
				aria-modal="true"
				@click.self="handleClose"
			>
				<div
					class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-4xl flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:gap-6 2xl:p-8"
				>
					<header class="flex items-center justify-between gap-4">
						<div class="min-w-0">
							<h3 class="truncate text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
								結果與警告
							</h3>
							<p class="mt-1 text-sm text-white/60 2xl:text-base">
								{{ summaryText }}
							</p>
						</div>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<div
						v-if="syncWarnings.length === 0"
						class="rounded-xl border border-white/10 bg-white/5 p-4"
					>
						<p class="text-base text-white/60 2xl:text-lg">尚無警告</p>
					</div>
					<div
						v-else
						class="max-h-[420px] overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-4 text-base text-white/80 2xl:text-lg"
						role="status"
						aria-live="polite"
					>
						<ul class="space-y-2">
							<li v-for="(w, i) in syncWarnings" :key="i" class="flex gap-2">
								<span class="shrink-0 text-white" aria-hidden="true">•</span>
								<div class="min-w-0 space-y-0.5">
									<div class="break-words text-white">
										<span v-if="w.locationName">{{ w.locationName }}：</span>
										<span v-if="w.employeeNo">員工 {{ w.employeeNo }}</span>
										<span class="text-amber-200">{{ syncWarningTypeLabel(w.type) }}</span>
									</div>
									<div class="break-words text-white/70">
										<span class="text-white/90">設備：</span>
										<span>{{ w.deviceName || (w.deviceId != null ? `#${w.deviceId}` : "—") }}</span>
									</div>
									<div class="break-words text-white/70">
										<span class="text-white/90">問題：</span>
										<span>{{ w.message }}</span>
									</div>
								</div>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { SyncWarning } from "~/types/personnel"

const props = defineProps<{
	modelValue: boolean
	syncWarnings: SyncWarning[]
	syncWarningTypeLabel: (type: string) => string
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
}>()

const handleClose = () => emit("update:modelValue", false)

const summaryText = computed(() => {
	const total = props.syncWarnings.length
	if (total === 0) return "同步完成，沒有警告"
	return `共有 ${total} 筆警告`
})
</script>
