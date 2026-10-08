<script setup lang="ts">
import PageTabs from "~/components/common/PageTabs.vue"
import { useEnergyMetering } from "~/composables/systems/energy/useEnergyMetering"
import type { EnergyMeteringMeter } from "~/types/energy"

const { meters, generatedAt, loading, errorMessage, refresh } = useEnergyMetering()

const activeMeterId = ref("")

const meterTabs = computed(() =>
	meters.value.map((m) => ({
		id: String(m.deviceId),
		label: m.deviceName,
	})),
)

const activeMeter = computed<EnergyMeteringMeter | null>(() => {
	if (!meters.value.length) return null
	const found = meters.value.find((m) => String(m.deviceId) === activeMeterId.value)
	return found ?? meters.value[0] ?? null
})

watch(
	meters,
	(list) => {
		if (!list.length) {
			activeMeterId.value = ""
			return
		}
		const still = list.some((m) => String(m.deviceId) === activeMeterId.value)
		if (!still) activeMeterId.value = String(list[0].deviceId)
	},
	{ immediate: true },
)

const handleBack = () => {
	void navigateTo("/utilities/energy")
}

const formatNum = (v: number | null | undefined, digits = 2) => {
	if (v == null || Number.isNaN(v)) return "—"
	return Number(v.toFixed(digits)).toLocaleString("zh-TW", {
		maximumFractionDigits: digits,
	})
}

const formatTime = (iso: string | null) => {
	if (!iso) return "—"
	try {
		return new Date(iso).toLocaleString("zh-TW", {
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		})
	} catch {
		return "—"
	}
}

const loadTypeLabel = (v: number | null) => {
	if (v == null || !Number.isFinite(v)) return "—"
	const n = Math.round(v)
	if (n === 82) return "R（電阻）"
	if (n === 76) return "L（電感）"
	if (n === 67) return "C（電容）"
	return String(formatNum(v, 0))
}

type MetricCell = { label: string; value: string; unit?: string }
type KpiItem = { label: string; value: string; unit?: string }

const kpiItems = (m: EnergyMeteringMeter): KpiItem[] => [
	{ label: "輸入有效電能", value: formatNum(m.activeEnergyKwh, 3), unit: "kWh" },
	{ label: "輸出有效電能", value: formatNum(m.exportEnergyKwh, 3), unit: "kWh" },
	{ label: "總有效電能", value: formatNum(m.totalActiveEnergyKwh, 3), unit: "kWh" },
	{ label: "需量", value: formatNum(m.demandKw, 3), unit: "kW" },
	{ label: "總有效功率", value: formatNum(m.activePower.psum, 3), unit: "kW" },
	{ label: "平均功率因數", value: formatNum(m.powerFactor.avg, 3) },
	{ label: "頻率", value: formatNum(m.item.frequency, 3), unit: "Hz" },
]

const detailGroups = (m: EnergyMeteringMeter): Array<{ title: string; cells: MetricCell[] }> => [
	{
		title: "電壓",
		cells: [
			{ label: "V1 相電壓", value: formatNum(m.voltage.v1), unit: "V" },
			{ label: "V2 相電壓", value: formatNum(m.voltage.v2), unit: "V" },
			{ label: "V3 相電壓", value: formatNum(m.voltage.v3), unit: "V" },
			{ label: "平均相電壓", value: formatNum(m.voltage.avg), unit: "V" },
		],
	},
	{
		title: "電流",
		cells: [
			{ label: "I1 電流", value: formatNum(m.current.i1, 3), unit: "A" },
			{ label: "I2 電流", value: formatNum(m.current.i2, 3), unit: "A" },
			{ label: "I3 電流", value: formatNum(m.current.i3, 3), unit: "A" },
			{ label: "平均電流", value: formatNum(m.current.avg, 3), unit: "A" },
		],
	},
	{
		title: "功率",
		cells: [
			{ label: "P1 有效功率", value: formatNum(m.activePower.p1, 3), unit: "kW" },
			{ label: "P2 有效功率", value: formatNum(m.activePower.p2, 3), unit: "kW" },
			{ label: "P3 有效功率", value: formatNum(m.activePower.p3, 3), unit: "kW" },
			{ label: "總有效功率 P", value: formatNum(m.activePower.psum, 3), unit: "kW" },
			{ label: "總無功功率 Q", value: formatNum(m.reactivePowerKvar, 3), unit: "kVAR" },
			{ label: "總視在功率 S", value: formatNum(m.apparentPowerKva, 3), unit: "kVA" },
		],
	},
	{
		title: "功率因數",
		cells: [
			{ label: "PF1", value: formatNum(m.powerFactor.pf1, 3) },
			{ label: "PF2", value: formatNum(m.powerFactor.pf2, 3) },
			{ label: "PF3", value: formatNum(m.powerFactor.pf3, 3) },
			{ label: "平均功率因數", value: formatNum(m.powerFactor.avg, 3) },
		],
	},
]

const secondaryCells = (m: EnergyMeteringMeter): MetricCell[] => [
	{ label: "負載特性", value: loadTypeLabel(m.item.loadType) },
	{
		label: "操作時間",
		value:
			m.item.runHour != null
				? `${formatNum(m.item.runHour, 0)}（${formatNum(m.item.runHour / 60, 1)} h）`
				: "—",
		unit: "min",
	},
	{ label: "CO₂ 排放", value: formatNum(m.item.co2, 3), unit: "Kg" },
	{ label: "電費金額（表計）", value: formatNum(m.item.cost, 2) },
]

