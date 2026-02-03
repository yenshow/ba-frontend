<template>
	<div v-if="logs.length === 0" class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center">
		<p class="text-base text-white/60 2xl:text-lg">尚無進出場記錄</p>
	</div>

	<div v-else>
		<table class="w-full border-b-2 border-r-2 border-l-2 border-white/20">
			<thead class="bg-white/20">
				<tr class="font-semibold text-white/80 text-center text-xs 2xl:text-sm">
					<th class="p-2">
						設備截圖
					</th>	
					<th class="p-2">
						進場單位
					</th>
					<th class="p-2">
						工號
					</th>
					<th class="p-2">
						姓名
					</th>
					<th class="p-2">
						事件
					</th>
					<th class="p-2">
						時間
					</th>
				</tr>	
			</thead>
			<tbody>
				<tr
					v-for="log in logs"
					:key="log.id"
					class="border-b border-white/10 text-center text-white"
				>
					<td class="p-2 flex items-center justify-center">
						<div class="relative h-12 w-12 overflow-hidden bg-white/10 2xl:h-16 2xl:w-16">
							<!-- 載入中 -->
							<Transition name="fade">
								<div
									v-if="imageLoadingStates[log.id]"
									key="loading"
									class="absolute inset-0 flex items-center justify-center bg-white/5"
								>
									<div class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/80"></div>
								</div>
							</Transition>

							<!-- 圖片 -->
							<Transition name="fade">
								<img
									v-if="imageUrls[log.id] && !imageLoadingStates[log.id] && !imageErrorStates[log.id]"
									key="image"
									:src="imageUrls[log.id]"
									:alt="`${log.personName || '未知'} 設備截圖`"
									class="absolute inset-0 h-full w-full object-cover"
									@error="handleImageError($event, log.id)"
								/>
							</Transition>

							<!-- 佔位符 SVG -->
							<Transition name="fade">
								<div
									v-if="(!imageUrls[log.id] || imageErrorStates[log.id]) && !imageLoadingStates[log.id]"
									class="absolute inset-0 flex items-center justify-center"
								>
									<svg
										class="h-full w-full text-white"
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
						</div>
					</td>
					<td class="p-2 text-sm 2xl:text-base">
						{{ log.unit?.name || log.unitName || "-" }}
					</td>
					<td class="p-2 text-sm 2xl:text-base">
						{{ log.employeeId || log.personnelId || "-" }}
					</td>
					<td class="p-2 text-sm 2xl:text-base">
						{{ log.personName || "-" }}
					</td>
					<td class="p-2">
						<span
							:class="[
								'rounded-full px-2 py-0.5 text-xs font-medium 2xl:text-sm',
								log.eventType === 'entry'
									? 'bg-green-500/30 text-green-200'
									: log.eventType === 'exit'
										? 'bg-blue-500/30 text-blue-200'
										: 'bg-red-500/70 text-red-200'
							]"
						>
							{{
								log.eventType === "entry"
									? "進入"
									: log.eventType === "exit"
										? "離開"
										: "失敗"
							}}
						</span>
					</td>
					<td class="p-2 text-xs 2xl:text-sm">
						<div class="flex flex-col items-center gap-1">
							<span>{{ formatDate(log.timestamp) }}</span>
							<span>{{ formatTime(log.timestamp) }}</span>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { PeopleCountingLog } from "~/types/peopleCounting";
import { useExternalDataApi } from "~/composables/systems/useExternalDataApi";
import { convertBase64ToImageUrl } from "~/utils/imageUtils";

interface Props {
	logs: PeopleCountingLog[];
}

const props = defineProps<Props>();

const { getBatchPicturesByUri } = useExternalDataApi();
const imageUrls = ref<Record<string | number, string>>({});
const imageLoadingStates = ref<Record<string | number, boolean>>({});
const imageErrorStates = ref<Record<string | number, boolean>>({});
const imageCache = new Map<string, string>();

// 格式化日期和時間：從 timestamp 中提取
const formatDate = (timestamp: string): string => {
	if (!timestamp) return "-";
	return timestamp.split(" ")[0] || "-";
};

const formatTime = (timestamp: string): string => {
	if (!timestamp) return "-";
	return timestamp.split(" ")[1] || "-";
};

const handleImageError = (_event: Event, logId: string | number) => {
	imageErrorStates.value[logId] = true;
	delete imageUrls.value[logId];
};

const loadAllImages = async () => {
	const logsToLoad = props.logs.filter(
		(log) =>
			log.deviceScreenshotUrl &&
			!imageUrls.value[log.id] &&
			!imageLoadingStates.value[log.id]
	);

	if (logsToLoad.length === 0) return;

	const picUris: string[] = [];
	const logIdMap = new Map<string, string | number>();

	for (const log of logsToLoad) {
		const picUri = log.deviceScreenshotUrl!.trim();
		if (imageCache.has(picUri)) {
			imageUrls.value[log.id] = imageCache.get(picUri)!;
		} else {
			picUris.push(picUri);
			logIdMap.set(picUri, log.id);
		}
	}

	if (picUris.length === 0) return;

	for (const picUri of picUris) {
		const logId = logIdMap.get(picUri);
		if (logId) {
			imageLoadingStates.value[logId] = true;
		}
	}

	try {
		const result = await getBatchPicturesByUri(picUris);

		if (result.success && result.data?.results) {
			result.data.results.forEach((item) => {
				if (item.success && item.image) {
					const logId = logIdMap.get(item.picUri);
					if (logId) {
						const imageUrl = convertBase64ToImageUrl(item.image);
						imageUrls.value[logId] = imageUrl;
						imageCache.set(item.picUri, imageUrl);
					}
				}
			});
		}
	} catch (error) {
		console.error("批次載入圖片失敗:", error);
	} finally {
		for (const logId of logIdMap.values()) {
			imageLoadingStates.value[logId] = false;
		}
	}
};

// 監聽 logs 變化，載入新記錄的圖片
watch(
	() => props.logs,
	() => {
		loadAllImages();
	},
	{ immediate: true, deep: true }
);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>

