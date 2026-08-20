<template>
	<Teleport to="body">
		<Transition name="access-event-camera-pop">
			<aside
				v-if="open && item"
				class="fixed bottom-4 right-4 z-[2100] flex w-[min(26rem,92vw)] cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/20 bg-[rgba(5,24,40,0.94)] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md sm:bottom-6 sm:right-6"
				role="button"
				tabindex="0"
				aria-live="polite"
				aria-label="門禁事件調閱，點擊前往門禁管理"
				@click="handleNavigateToPeopleCounting"
				@keydown.enter.prevent="handleNavigateToPeopleCounting"
				@keydown.space.prevent="handleNavigateToPeopleCounting"
			>
				<header class="flex items-start justify-between gap-2 border-b border-white/10 px-3 py-2.5">
					<div class="min-w-0 flex flex-col gap-0.5">
						<p class="truncate text-sm font-semibold text-white 2xl:text-base">
							{{ titleText }}
						</p>
						<p class="truncate text-xs text-white/70 2xl:text-sm">
							{{ item.eventLabel || "進入" }}
							<template v-if="item.count > 1">（×{{ item.count }}）</template>
						</p>
					</div>
					<div class="flex shrink-0 items-center gap-0.5">
						<button
							v-if="streams.length > 0"
							type="button"
							class="flex h-8 w-8 cursor-pointer items-center justify-center rounded border-none bg-transparent text-white/80 transition-colors hover:bg-white/10 hover:text-white"
							aria-label="全螢幕顯示調閱影像"
							@click.stop="emit('update:fullscreen', true)"
						>
							<svg
								class="h-4 w-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M8 3H5a2 2 0 0 0-2 2v3" />
								<path d="M16 3h3a2 2 0 0 1 2 2v3" />
								<path d="M8 21H5a2 2 0 0 1-2-2v-3" />
								<path d="M16 21h3a2 2 0 0 0 2-2v-3" />
							</svg>
						</button>
						<button
							type="button"
							class="flex h-8 w-8 cursor-pointer items-center justify-center rounded border-none bg-transparent text-xl leading-none text-white/80 transition-colors hover:bg-white/10 hover:text-white"
							aria-label="關閉調閱影像"
							@click.stop="emit('close')"
						>
							&times;
						</button>
					</div>
				</header>

				<div class="relative aspect-video w-full bg-black">
					<div
						v-if="streams.length === 0"
						class="flex h-full items-center justify-center px-3 text-xs text-white/60 2xl:text-sm"
					>
						無調閱攝影機
					</div>
					<AlertCameraStreamSlots
						v-else
						:slots="displaySlots"
						:is-single-layout="true"
						padding-class="p-1.5"
						@reload="emit('reload-stream', $event)"
					/>
				</div>

				<div
					v-if="!isFullscreen"
					class="h-1 w-full origin-left bg-cyan-400/90"
					:key="`${item.key}:${autoCloseEpoch}`"
					:style="{ animationDuration: `${autoCloseMs}ms` }"
					aria-hidden="true"
				/>
			</aside>
		</Transition>
	</Teleport>

	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="isFullscreen && open && item"
				class="fixed inset-0 z-[2200] flex flex-col bg-black"
				role="dialog"
				aria-modal="true"
				aria-label="調閱影像全螢幕"
			>
				<div class="flex items-center justify-between gap-3 bg-black/80 px-4 py-3">
					<p class="truncate text-sm text-white/90 2xl:text-base">{{ titleText }}</p>
					<button
						type="button"
						class="rounded bg-white/10 px-3 py-1.5 text-sm text-white/90 hover:bg-white/20"
						aria-label="關閉全螢幕"
						@click="emit('update:fullscreen', false)"
					>
						關閉
					</button>
				</div>
				<AlertCameraStreamSlots
					:slots="displaySlots"
					:is-single-layout="true"
					padding-class="p-4"
					@reload="emit('reload-stream', $event)"
				/>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue"
import AlertCameraStreamSlots, {
	type CameraStreamSlot,
	type CameraStreamState,
} from "~/components/alerts/AlertCameraStreamSlots.vue"

export type AccessEventCameraPopupItem = {
	key: string
	locationId: number
	deviceId: number
	cameraDeviceId: number
	zoneName?: string
	locationName?: string
	eventLabel?: string
	count: number
}

interface Props {
	open: boolean
	item: AccessEventCameraPopupItem | null
	streams: readonly CameraStreamState[]
	autoCloseMs: number
	autoCloseEpoch?: number
	isFullscreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	autoCloseEpoch: 0,
	isFullscreen: false,
})

const emit = defineEmits<{
	close: []
	"reload-stream": [deviceId: number]
	"update:fullscreen": [value: boolean]
}>()

const PEOPLE_COUNTING_ROUTE = "/access-control/people-counting"

const displaySlots = computed((): CameraStreamSlot[] => {
	const first = props.streams[0] ?? null
	return [{ key: first ? `cam-${first.deviceId}` : "empty-0", stream: first }]
})

const titleText = computed(() => {
	const zone = props.item?.zoneName || ""
	const loc = props.item?.locationName || ""
	const place = zone && loc ? `${zone} - ${loc}` : loc || zone || "門禁事件"
	return `門禁調閱｜${place}`
})

const handleNavigateToPeopleCounting = async () => {
	const locationId = props.item?.locationId
	const query =
		locationId != null && Number.isFinite(locationId) && locationId > 0
			? { locationId: String(Math.trunc(locationId)) }
			: undefined
	await navigateTo({ path: PEOPLE_COUNTING_ROUTE, query })
	emit("close")
}
</script>

<style scoped>
.access-event-camera-pop-enter-active,
.access-event-camera-pop-leave-active {
	transition:
		opacity 0.28s ease,
		transform 0.28s ease;
}

.access-event-camera-pop-enter-from,
.access-event-camera-pop-leave-to {
	opacity: 0;
	transform: translateY(1rem) scale(0.96);
}

@keyframes access-event-camera-countdown {
	from {
		transform: scaleX(1);
	}
	to {
		transform: scaleX(0);
	}
}

.h-1[aria-hidden="true"] {
	animation: access-event-camera-countdown linear forwards;
}
</style>
