<script setup lang="ts">
import type { EnergyDistributionItem } from "~/types/energy"

defineProps<{ items: EnergyDistributionItem[] }>()

const rankClass = (index: number) => {
	if (index === 0 || index === 1 || index === 2) return "bg-amber-400"
	return "bg-white/10"
}
</script>

<template>
	<div>
		<h3 class="mb-4 text-xl text-center font-semibold tracking-[4px] 2xl:text-2xl">用電排行榜</h3>
		<ol class="space-y-3">
			<li
				v-for="(item, index) in items"
				:key="item.deviceId"
				class="flex items-center justify-between gap-3 text-sm text-white/90 2xl:text-base"
			>
				<span
					class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/25 text-xs font-semibold 2xl:h-8 2xl:w-8 2xl:text-sm"
					:class="rankClass(index)"
					>{{ index + 1 }}</span
				>
				<div class="min-w-[160px]">{{ item.deviceName }}</div>
				<span>{{ item.energyKwh.toLocaleString() }} kWh</span>
				<span class="min-w-[64px] text-right text-white/55">{{ item.percent }}%</span>
			</li>
			<li v-if="items.length === 0" class="py-8 text-center text-white/60">
				<p class="text-base 2xl:text-lg">尚無排行資料</p>
				<p class="mt-2 text-sm 2xl:text-base">有用量彙總後會顯示設備排行</p>
			</li>
		</ol>
		<div class="mt-2 text-right">
			<span class="text-sm text-white/70 transition-colors hover:text-white 2xl:text-base"
				>查看更多 ></span
			>
		</div>
	</div>
</template>
