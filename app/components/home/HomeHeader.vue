<template>
	<div class="grid grid-cols-3">
		<!-- 左側：品牌標識 -->
		<div class="col-span-1 flex items-center justify-center">
			<img src="/layout/yenshow-logo.svg" alt="YENSHOW" class="h-20 object-contain 2xl:h-24" />
		</div>

		<!-- 中間：專案資訊 -->
		<div class="group col-span-1 flex items-center justify-center">
			<div class="relative">
				<img :src="projectImageSrc" alt="專案名稱" class="h-28 object-contain 2xl:h-36" />

				<button
					type="button"
					class="absolute -right-2 -top-2 hidden rounded-full bg-black/35 px-3 py-1 text-sm 2xl:text-base text-white backdrop-blur transition hover:bg-black/50 group-hover:block"
					aria-label="編輯專案圖片"
					@click="isProjectImageEditOpen = true"
					@keydown.enter="isProjectImageEditOpen = true"
					@keydown.space.prevent="isProjectImageEditOpen = true"
				>
					編輯
				</button>
			</div>

			<EditMockDialog
				v-model="isProjectImageEditOpen"
				title="編輯專案圖片"
				:value="projectImageSrcRaw"
				input-mode="image"
				placeholder="例如：https://... 或 /layout/building-name.png"
				preview-alt="專案圖片預覽"
				@save="saveProjectImageSrc"
				@reset="resetProjectImageSrc"
				@upload="handleUploadProjectImage"
			/>
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
					<div class="ms-[12px] text-[36px] font-semibold tracking-[12px] 2xl:text-[48px]">
						--
					</div>
					<div class="ms-[6px] text-[21px] tracking-[6px] 2xl:text-[28px]">
						--
					</div>
				</div>
			</template>
		</ClientOnly>
	</div>
</template>

<script setup lang="ts">
import EditMockDialog from "~/components/common/EditMockDialog.vue";
import { useAppSettings } from "~/composables/core/useAppSettings";

interface Props {
	projectName?: string;
	constructionCompany?: string;
}

const props = withDefaults(defineProps<Props>(), {
	projectName: "蝶蛹新天地",
	constructionCompany: "遠岫建設有限公司"
});

const defaultProjectImageSrc = "/layout/building-name.png";

const { value: projectImageSrcRaw, save: saveProjectImageSrc, reset: resetProjectImageSrc, uploadFile: uploadProjectImage } =
	useAppSettings({
		key: "home_header_project_image",
		defaultValue: defaultProjectImageSrc
	});

// 處理圖片 URL：如果是後端上傳的檔案，加上 API base URL
const config = useRuntimeConfig();
const apiBase = config.public.apiBase || "http://localhost:4000";
const projectImageSrc = computed(() => {
	const src = projectImageSrcRaw.value;
	if (!src) return defaultProjectImageSrc;
	
	// 如果是後端上傳的檔案 URL（以 /uploads/ 開頭），加上 API base
	if (src.startsWith("/uploads/")) {
		return `${apiBase}${src}`;
	}
	
	// 其他情況（相對路徑或完整 URL）直接返回
	return src;
});

const isProjectImageEditOpen = ref(false);

// 處理檔案上傳
const handleUploadProjectImage = async (file: File) => {
	try {
		await uploadProjectImage(file);
		// 上傳成功後關閉對話框
		isProjectImageEditOpen.value = false;
	} catch (error) {
		// 錯誤已由 useAppSettings 處理（Toast 顯示）
		console.error("[HomeHeader] 上傳專案圖片失敗:", error);
	}
};

// 格式化日期時間
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
	const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
	const time = `${String(displayHours).padStart(2, "0")}:${minutes}:${seconds}`;

	return {
		date: `${year}/${month}/${day}`,
		weekday,
		period,
		time
	};
};

// 當前日期時間（響應式）
const currentDateTime = ref(new Date());
const formattedDate = computed(() => formatDateTime(currentDateTime.value));

// 每秒更新時間
let timeInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
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
