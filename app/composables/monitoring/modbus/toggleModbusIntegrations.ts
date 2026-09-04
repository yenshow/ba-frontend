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
import type { SystemUiStatus } from "~/utils/monitoringStatus"
import { createToggleModbusIntegration } from "~/composables/monitoring/modbus/createToggleModbusIntegration"
import {
	applyToggleSnapshotWithBooleanHold,
	coerceToggleSnapshotNumber,
	mapToggleBackendUiStatus,
} from "~/composables/monitoring/modbus/modbusIntegrationShared"
import { normalizeOptionalDeviceId } from "~/utils/deviceIdUtils"
import { invertDefToRaw } from "~/utils/modbusTransform"
import { useLightingApi } from "~/composables/systems/lighting/useLightingApi"
import { useHvacApi } from "~/composables/systems/hvac/useHvacApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { TOGGLE_ROUNDTRIP_DELAY_MS } from "~/utils/realtimeTiming"

type LightingLocationStatus = {
	isRunning: boolean
	status: SystemUiStatus
}

/** status 一律全區（監控中心列全部區域；平面圖 selectedZone 不影響快照範圍） */
export const useLightingModbusIntegration = (
	lightingZones: Ref<LightingZone[]>,
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
		fetchSnapshot: (fetchOptions) => lightingApi.getStatus({ force: fetchOptions?.force }),
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
				nextBoolean: Boolean(item.raw?.isOn),
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
	// setpointC / fanSpeed 為約定語意鍵：statusPoints 配置後由後端 raw 原樣帶回
	raw?: { isOn?: boolean; temperatureC?: unknown; setpointC?: unknown; fanSpeed?: unknown }
}

type HvacLocationStatus = {
	isOn: boolean
	uiStatus: HvacUiStatus
	temperatureC: number | null
	setpointC: number | null
	fanSpeed: number | null
}

const emptyHvacStatus = (): HvacLocationStatus => ({
	isOn: false,
	uiStatus: "warning",
	temperatureC: null,
	setpointC: null,
	fanSpeed: null,
})

export const useHvacModbusIntegration = (
	hvacZones: Ref<HvacZone[]>,
	options?: { shouldFetchOnZonesChange?: () => boolean }
) => {
	const hvacApi = useHvacApi()
	const { handleError } = useErrorHandler()

	return createToggleModbusIntegration<HvacLocation, HvacZone, HvacSnapshotItem, HvacLocationStatus>({
		loadErrorLabel: "載入空調狀態失敗",
		systemKey: "hvac",
		controlScope: "hvac",
		zones: hvacZones,
		fetchSnapshot: (fetchOptions) => hvacApi.getStatus({ force: fetchOptions?.force }),
		buildLocationUiKey: (zone, location, locationIndex) =>
			getLocationUiKey({ zone, location, locationIndex }),
		findLocationByUiKey: (uiKey, requireDbId) =>
			findLocationInZonesByUiKey<HvacLocation, HvacZone>(hvacZones.value, uiKey, { requireDbId }),
		ensureLocationStatus: (uiKey, store) => {
			if (!store.value[uiKey]) store.value[uiKey] = emptyHvacStatus()
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
			// 偵測溫度唯讀，一律更新；AO 在寫入 hold 期間保留樂觀值（即使 isOn 吻合已 clearHold）
			status.temperatureC = coerceToggleSnapshotNumber(item.raw?.temperatureC)
			if (holdUntil <= now) {
				status.setpointC = coerceToggleSnapshotNumber(item.raw?.setpointC)
				status.fanSpeed = coerceToggleSnapshotNumber(item.raw?.fanSpeed)
			}
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
					if (!store.value[id]) store.value[id] = emptyHvacStatus()
				})
			}
		},
		buildExtraReturns: ({
			locationToggling,
			writeHoldingRegister,
			getLocationDeviceConfig,
			findLocationByUiKey,
			setSnapshotHold,
			clearSnapshotHold,
			loadAllLocationStatuses,
			ensureStatus,
		}) => {
			const executeAnalogWrite = async (
				locationUiKey: string,
				pointKey: "setpointC" | "fanSpeed",
				displayValue: number
			) => {
				const found = findLocationByUiKey(locationUiKey, true)
				if (!found) return
				const { location } = found
				const point = location.statusPoints?.[pointKey]
				if (!point || point.registerType !== "holding") return
				if (locationToggling.value.has(locationUiKey)) return

				locationToggling.value.add(locationUiKey)
				setSnapshotHold(locationUiKey)
				const status = ensureStatus(locationUiKey)
				const previous = status[pointKey]
				status[pointKey] = displayValue

				const rollback = () => {
					status[pointKey] = previous
					clearSnapshotHold(locationUiKey)
					locationToggling.value.delete(locationUiKey)
				}

				try {
					// 空調類比一律沿用地點層主控制器
					const deviceConfig = await getLocationDeviceConfig(location)
					if (!deviceConfig) {
						rollback()
						return
					}
					const raw = invertDefToRaw(displayValue, point)
					if (raw == null || !Number.isInteger(raw) || raw < 0 || raw > 65535) {
						rollback()
						return
					}
					await writeHoldingRegister(point.address, raw, deviceConfig)
					setTimeout(async () => {
						try {
							await loadAllLocationStatuses({ force: true })
						} finally {
							locationToggling.value.delete(locationUiKey)
						}
					}, TOGGLE_ROUNDTRIP_DELAY_MS)
				} catch (error) {
					rollback()
					throw error
				}
			}

			return {
				handleSetTemperature: async (locationUiKey: string, nextSetpointC: number) => {
					try {
						await executeAnalogWrite(locationUiKey, "setpointC", nextSetpointC)
					} catch (error) {
						handleError(error, "設定溫度失敗")
					}
				},
				handleSetFanSpeed: async (locationUiKey: string, nextFanSpeed: number) => {
					try {
						await executeAnalogWrite(locationUiKey, "fanSpeed", nextFanSpeed)
					} catch (error) {
						handleError(error, "設定風速失敗")
					}
				},
			}
		},
		shouldFetchOnZonesChange: options?.shouldFetchOnZonesChange,
	})
}
