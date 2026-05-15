<template>
	<div class="show-scrollbar flex h-full flex-col space-y-8 overflow-y-auto">
		<!-- 今日統計 -->
		<div class="flex items-center justify-center gap-4 min-h-[220px]">
			<div class="flex h-40 w-40 items-center justify-center 2xl:h-48 2xl:w-48">
				<img
					src="/people-counting/status-indicator-green.svg"
					alt="進場"
					class="h-full w-full object-contain"
				/>
			</div>
			<div class="text-white space-y-2">
				<div class="flex items-center justify-center gap-4">
					<div class="text-lg 2xl:text-2xl font-semibold">進場人數</div>
					<div class="text-2xl 2xl:text-3xl bg-black/20 w-[100px] 2xl:w-[120px] text-center">
						{{ entryCount || 0 }}
					</div>
				</div>

				<div class="flex items-center justify-center gap-4">
					<div class="text-lg 2xl:text-2xl font-semibold">出場人數</div>
					<div class="text-2xl 2xl:text-3xl bg-black/20 w-[100px] 2xl:w-[120px] text-center">
						{{ exitCount || 0 }}
					</div>
				</div>

				<div class="flex items-center justify-center gap-4">
					<div class="text-lg 2xl:text-2xl font-semibold">在場人數</div>
					<div class="text-2xl 2xl:text-3xl bg-black/20 w-[100px] 2xl:w-[120px] text-center">
						{{ currentCount || 0 }}
					</div>
				</div>
			</div>
		</div>
		<!-- 進出場記錄表（最新 5 筆）；工地首頁／分欄版面可關閉，改由外層 EntryExitLogTable 顯示 -->
		<EntryExitLogTable
			v-if="showLogTable"
			:logs="logs"
			:display-columns="displayColumns"
		/>
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
	/** false：僅顯示統計（人流頁分欄版面） */
	showLogTable?: boolean
}

withDefaults(defineProps<Props>(), {
	showLogTable: true,
})
</script>

