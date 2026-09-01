<template>
	<div class="monitoring-log-panel flex min-h-[320px] w-full min-w-0 flex-col 2xl:min-h-[400px]">
		<div
			v-if="logs.length === 0"
			class="monitoring-log-empty flex flex-1 items-center justify-center rounded-lg p-8"
			role="status"
		>
			<MonitoringLogEmptyState message="尚無進出場記錄" />
		</div>

		<div v-else>
			<table class="monitoring-log-table w-full">
				<thead class="monitoring-chip-bg">
					<tr class="people-log-th text-center text-xs font-semibold text-white/80 2xl:text-sm">
						<th v-for="col in recordColumns" :key="col" class="people-log-cell-pad p-2">
							{{ recordColumnLabels[col] }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="log in logs"
						:key="log.id"
						class="monitoring-log-row text-center text-white"
					>
						<td
							v-for="col in recordColumns"
							:key="`${log.id}-${col}`"
							class="people-log-cell-pad p-2"
							:class="col === 'screenshot' ? 'flex items-center justify-center' : ''"
						>
							<template v-if="col === 'screenshot'">
								<button
									type="button"
									class="people-log-shot relative block h-12 w-12 overflow-hidden rounded bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400 2xl:h-16 2xl:w-16"
									:aria-label="`放大檢視 ${log.personName || '未知'} 設備截圖`"
									:disabled="
										!imageUrls[log.id] || imageLoadingStates[log.id] || imageErrorStates[log.id]
									"
									@click="openLightbox(imageUrls[log.id])"
								>
									<Transition name="fade">
										<div
											v-if="imageLoadingStates[log.id]"
											key="loading"
											class="absolute inset-0 flex items-center justify-center bg-white/5"
										>
											<div
												class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
											></div>
										</div>
									</Transition>
									<Transition name="fade">
										<img
											v-if="
												imageUrls[log.id] &&
												!imageLoadingStates[log.id] &&
												!imageErrorStates[log.id]
											"
											key="image"
											:src="imageUrls[log.id]"
											:alt="`${log.personName || '未知'} 設備截圖`"
											class="absolute inset-0 h-full w-full object-cover"
											@error="onImageError($event, log.id)"
										/>
									</Transition>
									<Transition name="fade">
										<div
											v-if="
												(!imageUrls[log.id] || imageErrorStates[log.id]) &&
												!imageLoadingStates[log.id]
											"
											class="absolute inset-0 flex items-center justify-center text-white/50"
											aria-hidden="true"
										>
											<svg
												class="h-8 w-8 2xl:h-10 2xl:w-10"
												fill="currentColor"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
												/>
											</svg>
										</div>
									</Transition>
								</button>
							</template>
							<template v-else-if="col === 'unit_group'">
								<span class="people-log-cell text-sm 2xl:text-base">{{
									formatLogText(log.unit?.name || log.unitName)
								}}</span>
							</template>
							<template v-else-if="col === 'name'">
								<span class="people-log-cell text-sm 2xl:text-base">{{
									formatLogText(log.personName)
								}}</span>
							</template>
							<template v-else-if="col === 'device_name'">
								<span class="people-log-cell text-sm 2xl:text-base">{{
									formatLogText(log.deviceName)
								}}</span>
							</template>
							<template v-else-if="col === 'verify_method'">
								<span class="people-log-cell text-sm 2xl:text-base">{{
									formatLogVerifyMethod(log)
								}}</span>
							</template>
							<template v-else-if="col === 'similarity'">
								<span class="people-log-cell text-sm 2xl:text-base">{{
									formatLogSimilarity(log)
								}}</span>
							</template>
							<template v-else-if="col === 'event'">
								<span
									:class="[
										'people-log-tag inline-block rounded-full px-2 py-0.5 text-xs font-medium 2xl:text-sm',
										getLogEventBadgeClass(log),
									]"
								>
									{{ formatLogEventLabel(log) }}
								</span>
							</template>
							<template v-else-if="col === 'time'">
								<div class="people-log-time flex flex-col items-center gap-1 text-xs 2xl:text-sm">
									<span>{{ parseTimestamp(log.timestamp).date }}</span>
									<span>{{ parseTimestamp(log.timestamp).time || "—" }}</span>
								</div>
							</template>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<Teleport to="body">
		<Transition name="lightbox-fade">
			<div
				v-if="lightboxImageUrl"
				ref="lightboxRef"
				class="fixed inset-0 z-[4000] flex items-center justify-center bg-black/80 p-4"
				role="dialog"
				aria-modal="true"
				aria-label="設備截圖放大檢視"
				tabindex="-1"
				@click.self="closeLightbox"
				@keydown.escape="closeLightbox"
			>
				<button
					type="button"
					class="absolute right-4 top-4 z-10 rounded-full monitoring-chip-bg p-2 text-white transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400"
					aria-label="關閉"
					@click="closeLightbox"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
				<img
					:src="lightboxImageUrl"
					alt="設備截圖"
					class="max-h-[90vh] max-w-full object-contain"
					@click.stop
				/>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, toRef, computed } from "vue"
