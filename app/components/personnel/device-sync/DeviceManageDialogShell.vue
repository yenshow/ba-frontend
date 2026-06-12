<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				:aria-labelledby="titleId"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-6xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
					:aria-busy="isUiLocked || undefined"
				>
					<header class="flex items-center justify-between gap-3 pr-7 2xl:pr-8">
						<div class="min-w-0">
							<h3
								:id="titleId"
								class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
							>
								{{ title }}
							</h3>
						</div>

						<nav class="flex items-center gap-2 pr-7 2xl:pr-8" :aria-label="stepNavAriaLabel">
							<button
								type="button"
								class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors 2xl:text-base"
								:class="getPillButtonClass(manageStep === 1)"
								:aria-current="manageStep === 1 ? 'step' : undefined"
								@click="emit('update:manageStep', 1)"
							>
								<span
									class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ring-1 2xl:h-7 2xl:w-7 2xl:text-sm"
									:class="getStepCircleClass(manageStep === 1)"
									aria-hidden="true"
								>
									1
								</span>
								<span>{{ step1Label }}</span>
							</button>

							<div class="h-px w-[300px] bg-white/10" aria-hidden="true" />

							<button
								type="button"
								class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors 2xl:text-base"
								:class="getPillButtonClass(manageStep === 2)"
								:aria-current="manageStep === 2 ? 'step' : undefined"
								@click="emit('update:manageStep', 2)"
							>
								<span
									class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ring-1 2xl:h-7 2xl:w-7 2xl:text-sm"
									:class="getStepCircleClass(manageStep === 2)"
									aria-hidden="true"
								>
									2
								</span>
								<span>{{ step2Label }}</span>
							</button>
						</nav>

						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉對話框"
							tabindex="0"
							@click="emit('close')"
							@keydown.enter="emit('close')"
							@keydown.space.prevent="emit('close')"
						>
							&times;
						</button>
					</header>

					<div class="show-scrollbar relative min-h-[320px] flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<slot />
						<div
							v-if="isUiLocked"
							class="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center"
							role="status"
						>
							<div
								class="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-sm"
							>
								<div
									class="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
									aria-hidden="true"
								/>
								<p class="text-white/85">同步中，請稍候…</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { useWizardStepNav } from "~/composables/core/useWizardStepNav"

defineProps<{
	modelValue: boolean
	title: string
	titleId: string
	stepNavAriaLabel: string
	manageStep: 1 | 2
	step1Label: string
	step2Label: string
	isUiLocked?: boolean
}>()

const emit = defineEmits<{
	"update:manageStep": [value: 1 | 2]
	close: []
}>()

const { getPillButtonClass, getStepCircleClass } = useWizardStepNav()
</script>
