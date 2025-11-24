<template>
	<div class="relative bg-white/30 rounded-2xl overflow-hidden border-2 border-white/80 px-2 xl:px-3 2xl:px-4 py-4 xl:py-6 2xl:py-8">
		<h3 class="text-white text-center text-xl lg:text-2xl xl:text-3xl tracking-[12px] ms-[12px] mb-4 xl:mb-6 2xl:mb-8">
			{{ categoryName || "狀態中心" }}
		</h3>

		<div class="grid grid-cols-2 gap-x-2 gap-y-4 xl:gap-y-5 2xl:gap-y-6">
			<!-- 控制卡片 -->
			<div v-for="control in controls" :key="control.id" class="flex items-center rounded-xl p-2 xl:p-3 2xl:p-4 border-2 border-white">
				<!-- 左側圖示 -->
				<div>
					<NuxtImg src="/lighting/light-bulb.png" alt="燈泡圖示" class="w-12 h-12 lg:w-16 lg:h-16 2xl:w-24 2xl:h-24" width="96" height="96" />
				</div>

				<!-- 右側內容區域 -->
				<div class="flex flex-col gap-2">
					<!-- 名稱 -->
					<h4 class="text-white text-lg xl:text-xl 2xl:text-2xl whitespace-nowrap">{{ control.name }}</h4>
					<div class="flex items-center gap-2">
						<div class="space-y-2">
							<!-- 運轉中標籤 -->
							<div class="border border-white rounded p-1 bg-white/10">
								<span class="ps-2 text-sm 2xl:text-base tracking-[6px] whitespace-nowrap text-white">{{ getRunningLabel(control.isRunning) }}</span>
							</div>

							<!-- 正常狀態（綠色圓點 + 文字） -->
							<div class="flex items-center justify-center gap-2 border border-white rounded p-1 bg-white/10">
								<div :class="['w-5 h-5 rounded-full border border-white', isStatusNormal(control.status) ? 'bg-green-300' : 'bg-red-500']"></div>
								<span class="text-white text-sm 2xl:text-base">{{ getHealthLabel(control.status) }}</span>
							</div>
						</div>
						<!-- 切換開關 -->
						<div class="flex justify-center">
							<label class="relative inline-flex items-center cursor-pointer">
								<input type="checkbox" :checked="control.isRunning" class="sr-only peer" @change="handleToggle(control.id, control.isRunning)" />
								<div
									class="w-8 h-16 2xl:w-10 2xl:h-20 border-2 border-white bg-transparent peer-focus:outline-none rounded-full peer peer-checked:after:-translate-y-full after:content-[''] after:absolute after:bottom-0 after:left-0 after:bg-white after:rounded-full after:w-8 after:h-8 2xl:after:w-10 2xl:after:h-10 after:transition-all peer-checked:bg-[#00d1ff]"
								>
									<!-- ON 文字 -->
									<span
										class="absolute top-0 left-0 right-0 h-1/2 flex items-center justify-center text-white text-xs 2xl:text-base font-light pointer-events-none z-10 transition-opacity duration-300 opacity-100 peer-checked:opacity-0"
									>
										OFF
									</span>

									<!-- OFF 文字 -->
									<span
										class="absolute bottom-0 left-0 right-0 h-1/2 flex items-center justify-center text-white text-xs 2xl:text-base font-light pointer-events-none z-10 transition-opacity duration-300 opacity-100 peer-checked:opacity-0"
									>
										ON
									</span>
								</div>
							</label>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { ControlPoint } from "~/types/system";

interface Props {
	controls: ControlPoint[];
	categoryName?: string;
}

withDefaults(defineProps<Props>(), {
	categoryName: ""
});

const emit = defineEmits<{
	toggle: [controlId: string, isRunning: boolean];
}>();

const getHealthLabel = (status: ControlPoint["status"]) => {
	return status === "normal" ? "正常" : "異常";
};

const getRunningLabel = (isRunning: boolean) => {
	return isRunning ? "運轉中" : "已關閉";
};

const isStatusNormal = (status: ControlPoint["status"]) => status === "normal";

const handleToggle = (controlId: string, isRunning: boolean) => {
	emit("toggle", controlId, !isRunning);
};
</script>
