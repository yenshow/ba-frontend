<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="open"
				class="fixed inset-0 z-[2100] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				aria-label="警報攝影機連動彈窗"
			>
				<div
					class="dialog-panel-bg mx-4 flex max-h-[92vh] w-full max-w-[min(88rem,94vw)] flex-col overflow-hidden rounded-3xl p-4 2xl:p-6"
				>
					<header class="mb-3 flex items-start justify-between gap-3">
						<div class="min-w-0 flex flex-col gap-1">
							<h3 class="text-lg font-semibold tracking-[2px] text-white 2xl:text-xl">
								{{ titleText }}
							</h3>
							<p v-if="items.length > 0" class="text-xs text-white/70 2xl:text-sm">
								第 {{ activeIndex + 1 }} / {{ items.length }} 則連動
								<template v-if="items[activeIndex]?.count > 1">
									（重複 {{ items[activeIndex].count }} 次）
								</template>
							</p>
						</div>
						<button
							type="button"
							class="shrink-0 cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉攝影機彈窗"
							@click="emit('close')"
						>
							&times;
						</button>
					</header>

					<div
						class="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] lg:min-h-[480px] 2xl:min-h-[560px]"
					>
						<section
							class="map-location-dots relative min-h-[220px] overflow-hidden rounded-2xl border border-white/15 bg-black/60 lg:min-h-0"
							aria-label="警報地點平面圖"
						>
							<div
								v-if="locationContext.loading"
								class="flex h-full min-h-[220px] items-center justify-center text-sm text-white/70 lg:min-h-0"
							>
								載入平面圖…
							</div>
							<template v-else>
								<NuxtImg
									v-if="resolvedMapSrc"
									:src="resolvedMapSrc"
									alt="區域平面圖"
									class="image-blur-load pointer-events-none h-full w-full object-contain"
									:class="{ 'image-loaded': isMapLoaded }"
									width="auto"
									height="full"
									@load="isMapLoaded = true"
								/>
								<div
									v-else
									class="flex h-full min-h-[220px] items-center justify-center px-4 text-center text-sm text-white/50 lg:min-h-0"
								>
									{{ locationContext.error || "尚無對應區域平面圖" }}
								</div>
								<div
									v-if="hasPointCoords"
									class="category-dot-wrapper"
									:style="{
										left: `${locationContext.x}%`,
										top: `${locationContext.y}%`,
									}"
								>
									<div
										class="category-dot"
										data-status="alarm"
										role="img"
										:aria-label="pointTooltipTitle"
										:title="pointTooltipTitle"
									></div>
									<CategoryTooltip
										:show="true"
										:category-name="locationContext.locationName || '警報點位'"
										:is-normal="false"
										status-type="alarm"
										alert-flash="fast"
									/>
								</div>
							</template>
						</section>

						<section class="flex min-h-0 flex-col gap-3 overflow-hidden">
							<div
								class="shrink-0 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white/90"
								aria-label="點位訊息"
							>
								<p class="text-xs text-white/60 2xl:text-sm">點位訊息</p>
								<p class="mt-1 text-base font-medium text-white 2xl:text-lg">
									{{ alertMessageText }}
								</p>
							</div>

							<div
								class="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/15 bg-black"
							>
								<button
									v-if="streams.length > 0"
									type="button"
									class="absolute right-2 top-2 z-20 rounded bg-black/60 px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-black/80 2xl:text-sm"
									aria-label="全螢幕顯示連動影像"
									@click="isFullscreenOpen = true"
								>
									全螢幕
								</button>
								<div
									v-if="streams.length === 0"
									class="flex flex-1 items-center justify-center p-2 text-sm text-white/60"
								>
									無連動攝影機
								</div>
								<AlertCameraStreamSlots
									v-else
									:slots="displaySlots"
									:is-single-layout="isSingleLayout"
									padding-class="p-2 pt-9"
									@reload="emit('reload-stream', $event)"
								/>
							</div>
						</section>
					</div>

					<footer class="mt-4 flex items-center gap-3 border-t border-white/20 pt-4 2xl:gap-4">
						<button
							type="button"
							class="btn-secondary"
							:disabled="items.length <= 1 || activeIndex <= 0"
							aria-label="上一則連動"
							@click="emit('prev')"
						>
							上一則
						</button>
						<button
							type="button"
							class="btn-secondary"
							:disabled="items.length <= 1 || activeIndex >= items.length - 1"
							aria-label="下一則連動"
							@click="emit('next')"
						>
							下一則
						</button>
						<div class="flex-1"></div>
						<button type="button" class="btn-secondary" aria-label="關閉" @click="emit('close')">
							關閉
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>

	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="isFullscreenOpen"
				class="fixed inset-0 z-[2200] flex flex-col bg-black"
				role="dialog"
				aria-modal="true"
				aria-label="連動影像全螢幕"
			>
				<div class="flex items-center justify-between gap-3 bg-black/80 px-4 py-3">
					<p class="truncate text-sm text-white/90 2xl:text-base">
						連動影像（{{ streams.length }}）
					</p>
					<button
						type="button"
						class="rounded bg-white/10 px-3 py-1.5 text-sm text-white/90 hover:bg-white/20"
						aria-label="關閉全螢幕"
						@click="isFullscreenOpen = false"
					>
						關閉
					</button>
				</div>
				<AlertCameraStreamSlots
					:slots="displaySlots"
					:is-single-layout="isSingleLayout"
					padding-class="p-3"
					@reload="emit('reload-stream', $event)"
				/>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import CategoryTooltip from "~/components/common/CategoryTooltip.vue"
