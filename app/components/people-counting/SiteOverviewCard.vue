<template>
	<div
		class="rounded-lg border-2 bg-white/30 p-4 backdrop-blur-sm transition-all hover:border-white/80 hover:bg-white/40 xl:p-6 2xl:p-8"
		:class="statusBorderClass"
		@click="$emit('click', site.id)"
	>
		<!-- 標題與區域 -->
		<div class="mb-4 flex items-center justify-between border-b border-white/30 pb-3">
			<div>
				<h3 class="text-xl font-semibold text-white xl:text-2xl 2xl:text-3xl">{{ site.name }}</h3>
				<p class="mt-1 text-sm text-white/70 xl:text-base">{{ site.region }}</p>
			</div>

			<!-- 狀態指示器 -->
			<div
				class="flex-shrink-0"
				:class="[
					'h-12 w-12 rounded-full flex items-center justify-center xl:h-14 xl:w-14 2xl:h-16 2xl:w-16',
					statusIndicatorClass
				]"
			>
				<svg class="h-6 w-6 text-white xl:h-8 xl:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
					/>
				</svg>
			</div>
		</div>

		<!-- 統計數字 -->
		<div class="mb-4 grid grid-cols-2 gap-4">
			<div>
				<div class="text-sm text-white/70 xl:text-base">今日進場人數</div>
				<div class="mt-1 text-2xl font-bold text-white xl:text-3xl 2xl:text-4xl">
					{{ site.entryCount || 0 }}
				</div>
			</div>
			<div>
				<div class="text-sm text-white/70 xl:text-base">今日出場人數</div>
				<div class="mt-1 text-2xl font-bold text-white xl:text-3xl 2xl:text-4xl">
					{{ site.exitCount || 0 }}
				</div>
			</div>
		</div>

		<!-- 狀態文字 -->
		<div class="mb-4">
			<span
				:class="[
					'inline-block rounded-full px-3 py-1 text-xs font-medium xl:text-sm',
					statusBadgeClass
				]"
			>
				狀態: {{ statusText }}
			</span>
		</div>

		<!-- 關聯單位（如果有） -->
		<div v-if="site.units && site.units.length > 0" class="flex flex-wrap gap-2">
			<span
				v-for="unit in site.units"
				:key="unit.id"
				class="rounded-full bg-white/20 px-2.5 py-1 text-xs text-white/90 backdrop-blur-sm xl:text-sm"
			>
				{{ unit.name }}
			</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingSite } from "~/types/peopleCounting";
import { computed } from "vue";

interface Props {
	site: PeopleCountingSite;
}

const props = defineProps<Props>();
defineEmits<{
	click: [siteId: number];
}>();

const statusText = computed(() => {
	switch (props.site.status) {
		case "active":
			return "正常";
		case "equipment_anomaly":
			return "設備異常";
		case "intrusion_detected":
			return "非名單入侵";
		default:
			return "未知";
	}
});

const statusBorderClass = computed(() => {
	switch (props.site.status) {
		case "active":
			return "border-green-400/50";
		case "equipment_anomaly":
		case "intrusion_detected":
			return "border-red-400/50";
		default:
			return "border-white/50";
	}
});

const statusIndicatorClass = computed(() => {
	switch (props.site.status) {
		case "active":
			return "bg-green-500/30";
		case "equipment_anomaly":
		case "intrusion_detected":
			return "bg-red-500/30";
		default:
			return "bg-white/20";
	}
});

const statusBadgeClass = computed(() => {
	switch (props.site.status) {
		case "active":
			return "bg-green-500/30 text-green-200";
		case "equipment_anomaly":
			return "bg-yellow-500/30 text-yellow-200";
		case "intrusion_detected":
			return "bg-red-500/30 text-red-200";
		default:
			return "bg-white/20 text-white/80";
	}
});
</script>

