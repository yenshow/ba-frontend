import type { Ref } from "vue"
import type { HvacLocation, HvacUiStatus, HvacZone } from "~/types/hvac"
import type { LightingLocation, LightingStatusSnapshotItem, LightingZone } from "~/types/lighting"
import {
	filterDoPoints,
	hasControllerConfig,
	needsModbusConnection,
	extractWritePoints,
} from "~/utils/modbusPoints"
import { findLocationInZonesByUiKey, getLocationUiKey } from "~/utils/locationUiId"
import type { MapDotStatus, SystemUiStatus } from "~/utils/monitoringStatus"
import { createToggleModbusIntegration } from "~/composables/monitoring/modbus/createToggleModbusIntegration"
import {
	applyToggleSnapshotWithBooleanHold,
	coerceToggleSnapshotNumber,
	mapToggleBackendUiStatus,
} from "~/composables/monitoring/modbus/modbusIntegrationShared"
import { normalizeOptionalDeviceId } from "~/utils/deviceIdUtils"
import { useLightingApi } from "~/composables/systems/lighting/useLightingApi"
import { useHvacApi } from "~/composables/systems/hvac/useHvacApi"

type LightingLocationStatus = {
	isRunning: boolean
	status: SystemUiStatus
}

export const useLightingModbusIntegration = (
	lightingZones: Ref<LightingZone[]>,
	selectedZone: Ref<string>,
	options?: { shouldFetchOnZonesChange?: () => boolean }
) => {
	const lightingApi = useLightingApi()

	return createToggleModbusIntegration<
		LightingLocation,
		LightingZone,
		LightingStatusSnapshotItem,
		LightingLocationStatus
	>({
		loadErrorLabel: "載入照明狀態失敗",
		systemKey: "lighting",
		controlScope: "lighting",
		zones: lightingZones,
		selectedZone,
		fetchSnapshot: (zoneIds, options) =>
			lightingApi.getStatus(
				zoneIds ? { zoneIds, force: options?.force } : { force: options?.force }
			),
		buildLocationUiKey: (zone, location, locationIndex) =>
			getLocationUiKey({ zone, location, locationIndex }),
		findLocationByUiKey: (uiKey, requireDbId) =>
			findLocationInZonesByUiKey<LightingLocation, LightingZone>(lightingZones.value, uiKey, {
				requireDbId,
			}),
		ensureLocationStatus: (uiKey, store) => {
			if (!store.value[uiKey]) {
				store.value[uiKey] = { isRunning: false, status: "warning" }
			}
			return store.value[uiKey]!
		},
		applySnapshotItem: ({ status, item, uiKey, now, holdUntil, clearHold }) => {
			status.status = mapToggleBackendUiStatus(item.uiStatus)
			return applyToggleSnapshotWithBooleanHold({
				status,
				uiKey,
				now,
				holdUntil,
				clearHold,
				getBoolean: (s) => s.isRunning,
				setBoolean: (s, v) => {
					s.isRunning = v
				},
				nextBoolean: item.raw?.isOn === true,
			})
		},
		buildDisabledMap: (toggling) => {
			const map: Record<string, boolean> = {}
			lightingZones.value.forEach((zone) => {
				zone.locations.forEach((location, locationIndex) => {
					const locationId = getLocationUiKey({ zone, location, locationIndex })
					const isToggling = toggling.value.has(locationId)
					const hasDeviceReference = hasControllerConfig(location)
					if (!hasDeviceReference) {
						map[locationId] = true
						return
					}
					if (location.modbus?.points && location.modbus.points.length > 0) {
						map[locationId] = filterDoPoints(location.modbus.points).length === 0 || isToggling
						return
					}
					if (normalizeOptionalDeviceId(location.deviceId)) {
						const hasDoAddresses = !(
							!location.modbus.doAddresses &&
							!location.modbus.doAddress &&
							!location.modbus.address
						)
						map[locationId] = !hasDoAddresses || isToggling
						return
					}
					map[locationId] = isToggling
				})
			})
			return map
		},
		canToggleLocation: (location) => needsModbusConnection(location) && !!location.modbus,
		getToggleValue: (status) => status?.isRunning ?? false,
		setToggleValue: (status, value) => {
			status.isRunning = value
		},
		onToggleFailed: (status) => {
			status.status = "warning"
		},
		initializeLocationStatuses: (store) => {
			lightingZones.value.forEach((zone) => {
				zone.locations.forEach((location, locationIndex) => {
					const locationId = getLocationUiKey({ zone, location, locationIndex })
					const hasController = hasControllerConfig(location)
					const existing = store.value[locationId]
					store.value[locationId] = {
						isRunning: hasController ? (existing?.isRunning ?? false) : false,
						status: hasController ? (existing?.status ?? "warning") : "warning",
					}
				})
			})
		},
		buildExtraReturns: ({ locationStatuses }) => ({
			isLocationNormal: (locationId: string) => {
				const status = locationStatuses.value[locationId]
				return !!status && status.status === "normal"
			},
		}),
		shouldFetchOnZonesChange: options?.shouldFetchOnZonesChange,
	})
}