import AlertCameraStreamSlots, {
	type CameraStreamSlot,
	type CameraStreamState,
} from "~/components/alerts/AlertCameraStreamSlots.vue"
import { useImageCenter } from "~/composables/core/useImageCenter"
import { getSourceLabel } from "~/utils/alertUtils"
import type { AlertSource } from "~/types/alert"

export type { CameraStreamState }

export type CameraPopupItem = {
	key: string
	ruleId: number
	cameraDeviceIds: number[]
	createdAt: number
	count: number
	message?: string
	source?: AlertSource
	sourceId?: number
	zoneName?: string
	locationName?: string
	deviceName?: string
}

export type CameraLocationContext = {
	loading: boolean
	zoneName: string
	locationName: string
	imageUrl: string
	x: number | null
	y: number | null
	error: string
}

interface Props {
	open: boolean
	items: readonly CameraPopupItem[]
	activeIndex: number
	streams: readonly CameraStreamState[]
	locationContext: CameraLocationContext
}

const props = defineProps<Props>()

const emit = defineEmits<{
	close: []
	prev: []
	next: []
	"reload-stream": [deviceId: number]
}>()

const isMapLoaded = ref(false)
const isFullscreenOpen = ref(false)
const { useDisplaySrc } = useImageCenter()
const resolvedMapSrc = useDisplaySrc(() => props.locationContext.imageUrl || "")

watch(
	() => props.locationContext.imageUrl,
	() => {
		isMapLoaded.value = false
	}
)

watch([() => props.open, () => props.activeIndex], () => {
	isFullscreenOpen.value = false
})

const activeItem = computed(() => props.items[props.activeIndex] ?? null)

/** 1 台＝單格；2～4 台＝固定 2×2（空位補齊） */
const isSingleLayout = computed(() => props.streams.length <= 1)

const displaySlots = computed((): CameraStreamSlot[] => {
	const list = props.streams
	if (list.length <= 1) {
		const first = list[0]
		return [{ key: first ? `cam-${first.deviceId}` : "empty-0", stream: first ?? null }]
	}
	return Array.from({ length: 4 }, (_, i) => {
		const s = list[i] ?? null
		return { key: s ? `cam-${s.deviceId}-${i}` : `empty-${i}`, stream: s }
	})
})

const zoneLocationLabel = computed(() => {
	const zone = props.locationContext.zoneName || activeItem.value?.zoneName || ""
	const loc =
		props.locationContext.locationName ||
		activeItem.value?.locationName ||
		activeItem.value?.deviceName ||
		""
	if (zone && loc) return `${zone} - ${loc}`
	return loc || zone || ""
})

const titleText = computed(() => {
	const source = activeItem.value?.source
	const systemLabel = source ? getSourceLabel(source) : ""
	const place = zoneLocationLabel.value
	if (systemLabel && place) return `${systemLabel} ${place}`
	return place || systemLabel || "警報連動"
})

const alertMessageText = computed(() => String(activeItem.value?.message || "").trim() || "—")

const hasPointCoords = computed(
	() =>
		props.locationContext.x != null &&
		Number.isFinite(props.locationContext.x) &&
		props.locationContext.y != null &&
		Number.isFinite(props.locationContext.y)
)

const pointTooltipTitle = computed(
	() => `${props.locationContext.locationName || "警報點位"} 警報`
)

const handleFullscreenKeydown = (e: KeyboardEvent) => {
	if (e.key !== "Escape" || !isFullscreenOpen.value) return
	e.preventDefault()
	isFullscreenOpen.value = false
}

onMounted(() => {
	if (typeof document === "undefined") return
	document.addEventListener("keydown", handleFullscreenKeydown)
})

onBeforeUnmount(() => {
	if (typeof document === "undefined") return
	document.removeEventListener("keydown", handleFullscreenKeydown)
})
</script>
