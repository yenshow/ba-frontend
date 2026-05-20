<template>
	<div class="min-h-screen relative">
		<div class="absolute inset-0">
			<NuxtImg
				v-if="settings.backgroundImageUrl"
				:src="bgUrl"
				alt="背景"
				sizes="100vw"
				class="h-full w-full object-cover"
			/>
		</div>
		<header
			class="grid grid-cols-3 items-start px-6 py-4 2xl:px-10 2xl:py-6 absolute top-0 left-0 right-0"
		>
			<div class="col-span-1 flex items-center justify-start">
				<img src="/layout/yenshow-logo.svg" alt="YENSHOW" class="h-16 object-contain 2xl:h-20" />
			</div>

			<div class="col-span-1 flex items-center justify-center pt-6">
				<NuxtImg
					v-if="settings.projectImageUrl"
					:src="projectImageUrl"
					alt="專案圖片"
					sizes="128px"
					class="h-28 object-contain 2xl:h-32"
				/>
			</div>

			<ClientOnly>
				<div class="col-span-1 flex flex-col items-end justify-center">
					<div class="ms-[12px] text-[32px] font-[800] tracking-[12px] 2xl:text-[40px]">
						{{ formattedDate.date }}
					</div>
					<div class="ms-[4px] text-[18px] font-semibold tracking-[4px] 2xl:text-[24px]">
						{{ formattedDate.weekday }} {{ formattedDate.period }} {{ formattedDate.time }}
					</div>
				</div>
				<template #fallback>
					<div class="col-span-1 flex flex-col items-center justify-center">
						<div class="ms-[12px] text-[32px] font-[800] tracking-[12px] 2xl:text-[40px]">--</div>
						<div class="ms-[4px] text-[18px] font-semibold tracking-[4px] 2xl:text-[24px]">--</div>
					</div>
				</template>
			</ClientOnly>
		</header>

		<slot />

		<footer class="flex items-center bg-black/90 p-4 gap-4 absolute bottom-0 left-0 right-0">
			<NuxtImg src="/multiMedia/banner.png" alt="Banner" class="px-4 h-12 w-auto object-contain" />
			<div
				v-if="bannerText"
				class="flex items-center justify-center text-center text-3xl font-semibold tracking-[4px] 2xl:text-5xl"
				style="color: white !important ; opacity: 0.9"
			>
				{{ bannerText }}
			</div>
		</footer>
	</div>
</template>

<script setup lang="ts">
import { useMultimediaWallDashboard } from "~/composables/systems/multimedia/useMultimediaWallDashboard"

const { settings, bgUrl, bannerText, projectImageUrl, formattedDate } = useMultimediaWallDashboard()
</script>