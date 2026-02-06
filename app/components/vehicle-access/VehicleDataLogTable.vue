<template>
	<div
		v-if="logs.length === 0"
		class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center"
	>
		<p class="text-base text-white/60 2xl:text-lg">尚無過車記錄</p>
	</div>

	<div v-else ref="tableContainerRef" class="overflow-x-auto">
		<table class="w-full border-b-2 border-l-2 border-r-2 border-white/20">
			<thead class="bg-white/20">
				<tr class="text-center text-xs font-semibold text-white/80 2xl:text-sm">
					<th class="p-2">車牌圖片</th>
					<th class="p-2">車牌</th>
					<th class="p-2">車道名稱</th>
					<th class="p-2">車主名稱</th>
					<th class="p-2">放行結果</th>
					<th class="p-2">時間</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="log in logs" :key="log.id" class="border-b border-white/10 text-center text-white">
					<td class="flex items-center justify-center p-2">
						<button
							type="button"
							class="relative block h-12 w-12 overflow-hidden rounded bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400 2xl:h-16 2xl:w-16"
							:aria-label="`放大檢視 ${log.license_plate ?? ''} 車牌圖片`"
							:disabled="
								!resolvedImageUrls[log.id] || imageLoadingStates[log.id] || imageErrorStates[log.id]
							"
							@click="openLightbox(resolvedImageUrls[log.id])"
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
										resolvedImageUrls[log.id] && !imageLoadingStates[log.id] && !imageErrorStates[log.id]
									"
									key="image"
									:src="resolvedImageUrls[log.id]"
									:alt="`${log.license_plate ?? ''} 車牌`"
									class="absolute inset-0 h-full w-full object-cover"
									@error="handleImageError(log.id)"
								/>
							</Transition>
							<Transition name="fade">
								<div
									v-if="
										(!resolvedImageUrls[log.id] || imageErrorStates[log.id]) && !imageLoadingStates[log.id]
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
											d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
								</div>
							</Transition>
						</button>
					</td>
					<td class="p-2 text-sm font-medium 2xl:text-base">
						{{ log.license_plate?.trim() || "-" }}
					</td>
					<td class="p-2 text-sm 2xl:text-base">
						{{ log.lane_name?.trim() || "-" }}
					</td>
					<td class="p-2 text-sm 2xl:text-base">
						{{ log.owner_name?.trim() || "-" }}
					</td>
					<td class="p-2">
						<span
							:class="['inline-block rounded-full px-2 py-0.5 text-xs font-medium 2xl:text-sm', getPassResultTagClass(log)]"
							:aria-label="getPassResultLabel(log)"
						>
							{{ getPassResultLabel(log) }}
						</span>
					</td>
					<td class="p-2 text-xs 2xl:text-sm">
						<div class="flex flex-col items-center gap-0.5">
							<span>{{ formatDate(log.trigger_time) }}</span>
							<span>{{ formatTime(log.trigger_time) }}</span>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<!-- 車牌圖片 lightbox -->
	<Teleport to="body">
		<Transition name="lightbox-fade">
			<div
				v-if="lightboxImageUrl"
				ref="lightboxRef"
				class="fixed inset-0 z-[4000] flex items-center justify-center bg-black/80 p-4"
				role="dialog"
				aria-modal="true"
				aria-label="車牌圖片放大檢視"
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
					alt="車牌圖片"
					class="max-h-[90vh] max-w-full object-contain"
					@click.stop
				/>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from "vue";
import type { VehicleDataLog } from "~/types/vehicleAccess";
import { formatDate, formatTime } from "~/utils/dateUtils";
import { useExternalDataApi } from "~/composables/systems/useExternalDataApi";
import { convertBase64ToImageUrl } from "~/utils/imageUtils";

interface Props {
	logs: VehicleDataLog[];
}

const props = defineProps<Props>();

const { getBatchPicturesByUri } = useExternalDataApi();
const resolvedImageUrls = ref<Record<number, string>>({});
const imageLoadingStates = ref<Record<number, boolean>>({});
const imageErrorStates = ref<Record<number, boolean>>({});
const lightboxImageUrl = ref<string | null>(null);
const tableContainerRef = ref<HTMLElement | null>(null);
const hasTableEnteredView = ref(false);
let intersectionObserver: IntersectionObserver | null = null;

const lightboxRef = ref<HTMLElement | null>(null);
const openLightbox = (url: string) => {
	if (url) {
		lightboxImageUrl.value = url;
		nextTick(() => lightboxRef.value?.focus());
	}
};
const closeLightbox = () => {
	lightboxImageUrl.value = null;
};

const isDirectUrl = (url: string): boolean =>
	url.startsWith("http://") || url.startsWith("https://");

