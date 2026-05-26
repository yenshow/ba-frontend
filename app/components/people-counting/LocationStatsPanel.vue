<template>
	<div class="show-scrollbar flex h-full flex-col space-y-8 overflow-y-auto">
		<!-- 今日統計 -->
		<div class="flex min-h-[220px] items-center justify-center gap-4">
			<div class="flex h-40 w-40 items-center justify-center 2xl:h-48 2xl:w-48">
				<img :src="statusIndicatorSrc" alt="工地狀態" class="h-full w-full object-contain" />
			</div>
			<div class="space-y-2 text-white">
				<div class="flex items-center justify-center gap-4">
					<div class="text-lg font-semibold 2xl:text-2xl">進場人數</div>
					<div class="w-[100px] bg-black/20 text-center text-2xl 2xl:w-[120px] 2xl:text-3xl">
						{{ entryCount || 0 }}
					</div>
				</div>

				<div class="flex items-center justify-center gap-4">
					<div class="text-lg font-semibold 2xl:text-2xl">出場人數</div>
					<div class="w-[100px] bg-black/20 text-center text-2xl 2xl:w-[120px] 2xl:text-3xl">
						{{ exitCount || 0 }}
					</div>
				</div>

				<div class="flex items-center justify-center gap-4">
					<div class="text-lg font-semibold 2xl:text-2xl">在場人數</div>
					<div class="w-[100px] bg-black/20 text-center text-2xl 2xl:w-[120px] 2xl:text-3xl">
						{{ currentCount || 0 }}
					</div>
				</div>
			</div>
		</div>
		<!-- 進出場記錄表 -->
		<EntryExitLogTable :logs="logs" :display-columns="displayColumns" />
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingLog } from "~/types/peopleCounting"
import EntryExitLogTable from "~/components/people-counting/EntryExitLogTable.vue"
import type { PeopleCountingLogColumnKey } from "~/utils/peopleCountingLogColumns"

interface Props {
	entryCount: number
	exitCount: number
	currentCount: number
	logs: PeopleCountingLog[]
	displayColumns?: PeopleCountingLogColumnKey[] | string[] | null
}

defineProps<Props>()

const statusIndicatorSrc = "/people-counting/status-indicator-green.svg"
</script>
