<template>
	<div class="show-scrollbar flex h-full flex-col space-y-8 overflow-y-auto">
		<div class="flex min-h-[220px] items-center justify-center gap-4">
			<div class="flex h-40 w-40 items-center justify-center 2xl:h-48 2xl:w-48">
				<img src="/system/elevator.png" alt="電梯狀態" class="h-full w-full object-contain" />
			</div>
			<div class="space-y-2 text-white">
				<div class="flex items-center justify-center gap-4">
					<div class="text-lg font-semibold 2xl:text-2xl">今日事件數</div>
					<div
						class="w-[100px] bg-black/20 text-center text-2xl 2xl:w-[120px] 2xl:text-3xl"
					>
						{{ todayEventCount || 0 }}
					</div>
				</div>
			</div>
		</div>

		<ElevatorEventLogTable :logs="logs" :display-columns="displayColumns" />
	</div>
</template>

<script setup lang="ts">
import type { ElevatorLog } from "~/types/elevator"
import ElevatorEventLogTable from "~/components/elevator/ElevatorEventLogTable.vue"

interface Props {
	todayEventCount?: number
	logs: ElevatorLog[]
	displayColumns?: string[]
}

withDefaults(defineProps<Props>(), {
	todayEventCount: 0,
	logs: () => [],
	displayColumns: undefined,
})
</script>
