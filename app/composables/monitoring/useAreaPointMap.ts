import { computed, ref, watch, type ComputedRef, type Ref } from "vue"
import { useAuth } from "~/composables/core/useAuth"
import { useAccessGate, useAreaPointMapRbac } from "~/composables/core/useAccessGate"
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
import { useMonitoringSnapshotWebSocket } from "~/composables/monitoring/useMonitoringSnapshotWebSocket"
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

type OverviewSystemPayload = { zones?: unknown[]; items?: unknown[] }

const buildUiStatusMap = (items: unknown[]): Map<string, string> => {
	const m = new Map<string, string>()
	for (const it of items) {
		const locationId = String((it as { locationId?: string | number }).locationId || "")
		if (!locationId) continue
		m.set(locationId, String((it as { uiStatus?: string }).uiStatus || "unknown"))
	}
	return m
}

export const useAreaPointMap = (options: {
	selectedZone: Ref<string>
	selectedSystemType: Ref<SystemType | null>
	selectedZoneData: ComputedRef<UnifiedZone | undefined>
}) => {
	const { selectedZone, selectedSystemType, selectedZoneData } = options
	const { hasPermission } = useAuth()
	const { isModuleAccessReady } = useAccessGate()
	const { getDeletableSystemTypes } = useAreaPointMapRbac()

	const canFetchSystemStatusApi = (system: AreaPointModbusSystem) =>
		hasPermission(MODULE_BY_SYSTEM[system])

	const canPreferMonitoringOverview = () => hasPermission(PERM.areaPointMap.module)

	/** 點位圖篩選／異常色僅依子系統模組權限，不依聚合回傳擴權 */
	const canReadSystemStatus = (system: AreaPointModbusSystem) => canFetchSystemStatusApi(system)

	const hasAnyStatusReadPath = () =>
		AREA_POINT_MODBUS_SYSTEMS.some((s) => canFetchSystemStatusApi(s))

	const modbusIntegrationOptions = (system: AreaPointModbusSystem) => ({
		shouldFetchOnZonesChange: () => canFetchSystemStatusApi(system),
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
		startSnapshotSync: startLightingSnapshotSync,
		stopSnapshotSync: stopLightingSnapshotSync,
		handleVisibilityChange: handleLightingVisibilityChange,
	} = useLightingModbusIntegration(lightingZones, lightingSelectedZoneKey, modbusIntegrationOptions("lighting"))

	const {
		statusItems: drainageStatusItems,
		preloadDeviceInfos: preloadDrainageDevices,
		loadStatusSnapshot: loadDrainageSnapshot,
		setStatusItems: setDrainageStatusItems,
		patchStatusItems: patchDrainageStatusItems,
		startSnapshotSync: startDrainageSnapshotSync,
		stopSnapshotSync: stopDrainageSnapshotSync,
		handleVisibilityChange: handleDrainageVisibilityChange,
	} = useDrainageModbusIntegration(drainageZones, undefined, modbusIntegrationOptions("drainage"))

	const {
		statusItems: fireStatusItems,
		preloadDeviceInfos: preloadFireDevices,
		loadStatusSnapshot: loadFireSnapshot,
		setStatusItems: setFireStatusItems,
		patchStatusItems: patchFireStatusItems,
		startSnapshotSync: startFireSnapshotSync,
		stopSnapshotSync: stopFireSnapshotSync,
		handleVisibilityChange: handleFireVisibilityChange,
	} = useFireModbusIntegration(fireZones, undefined, modbusIntegrationOptions("fire"))

	const {
		statusItems: powerStatusItems,
		preloadDeviceInfos: preloadPowerDevices,
		loadStatusSnapshot: loadPowerSnapshot,
		setStatusItems: setPowerStatusItems,
		patchStatusItems: patchPowerStatusItems,
		startSnapshotSync: startPowerSnapshotSync,
		stopSnapshotSync: stopPowerSnapshotSync,
		handleVisibilityChange: handlePowerVisibilityChange,
	} = usePowerModbusIntegration(powerZones, undefined, modbusIntegrationOptions("power"))

	const hvacSelectedZoneKey = computed(() => selectedZone.value)
	const {
		locationStatuses: hvacLocationStatuses,
		initializeLocationStatuses: initializeHvacStatuses,
		preloadDeviceInfos: preloadHvacDevices,
		loadAllLocationStatuses: loadAllHvacStatuses,
		applySnapshotItems: applyHvacSnapshotItems,
		startSnapshotSync: startHvacSnapshotSync,
		stopSnapshotSync: stopHvacSnapshotSync,
		handleVisibilityChange: handleHvacVisibilityChange,
	} = useHvacModbusIntegration(hvacZones, hvacSelectedZoneKey, modbusIntegrationOptions("hvac"))

	const {
		statusItems: airCirculationStatusItems,
		preloadDeviceInfos: preloadAirCirculationDevices,
		loadStatusSnapshot: loadAirCirculationSnapshot,
		setStatusItems: setAirCirculationStatusItems,
		patchStatusItems: patchAirCirculationStatusItems,
		startSnapshotSync: startAirCirculationSnapshotSync,
		stopSnapshotSync: stopAirCirculationSnapshotSync,
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
		patchStatusItems: patchSmokeAlarmStatusItems,
		startSnapshotSync: startSmokeAlarmSnapshotSync,
		stopSnapshotSync: stopSmokeAlarmSnapshotSync,
		handleVisibilityChange: handleSmokeAlarmVisibilityChange,
	} = useSmokeAlarmModbusIntegration(smokeAlarmZones, undefined, modbusIntegrationOptions("smoke_alarm"))

	const {
		statusItems: emergencyRescueStatusItems,
		preloadDeviceInfos: preloadEmergencyRescueDevices,
		loadStatusSnapshot: loadEmergencyRescueSnapshot,
		setStatusItems: setEmergencyRescueStatusItems,
		patchStatusItems: patchEmergencyRescueStatusItems,
		startSnapshotSync: startEmergencyRescueSnapshotSync,
		stopSnapshotSync: stopEmergencyRescueSnapshotSync,
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

	const snapshotSystemZones = {
		lighting: lightingZones,
		drainage: drainageZones,
		fire: fireZones,
		power: powerZones,
		hvac: hvacZones,
		air_circulation: airCirculationZones,
		smoke_alarm: smokeAlarmZones,
		emergency_rescue: emergencyRescueZones,
	} as const

	const loadLightingStatusSnapshot = async (opts: { startSync: boolean }) => {
		const result = await lightingApi.getZones()
		lightingZones.value = result.zones || []
		initializeLightingStatuses()
		await preloadLightingDevices()
		await loadAllLightingStatuses({ loadAllZones: true })
		hasLoadedBySystem.lighting.value = true
		if (opts.startSync) startLightingSnapshotSync()
	}

	const loadDrainageStatusSnapshot = async (opts: { startSync: boolean }) => {
		const result = await drainageApi.getZones()
		drainageZones.value = result.zones || []
		await preloadDrainageDevices()
		await loadDrainageSnapshot()
		hasLoadedBySystem.drainage.value = true
		if (opts.startSync) startDrainageSnapshotSync()
	}

	const loadFireStatusSnapshot = async (opts: { startSync: boolean }) => {
		const result = await fireApi.getZones()
		fireZones.value = result.zones || []
		await preloadFireDevices()
		await loadFireSnapshot()
		hasLoadedBySystem.fire.value = true
		if (opts.startSync) startFireSnapshotSync()
	}

	const loadPowerStatusSnapshot = async (opts: { startSync: boolean }) => {
		const result = await powerApi.getZones()
		powerZones.value = result.zones || []
		await preloadPowerDevices()
		await loadPowerSnapshot()
		hasLoadedBySystem.power.value = true
		if (opts.startSync) startPowerSnapshotSync()
	}

	const loadHvacStatusSnapshot = async (opts: { startSync: boolean }) => {
		const result = await hvacApi.getZones()
		hvacZones.value = result.zones || []
		initializeHvacStatuses()
		await preloadHvacDevices()
		await loadAllHvacStatuses({ loadAllZones: true })
		hasLoadedBySystem.hvac.value = true
		if (opts.startSync) startHvacSnapshotSync()
	}

	const loadAirCirculationStatusSnapshot = async (opts: { startSync: boolean }) => {
		const result = await airCirculationApi.getZones()
		airCirculationZones.value = result.zones || []
		await preloadAirCirculationDevices()
		await loadAirCirculationSnapshot()
		hasLoadedBySystem.air_circulation.value = true
		if (opts.startSync) startAirCirculationSnapshotSync()
	}

	const loadSmokeAlarmStatusSnapshot = async (opts: { startSync: boolean }) => {
		const result = await smokeAlarmApi.getZones()
		smokeAlarmZones.value = result.zones || []
		await preloadSmokeAlarmDevices()
		await loadSmokeAlarmSnapshot()
		hasLoadedBySystem.smoke_alarm.value = true
		if (opts.startSync) startSmokeAlarmSnapshotSync()
	}

	const loadEmergencyRescueStatusSnapshot = async (opts: { startSync: boolean }) => {
		const result = await emergencyRescueApi.getZones()
		emergencyRescueZones.value = result.zones || []
		await preloadEmergencyRescueDevices()
		await loadEmergencyRescueSnapshot()
		hasLoadedBySystem.emergency_rescue.value = true
		if (opts.startSync) startEmergencyRescueSnapshotSync()
	}

	const snapshotSystemLoaders: Record<
		AreaPointModbusSystem,
		(options: { startSync: boolean }) => Promise<void>
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

	const snapshotSystemStops: Record<AreaPointModbusSystem, () => void> = {
		lighting: stopLightingSnapshotSync,
		drainage: stopDrainageSnapshotSync,
		fire: stopFireSnapshotSync,
		power: stopPowerSnapshotSync,
		hvac: stopHvacSnapshotSync,
		air_circulation: stopAirCirculationSnapshotSync,
		smoke_alarm: stopSmokeAlarmSnapshotSync,
		emergency_rescue: stopEmergencyRescueSnapshotSync,
	}

	const snapshotSystemVisibility: Partial<Record<AreaPointModbusSystem, () => void>> = {
		lighting: handleLightingVisibilityChange,
		drainage: handleDrainageVisibilityChange,
		fire: handleFireVisibilityChange,
		power: handlePowerVisibilityChange,
		hvac: handleHvacVisibilityChange,
		air_circulation: handleAirCirculationVisibilityChange,
		smoke_alarm: handleSmokeAlarmVisibilityChange,
		emergency_rescue: handleEmergencyRescueVisibilityChange,
	}

	const overviewSnapshotWsStop = ref<(() => void) | null>(null)

	const stopOverviewSnapshotSync = () => {
		overviewSnapshotWsStop.value?.()
		overviewSnapshotWsStop.value = null
	}

	const applySnapshotWsPatch = (system: AreaPointModbusSystem, items: unknown[]) => {
		if (!canFetchSystemStatusApi(system) || !items.length) return

		if (system === "lighting") {
			hasLoadedBySystem.lighting.value = true
			applyLightingSnapshotItems(items as never[])
			return
		}
		if (system === "hvac") {
			hasLoadedBySystem.hvac.value = true
			applyHvacSnapshotItems(items as never[])
			return
		}

		hasLoadedBySystem[system].value = true
		if (system === "drainage") patchDrainageStatusItems(items as never[])
		if (system === "fire") patchFireStatusItems(items as never[])
		if (system === "power") patchPowerStatusItems(items as never[])
		if (system === "air_circulation") patchAirCirculationStatusItems(items as never[])
		if (system === "smoke_alarm") patchSmokeAlarmStatusItems(items as never[])
		if (system === "emergency_rescue") patchEmergencyRescueStatusItems(items as never[])
	}

	const applyOverviewSystem = async (system: AreaPointModbusSystem, payload: OverviewSystemPayload) => {
		if (!canFetchSystemStatusApi(system)) return
		const zones = (payload.zones || []) as never[]
		const items = (payload.items || []) as never[]
		snapshotSystemZones[system].value = zones as never

		if (system === "lighting") {
			if (!hasLoadedBySystem.lighting.value) {
				initializeLightingStatuses()
				if (canFetchSystemStatusApi("lighting")) await preloadLightingDevices()
			}
			hasLoadedBySystem.lighting.value = true
			applyLightingSnapshotItems(items)
			return
		}
		if (system === "hvac") {
			if (!hasLoadedBySystem.hvac.value) {
				initializeHvacStatuses()
				if (canFetchSystemStatusApi("hvac")) await preloadHvacDevices()
			}
			hasLoadedBySystem.hvac.value = true
			applyHvacSnapshotItems(items)
			return
		}

		if (canFetchSystemStatusApi(system) && !hasLoadedBySystem[system].value) {
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
			if (!canFetchSystemStatusApi(system)) continue
			const payload = systems[system as keyof typeof systems]
			if (!payload) continue
			await applyOverviewSystem(system, payload as OverviewSystemPayload)
		}
	}

	const startOverviewSnapshotSync = () => {
		stopOverviewSnapshotSync()
		if (!hasAnyStatusReadPath()) return
		if (selectedSystemType.value) return

		void refreshOverviewFromAggregateApi()

		const snapshotWs = useMonitoringSnapshotWebSocket({
			systems: [...AREA_POINT_MODBUS_SYSTEMS],
			enabled: computed(() => isModuleAccessReady.value && hasAnyStatusReadPath()),
			onSnapshotUpdated: (event) => {
				const system = event.system as AreaPointModbusSystem
				if (!isAreaPointModbusSystem(system)) return
				applySnapshotWsPatch(system, event.items || [])
			},
		})
		snapshotWs.start()
		overviewSnapshotWsStop.value = snapshotWs.stop
	}

	const loadSnapshotSystemStatus = async (
		system: AreaPointModbusSystem,
		opts: { startSync: boolean }
	) => {
		if (!canFetchSystemStatusApi(system) || hasLoadedBySystem[system].value) return
		await snapshotSystemLoaders[system](opts)
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
			await loadSnapshotSystemStatus(system, { startSync: false })
		}
	}

	const stopAllSystemSnapshotSync = () => {
		for (const system of AREA_POINT_MODBUS_SYSTEMS) snapshotSystemStops[system]()
	}

	const handleRuntimeVisibility = () => {
		if (!selectedSystemType.value && hasAnyStatusReadPath()) {
			void ensureAllStatusSnapshotsLoaded()
			startOverviewSnapshotSync()
		}
		const selected = selectedSystemType.value
		if (selected && isAreaPointModbusSystem(selected) && canFetchSystemStatusApi(selected)) {
			snapshotSystemVisibility[selected]?.()
		}
	}

	watch(
		() => selectedSystemType.value,
		async (next) => {
			stopOverviewSnapshotSync()
			stopAllSystemSnapshotSync()

			if (!next) {
				await ensureAllStatusSnapshotsLoaded()
				startOverviewSnapshotSync()
				return
			}
			if (!isAreaPointModbusSystem(next) || !canReadSystemStatus(next)) return
			if (!canFetchSystemStatusApi(next)) return
			await snapshotSystemLoaders[next]({ startSync: true })
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

	const zoneHasSystemType = (systemType: SystemType): boolean =>
		(selectedZoneData.value?.locations || []).some((loc) =>
			(loc.systems || []).some((s) => s.systemType === systemType),
		)

	const canSelectSystemTypeOnMap = (systemType: SystemType): boolean => {
		if (!zoneHasSystemType(systemType)) return false
		if (isAreaPointModbusSystem(systemType)) return canReadSystemStatus(systemType)
		return getDeletableSystemTypes().includes(systemType)
	}

	const mapFilterSystemTypes = computed(() =>
		extractSystemTypes(selectedZoneData.value?.locations || []).filter((systemType) =>
			canSelectSystemTypeOnMap(systemType),
		),
	)

	const inferDefaultManagementSystemType = (): SystemType | null => {
		const types = mapFilterSystemTypes.value.filter((t) =>
			getDeletableSystemTypes().includes(t),
		)
		return types.length === 1 ? types[0]! : null
	}

	const handleSystemTypeToggle = (systemType: SystemType) => {
		if (!canSelectSystemTypeOnMap(systemType)) return
		selectedSystemType.value = selectedSystemType.value === systemType ? null : systemType
	}

	watch(mapFilterSystemTypes, (readable) => {
		if (!selectedSystemType.value) return
		if (!readable.includes(selectedSystemType.value)) selectedSystemType.value = null
	})

	return {
		mapFilterSystemTypes,
		inferDefaultManagementSystemType,
		getZoneSystemTypes,
		canReadSystemStatus,
		currentZoneLocations,
		getLocationDotStyle,
		dotStatusForLocation,
		flashModeForLocation,
		tooltipLabelForLocation,
		handleSystemTypeToggle,
		stopOverviewSnapshotSync,
		stopAllSystemSnapshotSync,
		handleRuntimeVisibility,
	}
}
