<template>
	<div
		class="relative flex h-full min-h-0 flex-col overflow-hidden monitoring-panel rounded-2xl px-3 py-6 2xl:px-4 2xl:py-8"
	>
		<h3 class="ms-[12px] shrink-0 text-center text-2xl tracking-[12px] text-white 2xl:text-3xl">
			監控中心
		</h3>

		<div
			class="show-scrollbar mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto ps-3 pe-1 pt-2 2xl:mt-8 2xl:space-y-8"
		>
			<div v-for="zone in displayedZones" :key="zone.id" class="space-y-3 2xl:space-y-4">
				<div class="flex items-center justify-start gap-3">
					<div class="relative shrink-0">
						<button
							type="button"
							:class="[
								'cursor-pointer rounded-full border-2 p-2 transition-all',
								props.selectedZone === (zone.id || zone.name)
									? 'bg-white text-black/50'
									: 'bg-transparent text-white',
								zoneHasWarning(zone)
									? 'ring-2 ring-amber-400/90 ring-offset-2 ring-offset-transparent'
									: '',
								getZoneBlinkClass(zone),
							]"
							:aria-label="`${zone.name}，選取此樓層`"
							@click="handleZoneClick(zone.id || zone.name)"
						>
							<h4 class="w-[48px] p-2 text-xl font-semibold tracking-wider 2xl:text-2xl">
								{{ zone.name }}
							</h4>
						</button>
						<span
							v-if="zoneHasWarning(zone)"
							class="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-0.5 text-[9px] font-bold leading-none text-teal-950 2xl:h-5 2xl:min-w-5 2xl:text-[10px]"
							aria-hidden="true"
							title="此區域有異常"
						>
							!
						</span>
					</div>

					<div
						v-if="getZoneLocationsWithIds(zone).length > 0"
						class="flex min-w-0 flex-1 flex-col gap-3 2xl:gap-4"
					>
						<div
							v-for="row in getZoneLocationsWithIds(zone)"
							:key="row.locationId"
							:class="[
								'flex justify-center items-center rounded-xl border-2 border-white pt-2 pb-4 gap-4',
								getLocationCardBackgroundClass(row.locationId),
								getLocationCardBlinkClass(row.locationId),
							]"
						>
							<!-- 左：圖示 + 目前溫度 -->
							<div class="flex flex-col items-center">
								<NuxtImg
									src="/hvac/air-conditioner.png"
									alt="空調圖示"
									class="h-20 w-20 2xl:h-[100px] 2xl:w-[100px]"
									width="128"
									height="128"
								/>
								<span
									class="border-b border-white/60 px-2 pb-0.5 text-xl text-white 2xl:text-2xl"
									:aria-label="`目前溫度 ${getLocationStatus(row.locationId).temperatureLabel || '未知'}`"
								>
									{{ getLocationStatus(row.locationId).temperatureLabel || "--°C" }}
								</span>
							</div>

							<!-- 右：名稱 / 開關狀態 / 溫度風速 -->
							<div class="flex flex-col gap-2">
								<h4 class="whitespace-nowrap text-xl tracking-[6px] text-white 2xl:text-2xl ps-12">
									{{ row.location.name }}
								</h4>

								<div class="flex items-center justify-center gap-2 2xl:gap-3">
									<div class="flex flex-col items-center gap-2 px-4">
										<div class="relative flex justify-center">
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
													'cursor-not-allowed':
														isLocationDisabled(row.locationId) || !props.canToggle,
													'cursor-pointer': !isLocationDisabled(row.locationId) && props.canToggle,
												}"
											>
												<input
													type="checkbox"
													:checked="getEffectiveIsOn(row.locationId)"
													class="peer sr-only"
													:disabled="isLocationDisabled(row.locationId) || !props.canToggle"
													@change="handleToggle(row.locationId, getEffectiveIsOn(row.locationId))"
												/>
												<div
													:class="[
														'relative h-9 w-[5.125rem] shrink-0 overflow-hidden rounded-full border-2 border-white bg-white/15 transition-colors duration-200 peer-checked:bg-[#5eb8e8] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white 2xl:h-10 2xl:w-24',
														isLocationDisabled(row.locationId) || !props.canToggle
															? 'opacity-50'
															: '',
													]"
												>
													<span
														class="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold tracking-wide text-white transition-opacity duration-200 2xl:left-2.5 2xl:text-xs"
														:class="getEffectiveIsOn(row.locationId) ? 'opacity-100' : 'opacity-0'"
													>
														ON
													</span>
													<span
														class="pointer-events-none absolute right-2 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold tracking-wide text-white transition-opacity duration-200 2xl:right-2.5 2xl:text-xs"
														:class="getEffectiveIsOn(row.locationId) ? 'opacity-0' : 'opacity-100'"
													>
														OFF
													</span>
													<span
														class="pointer-events-none absolute top-1/2 block h-7 w-7 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out 2xl:h-8 2xl:w-8"
														:class="
															getEffectiveIsOn(row.locationId)
																? 'left-[calc(100%-1.75rem-0.25rem)] 2xl:left-[calc(100%-2rem-0.25rem)]'
																: 'left-1'
														"
													></span>
												</div>
											</label>
										</div>

										<div
											class="flex h-9 items-center justify-center gap-2 rounded-full border border-white bg-white/10 px-4 2xl:h-10"
										>
											<div
												:class="[
													'h-4 w-4 shrink-0 rounded-full border border-white 2xl:h-5 2xl:w-5',
													isLocationNormal(row.locationId) ? 'bg-emerald-400' : 'bg-amber-400',
												]"
												aria-hidden="true"
											></div>
											<span class="text-sm text-white 2xl:text-base">
												{{ getLocationStatus(row.locationId).label }}
											</span>
										</div>
									</div>

									<div
										class="flex w-20 flex-col items-center justify-between gap-1 rounded-lg border border-white bg-white/10 py-1.5"
									>
										<span class="text-sm tracking-[3px] text-white 2xl:text-base">溫度</span>
										<div class="flex items-center">
											<button
												type="button"
												:class="stepBtnClass(canStepSetpoint(row.locationId, -1))"
												:disabled="!canStepSetpoint(row.locationId, -1)"
												aria-label="降低設定溫度"
												@click="handleSetpointStep(row.locationId, -1)"
											>
												<svg
													class="h-9 w-9"
													viewBox="0 0 24 24"
													fill="currentColor"
													aria-hidden="true"
												>
													<path fill-rule="evenodd" :d="TRIANGLE_MINUS_PATH" />
												</svg>
											</button>
											<button
												type="button"
												:class="stepBtnClass(canStepSetpoint(row.locationId, 1))"
												:disabled="!canStepSetpoint(row.locationId, 1)"
												aria-label="提高設定溫度"
												@click="handleSetpointStep(row.locationId, 1)"
											>
												<svg
													class="h-9 w-9"
													viewBox="0 0 24 24"
													fill="currentColor"
													aria-hidden="true"
												>
													<path fill-rule="evenodd" :d="TRIANGLE_PLUS_PATH" />
												</svg>
											</button>
										</div>
										<span
											class="px-1.5 text-sm text-white 2xl:text-base"
											:aria-label="`設定溫度 ${getSetpointLabel(row.locationId)}`"
										>
											{{ getSetpointLabel(row.locationId) }}
										</span>
									</div>

									<div
										class="flex w-20 flex-col items-center justify-between gap-1 rounded-lg border border-white bg-white/10 py-1.5"
									>
										<span class="text-sm tracking-[3px] text-white 2xl:text-base">風速</span>
										<div class="flex items-center">
											<button
												type="button"
												:class="stepBtnClass(canStepFanSpeed(row.locationId, -1))"
												:disabled="!canStepFanSpeed(row.locationId, -1)"
												aria-label="降低風速"
												@click="handleFanSpeedStep(row.locationId, -1)"
											>
												<svg
													class="h-9 w-9"
													viewBox="0 0 24 24"
													fill="currentColor"
													aria-hidden="true"
												>
													<path fill-rule="evenodd" :d="TRIANGLE_MINUS_PATH" />
												</svg>
											</button>
											<button
												type="button"
												:class="stepBtnClass(canStepFanSpeed(row.locationId, 1))"
												:disabled="!canStepFanSpeed(row.locationId, 1)"
												aria-label="提高風速"
												@click="handleFanSpeedStep(row.locationId, 1)"
											>
												<svg
													class="h-9 w-9"
													viewBox="0 0 24 24"
													fill="currentColor"
													aria-hidden="true"
												>
													<path fill-rule="evenodd" :d="TRIANGLE_PLUS_PATH" />
												</svg>
											</button>
										</div>
										<div
											class="flex h-5 items-end gap-[3px] 2xl:h-6"
											role="img"
											:aria-label="`風速 ${getFanSpeedLabel(row.locationId)}`"
										>
											<span
												v-for="level in FAN_SPEED_MAX"
												:key="level"
												class="w-1 rounded-sm 2xl:w-1.5"
												:class="
													level <= getEffectiveFanSpeed(row.locationId) ? 'bg-white' : 'bg-white/25'
												"
												:style="{ height: `${(level / FAN_SPEED_MAX) * 100}%` }"
											></span>
										</div>
									</div>
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
import { TOGGLE_SNAPSHOT_HOLD_MS } from "~/utils/realtimeTiming"

