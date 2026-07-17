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
			class="show-scrollbar mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pe-1 2xl:mt-8 2xl:space-y-8"
		>
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
					<template v-for="row in locationsForZone(zone)" :key="row.rowKey">
						<div
							class="flex flex-col rounded-xl border-2 border-white px-3 py-2"
							:class="[
								locationRowBackgroundClass(zone, row.loc),
								locationRowFlashClass(zone, row.loc),
								isTankLocation(row.loc) ? 'sm:col-span-2' : '',
							]"
						>
							<!-- 揚水泵：附圖版型（左圖右資訊） -->
							<template v-if="isPumpLocation(row.loc)">
								<div class="flex min-w-0 items-center gap-2 py-2">
									<div
										v-if="equipmentIconSrc(row.loc)"
										class="flex w-[4.5rem] shrink-0 items-center justify-center 2xl:w-[5.5rem]"
									>
										<NuxtImg
											:src="equipmentIconSrc(row.loc)!"
											:alt="`${row.loc.name} 設備示意`"
											class="h-16 w-16 object-contain 2xl:h-[4.5rem] 2xl:w-[4.5rem]"
											width="72"
											height="72"
										/>
									</div>
									<div class="flex min-w-0 flex-1 flex-col justify-center">
										<h4 class="mb-2 whitespace-nowrap text-center text-lg text-white 2xl:text-xl">
											{{ row.loc.name }}
										</h4>
										<div
											class="flex items-center justify-center gap-2 rounded-full border border-white bg-white/10 mx-4 py-2"
										>
											<span
												class="h-4 w-4 shrink-0 rounded-full border border-white 2xl:h-5 2xl:w-5"
												:class="statusDotClass(pumpUiStatus(row.loc))"
												aria-hidden="true"
											/>
											<span class="text-sm text-white 2xl:text-base">
												{{ statusLabel(pumpUiStatus(row.loc)) }}
											</span>
										</div>
									</div>
								</div>
							</template>

							<!-- 液位：水箱蓋／水位／高／低（raw 細項 + running 聚合） -->
							<template v-else>
								<div class="flex min-w-0 flex-row items-stretch gap-3 2xl:gap-4">
									<div
										class="flex w-[4.5rem] shrink-0 flex-col items-center justify-center 2xl:w-[5.5rem]"
									>
										<NuxtImg
											v-if="equipmentIconSrc(row.loc)"
											:src="equipmentIconSrc(row.loc)!"
											:alt="`${row.loc.name} 液位示意`"
											class="h-16 w-16 object-contain 2xl:h-[4.5rem] 2xl:w-[4.5rem]"
											width="72"
											height="72"
										/>
									</div>
									<div
										class="grid min-w-0 flex-1 grid-cols-3 pt-2"
										role="group"
										:aria-label="`${row.loc.name} 液位狀態`"
									>
										<div class="flex min-h-[5.5rem] flex-col px-2 text-center 2xl:min-h-[6rem]">
											<span class="border-b-2 border-white/50 pb-1.5 text-white/90 2xl:text-base">
												水箱蓋狀態
											</span>
											<div class="flex flex-1 flex-col items-center justify-center">
												<div
													class="inline-flex items-center gap-1.5 rounded-full border border-white bg-white/10 px-2.5 py-1.5"
												>
													<span
														class="h-4 w-4 shrink-0 rounded-full border border-white 2xl:h-5 2xl:w-5"
														:class="statusDotClass(tankDerived(row.loc, 'cover'))"
														aria-hidden="true"
													/>
													<span class="text-xs text-white 2xl:text-sm">
														{{ tankLabel(row.loc, "cover") }}
													</span>
												</div>
											</div>
										</div>
										<div class="flex min-h-[5.5rem] flex-col px-2 text-center 2xl:min-h-[6rem]">
											<span class="border-b-2 border-white/50 pb-1.5 text-white/90 2xl:text-base">
												水位狀態
											</span>
											<div class="flex flex-1 flex-col items-center justify-center">
												<div
													class="inline-flex items-center gap-1.5 rounded-full border border-white bg-white/10 px-2.5 py-1.5"
												>
													<span
														class="h-4 w-4 shrink-0 rounded-full border border-white 2xl:h-5 2xl:w-5"
														:class="statusDotClass(tankDerived(row.loc, 'level'))"
														aria-hidden="true"
													/>
													<span class="text-xs text-white 2xl:text-sm">
														{{ tankLabel(row.loc, "level") }}
													</span>
												</div>
											</div>
										</div>
										<div class="flex min-h-[5.5rem] flex-col px-2 text-center 2xl:min-h-[6rem]">
											<span class="border-b-2 border-white/50 pb-1.5 text-white/90 2xl:text-base">
												水位警告
											</span>
											<div class="flex flex-1 flex-col items-center justify-center gap-1">
												<span
													class="rounded-full border px-2.5 py-1 text-[11px] leading-snug tracking-wide 2xl:text-xs"
													:class="highLowClass(row.loc, 'high')"
												>
													高水位
												</span>
												<span
													class="rounded-full border px-2.5 py-1 text-[11px] leading-snug tracking-wide 2xl:text-xs"
													:class="highLowClass(row.loc, 'low')"
												>
													低水位
												</span>
											</div>
										</div>
									</div>
								</div>
							</template>
						</div>
					</template>
				</div>
			</div>
		</div>

			<ManualIssuePanel
				v-if="manualIssueTargets.length > 0"
				system-route-prefix="drainage"
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
import {
	type DrainageZone,
	type DrainageLocation,
	type DrainageStatusItem,
	type DrainageViewFilterOption,
	drainageLocationInViewCategory,
	deriveDrainagePumpUiStatus,
	deriveDrainageTankOverallUiStatus,
	deriveDrainageTankPartUiStatus,
} from "~/types/drainage"
import { compareZonesLoose } from "~/utils/sortOrder"
import { buildViewCategoryStatusById } from "~/utils/monitorViewCategoryStatus"

