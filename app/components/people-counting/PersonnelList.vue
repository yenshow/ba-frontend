<template>
	<div class="space-y-3">
		<h3 class="text-lg font-semibold text-white xl:text-xl 2xl:text-2xl">人員名單</h3>

		<div v-if="personnel.length === 0" class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center">
			<p class="text-sm text-white/60 xl:text-base">尚無人員資料</p>
		</div>

		<div v-else class="space-y-3">
			<div
				v-for="person in personnel"
				:key="person.id"
				class="flex items-center gap-3 rounded-lg border-2 border-white/30 p-3 backdrop-blur-sm transition-all hover:border-white/50"
				:class="[
					person.isInside || person.isPresent
						? 'bg-white/15 opacity-100'
						: 'bg-white/5 opacity-50'
				]"
			>
				<!-- 照片 -->
				<div class="flex-shrink-0">
					<div
						class="h-12 w-12 overflow-hidden rounded-full bg-white/10 xl:h-14 xl:w-14 2xl:h-16 2xl:w-16"
					>
						<img
							v-if="person.photoUrl || person.photo"
							:src="person.photoUrl || person.photo"
							:alt="person.name"
							class="h-full w-full object-cover"
						/>
						<div v-else class="flex h-full w-full items-center justify-center text-white/40">
							<svg
								class="h-6 w-6 xl:h-8 xl:w-8"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
						</div>
					</div>
				</div>

				<!-- 資訊 -->
				<div class="min-w-0 flex-1">
					<div class="font-medium text-white xl:text-base 2xl:text-lg">{{ person.name }}</div>
					<div class="mt-1 space-y-0.5 text-xs text-white/60 xl:text-sm">
						<div v-if="person.lastEntryDate || person.entryTime">
							<span>最近進場：</span>
							<span>{{ person.lastEntryDate || person.entryTime }}</span>
						</div>
						<div v-if="person.entryTime">
							<span>進場時間：</span>
							<span>{{ person.entryTime }}</span>
						</div>
						<div v-if="person.exitTime || person.lastExitTime">
							<span>離場時間：</span>
							<span>{{ person.exitTime || person.lastExitTime }}</span>
						</div>
						<div v-if="!person.entryTime && !person.exitTime && !person.lastEntryTime && !person.lastExitTime" class="text-white/40">
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
</script>

