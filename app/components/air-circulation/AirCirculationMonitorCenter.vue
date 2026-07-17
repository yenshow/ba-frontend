<template>
	<div
		class="relative flex h-full min-h-0 flex-col overflow-hidden monitoring-panel rounded-2xl px-3 py-6 2xl:px-4 2xl:py-8"
	>
		<div class="shrink-0 space-y-2">
			<h3 class="ms-[12px] text-center text-2xl tracking-[12px] text-white 2xl:text-3xl">
				監控中心
			</h3>

			<div v-if="viewFilterOptions.length > 0" class="mx-auto w-full max-w-xs">
				<FilterDropdown
					v-model="viewFilter"
					:options="viewFilterOptions"
					:status="viewCategoryStatusById[viewFilter] ?? 'normal'"
					placeholder="請選擇檢視分類"
					text-size="text-sm 2xl:text-base"
				/>
			</div>
		</div>

		<div
			class="show-scrollbar mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto ps-3 pe-1 pt-2 2xl:mt-8 2xl:space-y-8"
		>
		<div v-for="zone in displayedZones" :key="zone.id || zone.name" class="space-y-3 2xl:space-y-4">
			<div class="flex items-center justify-start gap-3">
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
								: zoneHasWarning(zone)
									? 'ring-2 ring-amber-400/90 ring-offset-2 ring-offset-transparent'
									: '',
							getZoneBlinkClass(zone),
						]"
						:aria-label="
							zoneHasAlarm(zone)
								? `${zone.name}，此區域有地點警報`
								: zoneHasWarning(zone)
									? `${zone.name}，此區域有地點異常`
									: `${zone.name}，選取此樓層`
						"
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
					v-if="zoneRows(zone).length > 0"
					class="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2"
				>
					<div
						v-for="row in zoneRows(zone)"
						:key="row.rowKey"
						class="flex min-w-0 flex-col rounded-xl border-2 border-white px-3 py-2"
						:class="[rowBackgroundClass(row.uiStatus), rowBlinkClass(row.uiStatus)]"
					>
						<div class="flex min-w-0 items-center gap-3 py-2">
							<div class="shrink-0">
								<FanIcon
									:aria-label="`${row.locationName} 設備圖示`"
									root-class="h-16 w-16 text-white 2xl:h-24 2xl:w-24"
									:spin="row.uiStatus === 'alarm'"
								/>
							</div>
							<div class="flex min-w-0 flex-1 flex-col justify-center gap-2">
								<h4 class="truncate text-center text-lg text-white 2xl:text-xl">
									{{ row.locationName }}
								</h4>
								<div
									class="mx-1 flex items-center justify-center gap-2 rounded-full border border-white bg-white/10 py-2"
								>
									<span
										class="h-4 w-4 shrink-0 rounded-full border border-white 2xl:h-5 2xl:w-5"
										:class="statusDotClass(row.uiStatus)"
										aria-hidden="true"
									/>
									<span class="text-sm text-white 2xl:text-base">
										{{ statusLabel(row.uiStatus) }}
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
				system-route-prefix="air-circulation"
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
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import FanIcon from "~/components/air-circulation/FanIcon.vue"
import {
	type AirCirculationZone,
	type AirCirculationLocation,
	type AirCirculationStatusItem,
	type AirCirculationViewFilterOption,
	airCirculationLocationInViewCategory,
} from "~/types/air-circulation"
import type { SystemUiStatus } from "~/utils/monitoringStatus"
import { compareZonesLoose } from "~/utils/sortOrder"
import { buildViewCategoryStatusById } from "~/utils/monitorViewCategoryStatus"

const viewFilter = defineModel<string>("viewFilter", { required: true })

const props = defineProps<{
	zones: AirCirculationZone[]
	statusItems: AirCirculationStatusItem[]
	selectedZone: string
	/** 與地點 viewCategory 相同；不含「全部」 */
	viewFilterOptions: AirCirculationViewFilterOption[]
	manualIssueTargets?: Array<{ id: string; label: string }>
	manualIssueDefaultTargetId?: string
	ruleBitOptionsByTargetId?: Record<string, ManualIssueRuleBitOption[]>
}>()

const emit = defineEmits<{
	zoneSelected: [zoneId: string]
	manualIssueChanged: [payload?: ManualIssueChangedPayload]
}>()

