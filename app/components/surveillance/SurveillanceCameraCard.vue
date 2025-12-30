<template>
	<div
		:class="[
			'cursor-pointer rounded-lg border-2 p-3 backdrop-blur-sm transition-all hover:shadow-lg',
			isSelected ? 'border-white bg-white/20' : 'border-white/30 bg-white/10 hover:bg-white/15',
			isStreaming ? 'ring-2 ring-green-400/50' : ''
		]"
		@click="$emit('select', camera.id)"
	>
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<div class="flex items-center gap-2">
					<h3 class="text-base font-semibold text-white xl:text-lg 2xl:text-xl">{{ camera.name }}</h3>
					<span
						:class="[
							'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur-sm xl:text-sm',
							camera.status === 'active'
								? 'bg-green-500/30 text-green-100'
								: camera.status === 'error'
									? 'bg-red-500/30 text-red-100'
									: 'bg-white/20 text-white/70'
						]"
					>
						{{ camera.status === "active" ? "啟用" : camera.status === "error" ? "錯誤" : "停用" }}
					</span>
				</div>
				<p v-if="camera.description" class="mt-1 text-sm text-white/70 xl:text-base">
					{{ camera.description }}
				</p>
				<div class="mt-2 flex items-center gap-2 text-xs text-white/60 xl:text-sm">
					<span>{{ camera.config.ip_address }}</span>
					<span v-if="camera.config.port">:{{ camera.config.port }}</span>
				</div>
			</div>
			<div class="ml-2 flex flex-col items-end gap-1">
				<!-- 串流狀態指示器 -->
				<div
					v-if="isStreaming"
					class="flex items-center gap-1 rounded-full bg-green-500/30 px-2 py-0.5 text-xs font-medium text-green-100 backdrop-blur-sm xl:text-sm"
				>
					<span class="h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
					串流中
				</div>
				<div v-else-if="camera.status === 'active'" class="text-xs text-white/50 xl:text-sm">未串流</div>
			</div>
		</div>

		<!-- 縮圖預覽（可選，未來可加入快照功能） -->
		<div
			v-if="showThumbnail"
			class="mt-3 aspect-video w-full overflow-hidden rounded bg-white/10 backdrop-blur-sm"
		>
			<div class="flex h-full items-center justify-center text-xs text-white/60">
				{{ isStreaming ? "預覽中..." : "無預覽" }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { SurveillanceCamera } from "~/types/surveillance";

interface Props {
	camera: SurveillanceCamera;
	isSelected?: boolean;
	showThumbnail?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	isSelected: false,
	showThumbnail: false
});

const isStreaming = computed(
	() => props.camera.isStreaming || props.camera.streamInfo?.status === "running"
);

defineEmits<{
	select: [deviceId: number];
}>();
</script>
