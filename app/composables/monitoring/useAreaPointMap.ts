import { computed, ref, watch, type ComputedRef, type Ref } from "vue"
import { useAuth } from "~/composables/core/useAuth"
import { PERM } from "~/config/permissionCodes"
import type { SystemType, UnifiedLocation, UnifiedZone } from "~/types/location"
import { getSystemTypeLabel } from "~/types/location"
import { getLocationStyleBySystem, hasCoordinatesForSystem } from "~/utils/locationAdapter"
import type { MapDotStatus } from "~/utils/monitoringStatus"
import { normalizeSystemUiStatus } from "~/utils/monitoringStatus"
import type { LightingZone } from "~/types/lighting"
import type { DrainageZone } from "~/types/drainage"
import type { PowerZone } from "~/types/power"
import type { HvacZone } from "~/types/hvac"
import type { FireZone } from "~/types/fire"
import type { AirCirculationZone } from "~/types/air-circulation"
import type { SmokeAlarmZone } from "~/types/smoke-alarm"
import type { EmergencyRescueZone } from "~/types/emergency-rescue"
import { useLightingApi } from "~/composables/systems/lighting/useLightingApi"
import { useDrainageApi } from "~/composables/systems/drainage/useDrainageApi"
import { usePowerApi } from "~/composables/systems/power/usePowerApi"
import { useHvacApi } from "~/composables/systems/hvac/useHvacApi"
import { useFireApi } from "~/composables/systems/fire/useFireApi"
import { useAirCirculationApi } from "~/composables/systems/air-circulation/useAirCirculationApi"
import { useSmokeAlarmApi } from "~/composables/systems/smoke-alarm/useSmokeAlarmApi"
import { useEmergencyRescueApi } from "~/composables/systems/emergency-rescue/useEmergencyRescueApi"
import { useMonitoringOverviewApi } from "~/composables/monitoring/useMonitoringOverviewApi"
import {
	useAirCirculationModbusIntegration,
	useDrainageModbusIntegration,
	useEmergencyRescueModbusIntegration,
	useFireModbusIntegration,
	usePowerModbusIntegration,
	useSmokeAlarmModbusIntegration,
} from "~/composables/monitoring/modbus/snapshotModbusIntegrations"
import {
	useHvacModbusIntegration,
	useLightingModbusIntegration,
} from "~/composables/monitoring/modbus/toggleModbusIntegrations"
import { getLocationUiKey } from "~/utils/locationUiId"
import type { SystemUiStatus } from "~/utils/monitoringStatus"

/** 全區點位圖會拉狀態／顯示異常色的 Modbus 子系統 */
export const AREA_POINT_MODBUS_SYSTEMS = [
	"lighting",
	"drainage",
	"fire",
	"power",
	"hvac",
	"air_circulation",
	"smoke_alarm",
	"emergency_rescue",
] as const

export type AreaPointModbusSystem = (typeof AREA_POINT_MODBUS_SYSTEMS)[number]

const MODULE_BY_SYSTEM: Record<AreaPointModbusSystem, string> = {
	lighting: PERM.lighting.module,
	drainage: PERM.drainage.module,
	fire: PERM.fire.module,
	power: PERM.power.module,
	hvac: PERM.hvac.module,
	air_circulation: PERM.airCirculation.module,
	smoke_alarm: PERM.smokeAlarm.module,
	emergency_rescue: PERM.emergencyRescue.module,
}

export const isAreaPointModbusSystem = (systemType: SystemType): systemType is AreaPointModbusSystem =>
	(AREA_POINT_MODBUS_SYSTEMS as readonly string[]).includes(systemType)

/** 有實際 uiStatus 才轉點位色；缺資料／unknown 不當異常 */
export const uiStatusToDotIfPresent = (uiStatus: string | null | undefined): MapDotStatus | null => {
	const raw = String(uiStatus ?? "").trim().toLowerCase()
	if (!raw || raw === "unknown") return null
	return normalizeSystemUiStatus(raw)
}

const extractSystemTypes = (locations: UnifiedLocation[]): SystemType[] => {
	if (!locations?.length) return []
	const systemTypes = new Set<SystemType>()
	for (const location of locations) {
		location.systems?.forEach((system) => systemTypes.add(system.systemType))
	}
	return Array.from(systemTypes)
}

