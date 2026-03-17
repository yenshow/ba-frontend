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
				<div
					v-if="displayAddress || displayGroup"
					class="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60 2xl:text-sm"
				>
					<span v-if="displayAddress">{{ displayAddress }}</span>
					<span
						v-if="displayGroup"
						class="rounded bg-white/20 px-1.5 py-0.5 text-white/80"
					>
						{{ displayGroup }}
					</span>
				</div>
			</div>
		</div>

		<div
			v-if="showThumbnail"
			class="mt-3 flex aspect-video w-full items-center justify-center overflow-hidden rounded bg-white/10 text-xs text-white/60"
		>
			點擊加入監控畫面
		</div>
	</div>
</template>

<script setup lang="ts">
import type { CameraDeviceConfig } from "~/types/device";
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

const displayAddress = computed(() => {
	const config = props.camera.config as CameraDeviceConfig;

	if (config.host) return config.host;
	if (config.ip_address) return config.ip_address;
	if (!config.rtsp_url) return "";

	try {
		const url = new URL(config.rtsp_url);
		return url.hostname || url.host || "";
	} catch {
		return "";
	}
});

const displayGroup = computed(() => {
	const config = props.camera.config as CameraDeviceConfig;
	return config?.group?.trim() || "";
});

defineEmits<{
	select: [deviceId: number];
}>();
</script>