/** 使用批次 API 一次取得所有需解析的圖片，減少請求數 */
const loadAllImages = async () => {
	const toBatch: { id: number; url: string }[] = [];

	for (const log of props.logs) {
		const url = log.plate_license_image_url?.trim();
		if (!url) continue;
		const id = log.id;
		if (resolvedImageUrls.value[id]) continue;
		if (isDirectUrl(url)) {
			resolvedImageUrls.value[id] = url;
		} else {
			toBatch.push({ id, url });
		}
	}

	if (toBatch.length === 0) return;

	for (const { id } of toBatch) {
		imageLoadingStates.value[id] = true;
		imageErrorStates.value[id] = false;
	}

	try {
		const picUris = toBatch.map(({ url }) => url);
		const result = await getBatchPicturesByUri(picUris);
		const results = result.data?.results ?? [];
		const uriToLog = new Map<string, { id: number }>();
		toBatch.forEach(({ id, url }) => uriToLog.set(url, { id }));

		for (const item of results) {
			const log = uriToLog.get(item.picUri);
			if (!log) continue;
			if (item.success && item.image) {
				resolvedImageUrls.value[log.id] = convertBase64ToImageUrl(item.image);
			} else {
				imageErrorStates.value[log.id] = true;
			}
			imageLoadingStates.value[log.id] = false;
		}
		for (const { id } of toBatch) {
			if (imageLoadingStates.value[id]) {
				imageErrorStates.value[id] = true;
				imageLoadingStates.value[id] = false;
			}
		}
	} catch {
		for (const { id } of toBatch) {
			imageErrorStates.value[id] = true;
			imageLoadingStates.value[id] = false;
		}
	}
};

const maybeLoadImages = () => {
	if (!hasTableEnteredView.value) return;
	loadAllImages();
};

watch(
	() => props.logs,
	newLogs => {
		const newIds = new Set((newLogs ?? []).map((l: VehicleDataLog) => l.id));
		for (const id of Object.keys(resolvedImageUrls.value).map(Number)) {
			if (!newIds.has(id)) {
				delete resolvedImageUrls.value[id];
				delete imageLoadingStates.value[id];
				delete imageErrorStates.value[id];
			}
		}
		maybeLoadImages();
	},
	{ immediate: true, deep: true }
);

const setupIntersectionObserver = () => {
	if (typeof IntersectionObserver === "undefined") {
		hasTableEnteredView.value = true;
		maybeLoadImages();
		return;
	}
	if (!tableContainerRef.value || intersectionObserver) return;
	intersectionObserver = new IntersectionObserver(
		entries => {
			if (entries[0]?.isIntersecting) {
				hasTableEnteredView.value = true;
				maybeLoadImages();
			}
		},
		{ rootMargin: "50px", threshold: 0 }
	);
	intersectionObserver.observe(tableContainerRef.value);
};

watch(
	() => props.logs.length > 0,
	hasLogs => {
		if (hasLogs) nextTick(setupIntersectionObserver);
	},
	{ immediate: true }
);

onBeforeUnmount(() => {
	if (intersectionObserver && tableContainerRef.value) {
		intersectionObserver.unobserve(tableContainerRef.value);
		intersectionObserver.disconnect();
		intersectionObserver = null;
	}
});

const handleImageError = (logId: number) => {
	imageErrorStates.value[logId] = true;
	delete resolvedImageUrls.value[logId];
};

/** 車道類型（1 進 2 出），後端自 lane_info 帶入 */
const getLaneType = (log: VehicleDataLog): number | null => log.lane_type ?? null;

/** 放行結果文字：allow_result 0=拒絕；1 依 lane_type 顯示進入/離開/放行 */
const getPassResultLabel = (log: VehicleDataLog): string => {
	if (log.allow_result === 0) return "拒絕";
	if (log.allow_result === 1) {
		const lt = getLaneType(log);
		if (lt === 1) return "進入";
		if (lt === 2) return "離開";
		return "放行";
	}
	return "-";
};

/** 放行結果樣式：拒絕=紅、進入=綠、離開=青藍、其他=灰 */
const getPassResultTagClass = (log: VehicleDataLog): string => {
	if (log.allow_result === 0) return "bg-red-500/70 text-red-200";
	if (log.allow_result === 1) {
		const lt = getLaneType(log);
		if (lt === 1) return "bg-green-500/30 text-green-200";
		if (lt === 2) return "bg-cyan-500/30 text-cyan-200";
	}
	return "bg-white/20 text-white/80";
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
.lightbox-fade-enter-active,
.lightbox-fade-leave-active {
	transition: opacity 0.2s ease;
}
.lightbox-fade-enter-from,
.lightbox-fade-leave-to {
	opacity: 0;
}
</style>