const viewFilter = defineModel<string>("viewFilter", { required: true })

const props = defineProps<{
	zones: DrainageZone[]
	statusItems: DrainageStatusItem[]
	selectedZone: string
	/** 與地點 viewCategory 相同；不含「全部」 */
	viewFilterOptions: DrainageViewFilterOption[]
	manualIssueTargets?: Array<{ id: string; label: string }>
	manualIssueDefaultTargetId?: string
	ruleBitOptionsByTargetId?: Record<string, ManualIssueRuleBitOption[]>
}>()

const DRAINAGE_ICONS = {
	pump: "/drainage/drainage-icon-pump.png",
	coverAlert: "/drainage/drainage-icon-cover-alert.png",
	highLevel: "/drainage/drainage-icon-high-level.png",
	lowLevel: "/drainage/drainage-icon-low-level.png",
	normalLevel: "/drainage/drainage-icon-normal-level.png",
} as const

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

const handleManualIssueChanged = (payload?: ManualIssueChangedPayload) => {
	emit("manualIssueChanged", payload)
}

const itemBySystemId = computed(() => {
	const m = new Map<string, DrainageStatusItem>()
	for (const it of props.statusItems) {
		m.set(String(it.systemId), it)
	}
	return m
})

const matchesViewFilter = (loc: DrainageLocation): boolean =>
	drainageLocationInViewCategory(loc, viewFilter.value)

const drainageLocationRowKey = (zone: DrainageZone, loc: DrainageLocation, index: number): string =>
	loc.id || `location-${zone.id || zone.name}-${index}`

const locationsForZone = (zone: DrainageZone): { loc: DrainageLocation; rowKey: string }[] => {
	const list = zone.locations || []
	const out: { loc: DrainageLocation; rowKey: string }[] = []
	list.forEach((loc, index) => {
		if (!matchesViewFilter(loc)) return
		out.push({ loc, rowKey: drainageLocationRowKey(zone, loc, index) })
	})
	return out
}

/**
 * 排序後僅列出「目前檢視分類下至少有一筆地點」的區（例如 RF 在「排水」下無點位則整列不顯示）
 */
const displayedZones = computed(() => {
	if (!props.zones?.length) return []
	const sorted = [...props.zones].sort((a, b) => compareZonesLoose(a, b))
	return sorted.filter((zone) => locationsForZone(zone).length > 0)
})

const getItemForLocation = (loc: DrainageLocation): DrainageStatusItem | null => {
	if (!loc.systemId) return null
	return itemBySystemId.value.get(String(loc.systemId)) ?? null
}

const pumpUiStatus = (loc: DrainageLocation): DrainageStatusItem["uiStatus"] =>
	deriveDrainagePumpUiStatus(getItemForLocation(loc))

const statusLabel = (s: string) => {
	if (s === "normal") return "正常"
	if (s === "warning" || s === "offline" || s === "unknown") return "異常"
	if (s === "alarm") return "警報"
	return "異常"
}

/** 監控中心狀態點：正常(綠)／異常(黃)／警報(紅)；離線、未知歸在異常層 */
const statusDotClass = (s: string) => {
	if (s === "normal") return "bg-emerald-400"
	if (s === "warning" || s === "offline" || s === "unknown") return "bg-amber-400"
	if (s === "alarm") return "bg-rose-500"
	return "bg-amber-400"
}