interface Props {
	zones: HvacZone[]
	areaStatuses?: Record<
		string,
		{
			isOn: boolean
			uiStatus: HvacUiStatus
			temperatureC: number | null
			setpointC?: number | null
			fanSpeed?: number | null
		}
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
	"set-temperature": [areaId: string, nextSetpointC: number]
	"set-fan-speed": [areaId: string, nextFanSpeed: number]
	"zone-selected": [zoneId: string]
}>()

// 設定溫度／風速範圍（AO 寫入契約定案前的 UI 預設值）
const SETPOINT_MIN_C = 16
const SETPOINT_MAX_C = 30
const SETPOINT_STEP_C = 1
const SETPOINT_DEFAULT_C = 26
const FAN_SPEED_MIN = 1
const FAN_SPEED_MAX = 4
const FAN_SPEED_DEFAULT = 1

const TRIANGLE_MINUS_PATH =
	"M19 4.8a1 1 0 0 0-1.5-.87L4.4 11.13a1 1 0 0 0 0 1.74l13.1 7.2a1 1 0 0 0 1.5-.87zM9.5 11h7v2h-7z"
const TRIANGLE_PLUS_PATH =
	"M5 4.8a1 1 0 0 1 1.5-.87l13.1 7.2a1 1 0 0 1 0 1.74l-13.1 7.2a1 1 0 0 1-1.5-.87zM9 11V8.5h2V11h2.5v2H11v2.5H9V13H6.5v-2z"

