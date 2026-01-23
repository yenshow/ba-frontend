<template>
	<div class="space-y-4">
		<h3 class="font-semibold text-lg bg-white/20 text-white text-center 2xl:text-xl py-1">人員名單</h3>
		<div v-if="personnel.length === 0" class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center">
			<p class="text-sm text-white/60 xl:text-base">尚無人員資料</p>
		</div>

		<div v-else class="grid grid-cols-2 gap-4">
			<div
				v-for="person in personnel"
				:key="person.id"
				class="flex items-start gap-3 border-2 border-white/30 p-3"
				:class="[
					person.isPresent
						? 'bg-white/20'
						: 'bg-black/20'
				]"
			>
				<!-- 照片 -->
				<div
					class="relative h-12 w-12 overflow-hidden rounded-full bg-white/10 2xl:h-16 2xl:w-16 mt-4"
				>
					<Transition name="fade">
						<img
							v-if="person.photoUrl"
							key="photo"
							:src="person.photoUrl"
							:alt="person.name"
							class="absolute inset-0 h-full w-full object-cover"
							@error="handleImageError($event)"
						/>
					</Transition>
					<Transition name="fade">
						<img
							v-if="!person.photoUrl"
							key="placeholder"
							src="/people-counting/no-photo-placeholder.png"
							alt="未設照片"
							class="absolute inset-0 h-full w-full object-cover"
						/>
					</Transition>
				</div>

				<!-- 資訊 -->
				<div class="min-w-0 flex-1">
					<div class="font-medium text-white text-base 2xl:text-xl border-b border-white/30 pb-1">{{ person.name }}</div>
					<div class="mt-1 space-y-0.5 text-xs text-white/60 xl:text-sm">
						<!-- 最近進場：顯示日期（不含時分秒） -->
						<div v-if="person.lastEntryDate">
							<span>最近進場：</span>
							<span>{{ person.lastEntryDate }}</span>
						</div>
						<!-- 進場時間：根據最近進場的日期，顯示時分秒 -->
						<div v-if="person.entryTime">
							<span>進場時間：</span>
							<span>{{ person.entryTime }}</span>
						</div>
						<!-- 離場時間：根據最近進場的日期，顯示時分秒 -->
						<!-- 如果是今日進場，顯示今日的離場時間；如果今日沒有離場，顯示 "- -" -->
						<div v-if="person.lastEntryDate || person.entryTime">
							<span>離場時間：</span>
							<span v-if="person.exitTime && !shouldHideExitTime(person)">
								{{ person.exitTime }}
							</span>
							<span v-else>
								- -
							</span>
						</div>
						<div v-if="!person.lastEntryDate && !person.entryTime && !person.exitTime" class="text-white/40">
							尚無進出場記錄
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingPersonnel } from "~/types/peopleCounting";

interface Props {
	personnel: PeopleCountingPersonnel[];
}

defineProps<Props>();

const parseTimeToSeconds = (time?: string | null) => {
	if (!time) return null;
	// 支援 "HH:mm" 或 "HH:mm:ss"
	const m = time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
	if (!m) return null;
	const hh = Number(m[1]);
	const mm = Number(m[2]);
	const ss = m[3] ? Number(m[3]) : 0;
	if ([hh, mm, ss].some((n) => Number.isNaN(n))) return null;
	return hh * 3600 + mm * 60 + ss;
};

const shouldHideExitTime = (person: PeopleCountingPersonnel) => {
	const entrySec = parseTimeToSeconds((person as any).entryTime);
	const exitSec = parseTimeToSeconds((person as any).exitTime);
	if (entrySec == null || exitSec == null) return false;
	return entrySec > exitSec;
};

const handleImageError = (event: Event) => {
	const img = event.target as HTMLImageElement;
	img.src = "/people-counting/no-photo-placeholder.png";
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
	opacity: 1;
}
</style>

