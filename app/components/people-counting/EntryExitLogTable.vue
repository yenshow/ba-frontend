<template>
	<div class="monitoring-log-panel flex min-h-[320px] w-full min-w-0 flex-col 2xl:min-h-[400px]">
		<div
			v-if="logs.length === 0"
			class="flex flex-1 items-center justify-center rounded-lg border-2 border-white/20 bg-white/5 p-8"
			role="status"
		>
			<MonitoringLogEmptyState message="尚無進出場記錄" />
		</div>

		<div v-else>
			<table class="w-full border-b-2 border-l-2 border-r-2 border-white/20">
				<thead class="bg-white/20">
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
						class="border-b border-white/10 text-center text-white"
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
												imageUrls[log.id] && !imageLoadingStates[log.id] && !imageErrorStates[log.id]
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
												(!imageUrls[log.id] || imageErrorStates[log.id]) && !imageLoadingStates[log.id]
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
					class="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
import MonitoringLogEmptyState from "~/components/monitoring/MonitoringLogEmptyState.vue"
import type { PeopleCountingLog } from "~/types/peopleCounting"
import { useResolvedMediaList } from "~/composables/core/useImageCenter"
import {
	formatLogEventLabel,
	formatLogVerifyMethod,
	formatLogText,
	getLogEventBadgeClass,
	normalizeLogDisplayColumns,
	type PeopleCountingLogColumnKey,
} from "~/utils/peopleCountingLogColumns"

type PeopleCountingRecordColumnKey =
	| "screenshot"
	| "unit_group"
	| "name"
	| "device_name"
	| "verify_method"
	| "event"
	| "time"

interface Props {
	logs: PeopleCountingLog[]
	dataSource?: "yscp" | "access_control" | "isapi_camera"
	/** 僅攝影機人流：套用區域表單勾選的欄位 */
	displayColumns?: PeopleCountingLogColumnKey[] | string[] | null
}

const props = withDefaults(defineProps<Props>(), {
	dataSource: undefined,
	displayColumns: null,
})

const FIXED_RECORD_COLUMNS: PeopleCountingRecordColumnKey[] = [
	"screenshot",
	"unit_group",
	"name",
	"device_name",
	"verify_method",
	"event",
	"time",
]

const recordColumnLabels: Record<PeopleCountingRecordColumnKey, string> = {
	screenshot: "設備截圖",
	unit_group: "人員群組",
	name: "姓名",
	device_name: "出入口名稱",
	verify_method: "方式",
	event: "事件",
	time: "時間",
}

const cameraColumnsFromZoneForm = computed((): PeopleCountingRecordColumnKey[] => {
	const picked = normalizeLogDisplayColumns(props.displayColumns)
	const out: PeopleCountingRecordColumnKey[] = []
	for (const k of picked) {
		if (k === "screenshot") out.push("screenshot")
		else if (k === "unit") out.push("unit_group")
		if (k === "name") out.push("name")
		else if (k === "device_name") out.push("device_name")
		else if (k === "verify_method") out.push("verify_method")
	}
	const pickedCols: PeopleCountingRecordColumnKey[] = out.length
		? out
		: ["screenshot", "name"]
	return [...new Set<PeopleCountingRecordColumnKey>([...pickedCols, "event", "time"])]
})

const recordColumns = computed((): PeopleCountingRecordColumnKey[] => {
	// 只要外層有傳 displayColumns（地點管理勾選欄位），就以該設定為準
	if (Array.isArray(props.displayColumns) && props.displayColumns.length > 0) {
		return cameraColumnsFromZoneForm.value
	}
	return FIXED_RECORD_COLUMNS
})

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
