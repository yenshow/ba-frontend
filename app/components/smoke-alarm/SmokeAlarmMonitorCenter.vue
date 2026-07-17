<template>
	<div
		class="relative flex h-full min-h-0 flex-col overflow-hidden monitoring-panel rounded-2xl px-3 py-6 2xl:px-4 2xl:py-8"
	>
		<div class="shrink-0 space-y-2">
			<h3 class="ms-[12px] text-center text-2xl tracking-[12px] text-white 2xl:text-3xl">
				監控中心
			</h3>
		</div>

		<div
			class="show-scrollbar mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pe-1 2xl:mt-8 2xl:space-y-8"
		>
		<div v-for="zone in displayedZones" :key="zone.id || zone.name" class="space-y-3 2xl:space-y-4">
			<div class="flex items-center justify-center gap-3">
				<div class="relative shrink-0">
					<button
						type="button"
						class="cursor-pointer rounded-full border-2 p-2 transition-all"
						:class="[
							selectedZone === (zone.id || zone.name)
								? 'bg-white text-black/50'
								: 'bg-transparent text-white',
							zoneHasAlarm(zone)
								? 'ring-2 ring-red-500/90 ring-offset-2 ring-offset-transparent'
								: zoneHasWarning(zone)
									? 'ring-2 ring-amber-400/90 ring-offset-2 ring-offset-transparent'
									: '',
							getZoneAlertBlinkClass(zone),
						]"
						:aria-label="
							zoneHasAlarm(zone)
								? `${zone.name}，此區域有地點警報`
								: zoneHasWarning(zone)
									? `${zone.name}，此區域有地點異常`
									: `${zone.name}，選取此樓層`
						"
						@click="handleZoneClick(zone.id || zone.name || '')"
					>
						<h4 class="w-[48px] p-2 text-xl font-semibold tracking-wider 2xl:text-2xl">
							{{ zone.name }}
						</h4>
					</button>
					<span
						v-if="zoneHasWarning(zone)"
						class="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold leading-none 2xl:h-5 2xl:min-w-5 2xl:text-[10px]"
						:class="zoneHasAlarm(zone) ? 'bg-red-500 text-white' : 'bg-amber-400 text-teal-950'"
						aria-hidden="true"
						:title="zoneHasAlarm(zone) ? '此區域有地點警報' : '此區域有地點異常'"
					>
						!
					</span>
				</div>

				<div
					v-if="locationsForZone(zone).length > 0"
					class="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2"
				>
					<div
						v-for="row in locationsForZone(zone)"
						:key="row.rowKey"
						class="flex min-w-0 flex-col rounded-xl border-2 border-white px-3 py-2"
						:class="[
							locationRowBackgroundClass(zone, row.loc),
							locationRowFlashClass(zone, row.loc),
						]"
					>
						<div class="flex min-w-0 items-center gap-3 py-2">
							<div class="shrink-0">
								<SmokeIcon
									:aria-label="`${row.loc.name} 煙霧警報設備圖示`"
									root-class="h-16 w-16 text-white 2xl:h-24 2xl:w-24"
									:animate="rowUiStatus(row.loc) === 'alarm'"
								/>
							</div>
							<div class="flex min-w-0 flex-1 flex-col justify-center gap-2">
								<h4 class="truncate text-center text-lg text-white 2xl:text-xl">
									{{ row.loc.name }}
								</h4>
								<div
									class="mx-1 flex items-center justify-center gap-2 rounded-full border border-white bg-white/10 py-2"
								>
									<span
										class="h-4 w-4 shrink-0 rounded-full border border-white 2xl:h-5 2xl:w-5"
										:class="statusDotClass(rowUiStatus(row.loc))"
										aria-hidden="true"
									/>
									<span class="text-sm text-white 2xl:text-base">
										{{ statusLabel(rowUiStatus(row.loc)) }}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

			<ManualIssuePanel
				v-if="manualIssueTargets.length > 0"
				system-route-prefix="smoke-alarm"
				:targets="manualIssueTargets"
				:default-target-id="manualIssueDefaultTargetId"
				:rule-bit-options-by-target-id="ruleBitOptionsByTargetId"
				@changed="handleManualIssueChanged"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import ManualIssuePanel from "~/components/common/ManualIssuePanel.vue"
import type { ManualIssueChangedPayload, ManualIssueRuleBitOption } from "~/utils/alertUtils"
import type { SmokeAlarmZone, SmokeAlarmLocation, SmokeAlarmStatusItem } from "~/types/smoke-alarm"
import { deriveSmokeAlarmUiStatus } from "~/types/smoke-alarm"
import { compareZonesLoose } from "~/utils/sortOrder"
import SmokeIcon from "~/components/smoke-alarm/SmokeIcon.vue"