type FlashMode = "none" | "slow" | "fast"

const dotSeverity = (s: MapDotStatus): 0 | 1 | 2 => {
	if (s === "alarm") return 2
	if (s === "warning") return 1
	return 0
}

const mergeDotSeverity = (best: MapDotStatus, next: MapDotStatus | null): MapDotStatus => {
	if (!next) return best
	return dotSeverity(next) > dotSeverity(best) ? next : best
}

const OVERVIEW_STAGGER_TICK_MS = 1800
const OVERVIEW_AGGREGATE_INTERVAL_MS = 15000

const buildUiStatusMap = (items: unknown[]): Map<string, string> => {
	const m = new Map<string, string>()
	for (const it of items) {
		const locationId = String((it as { locationId?: string | number }).locationId || "")
		if (!locationId) continue
		m.set(locationId, String((it as { uiStatus?: string }).uiStatus || "unknown"))
	}
	return m
}

type OverviewSystemPayload = { zones?: unknown[]; items?: unknown[] }

export const useAreaPointMap = (options: {
	selectedZone: Ref<string>
	selectedSystemType: Ref<SystemType | null>
	selectedZoneData: ComputedRef<UnifiedZone | undefined>
}) => {
	const { selectedZone, selectedSystemType, selectedZoneData } = options
	const { hasPermission } = useAuth()

	const canPollSystemStatusApi = (system: AreaPointModbusSystem) =>
		hasPermission(MODULE_BY_SYSTEM[system])

	const canPreferMonitoringOverview = () => hasPermission(PERM.areaPointMap.module)

	/** 點位圖篩選／異常色僅依子系統模組權限，不依聚合回傳擴權 */
	const canReadSystemStatus = (system: AreaPointModbusSystem) => canPollSystemStatusApi(system)

	const hasAnyStatusReadPath = () =>
		AREA_POINT_MODBUS_SYSTEMS.some((s) => canPollSystemStatusApi(s))

	const modbusIntegrationOptions = (system: AreaPointModbusSystem) => ({
		shouldFetchOnZonesChange: () => canPollSystemStatusApi(system),
	})

	const filterReadableSystemTypes = (types: SystemType[]): SystemType[] =>
		types.filter((t) => isAreaPointModbusSystem(t) && canReadSystemStatus(t))

	const lightingApi = useLightingApi()
	const drainageApi = useDrainageApi()
	const fireApi = useFireApi()
	const powerApi = usePowerApi()
	const hvacApi = useHvacApi()
	const airCirculationApi = useAirCirculationApi()
	const smokeAlarmApi = useSmokeAlarmApi()
	const emergencyRescueApi = useEmergencyRescueApi()
	const monitoringOverviewApi = useMonitoringOverviewApi()

	const lightingZones = ref<LightingZone[]>([])
	const drainageZones = ref<DrainageZone[]>([])
	const fireZones = ref<FireZone[]>([])
	const powerZones = ref<PowerZone[]>([])
	const hvacZones = ref<HvacZone[]>([])
	const airCirculationZones = ref<AirCirculationZone[]>([])
	const smokeAlarmZones = ref<SmokeAlarmZone[]>([])
	const emergencyRescueZones = ref<EmergencyRescueZone[]>([])

	const lightingSelectedZoneKey = computed(() => selectedZone.value)
	const {
		locationStatuses: lightingLocationStatuses,
		initializeLocationStatuses: initializeLightingStatuses,
		preloadDeviceInfos: preloadLightingDevices,
		loadAllLocationStatuses: loadAllLightingStatuses,
		applySnapshotItems: applyLightingSnapshotItems,
		startAutoRefresh: startLightingAutoRefresh,
		stopAutoRefresh: stopLightingAutoRefresh,
		handleVisibilityChange: handleLightingVisibilityChange,
	} = useLightingModbusIntegration(lightingZones, lightingSelectedZoneKey, modbusIntegrationOptions("lighting"))

	const {
		statusItems: drainageStatusItems,
		preloadDeviceInfos: preloadDrainageDevices,
		loadStatusSnapshot: loadDrainageSnapshot,
		setStatusItems: setDrainageStatusItems,
		startAutoRefresh: startDrainageAutoRefresh,
		stopAutoRefresh: stopDrainageAutoRefresh,
		handleVisibilityChange: handleDrainageVisibilityChange,
	} = useDrainageModbusIntegration(drainageZones, undefined, modbusIntegrationOptions("drainage"))

	const {
		statusItems: fireStatusItems,
		preloadDeviceInfos: preloadFireDevices,
		loadStatusSnapshot: loadFireSnapshot,
		setStatusItems: setFireStatusItems,
		startAutoRefresh: startFireAutoRefresh,
		stopAutoRefresh: stopFireAutoRefresh,
		handleVisibilityChange: handleFireVisibilityChange,
	} = useFireModbusIntegration(fireZones, undefined, modbusIntegrationOptions("fire"))

	const {
		statusItems: powerStatusItems,
		preloadDeviceInfos: preloadPowerDevices,
		loadStatusSnapshot: loadPowerSnapshot,
		setStatusItems: setPowerStatusItems,
		startAutoRefresh: startPowerAutoRefresh,
		stopAutoRefresh: stopPowerAutoRefresh,
		handleVisibilityChange: handlePowerVisibilityChange,
	} = usePowerModbusIntegration(powerZones, undefined, modbusIntegrationOptions("power"))

	const hvacSelectedZoneKey = computed(() => selectedZone.value)
	const {
		locationStatuses: hvacLocationStatuses,
		initializeLocationStatuses: initializeHvacStatuses,
		preloadDeviceInfos: preloadHvacDevices,
		loadAllLocationStatuses: loadAllHvacStatuses,
		applySnapshotItems: applyHvacSnapshotItems,
		startAutoRefresh: startHvacAutoRefresh,
		stopAutoRefresh: stopHvacAutoRefresh,
		handleVisibilityChange: handleHvacVisibilityChange,
	} = useHvacModbusIntegration(hvacZones, hvacSelectedZoneKey, modbusIntegrationOptions("hvac"))

	const {
		statusItems: airCirculationStatusItems,
		preloadDeviceInfos: preloadAirCirculationDevices,
		loadStatusSnapshot: loadAirCirculationSnapshot,
		setStatusItems: setAirCirculationStatusItems,
		startAutoRefresh: startAirCirculationAutoRefresh,
		stopAutoRefresh: stopAirCirculationAutoRefresh,
		handleVisibilityChange: handleAirCirculationVisibilityChange,
	} = useAirCirculationModbusIntegration(
		airCirculationZones,
		undefined,
		modbusIntegrationOptions("air_circulation")
	)

	const {
		statusItems: smokeAlarmStatusItems,
		preloadDeviceInfos: preloadSmokeAlarmDevices,
		loadStatusSnapshot: loadSmokeAlarmSnapshot,
		setStatusItems: setSmokeAlarmStatusItems,
		startAutoRefresh: startSmokeAlarmAutoRefresh,
		stopAutoRefresh: stopSmokeAlarmAutoRefresh,
		handleVisibilityChange: handleSmokeAlarmVisibilityChange,
	} = useSmokeAlarmModbusIntegration(smokeAlarmZones, undefined, modbusIntegrationOptions("smoke_alarm"))

	const {
		statusItems: emergencyRescueStatusItems,
		preloadDeviceInfos: preloadEmergencyRescueDevices,
		loadStatusSnapshot: loadEmergencyRescueSnapshot,
		setStatusItems: setEmergencyRescueStatusItems,
		startAutoRefresh: startEmergencyRescueAutoRefresh,
		stopAutoRefresh: stopEmergencyRescueAutoRefresh,
		handleVisibilityChange: handleEmergencyRescueVisibilityChange,
	} = useEmergencyRescueModbusIntegration(
		emergencyRescueZones,
		undefined,
		modbusIntegrationOptions("emergency_rescue")
	)

	const drainageUiStatusByLocationId = computed(() => buildUiStatusMap(drainageStatusItems.value || []))
	const fireUiStatusByLocationId = computed(() => buildUiStatusMap(fireStatusItems.value || []))
	const powerUiStatusByLocationId = computed(() => buildUiStatusMap(powerStatusItems.value || []))
	const airCirculationUiStatusByLocationId = computed(() =>
		buildUiStatusMap(airCirculationStatusItems.value || [])
	)
	const smokeAlarmUiStatusByLocationId = computed(() =>
		buildUiStatusMap(smokeAlarmStatusItems.value || [])
	)
	const emergencyRescueUiStatusByLocationId = computed(() =>
		buildUiStatusMap(emergencyRescueStatusItems.value || [])
	)

	const lightingHealthByLocationDbId = computed(() => {
		const m = new Map<string, { status?: SystemUiStatus }>()
		for (const zone of lightingZones.value || []) {
			for (let i = 0; i < (zone.locations || []).length; i += 1) {
				const loc = zone.locations[i] as { id?: string | number }
				const dbId = loc?.id ? String(loc.id) : ""
				if (!dbId) continue
				const uiKey = getLocationUiKey({ zone, location: loc, locationIndex: i })
				const s = lightingLocationStatuses.value[uiKey]?.status
				m.set(dbId, { status: s })
			}
		}
		return m
	})

	const hvacUiStatusByLocationDbId = computed(() => {
		const m = new Map<string, { uiStatus?: SystemUiStatus; temperatureC?: number | null }>()
		for (const zone of hvacZones.value || []) {
			for (let i = 0; i < (zone.locations || []).length; i += 1) {
				const loc = (zone.locations || [])[i] as { id?: string | number }
				const dbId = loc?.id ? String(loc.id) : ""
				if (!dbId) continue
				const uiKey = getLocationUiKey({ zone: zone as never, location: loc as never, locationIndex: i })
				const s = hvacLocationStatuses.value[uiKey]
				if (!s) continue
				m.set(dbId, {
					uiStatus: s.uiStatus,
					temperatureC: (s as { temperatureC?: number | null }).temperatureC ?? null,
				})
			}
		}
		return m
	})

	const snapshotUiStatusBySystem: Record<
		Exclude<AreaPointModbusSystem, "lighting" | "hvac">,
		ComputedRef<Map<string, string>>
	> = {
		drainage: drainageUiStatusByLocationId,
		fire: fireUiStatusByLocationId,
		power: powerUiStatusByLocationId,
		air_circulation: airCirculationUiStatusByLocationId,
		smoke_alarm: smokeAlarmUiStatusByLocationId,
		emergency_rescue: emergencyRescueUiStatusByLocationId,
	}

	const hasLoadedBySystem = Object.fromEntries(
		AREA_POINT_MODBUS_SYSTEMS.map((s) => [s, ref(false)])
	) as Record<AreaPointModbusSystem, Ref<boolean>>

	const pollableSystemZones = {
		lighting: lightingZones,
		drainage: drainageZones,
		fire: fireZones,
		power: powerZones,
		hvac: hvacZones,
		air_circulation: airCirculationZones,
		smoke_alarm: smokeAlarmZones,
		emergency_rescue: emergencyRescueZones,
	} as const

	const loadLightingStatusSnapshot = async (opts: { autoRefresh: boolean }) => {
		const result = await lightingApi.getZones()
		lightingZones.value = result.zones || []
		initializeLightingStatuses()
		await preloadLightingDevices()
		await loadAllLightingStatuses({ loadAllZones: true })
		hasLoadedBySystem.lighting.value = true
		if (opts.autoRefresh) startLightingAutoRefresh()
	}

	const loadDrainageStatusSnapshot = async (opts: { autoRefresh: boolean }) => {
		const result = await drainageApi.getZones()
		drainageZones.value = result.zones || []
		await preloadDrainageDevices()
		await loadDrainageSnapshot()
		hasLoadedBySystem.drainage.value = true
		if (opts.autoRefresh) startDrainageAutoRefresh()
	}

	const loadFireStatusSnapshot = async (opts: { autoRefresh: boolean }) => {
		const result = await fireApi.getZones()
		fireZones.value = result.zones || []
		await preloadFireDevices()
		await loadFireSnapshot()
		hasLoadedBySystem.fire.value = true
		if (opts.autoRefresh) startFireAutoRefresh()
	}

	const loadPowerStatusSnapshot = async (opts: { autoRefresh: boolean }) => {
		const result = await powerApi.getZones()
		powerZones.value = result.zones || []
		await preloadPowerDevices()
		await loadPowerSnapshot()
		hasLoadedBySystem.power.value = true
		if (opts.autoRefresh) startPowerAutoRefresh()
	}

	const loadHvacStatusSnapshot = async (opts: { autoRefresh: boolean }) => {
		const result = await hvacApi.getZones()
		hvacZones.value = result.zones || []
		initializeHvacStatuses()
		await preloadHvacDevices()
		await loadAllHvacStatuses({ loadAllZones: true })
		hasLoadedBySystem.hvac.value = true
		if (opts.autoRefresh) startHvacAutoRefresh()
	}

	const loadAirCirculationStatusSnapshot = async (opts: { autoRefresh: boolean }) => {
		const result = await airCirculationApi.getZones()
		airCirculationZones.value = result.zones || []
		await preloadAirCirculationDevices()
		await loadAirCirculationSnapshot()
		hasLoadedBySystem.air_circulation.value = true
		if (opts.autoRefresh) startAirCirculationAutoRefresh()
	}

	const loadSmokeAlarmStatusSnapshot = async (opts: { autoRefresh: boolean }) => {
		const result = await smokeAlarmApi.getZones()
		smokeAlarmZones.value = result.zones || []
		await preloadSmokeAlarmDevices()
		await loadSmokeAlarmSnapshot()
		hasLoadedBySystem.smoke_alarm.value = true
		if (opts.autoRefresh) startSmokeAlarmAutoRefresh()
	}

	const loadEmergencyRescueStatusSnapshot = async (opts: { autoRefresh: boolean }) => {
		const result = await emergencyRescueApi.getZones()
		emergencyRescueZones.value = result.zones || []
		await preloadEmergencyRescueDevices()
		await loadEmergencyRescueSnapshot()
		hasLoadedBySystem.emergency_rescue.value = true
		if (opts.autoRefresh) startEmergencyRescueAutoRefresh()
	}

	const pollableSystemLoaders: Record<
		AreaPointModbusSystem,
		(options: { autoRefresh: boolean }) => Promise<void>
	> = {
		lighting: loadLightingStatusSnapshot,
		drainage: loadDrainageStatusSnapshot,
		fire: loadFireStatusSnapshot,
		power: loadPowerStatusSnapshot,
		hvac: loadHvacStatusSnapshot,
		air_circulation: loadAirCirculationStatusSnapshot,
		smoke_alarm: loadSmokeAlarmStatusSnapshot,
		emergency_rescue: loadEmergencyRescueStatusSnapshot,
	}

	const pollableSystemStops: Record<AreaPointModbusSystem, () => void> = {
		lighting: stopLightingAutoRefresh,
		drainage: stopDrainageAutoRefresh,
		fire: stopFireAutoRefresh,
		power: stopPowerAutoRefresh,
		hvac: stopHvacAutoRefresh,
		air_circulation: stopAirCirculationAutoRefresh,
		smoke_alarm: stopSmokeAlarmAutoRefresh,
		emergency_rescue: stopEmergencyRescueAutoRefresh,
	}

	const pollableSystemVisibility: Partial<Record<AreaPointModbusSystem, () => void>> = {
		lighting: handleLightingVisibilityChange,
		drainage: handleDrainageVisibilityChange,
		fire: handleFireVisibilityChange,
		power: handlePowerVisibilityChange,
		hvac: handleHvacVisibilityChange,
		air_circulation: handleAirCirculationVisibilityChange,
		smoke_alarm: handleSmokeAlarmVisibilityChange,
		emergency_rescue: handleEmergencyRescueVisibilityChange,
	}

	const overviewAggregateEnabled = ref(true)
	const overviewAggregateTimerId = ref<ReturnType<typeof setInterval> | null>(null)
	const overviewRefreshTimerId = ref<ReturnType<typeof setInterval> | null>(null)
	const overviewRefreshCursor = ref(0)
	const isOverviewTickRunning = ref(false)

	const stopOverviewAutoRefresh = () => {
		if (overviewAggregateTimerId.value) {
			clearInterval(overviewAggregateTimerId.value)
			overviewAggregateTimerId.value = null
		}
		if (!overviewRefreshTimerId.value) return
		clearInterval(overviewRefreshTimerId.value)
		overviewRefreshTimerId.value = null
	}

	const applyOverviewSystem = async (system: AreaPointModbusSystem, payload: OverviewSystemPayload) => {
		if (!canPollSystemStatusApi(system)) return
		const zones = (payload.zones || []) as never[]
		const items = (payload.items || []) as never[]
		pollableSystemZones[system].value = zones as never

		if (system === "lighting") {
			if (!hasLoadedBySystem.lighting.value) {
				initializeLightingStatuses()
				if (canPollSystemStatusApi("lighting")) await preloadLightingDevices()
			}
			hasLoadedBySystem.lighting.value = true
			applyLightingSnapshotItems(items)
			return
		}
		if (system === "hvac") {
			if (!hasLoadedBySystem.hvac.value) {
				initializeHvacStatuses()
				if (canPollSystemStatusApi("hvac")) await preloadHvacDevices()
			}
			hasLoadedBySystem.hvac.value = true
			applyHvacSnapshotItems(items)
			return
		}

		if (canPollSystemStatusApi(system) && !hasLoadedBySystem[system].value) {
			if (system === "drainage") await preloadDrainageDevices()
			if (system === "fire") await preloadFireDevices()
			if (system === "power") await preloadPowerDevices()
			if (system === "air_circulation") await preloadAirCirculationDevices()
			if (system === "smoke_alarm") await preloadSmokeAlarmDevices()
			if (system === "emergency_rescue") await preloadEmergencyRescueDevices()
		}
		hasLoadedBySystem[system].value = true
		if (system === "drainage") setDrainageStatusItems(items)
		if (system === "fire") setFireStatusItems(items)
		if (system === "power") setPowerStatusItems(items)
		if (system === "air_circulation") setAirCirculationStatusItems(items)
		if (system === "smoke_alarm") setSmokeAlarmStatusItems(items)
		if (system === "emergency_rescue") setEmergencyRescueStatusItems(items)
	}

	const refreshOverviewFromAggregateApi = async () => {
		if (selectedSystemType.value) return
		if (typeof document !== "undefined" && document.visibilityState !== "visible") return

		const result = await monitoringOverviewApi.getOverviewStatus()
		const systems = result.systems || {}

		for (const system of AREA_POINT_MODBUS_SYSTEMS) {
			if (!canPollSystemStatusApi(system)) continue
			const payload = systems[system as keyof typeof systems]
			if (!payload) continue
			await applyOverviewSystem(system, payload as OverviewSystemPayload)
		}
	}

	const refreshPollableSystemTick = async (system: AreaPointModbusSystem) => {
		if (!canPollSystemStatusApi(system)) return
		if (!hasLoadedBySystem[system].value) {
			return pollableSystemLoaders[system]({ autoRefresh: false })
		}
		if (pollableSystemZones[system].value.length === 0) return
		if (system === "lighting") return loadAllLightingStatuses({ loadAllZones: true })
		if (system === "hvac") return loadAllHvacStatuses({ loadAllZones: true })
		if (system === "drainage") return loadDrainageSnapshot()
		if (system === "fire") return loadFireSnapshot()
		if (system === "power") return loadPowerSnapshot()
		if (system === "air_circulation") return loadAirCirculationSnapshot()
		if (system === "smoke_alarm") return loadSmokeAlarmSnapshot()
		return loadEmergencyRescueSnapshot()
	}

	const refreshOverviewOneSystem = async () => {
		if (selectedSystemType.value) return
		if (typeof document !== "undefined" && document.visibilityState !== "visible") return
		if (canPreferMonitoringOverview()) return

		const system =
			AREA_POINT_MODBUS_SYSTEMS[overviewRefreshCursor.value % AREA_POINT_MODBUS_SYSTEMS.length]
		overviewRefreshCursor.value += 1
		await refreshPollableSystemTick(system)
	}

	const loadPollableSystemSnapshot = async (
		system: AreaPointModbusSystem,
		opts: { autoRefresh: boolean }
	) => {
		if (!canPollSystemStatusApi(system) || hasLoadedBySystem[system].value) return
		await pollableSystemLoaders[system](opts)
	}

	const ensureAllStatusSnapshotsLoaded = async () => {
		if (!hasAnyStatusReadPath()) return
		if (canPreferMonitoringOverview() && hasAnyStatusReadPath()) {
			try {
				await refreshOverviewFromAggregateApi()
				return
			} catch {
				// 聚合失敗時改走具權限的單系統 API
			}
		}
		for (const system of AREA_POINT_MODBUS_SYSTEMS) {
			await loadPollableSystemSnapshot(system, { autoRefresh: false })
		}
	}

	const stopAllSystemAutoRefresh = () => {
		for (const system of AREA_POINT_MODBUS_SYSTEMS) pollableSystemStops[system]()
	}

	const startOverviewAutoRefresh = () => {
		stopOverviewAutoRefresh()
		if (!hasAnyStatusReadPath()) return
		if (selectedSystemType.value) return
		if (overviewAggregateEnabled.value) {
			overviewAggregateTimerId.value = setInterval(() => {
				if (typeof document !== "undefined" && document.visibilityState !== "visible") return
				refreshOverviewFromAggregateApi().catch(() => {
					overviewAggregateEnabled.value = false
					stopOverviewAutoRefresh()
					startOverviewAutoRefresh()
				})
			}, OVERVIEW_AGGREGATE_INTERVAL_MS)
			void refreshOverviewFromAggregateApi().catch(() => {
				overviewAggregateEnabled.value = false
				stopOverviewAutoRefresh()
				startOverviewAutoRefresh()
			})
			return
		}
		overviewRefreshTimerId.value = setInterval(async () => {
			if (isOverviewTickRunning.value) return
			isOverviewTickRunning.value = true
			try {
				await refreshOverviewOneSystem()
			} finally {
				isOverviewTickRunning.value = false
			}
		}, OVERVIEW_STAGGER_TICK_MS)
	}

	const handleRuntimeVisibility = () => {
		if (!selectedSystemType.value && hasAnyStatusReadPath()) {
			void ensureAllStatusSnapshotsLoaded()
			startOverviewAutoRefresh()
		}
		const selected = selectedSystemType.value
		if (selected && isAreaPointModbusSystem(selected) && canPollSystemStatusApi(selected)) {
			pollableSystemVisibility[selected]?.()
		}
	}

	watch(
		() => selectedSystemType.value,
		async (next) => {
			stopOverviewAutoRefresh()
			stopAllSystemAutoRefresh()

			if (!next) {
				await ensureAllStatusSnapshotsLoaded()
				startOverviewAutoRefresh()
				return
			}
			if (!isAreaPointModbusSystem(next) || !canReadSystemStatus(next)) return
			if (!canPollSystemStatusApi(next)) return
			await pollableSystemLoaders[next]({ autoRefresh: true })
		},
		{ immediate: true }
	)

	const zoneSystemTypes = computed(() => {
		if (!selectedZoneData.value?.locations) return []
		return filterReadableSystemTypes(extractSystemTypes(selectedZoneData.value.locations))
	})

	const getZoneSystemTypes = (zone: UnifiedZone): SystemType[] => {
		if (!zone?.locations) return []
		return filterReadableSystemTypes(extractSystemTypes(zone.locations))
	}

	const readableSystemsOnZone = computed(() =>
		zoneSystemTypes.value.filter((t): t is AreaPointModbusSystem => isAreaPointModbusSystem(t))
	)

	const locationHasSystemType = (location: UnifiedLocation, systemType: SystemType): boolean =>
		(location.systems || []).some((s) => s?.systemType === systemType)

	const getLocationUiStatus = (
		system: AreaPointModbusSystem,
		locationId: string
	): string | null | undefined => {
		if (!canReadSystemStatus(system)) return null
		if (system === "lighting") return lightingHealthByLocationDbId.value.get(locationId)?.status
		if (system === "hvac") return hvacUiStatusByLocationDbId.value.get(locationId)?.uiStatus
		return snapshotUiStatusBySystem[system].value.get(locationId) ?? null
	}

	const dotStatusForSystem = (
		location: UnifiedLocation,
		system: AreaPointModbusSystem
	): MapDotStatus | null => {
		if (!locationHasSystemType(location, system)) return null
		return uiStatusToDotIfPresent(getLocationUiStatus(system, String(location.id || "")))
	}

	const dotStatusForLocation = (location: UnifiedLocation): MapDotStatus => {
		const selected = selectedSystemType.value
		if (selected && isAreaPointModbusSystem(selected)) {
			return dotStatusForSystem(location, selected) ?? "normal"
		}
		let best: MapDotStatus = "normal"
		for (const system of readableSystemsOnZone.value) {
			best = mergeDotSeverity(best, dotStatusForSystem(location, system))
		}
		return best
	}

	const flashModeForLocation = (location: UnifiedLocation): FlashMode => {
		const s = dotStatusForLocation(location)
		if (s === "alarm") return "fast"
		if (s === "warning") return "slow"
		return "none"
	}

	const tooltipLabelForLocation = (location: UnifiedLocation): string => {
		const status = dotStatusForLocation(location)
		const label = status === "normal" ? "正常" : status === "alarm" ? "警報" : "異常"
		if (selectedSystemType.value) return `${location.name}：${label}`

		const id = String(location.id || "")
		const parts: string[] = []
		for (const system of readableSystemsOnZone.value) {
			if (!locationHasSystemType(location, system)) continue
			const dot = dotStatusForSystem(location, system)
			if (!dot || dot === "normal") continue
			const systemLabel = getSystemTypeLabel(system)
			let suffix = ""
			if (system === "hvac") {
				const temp = hvacUiStatusByLocationDbId.value.get(id)?.temperatureC
				if (temp != null && Number.isFinite(temp)) suffix = `（${Math.round(temp)}°C）`
			}
			parts.push(`${systemLabel}：${dot === "alarm" ? "警報" : "異常"}${suffix}`)
		}

		return parts.length
			? `${location.name}：${label}\n${parts.join("、")}`
			: `${location.name}：${label}`
	}

	const locationHasReadableCoordinates = (location: UnifiedLocation): boolean =>
		readableSystemsOnZone.value.some((t) => hasCoordinatesForSystem(location, t))

	const currentZoneLocations = computed(() => {
		if (!selectedZone.value) return []
		const zone = selectedZoneData.value
		if (!zone) return []

		return (zone.locations || []).filter((loc) => {
			if (selectedSystemType.value) return hasCoordinatesForSystem(loc, selectedSystemType.value)
			return locationHasReadableCoordinates(loc)
		})
	})

	const getLocationDotStyle = (location: UnifiedLocation): Record<string, string> => {
		const activeType = selectedSystemType.value
		if (activeType) {
			return getLocationStyleBySystem(location, activeType) as Record<string, string>
		}
		for (const systemType of readableSystemsOnZone.value) {
			const style = getLocationStyleBySystem(location, systemType)
			if ("left" in style && "top" in style) return style as Record<string, string>
		}
		return {}
	}

	const handleSystemTypeToggle = (systemType: SystemType) => {
		if (!isAreaPointModbusSystem(systemType) || !canReadSystemStatus(systemType)) return
		selectedSystemType.value = selectedSystemType.value === systemType ? null : systemType
	}

	watch(zoneSystemTypes, (readable) => {
		if (!selectedSystemType.value) return
		if (!readable.includes(selectedSystemType.value)) selectedSystemType.value = null
	})

	return {
		zoneSystemTypes,
		getZoneSystemTypes,
		canReadSystemStatus,
		currentZoneLocations,
		getLocationDotStyle,
		dotStatusForLocation,
		flashModeForLocation,
		tooltipLabelForLocation,
		handleSystemTypeToggle,
		stopOverviewAutoRefresh,
		stopAllSystemAutoRefresh,
		handleRuntimeVisibility,
	}
}