const STEP_BTN_BASE =
	"flex h-10 w-10 items-center justify-center text-white transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"

const stepBtnClass = (enabled: boolean) =>
	`${STEP_BTN_BASE} ${enabled ? "cursor-pointer hover:opacity-75" : "cursor-not-allowed opacity-40"}`

type PendingToggleState = {
	nextIsOn: boolean
	expiresAt: number
}

// Modbus/快照落地有時 > 2.5s，避免 pending 過早失效造成跳回舊狀態
const PENDING_TOGGLE_EXPIRE_MS = TOGGLE_SNAPSHOT_HOLD_MS

const pendingToggles = ref<Record<string, PendingToggleState>>({})
const localSetpoints = ref<Record<string, number>>({})
const localFanSpeeds = ref<Record<string, number>>({})

const setPendingToggle = (locationId: string, nextIsOn: boolean) => {
	pendingToggles.value = {
		...pendingToggles.value,
		[locationId]: {
			nextIsOn,
			expiresAt: Date.now() + PENDING_TOGGLE_EXPIRE_MS,
		},
	}
}

const clearPendingToggle = (locationId: string) => {
	if (!pendingToggles.value[locationId]) return
	const { [locationId]: _removed, ...rest } = pendingToggles.value
	pendingToggles.value = rest
}

const pruneExpiredPendingToggles = () => {
	const now = Date.now()
	const current = pendingToggles.value
	let changed = false
	const next: Record<string, PendingToggleState> = {}
	for (const [id, state] of Object.entries(current)) {
		if (state.expiresAt > now) {
			next[id] = state
			continue
		}
		changed = true
	}
	if (!changed) return
	pendingToggles.value = next
}

const clearLocalWhenSnapshotMatches = (
	localMap: Ref<Record<string, number>>,
	getSnapshot: (locationId: string) => number | null
) => {
	let next: Record<string, number> | null = null
	for (const [locationId, localValue] of Object.entries(localMap.value)) {
		if (getSnapshot(locationId) !== localValue) continue
		if (!next) next = { ...localMap.value }
		delete next[locationId]
	}
	if (next) localMap.value = next
}

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
	// 對外僅兩態：normal / warning（alarm 視為 warning）
	const uiStatus: HvacUiStatus = s?.uiStatus === "alarm" ? "warning" : (s?.uiStatus ?? "warning")
	const temperatureLabel =
		s?.temperatureC != null && Number.isFinite(s.temperatureC)
			? `${Math.round(s.temperatureC)}°C`
			: ""
	return {
		isOn: !!s?.isOn,
		uiStatus,
		label: uiStatus === "normal" ? "正常" : "異常",
		temperatureLabel,
	}
}

const getEffectiveIsOn = (locationId: string) => {
	const pending = pendingToggles.value[locationId]
	if (pending) return pending.nextIsOn
	return getLocationStatus(locationId).isOn
}

