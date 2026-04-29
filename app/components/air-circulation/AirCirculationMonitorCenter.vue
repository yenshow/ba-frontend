<template>
	<div
		class="show-scrollbar relative h-full overflow-hidden overflow-y-auto rounded-2xl border-2 border-white/80 bg-white/30 space-y-6 px-3 py-6 2xl:space-y-8 2xl:px-4 2xl:py-8"
	>
		<h3 class="ms-[12px] text-center text-2xl tracking-[12px] text-white 2xl:text-3xl">監控中心</h3>

		<div v-for="zone in displayedZones" :key="zone.id || zone.name" class="space-y-3 2xl:space-y-4">
			<div class="flex items-center justify-center gap-3">
				<div class="relative shrink-0">
					<button
						type="button"
						@click="handleZoneClick(zone.id || zone.name || '')"
						:class="[
							'cursor-pointer rounded-full border-2 p-2 transition-all',
							selectedZone === (zone.id || zone.name)
								? 'bg-white text-black/50'
								: 'bg-transparent text-white',
							zoneHasAlarm(zone)
								? 'ring-2 ring-red-500/90 ring-offset-2 ring-offset-transparent'
								: zoneHasAbnormal(zone)
									? 'ring-2 ring-amber-400/90 ring-offset-2 ring-offset-transparent'
									: '',
							getZoneBlinkClass(zone),
						]"
						:aria-label="`${zone.name}，選取此樓層`"
					>
						<h4 class="w-[48px] p-2 text-xl font-semibold tracking-wider 2xl:text-2xl">
							{{ zone.name }}
						</h4>
					</button>
					<span
						v-if="zoneHasAbnormal(zone)"
						class="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold leading-none 2xl:h-5 2xl:min-w-5 2xl:text-[10px]"
						:class="zoneHasAlarm(zone) ? 'bg-red-500 text-white' : 'bg-amber-400 text-teal-950'"
						aria-hidden="true"
						title="此區域有異常"
					>
						!
					</span>
				</div>

				<div v-if="zoneRows(zone).length > 0" class="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
					<div
						v-for="row in zoneRows(zone)"
						:key="row.rowKey"
						class="flex flex-col rounded-xl border-2 border-white px-3 py-3"
						:class="[rowBackgroundClass(row.uiStatus), rowBlinkClass(row.uiStatus)]"
					>
						<h4 class="mb-2 whitespace-nowrap text-center text-lg text-white 2xl:text-xl">
							{{ row.locationName }}
						</h4>

						<div
							class="flex h-9 w-full items-center justify-center gap-2 rounded-full border border-white bg-white/10 px-2 2xl:h-10"
						>
							<span
								class="h-4 w-4 shrink-0 rounded-full border border-white 2xl:h-5 2xl:w-5"
								:class="statusDotClass(row.uiStatus)"
								aria-hidden="true"
							/>
							<span class="text-sm text-white 2xl:text-base">
								{{ statusLabel(row.uiStatus) }}
							</span>
							<span v-if="row.valueSummary" class="text-sm text-white/85 2xl:text-base">
								{{ row.valueSummary }}
							</span>
						</div>

						<p v-if="row.error" class="mt-2 text-center text-xs text-white/85">
							{{ row.error }}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { AirCirculationZone } from "~/types/air-circulation"
import { compareZonesLoose } from "~/utils/sortOrder"

type UiStatus = "normal" | "warning" | "alarm" | "offline" | "unknown"

const props = defineProps<{
	zones: AirCirculationZone[]
	statusItems: Array<{
		zoneId: string
		zoneName: string
		locationId: string
		locationName: string
		systemId: string
		uiStatus: UiStatus
		raw: Record<string, unknown>
		error?: string
	}>
	selectedZone: string
}>()

const emit = defineEmits<{
	zoneSelected: [zoneId: string]
}>()

const handleZoneClick = (zoneId: string) => emit("zoneSelected", zoneId)

const itemBySystemId = computed(() => {
	const m = new Map<string, (typeof props.statusItems)[number]>()
	for (const it of props.statusItems || []) {
		m.set(String(it.systemId), it)
	}
	return m
})

const displayedZones = computed(() => {
	if (!props.zones?.length) return []
	const sorted = [...props.zones].sort((a, b) => compareZonesLoose(a as any, b as any))
	return sorted.filter((z) => (z.locations || []).length > 0)
})

const statusLabel = (s: UiStatus) => {
	if (s === "normal") return "正常"
	if (s === "alarm") return "警報"
	if (s === "offline") return "離線"
	if (s === "unknown") return "未知"
	return "異常"
}

const statusDotClass = (s: UiStatus) => {
	if (s === "normal") return "bg-emerald-400"
	if (s === "alarm") return "bg-rose-500"
	if (s === "offline") return "bg-amber-400"
	if (s === "unknown") return "bg-amber-400"
	return "bg-amber-400"
}

const rowBlinkClass = (s: UiStatus) => {
	if (s === "alarm") return "blink-alarm-fast"
	if (s === "warning" || s === "offline") return "blink-slow"
	return ""
}

const rowBackgroundClass = (s: UiStatus) => {
	if (s === "alarm") return "bg-[#FF0000]/60"
	if (s === "warning" || s === "offline") return "bg-[#FFC801]/60"
	return "bg-white/10"
}

const zoneHasAbnormal = (zone: AirCirculationZone) =>
	(zone.locations || []).some((loc) => {
		const it = loc.systemId ? itemBySystemId.value.get(String(loc.systemId)) : null
		const s = (it?.uiStatus ?? "unknown") as UiStatus
		return s !== "normal" && s !== "unknown"
	})

const zoneHasAlarm = (zone: AirCirculationZone) =>
	(zone.locations || []).some((loc) => {
		const it = loc.systemId ? itemBySystemId.value.get(String(loc.systemId)) : null
		return (it?.uiStatus ?? "unknown") === "alarm"
	})

const getZoneBlinkClass = (zone: AirCirculationZone) => {
	if (zoneHasAlarm(zone)) return "blink-alarm-fast"
	if (zoneHasAbnormal(zone)) return "blink-slow"
	return ""
}

const buildValueSummary = (raw: Record<string, unknown> | undefined) => {
	if (!raw) return ""
	const v = raw.temperatureC ?? raw.tempC ?? raw.temperature ?? raw.temp
	if (typeof v === "number" && Number.isFinite(v)) return `${Math.round(v)}°C`
	return ""
}

const zoneRows = (zone: AirCirculationZone) => {
	const out: Array<{
		rowKey: string
		locationName: string
		uiStatus: UiStatus
		valueSummary: string
		error?: string
	}> = []

	for (let i = 0; i < (zone.locations || []).length; i += 1) {
		const loc = zone.locations[i]!
		const systemId = loc.systemId ? String(loc.systemId) : ""
		const it = systemId ? itemBySystemId.value.get(systemId) : null
		const uiStatus = (it?.uiStatus ?? "unknown") as UiStatus
		out.push({
			rowKey: loc.id || `${zone.id || zone.name}-${i}`,
			locationName: loc.name,
			uiStatus,
			valueSummary: buildValueSummary(it?.raw),
			error: it?.error,
		})
	}
	return out
}
</script>