const equipmentIconSrc = (loc: DrainageLocation): string | null => {
	if (!loc.systemId) return null
	const kind = loc.equipmentKind || "pump"
	if (kind === "pump") return DRAINAGE_ICONS.pump
	const it = itemBySystemId.value.get(String(loc.systemId))
	const raw = it?.raw || {}
	if (raw.coverAlarm === true) return DRAINAGE_ICONS.coverAlert
	if (raw.highLevel === true) return DRAINAGE_ICONS.highLevel
	if (raw.lowLevel === true) return DRAINAGE_ICONS.lowLevel
	return DRAINAGE_ICONS.normalLevel
}

const tankDerived = (
	loc: DrainageLocation,
	part: "cover" | "level"
): DrainageStatusItem["uiStatus"] => {
	return deriveDrainageTankPartUiStatus(getItemForLocation(loc), part)
}

const tankLabel = (loc: DrainageLocation, part: "cover" | "level") => {
	const s = tankDerived(loc, part)
	if (s === "alarm") return "警報"
	if (s === "warning") return "異常"
	return "正常"
}

const tankUiStatus = (loc: DrainageLocation): DrainageStatusItem["uiStatus"] =>
	deriveDrainageTankOverallUiStatus(getItemForLocation(loc))

const isPumpLocation = (loc: DrainageLocation) => (loc.equipmentKind || "pump") === "pump"
const isTankLocation = (loc: DrainageLocation) => !isPumpLocation(loc)

/** 監控中心閃爍：異常(黃)／警報(紅) */
type DrainageRowFlash = "none" | "slow" | "alarm-fast"

const pumpFlashFromUiStatus = (s: DrainageStatusItem["uiStatus"]): DrainageRowFlash => {
	if (s === "normal") return "none"
	if (s === "alarm") return "alarm-fast"
	// warning／offline／unknown：異常層
	return "slow"
}

const drainageRowFlashMode = (zone: DrainageZone, loc: DrainageLocation): DrainageRowFlash => {
	if (isPumpLocation(loc)) {
		return pumpFlashFromUiStatus(pumpUiStatus(loc))
	}
	if (tankDerived(loc, "cover") === "alarm" || tankDerived(loc, "level") === "alarm") {
		return "alarm-fast"
	}
	return pumpFlashFromUiStatus(tankUiStatus(loc))
}

const evaluateDrainageLocationStatus = (zone: DrainageZone, loc: DrainageLocation) => {
	const flash = drainageRowFlashMode(zone, loc)
	const isAlarm = isPumpLocation(loc)
		? pumpUiStatus(loc) === "alarm"
		: tankDerived(loc, "cover") === "alarm" || tankDerived(loc, "level") === "alarm"
	return { flash, isAlarm }
}

const viewCategoryStatusById = computed(() =>
	buildViewCategoryStatusById({
		zones: props.zones,
		categoryIds: props.viewFilterOptions.map((o) => o.value),
		getZoneLocations: (zone) => zone.locations || [],
		locationInCategory: (loc, categoryId) => drainageLocationInViewCategory(loc, categoryId),
		evaluateLocation: evaluateDrainageLocationStatus,
	})
)

const flashModeToClass = (mode: DrainageRowFlash): string => {
	if (mode === "alarm-fast") return "blink-fast"
	if (mode === "slow") return "blink-slow"
	return ""
}

const zoneHasWarning = (zone: DrainageZone): boolean =>
	locationsForZone(zone).some(({ loc }) => drainageRowFlashMode(zone, loc) !== "none")

const zoneHasAlarm = (zone: DrainageZone): boolean =>
	locationsForZone(zone).some(({ loc }) => evaluateDrainageLocationStatus(zone, loc).isAlarm)

const getZoneAlertBlinkClass = (zone: DrainageZone): string => {
	const modes = locationsForZone(zone).map(({ loc }) => drainageRowFlashMode(zone, loc))
	if (modes.includes("alarm-fast")) return "blink-fast"
	if (modes.includes("slow")) return "blink-slow"
	return ""
}

const locationRowFlashClass = (zone: DrainageZone, loc: DrainageLocation): string =>
	flashModeToClass(drainageRowFlashMode(zone, loc))

const locationRowBackgroundClass = (zone: DrainageZone, loc: DrainageLocation): string => {
	const mode = drainageRowFlashMode(zone, loc)
	if (mode === "alarm-fast") return "bg-[#FF0000]/60"
	if (mode === "slow") return "bg-[#FFC801]/60"
	return "bg-white/10"
}

const highLowClass = (loc: DrainageLocation, which: "high" | "low") => {
	const it = loc.systemId ? itemBySystemId.value.get(String(loc.systemId)) : undefined
	const raw = it?.raw || {}
	const on = which === "high" ? raw.highLevel === true : raw.lowLevel === true
	return on
		? "border-white/90 bg-white/15 text-white ring-2 ring-white/50"
		: "border-white/20 text-white/45"
}
</script>
