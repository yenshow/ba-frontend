<script setup lang="ts">
import type { EnergyMonthElectricityCost } from "~/types/energy"

const props = defineProps<{
	cost: EnergyMonthElectricityCost | null
}>()

const formatNum = (v: number | null | undefined, digits = 2) => {
	if (v == null || Number.isNaN(Number(v))) return "—"
	return Number(v).toLocaleString("zh-TW", { maximumFractionDigits: digits })
}

const touItems = computed(() => props.cost?.touLineItems || [])
const pf = computed(() => props.cost?.powerFactor)
const hasPfSample = computed(() => (pf.value?.sampleDeviceCount ?? 0) > 0 && pf.value?.avgPercent != null)
</script>

<template>
	<div v-if="cost" class="space-y-3 text-sm text-white/85 2xl:text-base">
		<p class="text-xs tracking-wider text-white/45 2xl:text-sm">
			參考估算，非正式帳單（不含基本電費／需量費）
		</p>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<section class="rounded-xl border border-white/10 bg-white/5 p-3 2xl:p-4">
				<h4 class="mb-2 text-xs tracking-[3px] text-white/50 2xl:text-sm">時間電價</h4>
				<dl class="space-y-2">
					<div v-for="item in touItems" :key="`${item.band}-${item.season}`" class="flex justify-between gap-3">
						<dt class="text-white/60">
							{{ item.label }}
							<span class="ml-1 text-white/40">{{ formatNum(item.kwh, 3) }} kWh × {{ formatNum(item.rate, 2) }}</span>
						</dt>
						<dd class="tabular-nums">{{ formatNum(item.subtotal) }}</dd>
					</div>
					<div v-if="touItems.length === 0" class="text-white/45">尚無 TOU 用量</div>
					<div class="flex justify-between border-t border-white/10 pt-2">
						<dt>TOU 小計</dt>
						<dd class="tabular-nums">{{ formatNum(cost.baseAmount ?? 0) }}</dd>
					</div>
					<div v-if="(cost.excessAmount ?? 0) > 0 || (cost.excessKwh ?? 0) > 0" class="flex justify-between">
						<dt class="text-white/60">
							超額加價
							<span class="ml-1 text-white/40">{{ formatNum(cost.excessKwh, 3) }} kWh</span>
						</dt>
						<dd class="tabular-nums">{{ formatNum(cost.excessAmount) }}</dd>
					</div>
				</dl>
			</section>
			<section class="rounded-xl border border-white/10 bg-white/5 p-3 2xl:p-4">
				<h4 class="mb-2 text-xs tracking-[3px] text-white/50 2xl:text-sm">功率因數</h4>
				<dl v-if="pf?.enabled && hasPfSample" class="space-y-2">
					<div class="flex justify-between">
						<dt class="text-white/60">本月站級平均</dt>
						<dd class="tabular-nums">{{ formatNum(pf.avgPercent, 3) }}%</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-white/60">基準／上限</dt>
						<dd class="tabular-nums">{{ pf.baselinePercent }}%／{{ pf.rewardCapPercent }}%</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-white/60">帳單調整</dt>
						<dd class="tabular-nums">{{ formatNum(pf.billDeltaPercent, 3) }}%</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-white/60">調整金額</dt>
						<dd class="tabular-nums">{{ formatNum(pf.adjustmentAmount) }}</dd>
					</div>
				</dl>
				<p v-else-if="pf?.enabled" class="text-white/45">
					尚無足夠 pf_avg 讀數，僅顯示 TOU 小計
				</p>
				<p v-else class="text-white/45">功率因數調整已關閉</p>
				<div class="mt-3 flex justify-between border-t border-white/10 pt-2 font-medium">
					<span>參考電費合計</span>
					<span class="tabular-nums">NT$ {{ formatNum(cost.amount) }}</span>
				</div>
			</section>
		</div>
	</div>
	<p v-else class="py-6 text-center text-white/50">尚無參考電費資料</p>
</template>
