<template>
	<div
		:class="[
			'cursor-pointer rounded-lg border-2 p-3 transition-all',
			props.isSelected ? 'border-white bg-white/20' : 'border-white/30 bg-white/10 hover:bg-white/15',
		]"
		@click="$emit('select', camera.id)"
	>
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<div class="flex items-center gap-2">
					<h3 class="text-lg font-semibold text-white 2xl:text-xl">{{ camera.name }}</h3>
					<span
						:class="[
							'inline-flex min-w-[2.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur-sm 2xl:text-sm',
							connectivityBadgeClass,
						]"
					>
						<span
							v-if="props.connectivityLoading"
							class="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
							aria-hidden="true"
						/>
						<span v-else>{{ connectivityLabel }}</span>
					</span>
				</div>
				<div
					v-if="displayModelName || displayAddress || displayGroup"
					class="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60 2xl:text-sm"
				>
					<span v-if="displayModelName" class="text-white/70">{{ displayModelName }}</span>
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
			v-if="props.showThumbnail"
			class="mt-3 flex aspect-video w-full items-center justify-center overflow-hidden rounded bg-white/10 text-xs text-white/60"
		>
			點擊加入監控畫面
		</div>
	</div>
</template>

<script setup lang="ts">
import type { CameraDeviceConfig, DeviceConnectivityStatus } from "~/types/device"
import type { SurveillanceCamera } from "~/types/surveillance"

interface Props {
	camera: SurveillanceCamera
	isSelected?: boolean
	showThumbnail?: boolean
	connectivityStatus?: DeviceConnectivityStatus
	connectivityLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	isSelected: false,
	showThumbnail: false,
	connectivityStatus: "offline",
	connectivityLoading: false,
})

const connectivityLabel = computed(() => {
	if (props.connectivityStatus === "online") return "線上"
	return "離線"
})

const connectivityBadgeClass = computed(() => {
	if (props.connectivityLoading) return "bg-white/20 text-white/70"
	if (props.connectivityStatus === "online") return "bg-green-500/30 text-green-100"
	return "bg-white/20 text-white/70"
})

const displayModelName = computed(() => props.camera.model_name?.trim() || "")

const displayAddress = computed(() => {
	const config = props.camera.config as CameraDeviceConfig

	if (config.host) return config.host
	if (!config.rtsp_url) return ""

	try {
		const url = new URL(config.rtsp_url)
		return url.hostname || url.host || ""
	} catch {
		return ""
	}
})

const displayGroup = computed(() => {
	const config = props.camera.config as CameraDeviceConfig
	return config?.group?.trim() || ""
})

defineEmits<{
	select: [deviceId: number]
}>()
</script>
