<template>
	<div
		class="show-scrollbar relative h-full overflow-hidden overflow-y-auto rounded-2xl border-2 border-white/80 bg-white/30 space-y-6 px-3 py-6 2xl:space-y-8 2xl:px-4 2xl:py-8"
	>
		<h3 class="ms-[12px] text-center text-2xl tracking-[12px] text-white 2xl:text-3xl">監控中心</h3>

		<div v-for="zone in displayedZones" :key="zone.id" class="space-y-3 2xl:space-y-4">
			<div class="flex items-center justify-center gap-3">
				<div class="relative shrink-0">
					<button
						type="button"
						@click="handleZoneClick(zone.id || zone.name)"
						:class="[
							'cursor-pointer rounded-full border-2 p-2 transition-all',
							props.selectedZone === (zone.id || zone.name)
								? 'bg-white text-black/50'
								: 'bg-transparent text-white',
							zoneHasAbnormal(zone)
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
						class="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold leading-none text-teal-950 2xl:h-5 2xl:min-w-5 2xl:text-[10px]"
						:class="'bg-amber-400'"
						aria-hidden="true"
						title="此區域有異常"
					>
						!
					</span>
				</div>

				<div
					v-if="getZoneLocationsWithIds(zone).length > 0"
					class="grid grid-cols-2 gap-x-2 gap-y-4 2xl:gap-y-6"
				>
					<div
						v-for="row in getZoneLocationsWithIds(zone)"
						:key="row.locationId"
						:class="[
							'flex flex-col rounded-xl border-2 border-white px-3 py-2',
							getLocationCardBackgroundClass(row.locationId),
							getLocationCardBlinkClass(row.locationId),
						]"
					>
						<h4 class="mb-2 whitespace-nowrap text-center text-xl text-white 2xl:text-2xl">
							{{ row.location.name }}
						</h4>

						<div class="flex items-center gap-2">
							<div class="shrink-0">
								<NuxtImg
									src="/hvac/air-conditioner.png"
									alt="空調圖示"
									class="h-16 w-16 2xl:h-24 2xl:w-24"
									width="96"
									height="96"
								/>
							</div>

							<div class="flex min-w-0 flex-1 flex-col items-center gap-2">
								<div class="relative flex w-full justify-center">
									<div
										v-if="props.areaToggling.has(row.locationId)"
										class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
									>
										<div
											class="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white 2xl:h-7 2xl:w-7"
										></div>
									</div>

									<label
										class="relative inline-flex select-none items-center"
										:class="{
											'cursor-not-allowed': isLocationDisabled(row.locationId) || !props.canToggle,
											'cursor-pointer': !isLocationDisabled(row.locationId) && props.canToggle,
										}"
									>
										<input
											type="checkbox"
											:checked="getLocationStatus(row.locationId).isOn"
											class="peer sr-only"
											:disabled="isLocationDisabled(row.locationId) || !props.canToggle"
											@change="handleToggle(row.locationId, getLocationStatus(row.locationId).isOn)"
										/>
										<div
											:class="[
												'relative h-9 w-[5.125rem] shrink-0 overflow-hidden rounded-full border-2 border-white bg-white/15 transition-colors duration-200 peer-checked:bg-[#5eb8e8] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white 2xl:h-10 2xl:w-24',
												isLocationDisabled(row.locationId) || !props.canToggle ? 'opacity-50' : '',
											]"
										>
											<span
												class="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold tracking-wide text-white transition-opacity duration-200 2xl:left-2.5 2xl:text-xs"
												:class="
													getLocationStatus(row.locationId).isOn ? 'opacity-100' : 'opacity-0'
												"
											>
												ON
											</span>
											<span
												class="pointer-events-none absolute right-2 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold tracking-wide text-white transition-opacity duration-200 2xl:right-2.5 2xl:text-xs"
												:class="
													getLocationStatus(row.locationId).isOn ? 'opacity-0' : 'opacity-100'
												"
											>
												OFF
											</span>
											<span
												class="pointer-events-none absolute top-1/2 block h-7 w-7 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out 2xl:h-8 2xl:w-8"
												:class="
													getLocationStatus(row.locationId).isOn
														? 'left-[calc(100%-1.75rem-0.25rem)] 2xl:left-[calc(100%-2rem-0.25rem)]'
														: 'left-1'
												"
											></span>
										</div>
									</label>
								</div>

								<div
									class="flex h-9 w-full items-center justify-center gap-2 rounded-full border border-white bg-white/10 px-2 2xl:h-10"
								>
									<div
										:class="[
											'h-4 w-4 shrink-0 rounded-full border border-white 2xl:h-5 2xl:w-5',
											getLocationStatus(row.locationId).uiStatus === 'normal'
												? 'bg-emerald-400'
												: 'bg-amber-400',
										]"
										aria-hidden="true"
									></div>
									<span class="text-sm text-white 2xl:text-base">
										{{ getLocationStatus(row.locationId).label }}
									</span>
									<span
										v-if="getLocationStatus(row.locationId).temperatureLabel"
										class="text-sm text-white/85 2xl:text-base"
									>
										{{ getLocationStatus(row.locationId).temperatureLabel }}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { HvacZone, HvacLocation, HvacUiStatus } from "~/types/hvac"
