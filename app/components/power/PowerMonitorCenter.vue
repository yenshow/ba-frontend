<template>
	<div
		class="show-scrollbar relative h-full overflow-hidden overflow-y-auto monitoring-panel rounded-2xl space-y-6 px-3 py-6 2xl:space-y-8 2xl:px-4 2xl:py-8"
	>
		<div class="space-y-2">
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
								isGeneratorLocation(row.loc) ? 'sm:col-span-2' : '',
							]"
						>
							<!-- 獨立油位：小卡 -->
							<template v-if="isOilLevelLocation(row.loc)">
								<div class="flex min-w-0 items-center gap-2 py-2">
									<div class="flex w-[4.5rem] shrink-0 items-center justify-center 2xl:w-[5.5rem]">
										<NuxtImg
											src="/power/power-station.png"
											:alt="`${row.loc.name} 發電機油位示意`"
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
												:class="statusDotClass(overallUi(row.loc))"
												aria-hidden="true"
											/>
											<span class="text-sm text-white 2xl:text-base">
												{{ statusLabel(overallUi(row.loc)) }}
											</span>
										</div>
									</div>
								</div>
							</template>

							<!-- 發電機：發電機狀態／油位狀態／高／低油位 -->
							<template v-else>
								<div class="flex min-w-0 flex-row items-stretch gap-3 2xl:gap-4">
									<div
										class="flex w-[4.5rem] shrink-0 flex-col items-center justify-center 2xl:w-[5.5rem]"
									>
										<NuxtImg
											src="/power/power-station.png"
											:alt="`${row.loc.name} 發電機示意`"
											class="h-16 w-16 object-contain 2xl:h-[4.5rem] 2xl:w-[4.5rem]"
											width="72"
											height="72"
										/>
									</div>

									<div
										class="grid min-w-0 flex-1 grid-cols-3 pt-2"
										role="group"
										:aria-label="`${row.loc.name} 發電機狀態`"
									>
										<div class="flex min-h-[5.5rem] flex-col px-2 text-center 2xl:min-h-[6rem]">
											<span class="border-b-2 border-white/50 pb-1.5 text-white/90 2xl:text-base">
												發電機狀態
											</span>
											<div class="flex flex-1 flex-col items-center justify-center">
												<div
													class="inline-flex items-center gap-1.5 rounded-full border border-white bg-white/10 px-2.5 py-1.5"
												>
													<span
														class="h-4 w-4 shrink-0 rounded-full border border-white 2xl:h-5 2xl:w-5"
														:class="
															statusDotClass(
																derivePowerGeneratorRunStatus(getItemForLocation(row.loc))
															)
														"
														aria-hidden="true"
													/>
													<span class="text-xs text-white 2xl:text-sm">
														{{
															statusLabel(
																derivePowerGeneratorRunStatus(getItemForLocation(row.loc))
															)
														}}
													</span>
												</div>
											</div>
										</div>

										<div class="flex min-h-[5.5rem] flex-col px-2 text-center 2xl:min-h-[6rem]">
											<span class="border-b-2 border-white/50 pb-1.5 text-white/90 2xl:text-base">
												油位狀態
											</span>
											<div class="flex flex-1 flex-col items-center justify-center">
												<div
													class="inline-flex items-center gap-1.5 rounded-full border border-white bg-white/10 px-2.5 py-1.5"
												>
													<span
														class="h-4 w-4 shrink-0 rounded-full border border-white 2xl:h-5 2xl:w-5"
														:class="
															statusDotClass(
																derivePowerGeneratorOilStatus(getItemForLocation(row.loc))
															)
														"
														aria-hidden="true"
													/>
													<span class="text-xs text-white 2xl:text-sm">
														{{
															statusLabel(
																derivePowerGeneratorOilStatus(getItemForLocation(row.loc))
															)
														}}
													</span>
												</div>
											</div>
										</div>

										<div class="flex min-h-[5.5rem] flex-col px-2 text-center 2xl:min-h-[6rem]">
											<span class="border-b-2 border-white/50 pb-1.5 text-white/90 2xl:text-base">
												油位警告
											</span>
											<div class="flex flex-1 flex-col items-center justify-center gap-1">
												<span
													class="rounded-full border px-2.5 py-1 text-[11px] leading-snug tracking-wide 2xl:text-xs"
													:class="highLowWarnClass(row.loc, 'high')"
												>
													高油位
												</span>
												<span
													class="rounded-full border px-2.5 py-1 text-[11px] leading-snug tracking-wide 2xl:text-xs"
													:class="highLowWarnClass(row.loc, 'low')"
												>
													低油位
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
			system-route-prefix="power"
			:targets="manualIssueTargets"
			:default-target-id="manualIssueDefaultTargetId"
			:rule-bit-options-by-target-id="ruleBitOptionsByTargetId"
			@changed="handleManualIssueChanged"
		/>
	</div>
</template>

<script setup lang="ts">
import ManualIssuePanel from "~/components/common/ManualIssuePanel.vue"
import type { ManualIssueChangedPayload, ManualIssueRuleBitOption } from "~/utils/alertUtils"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import {
	type PowerZone,
	type PowerLocation,
	type PowerStatusItem,
	type PowerViewFilterOption,
	powerLocationInViewCategory,
	derivePowerGeneratorRunStatus,
	derivePowerGeneratorOilStatus,
	derivePowerOverallUiStatus,
} from "~/types/power"
import { compareZonesLoose } from "~/utils/sortOrder"
import { buildViewCategoryStatusById } from "~/utils/monitorViewCategoryStatus"

const viewFilter = defineModel<string>("viewFilter", { required: true })

