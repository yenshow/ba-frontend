<template>
	<div class="space-y-3">
		<h3 class="text-lg font-semibold text-white xl:text-xl 2xl:text-2xl">進出場記錄</h3>

		<div v-if="displayedLogs.length === 0" class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center">
			<p class="text-sm text-white/60 xl:text-base">尚無進出場記錄</p>
		</div>

		<div v-else class="overflow-x-auto">
			<table class="w-full border-collapse">
				<thead>
					<tr class="border-b-2 border-white/30">
						<th class="px-3 py-2 text-left text-xs font-semibold text-white/80 xl:px-4 xl:py-3 xl:text-sm">
							設備截圖
						</th>
						<th class="px-3 py-2 text-left text-xs font-semibold text-white/80 xl:px-4 xl:py-3 xl:text-sm">
							進場單位
						</th>
						<th class="px-3 py-2 text-left text-xs font-semibold text-white/80 xl:px-4 xl:py-3 xl:text-sm">
							工號
						</th>
						<th class="px-3 py-2 text-left text-xs font-semibold text-white/80 xl:px-4 xl:py-3 xl:text-sm">
							姓名
						</th>
						<th class="px-3 py-2 text-left text-xs font-semibold text-white/80 xl:px-4 xl:py-3 xl:text-sm">
							事件
						</th>
						<th class="px-3 py-2 text-left text-xs font-semibold text-white/80 xl:px-4 xl:py-3 xl:text-sm">
							時間
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="log in displayedLogs"
						:key="log.id"
						class="border-b border-white/10 transition-colors hover:bg-white/5"
					>
						<td class="px-3 py-2 xl:px-4 xl:py-3">
							<div class="h-12 w-16 overflow-hidden rounded bg-white/10 xl:h-16 xl:w-20">
								<img
									v-if="log.deviceScreenshotUrl"
									:src="log.deviceScreenshotUrl"
									:alt="`${log.name} 設備截圖`"
									class="h-full w-full object-cover"
								/>
								<div v-else class="flex h-full w-full items-center justify-center text-white/20">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
								</div>
							</div>
						</td>
						<td class="px-3 py-2 text-sm text-white/90 xl:px-4 xl:py-3 xl:text-base">
							{{ log.unit?.name || log.unitName || "-" }}
						</td>
						<td class="px-3 py-2 text-sm text-white/90 xl:px-4 xl:py-3 xl:text-base">
							{{ log.employeeId || log.personId || "-" }}
						</td>
						<td class="px-3 py-2 text-sm text-white/90 xl:px-4 xl:py-3 xl:text-base">
							{{ log.name || log.personName || "-" }}
						</td>
						<td class="px-3 py-2 xl:px-4 xl:py-3">
							<span
								:class="[
									'rounded-full px-2 py-0.5 text-xs font-medium xl:text-sm',
									log.eventType === 'entry'
										? 'bg-green-500/30 text-green-200'
										: 'bg-blue-500/30 text-blue-200'
								]"
							>
								{{ log.eventType === "entry" ? "進入" : "離開" }}
							</span>
						</td>
						<td class="px-3 py-2 text-xs text-white/70 xl:px-4 xl:py-3 xl:text-sm">
							{{ log.timestamp }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingLog } from "~/types/peopleCounting";
import { computed } from "vue";

interface Props {
	logs: PeopleCountingLog[];
	limit?: number;
}

const props = withDefaults(defineProps<Props>(), {
	limit: 5
});

// 顯示最新 5 筆記錄
const displayedLogs = computed(() => {
	return props.logs.slice(0, props.limit);
});
</script>

