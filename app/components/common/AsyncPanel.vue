<template>
	<div :class="rootClass">
		<Transition name="fade" mode="out-in">
			<div
				v-if="loading"
				key="loading"
				:class="loadingClass"
				role="status"
				aria-live="polite"
				aria-busy="true"
			>
				<slot name="loading">
					<p class="sr-only">{{ loadingLabel }}</p>
				</slot>
			</div>

			<div v-else-if="error" key="error" :class="errorClass" role="alert">
				<div class="max-w-md space-y-2">
					<p class="text-base font-medium text-rose-300/95 2xl:text-lg">{{ errorTitle }}</p>
					<p class="text-sm text-white/65 2xl:text-base">{{ error }}</p>
				</div>
			</div>

			<div v-else-if="empty" key="empty" :class="emptyClass">
				<slot name="empty">
					<div class="max-w-sm space-y-2">
						<svg
							class="mx-auto mb-1 h-11 w-11 text-white/40 2xl:h-12 2xl:w-12"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
							/>
						</svg>
						<p class="text-lg font-medium text-white/85 2xl:text-xl">{{ emptyTitle }}</p>
						<p v-if="emptyDescription" class="text-sm text-white/60 2xl:text-base">
							{{ emptyDescription }}
						</p>
					</div>
				</slot>
			</div>

			<div v-else key="content" class="flex min-h-0 flex-1 flex-col">
				<slot />
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
type PanelSize = "default" | "compact" | "dense" | "sidebar"

const PANEL_SIZE_PRESETS: Record<PanelSize, { loading: string; empty: string }> = {
	default: {
		loading: "min-h-[480px] 2xl:min-h-[520px]",
		empty: "min-h-[400px] 2xl:min-h-[480px]",
	},
	compact: {
		loading: "min-h-[320px] 2xl:min-h-[360px]",
		empty: "min-h-[360px] 2xl:min-h-[480px]",
	},
	dense: {
		loading: "min-h-[280px]",
		empty: "min-h-[240px]",
	},
	sidebar: {
		loading: "min-h-[120px]",
		empty: "min-h-[160px]",
	},
}

const STATE_FRAME_BASE =
	"flex items-center justify-center rounded-lg border border-dashed p-6 text-center 2xl:p-10"

const props = withDefaults(
	defineProps<{
		loading?: boolean
		empty?: boolean
		error?: string | null
		emptyTitle?: string
		emptyDescription?: string
		errorTitle?: string
		loadingLabel?: string
		panelSize?: PanelSize
		minHeightClass?: string
		loadingMinHeightClass?: string
		emptyMinHeightClass?: string
	}>(),
	{
		loading: false,
		empty: false,
		error: null,
		emptyTitle: "目前沒有資料",
		emptyDescription: "",
		errorTitle: "載入失敗",
		loadingLabel: "載入中",
		panelSize: "default",
		minHeightClass: "min-h-0",
	}
)

const sizePreset = computed(() => PANEL_SIZE_PRESETS[props.panelSize])

const resolvedLoadingMin = computed(() => {
	if (props.loadingMinHeightClass) return props.loadingMinHeightClass
	if (props.minHeightClass && props.minHeightClass !== "min-h-0") return props.minHeightClass
	return sizePreset.value.loading
})
const resolvedEmptyMin = computed(() => props.emptyMinHeightClass ?? sizePreset.value.empty)

const rootClass = computed(() =>
	["flex w-full min-h-0 flex-col", props.minHeightClass].filter(Boolean),
)

const slots = useSlots()

const loadingClass = computed(() => {
	const base = `flex w-full ${resolvedLoadingMin.value} py-4 2xl:py-5`
	if (slots.loading) return `${base} items-start justify-stretch px-1`
	return `${base} items-center justify-center`
})

const emptyClass = computed(
	() => `${STATE_FRAME_BASE} ${resolvedEmptyMin.value} border-white/20 bg-white/[0.04]`
)

const errorClass = computed(
	() => `${STATE_FRAME_BASE} ${resolvedEmptyMin.value} border-rose-400/25 bg-rose-950/10`
)
</script>