const props = defineProps<{
	zones: PowerZone[]
	statusItems: PowerStatusItem[]
	selectedZone: string
	viewFilterOptions: PowerViewFilterOption[]
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

const handleManualIssueChanged = (payload?: ManualIssueChangedPayload) => {
	emit("manualIssueChanged", payload)
}

const itemBySystemId = computed(() => {
	const m = new Map<string, PowerStatusItem>()
	for (const it of props.statusItems) {
		m.set(String(it.systemId), it)
	}
	return m
})

const matchesViewFilter = (loc: PowerLocation): boolean =>
	powerLocationInViewCategory(loc, viewFilter.value)

const powerLocationRowKey = (zone: PowerZone, loc: PowerLocation, index: number): string =>
	loc.id || `location-${zone.id || zone.name}-${index}`

const locationsForZone = (zone: PowerZone): { loc: PowerLocation; rowKey: string }[] => {
	const list = zone.locations || []
	const out: { loc: PowerLocation; rowKey: string }[] = []
	list.forEach((loc, index) => {
		if (!matchesViewFilter(loc)) return
		out.push({ loc, rowKey: powerLocationRowKey(zone, loc, index) })
	})
	return out
}

const displayedZones = computed(() => {
	if (!props.zones?.length) return []
	const sorted = [...props.zones].sort((a, b) => compareZonesLoose(a, b))
	return sorted.filter((zone) => locationsForZone(zone).length > 0)
})

const getItemForLocation = (loc: PowerLocation): PowerStatusItem | null => {
	if (!loc.systemId) return null
	return itemBySystemId.value.get(String(loc.systemId)) ?? null
}

const overallUi = (loc: PowerLocation): PowerStatusItem["uiStatus"] =>
	derivePowerOverallUiStatus(getItemForLocation(loc))

const statusLabel = (s: PowerStatusItem["uiStatus"]) => {
	if (s === "normal") return "正常"
	if (s === "alarm") return "警報"
	return "異常"
}

const statusDotClass = (s: PowerStatusItem["uiStatus"]) => {
	if (s === "normal") return "bg-emerald-400"
	if (s === "alarm") return "bg-rose-500"
	return "bg-amber-400"
}

const isGeneratorLocation = (loc: PowerLocation) =>
	(loc.equipmentKind || "generator") === "generator"

const isOilLevelLocation = (loc: PowerLocation) => loc.equipmentKind === "oil_level"

const highLowWarnClass = (loc: PowerLocation, which: "high" | "low") => {
	const it = loc.systemId ? itemBySystemId.value.get(String(loc.systemId)) : undefined
	const raw = it?.raw || {}
	const on = which === "high" ? raw.highOil === true : raw.lowOil === true
	return on
		? "border-white/90 bg-white/15 text-white ring-2 ring-white/50"
		: "border-white/20 text-white/45"
}

type RowFlash = "none" | "slow" | "alarm-fast"

const flashFromUiStatus = (s: PowerStatusItem["uiStatus"]): RowFlash => {
	if (s === "normal") return "none"
	if (s === "alarm") return "alarm-fast"
	return "slow"
}

const generatorDetailFlashMode = (loc: PowerLocation): RowFlash => {
	const item = getItemForLocation(loc)
	const run = derivePowerGeneratorRunStatus(item)
	const oil = derivePowerGeneratorOilStatus(item)
	if (run === "alarm" || oil === "alarm") return "alarm-fast"
	return flashFromUiStatus(overallUi(loc))
}

const powerRowFlashMode = (loc: PowerLocation): RowFlash => {
	if (isOilLevelLocation(loc)) return flashFromUiStatus(overallUi(loc))
	return generatorDetailFlashMode(loc)
}

const evaluatePowerLocationStatus = (_zone: PowerZone, loc: PowerLocation) => ({
	flash: powerRowFlashMode(loc),
	isAlarm: overallUi(loc) === "alarm",
})

const viewCategoryStatusById = computed(() =>
	buildViewCategoryStatusById({
		zones: props.zones,
		categoryIds: props.viewFilterOptions.map((o) => o.value),
		getZoneLocations: (zone) => zone.locations || [],
		locationInCategory: (loc, categoryId) => powerLocationInViewCategory(loc, categoryId),
		evaluateLocation: evaluatePowerLocationStatus,
	})
)

const flashModeToClass = (mode: RowFlash): string => {
	if (mode === "alarm-fast") return "blink-fast"
	if (mode === "slow") return "blink-slow"
	return ""
}

const zoneHasWarning = (zone: PowerZone): boolean =>
	locationsForZone(zone).some(({ loc }) => powerRowFlashMode(loc) !== "none")

const zoneHasAlarm = (zone: PowerZone): boolean =>
	locationsForZone(zone).some(({ loc }) => overallUi(loc) === "alarm")

const getZoneAlertBlinkClass = (zone: PowerZone): string => {
	const modes = locationsForZone(zone).map(({ loc }) => powerRowFlashMode(loc))
	if (modes.includes("alarm-fast")) return "blink-fast"
	if (modes.includes("slow")) return "blink-slow"
	return ""
}

const locationRowFlashClass = (_zone: PowerZone, loc: PowerLocation): string =>
	flashModeToClass(powerRowFlashMode(loc))

const locationRowBackgroundClass = (_zone: PowerZone, loc: PowerLocation): string => {
	const mode = powerRowFlashMode(loc)
	if (mode === "alarm-fast") return "bg-[#FF0000]/60"
	if (mode === "slow") return "bg-[#FFC801]/60"
	return "bg-white/10"
}
</script>