onMounted(() => {
	void refresh()
})
</script>

<template>
	<div class="page-shell energy-dashboard">
		<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
			<header class="flex flex-col gap-1 2xl:gap-2">
				<div class="flex flex-wrap items-center gap-3">
					<button
						type="button"
						class="text-sm text-white/70 transition-colors hover:text-white 2xl:text-base"
						aria-label="返回能源管理"
						@click="handleBack"
					>
						← 返回
					</button>
					<h1 class="page-title">電表即時量測</h1>
				</div>
				<p class="page-subtitle">
					電能度數／功率 PQS／電壓／電流／功率因數
					<span v-if="generatedAt" class="text-white/40">
						· 更新 {{ formatTime(generatedAt) }}
					</span>
				</p>
			</header>
			<button
				type="button"
				class="btn-secondary"
				:disabled="loading"
				aria-label="重新整理即時量測"
				@click="() => refresh()"
			>
				重新整理
			</button>
		</div>

		<p
			v-if="errorMessage"
			class="rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-200"
			role="alert"
		>
			{{ errorMessage }}
		</p>

		<div v-if="loading && meters.length === 0" class="py-16 text-center text-white/60">
			載入中…
		</div>
		<div v-else-if="meters.length === 0" class="py-16 text-center text-white/60">
			<p class="text-base 2xl:text-lg">尚無電表即時資料</p>
			<p class="mt-2 text-sm">
				請於能源參數設定納入電表，並於設備型號設定電壓／電流等 FLOAT 暫存器
			</p>
		</div>

		<template v-else-if="activeMeter">
			<div class="flex flex-col gap-4 2xl:gap-5">
				<PageTabs
					v-model="activeMeterId"
					:tabs="meterTabs"
					:panels="false"
					:hide-list-when-single="false"
					aria-label="電表切換"
					id-prefix="energy-meter"
					list-class="overflow-x-auto"
				/>

				<article class="monitoring-panel rounded-2xl p-4 text-white 2xl:p-6">
					<header class="mb-4 flex flex-wrap items-start justify-between gap-3">
						<div>
							<h2 class="text-lg font-semibold tracking-wider 2xl:text-xl">
								{{ activeMeter.deviceName }}
							</h2>
							<p class="mt-1 text-sm text-white/55 2xl:text-base">
								{{ activeMeter.systemName }}
								<span v-if="activeMeter.location"> · {{ activeMeter.location }}</span>
								· 最近讀數 {{ formatTime(activeMeter.lastReadingAt) }}
							</p>
						</div>
						<span
							class="rounded-full px-3 py-1 text-xs tracking-wider 2xl:text-sm"
							:class="
								activeMeter.online
									? 'bg-emerald-500/20 text-emerald-200'
									: 'bg-white/10 text-white/50'
							"
						>
							{{ activeMeter.online ? "線上" : "讀數逾時" }}
						</span>
					</header>

					<section
						class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 2xl:gap-3"
						aria-label="關鍵指標"
					>
						<div
							v-for="kpi in kpiItems(activeMeter)"
							:key="kpi.label"
							class="rounded-xl border border-white/10 bg-white/5 px-3 py-3 2xl:px-4 2xl:py-4"
						>
							<p class="text-xs tracking-wider text-white/45 2xl:text-sm">
								{{ kpi.label }}
							</p>
							<p class="mt-1 tabular-nums text-lg font-semibold text-white 2xl:text-xl">
								{{ kpi.value }}
								<span v-if="kpi.unit" class="ml-1 text-xs font-normal text-white/40 2xl:text-sm">{{
									kpi.unit
								}}</span>
							</p>
						</div>
					</section>

					<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:gap-4">
						<section
							v-for="group in detailGroups(activeMeter)"
							:key="group.title"
							class="rounded-xl border border-white/10 bg-white/5 p-3 2xl:p-4"
						>
							<h3 class="mb-2 text-xs tracking-[3px] text-white/50 2xl:text-sm">
								{{ group.title }}
							</h3>
							<dl class="grid grid-cols-2 gap-x-3 gap-y-2">
								<div v-for="cell in group.cells" :key="cell.label">
									<dt class="text-xs text-white/45 2xl:text-sm">{{ cell.label }}</dt>
									<dd class="tabular-nums text-sm text-white/90 2xl:text-base">
										{{ cell.value }}
										<span v-if="cell.unit" class="ml-1 text-white/40">{{ cell.unit }}</span>
									</dd>
								</div>
							</dl>
						</section>
					</div>

					<details class="mt-4 rounded-xl border border-white/10 bg-white/[0.03] open:bg-white/5">
						<summary
							class="cursor-pointer list-none px-3 py-2 text-xs tracking-wider text-white/50 2xl:px-4 2xl:text-sm"
						>
							表計附加資訊（負載／操作時間／CO₂／電費）
						</summary>
						<dl class="grid grid-cols-2 gap-x-3 gap-y-2 px-3 pb-3 md:grid-cols-4 2xl:px-4 2xl:pb-4">
							<div v-for="cell in secondaryCells(activeMeter)" :key="cell.label">
								<dt class="text-xs text-white/40 2xl:text-sm">{{ cell.label }}</dt>
								<dd class="tabular-nums text-sm text-white/70 2xl:text-base">
									{{ cell.value }}
									<span v-if="cell.unit" class="ml-1 text-white/35">{{ cell.unit }}</span>
								</dd>
							</div>
						</dl>
					</details>
				</article>
			</div>
		</template>
	</div>
</template>
