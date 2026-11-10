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
					class="dialog-panel-bg mx-4 flex h-[94vh] max-h-[94vh] w-full flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
					:class="panelMaxWidthClass"
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
						<div class="flex shrink-0 items-center gap-3">
							<slot name="header-actions" />
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉對話框"
								@click="emit('close')"
							>
								&times;
							</button>
						</div>
					</header>

					<div class="flex min-h-0 flex-1 flex-col overflow-hidden pr-7 2xl:pr-8">
						<div
							class="flex min-h-0 flex-1 flex-col overflow-hidden"
							:class="isUiLocked ? 'pointer-events-none select-none opacity-40' : ''"
						>
							<slot />
						</div>

						<div
							v-if="isUiLocked"
							class="pointer-events-auto mt-3 shrink-0 rounded-2xl border border-white/15 bg-[#0a2230] px-4 py-3"
							role="status"
							:aria-live="isStalled ? 'assertive' : 'polite'"
						>
							<div class="flex flex-col gap-2.5">
								<div class="flex items-start gap-3">
									<div
										class="mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-200"
										aria-hidden="true"
									/>
									<div class="min-w-0 flex-1 space-y-0.5">
										<div class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
											<p class="text-base font-semibold text-white">
												{{ displayPrimary }}
											</p>
											<span
												v-if="syncProgress?.percent != null"
												class="text-sm tabular-nums text-cyan-100/80"
											>
												{{ syncProgress.percent }}%
											</span>
										</div>
										<p v-if="syncProgress?.detail" class="truncate text-sm text-white/70">
											{{ syncProgress.detail }}
										</p>
										<p class="text-xs text-white/55">
											<span v-if="syncProgress?.stats">{{ syncProgress.stats }}</span>
											<span v-if="syncProgress?.stats && elapsedLabel"> · </span>
											<span v-if="elapsedLabel">{{ elapsedLabel }}</span>
										</p>
									</div>
									<button
										type="button"
										class="btn-dialog-muted shrink-0"
										:disabled="failedCount <= 0"
										:aria-label="
											failedCount > 0 ? `查看錯誤 ${failedCount} 筆` : '尚無錯誤'
										"
										@click="handleOpenWarnings"
									>
										查看錯誤
										<span v-if="failedCount > 0" class="ms-1 text-amber-200">
											({{ failedCount }})
										</span>
									</button>
								</div>

								<ProgressMeter
									:percent="syncProgress?.percent ?? null"
									:tone="isStalled ? 'warning' : 'default'"
									aria-label="同步進度"
								/>

								<p
									v-if="isStalled"
									class="text-sm leading-relaxed text-amber-100/90"
								>
									進度似乎停滯。可關閉此視窗（背景仍可能繼續）；若已有失敗筆可先查看錯誤。
								</p>
								<p v-else class="text-xs text-white/45">
									可關閉視窗，背景同步仍會繼續。
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
import { computed, onBeforeUnmount, ref, watch } from "vue"
import ProgressMeter from "~/components/common/ProgressMeter.vue"
import {
	DEVICE_SYNC_STALL_MS,
	formatSyncElapsed,
	type DeviceSyncOverlayProgress,
} from "~/utils/deviceSyncProgress"

const props = withDefaults(
	defineProps<{
		modelValue: boolean
		title: string
		titleId: string
		titleMeta?: string | null
		isUiLocked?: boolean
		syncProgress?: DeviceSyncOverlayProgress | null
		/** Tailwind max-width（預設 max-w-7xl） */
		panelMaxWidthClass?: string
	}>(),
	{
		panelMaxWidthClass: "max-w-7xl",
		syncProgress: null,
	},
)

const emit = defineEmits<{
	close: []
	openWarnings: []
}>()

const nowTick = ref(Date.now())
const lastHeartbeatAt = ref<number | null>(null)
const lastHeartbeatKey = ref<string | null>(null)
let tickTimer: ReturnType<typeof setInterval> | null = null

const clearTickTimer = () => {
	if (tickTimer == null) return
	clearInterval(tickTimer)
	tickTimer = null
}

const startTickTimer = () => {
	clearTickTimer()
	nowTick.value = Date.now()
	tickTimer = setInterval(() => {
		nowTick.value = Date.now()
	}, 1000)
}

const resetHeartbeat = () => {
	lastHeartbeatAt.value = Date.now()
	lastHeartbeatKey.value = props.syncProgress?.heartbeatKey ?? null
}

watch(
	() => props.isUiLocked,
	(locked) => {
		if (locked) {
			resetHeartbeat()
			startTickTimer()
			return
		}
		clearTickTimer()
		lastHeartbeatAt.value = null
		lastHeartbeatKey.value = null
	},
	{ immediate: true },
)

watch(
	() => props.syncProgress?.heartbeatKey,
	(key) => {
		if (!props.isUiLocked) return
		if (key == null) return
		if (key === lastHeartbeatKey.value) return
		lastHeartbeatKey.value = key
		lastHeartbeatAt.value = Date.now()
	},
)

onBeforeUnmount(() => {
	clearTickTimer()
})

const displayPrimary = computed(() => props.syncProgress?.primary || "同步中，請稍候…")

const elapsedLabel = computed(() =>
	formatSyncElapsed(props.syncProgress?.startedAt ?? null, nowTick.value),
)

const failedCount = computed(() => Math.max(0, Number(props.syncProgress?.failedCount) || 0))

const isStalled = computed(() => {
	if (!props.isUiLocked || lastHeartbeatAt.value == null) return false
	return nowTick.value - lastHeartbeatAt.value >= DEVICE_SYNC_STALL_MS
})

const handleOpenWarnings = () => {
	if (failedCount.value <= 0) return
	emit("openWarnings")
}
</script>