import MonitoringLogEmptyState from "~/components/common/MonitoringLogEmptyState.vue"
import type { PeopleCountingLog } from "~/types/peopleCounting"
import { useResolvedMediaList } from "~/composables/core/useImageCenter"
import {
	buildRecordColumnLabels,
	formatLogEventLabel,
	formatLogVerifyMethod,
	formatLogSimilarity,
	formatLogText,
	getLogEventBadgeClass,
	resolvePeopleCountingRecordColumns,
	type PeopleCountingLogColumnKey,
} from "~/utils/peopleCountingLogColumns"
import {
	isFaceRecognitionCameraMode,
	type PeopleCountingCameraMode,
} from "~/utils/peopleCountingCameraMode"

interface Props {
	logs: PeopleCountingLog[]
	dataSource?: "yscp" | "access_control" | "isapi_camera"
	/** isapi_camera：人臉模式欄位語意同門禁（人員群組），人流模式才標「分區」 */
	cameraMode?: PeopleCountingCameraMode | string | null
	/** 攝影機模式：套用地點表單勾選的欄位 */
	displayColumns?: PeopleCountingLogColumnKey[] | string[] | null
}

const props = withDefaults(defineProps<Props>(), {
	dataSource: undefined,
	cameraMode: null,
	displayColumns: null,
})

const isCameraRegionColumns = computed(
	() =>
		props.dataSource === "isapi_camera" && !isFaceRecognitionCameraMode(props.cameraMode)
)

const recordColumns = computed(() =>
	resolvePeopleCountingRecordColumns({
		displayColumns: props.displayColumns,
		dataSource: props.dataSource,
		cameraMode: props.cameraMode,
	})
)

const recordColumnLabels = computed(() =>
	buildRecordColumnLabels(isCameraRegionColumns.value)
)

const parseTimestamp = (ts: string | null | undefined): { date: string; time: string } => {
	const raw = (ts ?? "").trim()
	if (!raw) return { date: "—", time: "—" }
	const i = raw.indexOf(" ")
	if (i === -1) return { date: raw, time: "" }
	return { date: raw.slice(0, i), time: raw.slice(i + 1) }
}

const {
	urls: imageUrls,
	loading: imageLoadingStates,
	errors: imageErrorStates,
	onImageError,
} = useResolvedMediaList(toRef(props, "logs"), {
	getRaw: (log) => log.deviceScreenshotUrl,
	getId: (log) => log.id,
})

const lightboxImageUrl = ref<string | null>(null)
const lightboxRef = ref<HTMLElement | null>(null)

const openLightbox = (url: string | undefined) => {
	if (url) {
		lightboxImageUrl.value = url
		nextTick(() => lightboxRef.value?.focus())
	}
}
const closeLightbox = () => {
	lightboxImageUrl.value = null
}
</script>
