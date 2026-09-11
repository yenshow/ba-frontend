<template>
	<div
		:class="[
			'grid h-full min-h-0 w-full',
			isFullscreen ? 'gap-px' : 'gap-2 sm:gap-3',
			gridClass,
		]"
	>
			<div
				v-for="(view, index) in displayViews"
				:key="`view-${view.deviceId}-${view.position}-${index}`"
				:ref="(el: HTMLElement | null) => setViewRef(el, index)"
				:class="[
					'relative min-h-0 overflow-hidden bg-black',
					isFullscreen
						? 'rounded-none border-0'
						: 'rounded-lg border-2 border-gray-300 dark:border-gray-700',
				]"
			>
				<div
					v-if="
						(view.webrtcUrl ||
							view.streamStatus === 'loading' ||
							view.streamStatus === 'error') &&
						(isViewVisible(index) || view.streamStatus === 'error')
					"
					class="absolute inset-0"
				>
					<SurveillanceVideoPlayer
						:key="`player-${view.deviceId}-${view.position}-${index}`"
						:webrtc-url="view.webrtcUrl"
						:webrtc-port="view.webrtcPort"
						:stream-status="view.streamStatus"
						class="h-full w-full"
						@reload="$emit('reload', view.deviceId)"
					/>
				</div>

				<div
					v-else-if="!view.webrtcUrl && view.streamStatus !== 'loading'"
					class="absolute inset-0 flex items-center justify-center bg-gray-900"
				>
					<p class="text-sm text-gray-400 2xl:text-base">無串流</p>
				</div>

				<div
					v-if="!isFullscreen"
					class="absolute left-0 top-0 z-20 max-w-[60%] overflow-hidden text-ellipsis whitespace-nowrap rounded-br bg-black/60 px-2 py-1 text-xs font-medium text-white 2xl:text-base"
				>
					{{ getCameraName(view.deviceId) }}
				</div>

				<div v-if="!isFullscreen" class="absolute right-0 top-0 z-20 flex shrink-0 gap-1 p-1.5">
					<button
						type="button"
						class="shrink-0 whitespace-nowrap rounded bg-gray-500/80 px-1.5 py-0.5 text-xs text-white transition-colors hover:bg-gray-600 2xl:px-2 2xl:py-1"
						title="移除畫面"
						aria-label="移除畫面"
						@click.stop="$emit('remove', view.deviceId)"
					>
						移除
					</button>
				</div>
			</div>

			<div
				v-for="idx in emptySlots"
				:key="`empty-${idx}`"
				:class="[
					'flex min-h-0 items-center justify-center',
					isFullscreen
						? 'bg-black'
						: 'rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800',
				]"
			>
				<p v-if="!isFullscreen" class="text-sm text-gray-400 2xl:text-base dark:text-gray-500">空位</p>
			</div>
	</div>
</template>

<script setup lang="ts">
import type { SurveillanceCamera, MonitorView, GridLayout } from "~/types/surveillance"

interface Props {
	cameras: readonly SurveillanceCamera[]
	views: readonly MonitorView[]
	layout: GridLayout
	isFullscreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	isFullscreen: false,
})

defineEmits<{
	remove: [deviceId: number]
	reload: [deviceId: number]
}>()

const GRID_CLASS: Record<GridLayout, { cols: string; rows: string }> = {
	"1": { cols: "grid-cols-1", rows: "grid-rows-1" },
	"4": { cols: "grid-cols-2", rows: "grid-rows-2" },
	"9": { cols: "grid-cols-3", rows: "grid-rows-3" },
	"16": { cols: "grid-cols-4", rows: "grid-rows-4" },
}

const viewRefs = ref<(HTMLElement | null)[]>([])
const visibleViews = ref<Set<number>>(new Set())
let intersectionObserver: IntersectionObserver | null = null

const setViewRef = (el: HTMLElement | null, index: number) => {
	if (el) viewRefs.value[index] = el
}

const isViewVisible = (index: number): boolean => visibleViews.value.has(index)

const gridClass = computed(() => {
	const g = GRID_CLASS[props.layout] || GRID_CLASS["1"]
	return `${g.cols} ${g.rows}`
})

const maxViews = computed(() => parseInt(props.layout, 10))

const displayViews = computed(() =>
	[...props.views].sort((a, b) => a.position - b.position).slice(0, maxViews.value)
)

const emptySlots = computed(() => Math.max(0, maxViews.value - displayViews.value.length))

const cameraMap = computed(() => {
	const map = new Map<number, SurveillanceCamera>()
	props.cameras.forEach((c) => map.set(c.id, c))
	return map
})

const getCameraName = (deviceId: number): string =>
	cameraMap.value.get(deviceId)?.name || `設備 ${deviceId}`

const initIntersectionObserver = () => {
	if (typeof IntersectionObserver === "undefined") {
		displayViews.value.forEach((_, i) => visibleViews.value.add(i))
		return
	}
	intersectionObserver?.disconnect()
	intersectionObserver = new IntersectionObserver(
		(entries) => {
			const next = new Set(visibleViews.value)
			entries.forEach((entry) => {
				const index = parseInt(entry.target.getAttribute("data-view-index") || "-1", 10)
				if (index < 0) return
				if (entry.isIntersecting) next.add(index)
				else next.delete(index)
			})
			visibleViews.value = next
		},
		{ threshold: 0.1, rootMargin: "50px" }
	)
	nextTick(() => {
		viewRefs.value.forEach((el, index) => {
			if (!el) return
			el.setAttribute("data-view-index", String(index))
			intersectionObserver?.observe(el)
		})
	})
}

watch(
	() => displayViews.value.length,
	() => {
		visibleViews.value.clear()
		initIntersectionObserver()
	},
	{ immediate: true }
)

onBeforeUnmount(() => {
	intersectionObserver?.disconnect()
	intersectionObserver = null
	visibleViews.value.clear()
})
</script>
