<template>
	<div class="flex h-full flex-col space-y-6 overflow-y-auto">
		<!-- 今日統計 -->
		<div class="grid grid-cols-2 gap-4 rounded-lg border-2 border-white/30 bg-white/10 p-6 backdrop-blur-sm">
			<div class="flex items-center gap-4">
				<div
					class="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/30 xl:h-20 xl:w-20 2xl:h-24 2xl:w-24"
				>
					<svg class="h-8 w-8 text-white xl:h-10 xl:w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
						/>
					</svg>
				</div>
				<div>
					<div class="text-sm text-white/70 xl:text-base">今日進場人數</div>
					<div class="mt-1 text-3xl font-bold text-white xl:text-4xl 2xl:text-5xl">
						{{ entryCount || 0 }}
					</div>
				</div>
			</div>
			<div class="flex items-center gap-4">
				<div
					class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/30 xl:h-20 xl:w-20 2xl:h-24 2xl:w-24"
				>
					<svg class="h-8 w-8 text-white xl:h-10 xl:w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
				</div>
				<div>
					<div class="text-sm text-white/70 xl:text-base">今日出場人數</div>
					<div class="mt-1 text-3xl font-bold text-white xl:text-4xl 2xl:text-5xl">
						{{ exitCount || 0 }}
					</div>
				</div>
			</div>
		</div>

		<!-- 進出場記錄表（最新 5 筆） -->
		<EntryExitLogTable :logs="logs" />
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingLog } from "~/types/peopleCounting";
import EntryExitLogTable from "~/components/people-counting/EntryExitLogTable.vue";

interface Props {
	entryCount: number;
	exitCount: number;
	logs: PeopleCountingLog[];
}

defineProps<Props>();
</script>

