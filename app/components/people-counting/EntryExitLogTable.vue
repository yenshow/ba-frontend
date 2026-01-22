<template>
	<div v-if="logs.length === 0" class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center">
		<p class="text-sm text-white/60 xl:text-base">尚無進出場記錄</p>
	</div>

	<div v-else>
		<table class="w-full border-collapse">
			<thead>
				<tr class="border-b-2 border-white/30 font-semibold text-white/80 text-center text-xs xl:text-sm">
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
					<td class="p-2">
						<div class="relative h-12 w-12 overflow-hidden bg-white/10 xl:h-16 xl:w-16">
							<!-- 載入中 -->
							<div
								v-if="imageLoadingStates[log.id]"
								class="flex h-full w-full items-center justify-center"
							>
								<div class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/80"></div>
							</div>

							<!-- 圖片 -->
							<img
								v-else-if="imageUrls[log.id]"
								:src="imageUrls[log.id]"
								:alt="`${log.personName || '未知'} 設備截圖`"
								class="h-full w-full object-cover"
								@error="handleImageError($event, log.id)"
							/>

							<!-- 佔位符 -->
							<img
								v-else
								src="/people-counting/no-photo-placeholder.png"
								alt="無設備截圖"
								class="h-full w-full object-cover"
							/>
						</div>
					</td>
					<td class="p-2 text-sm xl:text-base">
						{{ log.unit?.name || log.unitName || "-" }}
					</td>
					<td class="p-2 text-sm xl:text-base">
						{{ log.employeeId || log.personnelId || "-" }}
					</td>
					<td class="p-2 text-sm xl:text-base">
						{{ log.personName || "-" }}
					</td>
					<td class="p-2">
						<span
							:class="[
								'rounded-full px-2 py-0.5 text-xs font-medium xl:text-sm',
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
					<td class="p-2 text-xs  xl:text-sm">
						{{ log.timestamp }}
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

const { getPictureByUri } = useExternalDataApi();
const imageUrls = ref<Record<string | number, string>>({});
const imageLoadingStates = ref<Record<string | number, boolean>>({});
const imageCache = new Map<string, string>();

/**
 * 處理圖片載入錯誤
 */
const handleImageError = (event: Event, logId: string | number) => {
	const img = event.target as HTMLImageElement;
	img.src = "/people-counting/no-photo-placeholder.png";
	// 清除錯誤的圖片 URL
	delete imageUrls.value[logId];
};

/**
 * 載入單個記錄的圖片
 */
const loadImage = async (log: PeopleCountingLog) => {
	// 如果沒有 deviceScreenshotUrl（實際上是 snap_pic_url），不載入
	if (!log.deviceScreenshotUrl || log.deviceScreenshotUrl.trim() === "") {
		return;
	}

	const picUri = log.deviceScreenshotUrl.trim();
	const logId = log.id;

	// 檢查緩存
	if (imageCache.has(picUri)) {
		imageUrls.value[logId] = imageCache.get(picUri)!;
		return;
	}

	// 如果正在載入，不重複載入
	if (imageLoadingStates.value[logId]) {
		return;
	}

	// 開始載入
	imageLoadingStates.value[logId] = true;

	try {
		const result = await getPictureByUri(picUri);

		if (result.success && result.data?.image) {
			const imageUrl = convertBase64ToImageUrl(result.data.image);
			imageUrls.value[logId] = imageUrl;
			imageCache.set(picUri, imageUrl);
		}
	} catch (error) {
		console.error("載入圖片失敗:", error);
	} finally {
		imageLoadingStates.value[logId] = false;
	}
};

/**
 * 載入所有記錄的圖片
 */
const loadAllImages = () => {
	props.logs.forEach((log) => {
		if (log.deviceScreenshotUrl && !imageUrls.value[log.id] && !imageLoadingStates.value[log.id]) {
			loadImage(log);
		}
	});
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

