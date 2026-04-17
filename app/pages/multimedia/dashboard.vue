<template>
	<div class="relative min-h-screen flex flex-col justify-center items-center pt-24">
		<div class="flex flex-col gap-4 2xl:gap-8 min-w-[100vw]">
			<section class="grid grid-cols-12 gap-4 px-6 2xl:px-10">
				<div
					class="relative col-span-7 rounded-2xl border-2 border-[#323232]/50 bg-[#f0f0e6]/70 p-4"
				>
					<div class="flex items-center justify-center border-b-2 border-[#323232]/50 pb-4">
						<h2 class="text-4xl font-semibold tracking-[8px]">社區公告</h2>
					</div>

					<div class="space-y-3 py-3">
						<div
							v-for="a in pagedAnnouncements"
							:key="a.id"
							class="flex gap-3 border-b-2 border-[#323232]/20 pb-3"
						>
							<div class="min-w-0 px-4">
								<div class="flex items-center gap-2 text-xl 2xl:text-2xl font-semibold">
									<img
										v-if="a.pinned"
										src="/multiMedia/ping.png"
										alt="置頂"
										class="h-6 w-6 2xl:h-10 2xl:w-10 flex-shrink-0 object-contain"
									/>
									<span class="min-w-0">{{ a.title || "（未命名公告）" }}</span>
								</div>
							</div>
						</div>

						<div v-if="pagedAnnouncements.length === 0" class="py-16 text-center">
							<div class="text-2xl font-semibold">目前沒有公告</div>
						</div>

						<div
							v-if="announcementTotalPages > 1"
							class="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-2"
							aria-label="社區公告分頁"
						>
							<button
								v-for="idx in announcementTotalPages"
								:key="idx"
								type="button"
								class="h-2.5 w-2.5 rounded-full transition-all"
								:class="{
									'bg-[#323232]/80': announcementPageIndex === idx - 1,
									'bg-[#323232]/30 hover:bg-[#323232]/50': announcementPageIndex !== idx - 1,
								}"
								:aria-label="`切換公告頁：第 ${idx} 頁`"
								@click="handleSetAnnouncementPage(idx - 1)"
								@keydown.enter.prevent="handleSetAnnouncementPage(idx - 1)"
								@keydown.space.prevent="handleSetAnnouncementPage(idx - 1)"
							/>
						</div>
					</div>
				</div>

				<div class="col-span-5 overflow-hidden rounded-2xl border-2 border-[#323232]/50">
					<video
						v-if="settings.heroImageUrl && isHeroVideo"
						:src="heroUrl"
						class="min-h-[400px] h-full aspect-[16/9] object-cover"
						autoplay
						muted
						loop
						playsinline
						controls
						aria-label="右側影片"
					/>
					<img
						v-else-if="settings.heroImageUrl"
						:src="heroUrl"
						alt="右側圖片"
						class="min-h-[400px] h-full aspect-[16/9] object-cover"
					/>
					<div v-else class="flex min-h-[400px] items-center justify-center">尚未設定圖片</div>
				</div>
			</section>

			<section class="grid grid-cols-12 gap-4 px-6 2xl:px-10">
				<div class="col-span-8 rounded-2xl border-2 border-[#323232]/50 bg-[#f0f0e6]/70 p-4">
					<div class="flex items-center h-full">
						<div class="flex items-center justify-center">
							<div
								class="[writing-mode:vertical-rl] text-2xl font-semibold mt-[12px] tracking-[12px]"
							>
								社區環境偵測
							</div>
						</div>

						<div class="min-w-0 flex-1 px-4">
							<div class="grid grid-cols-6 gap-4">
								<EnvironmentMetricCard
									v-for="m in environmentMetrics"
									:key="m.key"
									:label="m.label"
									:unit="m.unit"
									:value="m.value"
									:status="m.status"
								/>
							</div>
							<div
								v-if="environmentMetrics.length === 0"
								class="py-10 text-center text-xl font-semibold"
							>
								尚未設定環境骨架
							</div>
						</div>
					</div>
				</div>

				<div
					class="relative col-span-4 rounded-2xl border-2 border-[#323232]/50 bg-[#f0f0e6]/70 p-4"
				>
					<h2 class="text-center ms-[12px] text-2xl font-semibold tracking-[12px]">今日社區排程</h2>
					<div class="grid grid-cols-2 gap-2 pt-4">
						<div
							v-for="s in pagedTodaySchedules"
							:key="s.id"
							class="rounded-xl border border-black/50 bg-white/75 px-3 py-2 text-center"
						>
							<div class="text-xl font-semibold">{{ s.startTime }} - {{ s.endTime }}</div>
							<div class="text-xl">{{ s.title }}</div>
						</div>
						<div v-if="todaySchedules.length === 0" class="py-10 text-center">今日無排程</div>
					</div>

					<div
						v-if="scheduleTotalPages > 1"
						class="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2"
						aria-label="今日社區排程分頁"
					>
						<button
							v-for="idx in scheduleTotalPages"
							:key="idx"
							type="button"
							class="h-2.5 w-2.5 rounded-full transition-all"
							:class="{
								'bg-[#323232]/80': schedulePageIndex === idx - 1,
								'bg-[#323232]/30 hover:bg-[#323232]/50': schedulePageIndex !== idx - 1,
							}"
							:aria-label="`切換排程頁：第 ${idx} 頁`"
							@click="handleSetSchedulePage(idx - 1)"
							@keydown.enter.prevent="handleSetSchedulePage(idx - 1)"
							@keydown.space.prevent="handleSetSchedulePage(idx - 1)"
						/>
					</div>
				</div>
			</section>
		</div>
	</div>
</template>

<script setup lang="ts">
import EnvironmentMetricCard from "~/components/multimedia/EnvironmentMetricCard.vue"
import { useMultimediaWallDashboard } from "~/composables/systems/multimedia/useMultimediaWallDashboard"

definePageMeta({ layout: "dashboard" })

const {
	settings,
	heroUrl,
	isHeroVideo,
	pagedAnnouncements,
	announcementPageIndex,
	announcementTotalPages,
	handleSetAnnouncementPage,
	todaySchedules,
	pagedTodaySchedules,
	schedulePageIndex,
	scheduleTotalPages,
	handleSetSchedulePage,
	environmentMetrics,
} = useMultimediaWallDashboard()
</script>

<style scoped>
* {
	color: #323232 !important;
	font-family: "Noto Serif TC", sans-serif !important;
}
</style>