const getSnapshotSetpoint = (locationId: string): number | null => {
	const v = props.areaStatuses[locationId]?.setpointC
	return v != null && Number.isFinite(v) ? Math.round(v) : null
}

const getSnapshotFanSpeed = (locationId: string): number | null => {
	const v = props.areaStatuses[locationId]?.fanSpeed
	return v != null && Number.isFinite(v) ? Math.round(v) : null
}

const getEffectiveSetpoint = (locationId: string): number =>
	localSetpoints.value[locationId] ?? getSnapshotSetpoint(locationId) ?? SETPOINT_DEFAULT_C

const getEffectiveFanSpeed = (locationId: string): number =>
	localFanSpeeds.value[locationId] ?? getSnapshotFanSpeed(locationId) ?? FAN_SPEED_DEFAULT

const getSetpointLabel = (locationId: string): string => `${getEffectiveSetpoint(locationId)}°C`

const getFanSpeedLabel = (locationId: string): string =>
	`${getEffectiveFanSpeed(locationId)} / ${FAN_SPEED_MAX} 段`

const canAdjust = (locationId: string): boolean =>
	props.canToggle && getEffectiveIsOn(locationId) && !props.areaToggling.has(locationId)

const canStepSetpoint = (locationId: string, direction: 1 | -1): boolean => {
	if (!canAdjust(locationId)) return false
	const next = getEffectiveSetpoint(locationId) + direction * SETPOINT_STEP_C
	return next >= SETPOINT_MIN_C && next <= SETPOINT_MAX_C
}

const canStepFanSpeed = (locationId: string, direction: 1 | -1): boolean => {
	if (!canAdjust(locationId)) return false
	const next = getEffectiveFanSpeed(locationId) + direction
	return next >= FAN_SPEED_MIN && next <= FAN_SPEED_MAX
}

const handleSetpointStep = (locationId: string, direction: 1 | -1) => {
	if (!canStepSetpoint(locationId, direction)) return
	const next = getEffectiveSetpoint(locationId) + direction * SETPOINT_STEP_C
	localSetpoints.value = { ...localSetpoints.value, [locationId]: next }
	emit("set-temperature", locationId, next)
}

const handleFanSpeedStep = (locationId: string, direction: 1 | -1) => {
	if (!canStepFanSpeed(locationId, direction)) return
	const next = getEffectiveFanSpeed(locationId) + direction
	localFanSpeeds.value = { ...localFanSpeeds.value, [locationId]: next }
	emit("set-fan-speed", locationId, next)
}

const isLocationNormal = (locationId: string): boolean =>
	getLocationStatus(locationId).uiStatus === "normal"

const isLocationDisabled = (locationId: string): boolean =>
	(props.areaDisabledMap[locationId] ?? false) ||
	props.areaToggling.has(locationId) ||
	!!pendingToggles.value[locationId]

const isWarning = (locationId: string) => !isLocationNormal(locationId)

const getLocationCardBlinkClass = (locationId: string): string =>
	isWarning(locationId) ? "blink-slow" : ""

const getLocationCardBackgroundClass = (locationId: string): string =>
	isWarning(locationId) ? "bg-[#FFC801]/60" : "bg-white/10"

const zoneHasWarning = (zone: HvacZone) =>
	getZoneLocationsWithIds(zone).some((row) => isWarning(row.locationId))

const getZoneBlinkClass = (zone: HvacZone): string => (zoneHasWarning(zone) ? "blink-slow" : "")

const handleToggle = (areaId: string, isOn: boolean) => {
	if (!props.canToggle) return
	if (isLocationDisabled(areaId)) return
	setPendingToggle(areaId, !isOn)
	emit("toggle", areaId, !isOn)
}

const handleZoneClick = (zoneId: string) => emit("zone-selected", zoneId)

watch(
	() => [props.areaToggling, props.areaStatuses] as const,
	() => {
		for (const [locationId, pending] of Object.entries(pendingToggles.value)) {
			if (props.areaStatuses[locationId]?.isOn === pending.nextIsOn) {
				clearPendingToggle(locationId)
			}
		}
		pruneExpiredPendingToggles()
		clearLocalWhenSnapshotMatches(localSetpoints, getSnapshotSetpoint)
		clearLocalWhenSnapshotMatches(localFanSpeeds, getSnapshotFanSpeed)
	},
	{ deep: true }
)

let pruneTimer: number | null = null
onMounted(() => {
	pruneTimer = window.setInterval(() => {
		pruneExpiredPendingToggles()
	}, 1000)
})

onBeforeUnmount(() => {
	if (pruneTimer == null) return
	window.clearInterval(pruneTimer)
	pruneTimer = null
})
</script>
