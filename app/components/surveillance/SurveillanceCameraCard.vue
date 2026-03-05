<template>
	<div
		:class="[
			'cursor-pointer rounded-lg border-2 p-3 transition-all',
			isSelected ? 'border-white bg-white/20' : 'border-white/30 bg-white/10 hover:bg-white/15'
		]"
		@click="$emit('select', camera.id)"
	>
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<div class="flex items-center gap-2">
					<h3 class="text-lg font-semibold text-white 2xl:text-xl">{{ camera.name }}</h3>
					<span
						:class="[
							'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur-sm 2xl:text-sm',
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
				<p v-if="camera.description" class="mt-1 text-sm text-white/70 2xl:text-base">
					{{ camera.description }}
				</p>
				<div class="mt-2 flex items-center gap-2 text-xs text-white/60 2xl:text-sm">
					<span>{{ camera.config.host || camera.config.ip_address }}</span>
				</div>
				<div v-if="camera.config.isapi_preview_path" class="mt-1 text-xs text-white/50 2xl:text-sm">
					可預覽
				</div>
			</div>
		</div>

		<div
			v-if="showThumbnail"
			class="mt-3 aspect-video w-full overflow-hidden rounded bg-white/10 flex items-center justify-center text-xs text-white/60"
		>
			點擊加入監控畫面
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

defineEmits<{
	select: [deviceId: number];
}>();
</script>