const props = defineProps<{
	zones: SmokeAlarmZone[]
	statusItems: SmokeAlarmStatusItem[]
	selectedZone: string
	manualIssueTargets?: Array<{ id: string; label: string }>
	manualIssueDefaultTargetId?: string
	ruleBitOptionsByTargetId?: Record<string, ManualIssueRuleBitOption[]>
}>()

const emit = defineEmits<{
	zoneSelected: [zoneId: string]
	manualIssueChanged: [payload?: ManualIssueChangedPayload]
}>()

const handleZoneClick = (zoneId: string) => {
	emit("zoneSelected", zoneId)
}

const manualIssueTargets = computed(() => props.manualIssueTargets ?? [])
const manualIssueDefaultTargetId = computed(() => props.manualIssueDefaultTargetId ?? "")
const ruleBitOptionsByTargetId = computed(() => props.ruleBitOptionsByTargetId ?? {})
const handleManualIssueChanged = (payload?: ManualIssueChangedPayload) =>
	emit("manualIssueChanged", payload)

const itemBySystemId = computed(() => {
	const m = new Map<string, SmokeAlarmStatusItem>()
	for (const it of props.statusItems) {
		m.set(String(it.systemId), it)
	}
	return m
})

const rowKey = (zone: SmokeAlarmZone, loc: SmokeAlarmLocation, index: number): string =>
	loc.id || `location-${zone.id || zone.name}-${index}`

const locationsForZone = (zone: SmokeAlarmZone): { loc: SmokeAlarmLocation; rowKey: string }[] => {
	const list = zone.locations || []
	const out: { loc: SmokeAlarmLocation; rowKey: string }[] = []
	list.forEach((loc, index) => {
		out.push({ loc, rowKey: rowKey(zone, loc, index) })
	})
	return out
}

const displayedZones = computed(() => {
	if (!props.zones?.length) return []
	const sorted = [...props.zones].sort((a, b) => compareZonesLoose(a, b))
	return sorted.filter((zone) => locationsForZone(zone).length > 0)
})

const getItemForLocation = (loc: SmokeAlarmLocation): SmokeAlarmStatusItem | null => {
	if (!loc.systemId) return null
	return itemBySystemId.value.get(String(loc.systemId)) ?? null
}

const rowUiStatus = (loc: SmokeAlarmLocation): SmokeAlarmStatusItem["uiStatus"] =>
	deriveSmokeAlarmUiStatus(getItemForLocation(loc))

const statusLabel = (s: SmokeAlarmStatusItem["uiStatus"]) => {
	if (s === "normal") return "正常"
	if (s === "alarm") return "警報"
	if (s === "warning") return "異常"
	return "異常"
}

const statusDotClass = (s: SmokeAlarmStatusItem["uiStatus"]) => {
	if (s === "normal") return "bg-emerald-400"
	if (s === "alarm") return "bg-rose-500"
	if (s === "warning") return "bg-amber-400"
	return "bg-amber-400"
}

type RowFlash = "none" | "slow" | "alarm-fast"

const flashFromUi = (s: SmokeAlarmStatusItem["uiStatus"]): RowFlash => {
	if (s === "normal") return "none"
	if (s === "alarm") return "alarm-fast"
	return "slow"
}

const rowFlashMode = (_zone: SmokeAlarmZone, loc: SmokeAlarmLocation): RowFlash =>
	flashFromUi(rowUiStatus(loc))

const flashModeToClass = (mode: RowFlash): string => {
	if (mode === "alarm-fast") return "blink-fast"
	if (mode === "slow") return "blink-slow"
	return ""
}

const zoneHasWarning = (zone: SmokeAlarmZone): boolean =>
	locationsForZone(zone).some(({ loc }) => rowFlashMode(zone, loc) !== "none")

const zoneHasAlarm = (zone: SmokeAlarmZone): boolean =>
	locationsForZone(zone).some(({ loc }) => rowUiStatus(loc) === "alarm")

const getZoneAlertBlinkClass = (zone: SmokeAlarmZone): string => {
	const modes = locationsForZone(zone).map(({ loc }) => rowFlashMode(zone, loc))
	if (modes.includes("alarm-fast")) return "blink-fast"
	if (modes.includes("slow")) return "blink-slow"
	return ""
}

const locationRowFlashClass = (zone: SmokeAlarmZone, loc: SmokeAlarmLocation): string =>
	flashModeToClass(rowFlashMode(zone, loc))

const locationRowBackgroundClass = (_zone: SmokeAlarmZone, loc: SmokeAlarmLocation): string => {
	const mode = rowFlashMode(_zone, loc)
	if (mode === "alarm-fast") return "bg-[#FF0000]/60"
	if (mode === "slow") return "bg-[#FFC801]/60"
	return "bg-white/10"
}
</script>
