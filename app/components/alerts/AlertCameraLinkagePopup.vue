<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="open"
				class="fixed inset-0 z-[2100] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				aria-label="攝影機彈窗"
			>
				<div class="dialog-panel-bg w-full max-w-6xl overflow-hidden rounded-3xl p-4 2xl:p-6">
					<div class="mb-3 flex items-center justify-between">
						<div class="flex flex-col gap-1">
							<h3 class="text-lg font-semibold tracking-[2px] text-white 2xl:text-xl">攝影機連動</h3>
							<p v-if="items.length > 0" class="text-xs text-white/70 2xl:text-sm">
								第 {{ activeIndex + 1 }} / {{ items.length }} 則連動
								<template v-if="items[activeIndex]?.count > 1">
									（重複 {{ items[activeIndex].count }} 次）
								</template>
							</p>
						</div>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉攝影機彈窗"
							@click="emit('close')"
						>
							&times;
						</button>
					</div>

					<div class="mb-3 flex items-center gap-2" v-if="items.length > 1">
						<button
							type="button"
							class="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/85 hover:bg-white/10 disabled:opacity-50"
							:disabled="activeIndex <= 0"
							aria-label="上一則連動"
							@click="emit('prev')"
						>
							上一則
						</button>
						<button
							type="button"
							class="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/85 hover:bg-white/10 disabled:opacity-50"
							:disabled="activeIndex >= items.length - 1"
							aria-label="下一則連動"
							@click="emit('next')"
						>
							下一則
						</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/85 hover:bg-white/10"
							aria-label="重新載入目前連動畫面"
							@click="emit('reload')"
						>
							重新載入
						</button>
					</div>

					<div class="h-[70vh] w-full overflow-hidden rounded-2xl border border-white/15 bg-black p-2">
						<div
							:class="[
								'grid h-full w-full gap-2',
								streams.length <= 1 ? 'grid-cols-1' : 'grid-cols-2',
							]"
						>
							<div
								v-for="(s, idx) in streams"
								:key="`cam-${s.deviceId}-${idx}`"
								class="relative overflow-hidden rounded-xl border border-white/10 bg-black"
							>
								<div class="absolute left-2 top-2 z-10 rounded bg-black/60 px-2 py-1 text-xs text-white/90">
									{{ s.deviceName || `設備 ${s.deviceId}` }}
								</div>
								<VideoPlayer :webrtc-url="s.webrtcUrl" :stream-status="s.streamStatus" />
								<p
									v-if="s.error"
									class="absolute inset-x-0 bottom-0 z-10 bg-black/60 p-2 text-xs text-rose-300"
								>
									{{ s.error }}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import VideoPlayer from "~/components/surveillance/VideoPlayer.vue"

export type CameraPopupItem = {
	key: string
	ruleId: number
	cameraDeviceIds: number[]
	createdAt: number
	count: number
}

export type CameraStreamState = {
	deviceId: number
	deviceName: string
	webrtcUrl: string
	streamStatus: "running" | "stopped" | "loading" | "error"
	error: string
}

interface Props {
	open: boolean
	items: readonly CameraPopupItem[]
	activeIndex: number
	streams: readonly CameraStreamState[]
}

defineProps<Props>()

const emit = defineEmits<{
	close: []
	prev: []
	next: []
	reload: []
}>()
</script>