import { getLocationUiKey } from "~/utils/locationUiId"
import { compareZonesLoose } from "~/utils/sortOrder"

interface Props {
	zones: HvacZone[]
	areaStatuses?: Record<
		string,
		{ isOn: boolean; uiStatus: HvacUiStatus; temperatureC: number | null }
	>
	areaDisabledMap?: Record<string, boolean>
	areaToggling?: Set<string>
	selectedZone?: string
	canToggle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	zones: () => [],
	areaStatuses: () => ({}),
	areaDisabledMap: () => ({}),
	areaToggling: () => new Set(),
	selectedZone: "",
	canToggle: true,
})

const emit = defineEmits<{
	toggle: [areaId: string, nextIsOn: boolean]
	"zone-selected": [zoneId: string]
}>()

const getZoneLocations = (zone: HvacZone): HvacLocation[] => zone.locations || []

const getZoneLocationsWithIds = (zone: HvacZone) =>
	getZoneLocations(zone).map((location, locationIndex) => ({
		location,
		locationIndex,
		locationId: getLocationUiKey({ zone: zone as any, location: location as any, locationIndex }),
	}))

const displayedZones = computed(() => {
	if (!props.zones || !Array.isArray(props.zones)) return []
	const zonesWithLocations = props.zones.filter((z) => getZoneLocations(z).length > 0)
	const zonesToShow = zonesWithLocations.length > 0 ? zonesWithLocations : props.zones
	return [...zonesToShow].sort((a, b) => compareZonesLoose(a as any, b as any))
})

const getLocationStatus = (locationId: string) => {
	const s = props.areaStatuses[locationId]
	const uiStatus: HvacUiStatus = s?.uiStatus ?? "abnormal"
	const label = uiStatus === "normal" ? "正常" : "異常"
	const temperatureLabel =
		s?.temperatureC != null && Number.isFinite(s.temperatureC)
			? `${Math.round(s.temperatureC)}°C`
			: ""
	return {
		isOn: !!s?.isOn,
		uiStatus,
		label,
		temperatureLabel,
	}
}

const isLocationDisabled = (locationId: string): boolean =>
	(props.areaDisabledMap[locationId] ?? false) || props.areaToggling.has(locationId)

const isAbnormal = (locationId: string) => {
	const s = getLocationStatus(locationId).uiStatus
	return s === "abnormal"
}

const getLocationCardBlinkClass = (locationId: string): string =>
	isAbnormal(locationId) ? "blink-slow" : ""

const getLocationCardBackgroundClass = (locationId: string): string =>
	isAbnormal(locationId) ? "bg-[#FFC801]/60" : "bg-white/10"

const zoneHasAbnormal = (zone: HvacZone) =>
	getZoneLocationsWithIds(zone).some((row) => isAbnormal(row.locationId))

const getZoneBlinkClass = (zone: HvacZone): string => (zoneHasAbnormal(zone) ? "blink-slow" : "")

const handleToggle = (areaId: string, isOn: boolean) => {
	if (!props.canToggle) return
	emit("toggle", areaId, !isOn)
}

const handleZoneClick = (zoneId: string) => emit("zone-selected", zoneId)
</script>