type HvacSnapshotItem = {
	locationId: string | number
	uiStatus?: unknown
	raw?: { isOn?: boolean; temperatureC?: unknown }
}

type HvacLocationStatus = {
	isOn: boolean
	uiStatus: HvacUiStatus
	temperatureC: number | null
}

export const useHvacModbusIntegration = (
	hvacZones: Ref<HvacZone[]>,
	selectedZone: Ref<string>,
	options?: { shouldFetchOnZonesChange?: () => boolean }
) => {
	const hvacApi = useHvacApi()

	return createToggleModbusIntegration<HvacLocation, HvacZone, HvacSnapshotItem, HvacLocationStatus>({
		loadErrorLabel: "載入空調狀態失敗",
		systemKey: "hvac",
		controlScope: "hvac",
		zones: hvacZones,
		selectedZone,
		fetchSnapshot: (zoneIds, fetchOptions) =>
			hvacApi.getStatus(
				zoneIds ? { zoneIds, force: fetchOptions?.force } : { force: fetchOptions?.force }
			),
		buildLocationUiKey: (zone, location, locationIndex) =>
			getLocationUiKey({ zone, location, locationIndex }),
		findLocationByUiKey: (uiKey, requireDbId) =>
			findLocationInZonesByUiKey<HvacLocation, HvacZone>(hvacZones.value, uiKey, { requireDbId }),
		ensureLocationStatus: (uiKey, store) => {
			if (!store.value[uiKey]) {
				store.value[uiKey] = { isOn: false, uiStatus: "warning", temperatureC: null }
			}
			return store.value[uiKey]!
		},
		applySnapshotItem: ({ status, item, uiKey, now, holdUntil, clearHold }) => {
			status.uiStatus = mapToggleBackendUiStatus(item.uiStatus) as HvacUiStatus
			const holdResult = applyToggleSnapshotWithBooleanHold({
				status,
				uiKey,
				now,
				holdUntil,
				clearHold,
				getBoolean: (s) => s.isOn,
				setBoolean: (s, v) => {
					s.isOn = v
				},
				nextBoolean: Boolean(item.raw?.isOn),
			})
			status.temperatureC = coerceToggleSnapshotNumber(item.raw?.temperatureC)
			return holdResult
		},
		buildDisabledMap: (toggling) => {
			const disabled: Record<string, boolean> = {}
			for (const zone of hvacZones.value) {
				zone.locations.forEach((loc, idx) => {
					const id = getLocationUiKey({ zone, location: loc, locationIndex: idx })
					const hasController = hasControllerConfig({
						deviceId: loc.deviceId,
						modbus: loc.modbus,
					})
					const hasWritableDo = !!loc.modbus && extractWritePoints(loc.modbus).length > 0
					disabled[id] = !hasController || !hasWritableDo || toggling.value.has(id)
				})
			}
			return disabled
		},
		canToggleLocation: (location) => !!location.modbus,
		getToggleValue: (status) => status?.isOn ?? false,
		setToggleValue: (status, value) => {
			status.isOn = value
		},
		initializeLocationStatuses: (store) => {
			for (const zone of hvacZones.value) {
				zone.locations.forEach((loc, idx) => {
					const id = getLocationUiKey({ zone, location: loc, locationIndex: idx })
					if (!store.value[id]) {
						store.value[id] = { isOn: false, uiStatus: "warning", temperatureC: null }
					}
				})
			}
		},
		buildExtraReturns: ({ locationStatuses }) => ({
			dotStatusForLocation: (locationUiKey: string): MapDotStatus => {
				const s = locationStatuses.value[locationUiKey]
				if (!s) return "warning"
				return s.uiStatus
			},
		}),
		shouldFetchOnZonesChange: options?.shouldFetchOnZonesChange,
	})
}
