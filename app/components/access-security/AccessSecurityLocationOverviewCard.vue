<template>
	<div
		class="flex cursor-pointer gap-2 rounded-xl bg-white/10 py-1 transition-all hover:bg-white/15 hover:ring-2 hover:ring-cyan-300/50"
		role="button"
		tabindex="0"
		:aria-label="`選擇 ${location.name}`"
		@click="handleClick"
		@keydown.enter="handleClick"
		@keydown.space.prevent="handleClick"
	>
		<div class="overview-zone-tag">
			{{ zoneName || "未分類" }}
		</div>

		<div class="relative flex min-w-0 flex-1 flex-col items-center pr-2">
			<div class="mb-2 flex w-[160px] items-center justify-center border-b border-white/80 pb-px">
				<h3 class="text-base text-white 2xl:text-lg">{{ location.name }}</h3>
			</div>

			<div class="flex w-full flex-col gap-2 px-3 py-2 text-white">
				<div class="flex items-center justify-center gap-3 monitoring-chip-bg p-2">
					<div class="overview-stat-label">室內機</div>
					<div
						class="min-w-[80px] flex-1 bg-black/20 px-2 text-center text-sm 2xl:text-base"
					>
						{{ location.indoorDeviceName || "未綁定" }}
					</div>
				</div>
				<div class="flex items-center justify-center gap-3 monitoring-chip-bg p-2">
					<div class="overview-stat-label">VoIP</div>
					<div
						class="min-w-[80px] flex-1 bg-black/20 px-2 text-center text-sm 2xl:text-base"
					>
						{{ location.voipNumber || "—" }}
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { AccessSecuritySiteLocation } from "~/types/accessSecurity"

const props = defineProps<{
	location: AccessSecuritySiteLocation
	zoneName: string
}>()

const emit = defineEmits<{ click: [locationId: number] }>()

const handleClick = () => {
	emit("click", props.location.id)
}
</script>
