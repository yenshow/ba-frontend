<template>
	<div class="grid grid-cols-3 py-4">
		<!-- 左側：品牌標識 -->
		<div class="col-span-1 flex items-center justify-center gap-4">
			<img src="/layout/yenshow-logo.png" alt="YENSHOW" class="h-16 object-contain 2xl:h-24" />
		</div>

		<!-- 中間：專案資訊 -->
		<div class="col-span-1 flex items-center justify-center">
			<img src="/layout/building-name.png" alt="專案名稱" class="h-24 object-contain 2xl:h-36" />
		</div>

		<!-- 右側：日期時間 -->
		<ClientOnly>
			<div class="col-span-1 flex flex-col items-center justify-center text-white">
				<div class="ms-[12px] text-[32px] font-semibold tracking-[12px] 2xl:text-[48px]">
					{{ formattedDate.date }}
				</div>
				<div class="ms-[6px] text-[20px] tracking-[6px] 2xl:text-[24px]">
					{{ formattedDate.weekday }} {{ formattedDate.period }} {{ formattedDate.time }}
				</div>
			</div>
			<template #fallback>
				<div class="text-right text-white">
					<div class="text-lg font-semibold xl:text-xl 2xl:text-2xl">載入中...</div>
					<div class="text-sm xl:text-base 2xl:text-lg">載入中...</div>
				</div>
			</template>
		</ClientOnly>
	</div>
</template>

<script setup lang="ts">
interface Props {
	projectName?: string;
	constructionCompany?: string;
}

const props = withDefaults(defineProps<Props>(), {
	projectName: "蝶蛹新天地",
	constructionCompany: "遠岫建設有限公司"
});

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
