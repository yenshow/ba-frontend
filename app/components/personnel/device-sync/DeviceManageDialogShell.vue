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
					class="dialog-panel-bg mx-4 flex max-h-[88vh] min-h-[min(520px,80vh)] w-full max-w-7xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
					:aria-busy="isUiLocked || undefined"
				>
					<header class="flex items-center justify-between gap-3 pr-7 2xl:pr-8">
						<div class="flex min-w-0 flex-1 items-baseline gap-3">
							<h3
								:id="titleId"
								class="shrink-0 text-2xl font-semibold tracking-[4px] text-white 2xl:text-[1.75rem]"
							>
								{{ title }}
							</h3>
							<p
								v-if="titleMeta"
								class="min-w-0 truncate text-lg font-medium text-white/75 2xl:text-xl"
							>
								{{ titleMeta }}
							</p>
						</div>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
							:disabled="isUiLocked"
							aria-label="關閉對話框"
							@click="emit('close')"
						>
							&times;
						</button>
					</header>

					<div class="relative flex min-h-0 flex-1 flex-col overflow-hidden pr-7 2xl:pr-8">
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
defineProps<{
	modelValue: boolean
	title: string
	titleId: string
	titleMeta?: string | null
	isUiLocked?: boolean
}>()

const emit = defineEmits<{
	close: []
}>()
</script>
