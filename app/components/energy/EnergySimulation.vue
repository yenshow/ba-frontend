<script setup lang="ts">
import type { EnergyReadingRow } from "~/types/energy"
import { getTimeRangeUTC } from "~/utils/dateUtils"

const props = defineProps<{
	readings: EnergyReadingRow[]
	loading?: boolean
}>()

const emit = defineEmits<{
	"update:time-range": [payload: { startTime: string; endTime: string; preset: string }]
}>()

const preset = ref("today")

const handlePreset = () => {
	const range = getTimeRangeUTC(preset.value)
	emit("update:time-range", {
		startTime: range.start.toISOString(),
		endTime: range.end.toISOString(),
		preset: preset.value,
	})
}

onMounted(() => handlePreset())
</script>

<template>
	<div class="space-y-4 text-white">
		<div class="flex flex-wrap items-center gap-3">
			<label class="flex items-center gap-2 text-sm">
				<span class="text-white/70">時間範圍</span>
				<select v-model="preset" class="form-input" @change="handlePreset">
					<option value="today">今日</option>
					<option value="last_7_days">近一週</option>
					<option value="last_30_days">近一個月</option>
				</select>
			</label>
			<span v-if="loading" class="text-sm text-white/50">載入中…</span>
		</div>
		<div class="overflow-x-auto rounded border border-white/10">
			<table class="min-w-full text-left text-sm">
				<thead class="bg-white/5 text-white/60">
					<tr>
						<th class="px-3 py-2">時間</th>
						<th class="px-3 py-2">設備</th>
						<th class="px-3 py-2">累積電能 (kWh)</th>
						<th class="px-3 py-2">累積水量 (m³)</th>
						<th class="px-3 py-2">功率 (kW)</th>
						<th class="px-3 py-2">需量 (kW)</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="row in readings"
						:key="row.id"
						class="border-t border-white/5 text-white/80"
					>
						<td class="px-3 py-2 whitespace-nowrap">
							{{ new Date(row.recordedAt).toLocaleString() }}
						</td>
						<td class="px-3 py-2">{{ row.deviceName || row.deviceId }}</td>
						<td class="px-3 py-2 tabular-nums">{{ row.data.active_energy ?? "—" }}</td>
						<td class="px-3 py-2 tabular-nums">{{ row.data.water_volume ?? "—" }}</td>
						<td class="px-3 py-2 tabular-nums">{{ row.data.active_power ?? "—" }}</td>
						<td class="px-3 py-2 tabular-nums">{{ row.data.demand ?? "—" }}</td>
					</tr>
					<tr v-if="!loading && readings.length === 0">
						<td colspan="6" class="px-3 py-8 text-center text-white/40">此區間無讀數</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>