const handleZoneClick = (zoneId: string) => emit("zoneSelected", zoneId)

const manualIssueTargets = computed(() => props.manualIssueTargets ?? [])
const manualIssueDefaultTargetId = computed(() => props.manualIssueDefaultTargetId ?? "")
const ruleBitOptionsByTargetId = computed(() => props.ruleBitOptionsByTargetId ?? {})
const handleManualIssueChanged = (payload?: ManualIssueChangedPayload) =>
	emit("manualIssueChanged", payload)

const itemBySystemId = computed(() => {
	const m = new Map<string, AirCirculationStatusItem>()
	for (const it of props.statusItems || []) {
		m.set(String(it.systemId), it)
	}
	return m
})

const matchesViewFilter = (loc: AirCirculationLocation): boolean =>
	airCirculationLocationInViewCategory(loc, viewFilter.value)

const locationsForZone = (zone: AirCirculationZone): AirCirculationLocation[] => {
	const list = zone.locations || []
	const out: AirCirculationLocation[] = []
	list.forEach((loc) => {
		if (!matchesViewFilter(loc)) return
		out.push(loc)
	})
	return out
}

const uiStatusForLocation = (loc: AirCirculationLocation): SystemUiStatus => {
	const it = loc.systemId ? itemBySystemId.value.get(String(loc.systemId)) : null
	return it?.uiStatus ?? "warning"
}

const displayedZones = computed(() => {
	if (!props.zones?.length) return []
	const sorted = [...props.zones].sort((a, b) => compareZonesLoose(a, b))
	return sorted.filter((z) => locationsForZone(z).length > 0)
})

const statusLabel = (s: SystemUiStatus) => {
	if (s === "normal") return "正常"
	if (s === "alarm") return "警報"
	return "異常"
}

const statusDotClass = (s: SystemUiStatus) => {
	if (s === "normal") return "bg-emerald-400"
	if (s === "alarm") return "bg-rose-500"
	return "bg-amber-400"
}

const rowBlinkClass = (s: SystemUiStatus) => {
	if (s === "alarm") return "blink-fast"
	if (s === "warning") return "blink-slow"
	return ""
}

const rowBackgroundClass = (s: SystemUiStatus) => {
	if (s === "alarm") return "bg-[#FF0000]/60"
	if (s === "warning") return "bg-[#FFC801]/60"
	return "bg-white/10"
}

const evaluateAirCirculationLocationStatus = (
	_zone: AirCirculationZone,
	loc: AirCirculationLocation
) => {
	const s = uiStatusForLocation(loc)
	return {
		flash: s === "alarm" ? ("alarm-fast" as const) : s !== "normal" ? ("slow" as const) : ("none" as const),
		isAlarm: s === "alarm",
	}
}

const viewCategoryStatusById = computed(() =>
	buildViewCategoryStatusById({
		zones: props.zones,
		categoryIds: props.viewFilterOptions.map((o) => o.value),
		getZoneLocations: (zone) => zone.locations || [],
		locationInCategory: (loc, categoryId) =>
			airCirculationLocationInViewCategory(loc, categoryId),
		evaluateLocation: evaluateAirCirculationLocationStatus,
	})
)

const zoneHasWarning = (zone: AirCirculationZone) =>
	locationsForZone(zone).some((loc) => uiStatusForLocation(loc) !== "normal")

const zoneHasAlarm = (zone: AirCirculationZone) =>
	locationsForZone(zone).some((loc) => uiStatusForLocation(loc) === "alarm")

const getZoneBlinkClass = (zone: AirCirculationZone) => {
	if (zoneHasAlarm(zone)) return "blink-fast"
	if (zoneHasWarning(zone)) return "blink-slow"
	return ""
}

const zoneRows = (zone: AirCirculationZone) => {
	const out: Array<{
		rowKey: string
		locationName: string
		uiStatus: SystemUiStatus
	}> = []

	const locs = locationsForZone(zone)
	for (let i = 0; i < locs.length; i += 1) {
		const loc = locs[i]!
		const uiStatus = uiStatusForLocation(loc)
		out.push({
			rowKey: loc.id || `${zone.id || zone.name}-${i}`,
			locationName: loc.name,
			uiStatus,
		})
	}
	return out
}
</script>
