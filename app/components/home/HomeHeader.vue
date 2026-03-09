<template>
	<div class="grid grid-cols-3">
		<!-- 左側：品牌標識 -->
		<div class="col-span-1 flex items-center justify-center">
			<img src="/layout/yenshow-logo.svg" alt="YENSHOW" class="h-20 object-contain 2xl:h-24" />
		</div>

		<!-- 中間：專案資訊 -->
		<div class="group col-span-1 flex items-center justify-center">
			<div class="relative flex h-28 items-center justify-center 2xl:h-36">
				<img
					v-if="projectImageSrc"
					:src="projectImageSrc"
					alt="專案圖片"
					class="h-28 object-contain 2xl:h-36"
				/>
				<div
					v-else
					class="rounded-lg border-2 border-white/20 bg-white/5 px-6 py-3 text-center text-sm text-white/80 2xl:text-base"
				>
					請上傳或設定專案圖片
				</div>

				<template v-if="isOperator">
					<button
						type="button"
						class="absolute -right-2 -top-2 hidden rounded-full bg-black/30 px-3 py-1 text-sm text-white backdrop-blur transition hover:bg-black/50 group-hover:block 2xl:text-base"
						aria-label="編輯專案圖片"
						@click="isProjectImageEditOpen = true"
						@keydown.enter="isProjectImageEditOpen = true"
						@keydown.space.prevent="isProjectImageEditOpen = true"
					>
						編輯
					</button>
				</template>
			</div>

			<template v-if="isOperator">
				<EditMockDialog
					v-model="isProjectImageEditOpen"
					title="編輯專案圖片"
					:value="projectImageSrcRaw"
					input-mode="image"
					placeholder="例如：https://... 或上傳圖片"
					preview-alt="專案圖片預覽"
					@save="saveProjectImageSrc"
					@reset="resetProjectImageSrc"
					@upload="handleUploadProjectImage"
				/>
			</template>
		</div>

		<!-- 右側：日期時間 -->
		<ClientOnly>
			<div class="col-span-1 flex flex-col items-center justify-center text-white">
				<div class="ms-[12px] text-[36px] font-semibold tracking-[12px] 2xl:text-[48px]">
					{{ formattedDate.date }}
				</div>
				<div class="ms-[6px] text-[21px] tracking-[6px] 2xl:text-[28px]">
					{{ formattedDate.weekday }} {{ formattedDate.period }} {{ formattedDate.time }}
				</div>
			</div>
			<template #fallback>
				<div class="col-span-1 flex flex-col items-center justify-center text-white">
					<div class="ms-[12px] text-[36px] font-semibold tracking-[12px] 2xl:text-[48px]">--</div>
					<div class="ms-[6px] text-[21px] tracking-[6px] 2xl:text-[28px]">--</div>
				</div>
			</template>
		</ClientOnly>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import EditMockDialog from "~/components/common/EditMockDialog.vue";
import { useAppSettings } from "~/composables/core/useAppSettings";
import { useUploadBaseUrl } from "~/composables/core/useUploadBaseUrl";
import { resolveUploadUrl } from "~/utils/apiUtils";
import { createSafeFileName } from "~/utils/fileUtils";
import { useAuth } from "~/composables/core/useAuth";

// --- 專案圖片設定 ---

const {
	value: projectImageSrcRaw,
	save: saveProjectImageSrc,
	reset: resetProjectImageSrc,
	uploadFile: uploadProjectImage
} = useAppSettings({
	key: "home_header_project_image",
	defaultValue: ""
});

const { isOperator } = useAuth();

const apiBase = useUploadBaseUrl();
const projectImageSrc = computed(() =>
	resolveUploadUrl(projectImageSrcRaw.value ?? "", apiBase)
);
const isProjectImageEditOpen = ref(false);

const handleUploadProjectImage = async (file: File) => {
	try {
		const safeFile = createSafeFileName("project-header", file, "png");
		await uploadProjectImage(safeFile);
		isProjectImageEditOpen.value = false;
	} catch (error) {
		console.error("Upload failed:", error);
	}
};

// --- 日期時間邏輯 ---

const formatDateTime = (date: Date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
	const weekday = weekdays[date.getDay()];

	const hours = date.getHours();
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");

	const period = hours < 12 ? "上午" : "下午";
	// 12小時制顯示
	const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
	const time = `${String(displayHours).padStart(2, "0")}:${minutes}:${seconds}`;

	return {
		date: `${year}/${month}/${day}`,
		weekday,
		period,
		time
	};
};

const currentDateTime = ref(new Date());
const formattedDate = computed(() => formatDateTime(currentDateTime.value));

let timeInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
	// 初始化時間
	currentDateTime.value = new Date();
	// 每秒更新
	timeInterval = setInterval(() => {
		currentDateTime.value = new Date();
	}, 1000);
});

onBeforeUnmount(() => {
	if (timeInterval) {
		clearInterval(timeInterval);
		timeInterval = null;
	}
});
</script>
