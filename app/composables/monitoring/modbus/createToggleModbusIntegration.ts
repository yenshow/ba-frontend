import { computed, ref, watch, type Ref } from "vue"
import { extractWritePoints, type ModbusDeviceConfig } from "~/utils/modbusPoints"
import { normalizeOptionalDeviceId } from "~/utils/deviceIdUtils"
import { useApiBase } from "~/composables/core/useApiBase"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useSnapshotSyncHealth } from "~/composables/monitoring/modbus/useSnapshotSyncHealth"
import { useMonitoringSnapshotWebSocket } from "~/composables/monitoring/useMonitoringSnapshotWebSocket"
import { useAccessGate } from "~/composables/core/useAccessGate"
import type { FeatureKey } from "~/types/license"
import type { ZoneUiKeyable } from "~/utils/locationUiId"
import {
	collectDeviceIdsFromZones,
	extractControllerDeviceConfig,
	resolveToggleSnapshotZoneIds,
	type ModbusDeviceConn,
	type ModbusIntegrationZone,
	type ToggleModbusSnapshotApplyResult,
	type ToggleSnapshotZoneFilterOptions,
	useModbusIntegrationDeviceCache,
} from "~/composables/monitoring/modbus/modbusIntegrationShared"

const TOGGLE_DEBOUNCE_DELAY_MS = 300
const TOGGLE_ROUNDTRIP_DELAY_MS = 450
const TOGGLE_SNAPSHOT_HOLD_MS = 8000

export type ToggleModbusSnapshotApplyArgs<TLocationStatus, TSnapshotItem> = {
	status: TLocationStatus
	item: TSnapshotItem
	uiKey: string
	now: number
	holdUntil: number
	clearHold: (uiKey: string) => void
}

export type CreateToggleModbusIntegrationConfig<
	TLocation extends { name?: string; modbus?: unknown },
	TZone extends ModbusIntegrationZone & ZoneUiKeyable & { locations: TLocation[] },
	TSnapshotItem extends { locationId: string | number },
	TLocationStatus,
> = {
	loadErrorLabel: string
	systemKey: string
	zones: Ref<TZone[]>
	selectedZone: Ref<string>
	/** `zoneIds` 為 undefined 時不篩選區域（全區快照） */
	fetchSnapshot: (
		zoneIds?: string[],
		options?: { force?: boolean }
	) => Promise<{ items?: TSnapshotItem[] | null }>
	buildLocationUiKey: (zone: TZone, location: TLocation, locationIndex: number) => string
	findLocationByUiKey: (
		uiKey: string,
		requireDbId?: boolean
	) => { location: TLocation } | null | undefined
	ensureLocationStatus: (
		uiKey: string,
		store: Ref<Record<string, TLocationStatus>>
	) => TLocationStatus
	initializeLocationStatuses?: (store: Ref<Record<string, TLocationStatus>>) => void
	applySnapshotItem: (args: ToggleModbusSnapshotApplyArgs<TLocationStatus, TSnapshotItem>) => ToggleModbusSnapshotApplyResult
	buildDisabledMap: (toggling: Ref<Set<string>>) => Record<string, boolean>
	collectDeviceIds?: (zones: TZone[]) => number[]
	canToggleLocation: (location: TLocation) => boolean
	getToggleValue: (status: TLocationStatus | undefined) => boolean
	setToggleValue: (status: TLocationStatus, value: boolean) => void
	onToggleFailed?: (status: TLocationStatus, previousValue: boolean) => void
	resolveInlineDeviceConfig?: (location: TLocation) => ModbusDeviceConn | null
	buildExtraReturns?: (ctx: {
		locationStatuses: Ref<Record<string, TLocationStatus>>
	}) => Record<string, unknown>
	/** 為 false 時 zones 變更不觸發 preload／status 請求（全區點位聚合快照用） */
	shouldFetchOnZonesChange?: () => boolean
	/** Modbus 寫入權限範圍（lighting / hvac） */
	controlScope: "lighting" | "hvac"
}

export const createToggleModbusIntegration = <
	TLocation extends { name?: string; modbus?: unknown; deviceId?: number },
	TZone extends ModbusIntegrationZone & ZoneUiKeyable & { locations: TLocation[] },
	TSnapshotItem extends { locationId: string | number },
	TLocationStatus,
>(
	config: CreateToggleModbusIntegrationConfig<TLocation, TZone, TSnapshotItem, TLocationStatus>
) => {
	const {
		loadErrorLabel,
		systemKey,
		zones,
		selectedZone,
		fetchSnapshot,
		buildLocationUiKey,
		findLocationByUiKey,
		ensureLocationStatus,
		applySnapshotItem,
		buildDisabledMap,
		collectDeviceIds = collectDeviceIdsFromZones,
		canToggleLocation,
		getToggleValue,
		setToggleValue,
		onToggleFailed,
		initializeLocationStatuses,
		resolveInlineDeviceConfig,
		buildExtraReturns,
		shouldFetchOnZonesChange,
		controlScope,
	} = config

	const { request } = useApiBase()
	const { handleError } = useErrorHandler()
	const { deviceConfigCache, loadDeviceInfo, preloadDeviceInfos } = useModbusIntegrationDeviceCache()
	const syncHealth = useSnapshotSyncHealth()
	const { useWsModuleGate } = useAccessGate()
	const canSubscribe = useWsModuleGate(systemKey as FeatureKey)

	const locationStatuses = ref<Record<string, TLocationStatus>>({}) as Ref<
		Record<string, TLocationStatus>
	>
	const ensureStatus = (uiKey: string) => ensureLocationStatus(uiKey, locationStatuses)
	const locationToggling = ref<Set<string>>(new Set())
	const snapshotHoldUntilByUiKey = ref<Record<string, number>>({})
	const toggleDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
	let inflightStatusRefresh: Promise<void> | null = null

	const setSnapshotHold = (uiKey: string) => {
		snapshotHoldUntilByUiKey.value = {
			...snapshotHoldUntilByUiKey.value,
			[uiKey]: Date.now() + TOGGLE_SNAPSHOT_HOLD_MS,
		}
	}

	const clearSnapshotHold = (uiKey: string) => {
		if (!snapshotHoldUntilByUiKey.value[uiKey]) return
		const { [uiKey]: _removed, ...rest } = snapshotHoldUntilByUiKey.value
		snapshotHoldUntilByUiKey.value = rest
	}

	const writeCoil = async (address: number, value: boolean, deviceConfig: ModbusDeviceConfig) => {
		const queryParams = new URLSearchParams({
			host: deviceConfig.host,
			port: String(deviceConfig.port),
			unitId: String(deviceConfig.unitId),
			controlScope,
		})
		return request<{
			address: number
			value: boolean
			success: boolean
			device: ModbusDeviceConfig
		}>(`/modbus/coils?${queryParams.toString()}`, {
			method: "PUT",
			body: JSON.stringify({ address, value }),
		})
	}

	const getLocationDeviceConfig = async (location: TLocation): Promise<ModbusDeviceConn | null> => {
		const modbus = location.modbus as
			| ({ host?: string; port?: number; unitId?: number } & Record<string, unknown>)
			| undefined
			| null
		if (!modbus) return null

		const effectiveDeviceId = normalizeOptionalDeviceId(location.deviceId)
		if (!effectiveDeviceId) {
			if (resolveInlineDeviceConfig) return resolveInlineDeviceConfig(location)
			if (modbus.host && modbus.port !== undefined && modbus.unitId !== undefined) {
				return {
					host: String(modbus.host),
					port: Number(modbus.port),
					unitId: Number(modbus.unitId),
				}
			}
			return null
		}

		if (deviceConfigCache.value.has(effectiveDeviceId)) {
			return deviceConfigCache.value.get(effectiveDeviceId)!
		}

		const device = await loadDeviceInfo(effectiveDeviceId)
		if (!device) return null
		return deviceConfigCache.value.get(effectiveDeviceId) || extractControllerDeviceConfig(device)
	}

	const applyBackendSnapshotItems = (items: TSnapshotItem[]) => {
		const locationIdToUiKey = new Map<string, string>()
		for (const zone of zones.value) {
			for (let i = 0; i < zone.locations.length; i++) {
				const loc = zone.locations[i]!
				const locId = (loc as { id?: string | number }).id
				if (locId == null || String(locId).trim() === "") continue
				locationIdToUiKey.set(String(locId), buildLocationUiKey(zone, loc, i))
			}
		}

		const now = Date.now()
		for (const item of items || []) {
			const uiKey = locationIdToUiKey.get(String(item.locationId))
			if (!uiKey) continue
			const status = ensureStatus(uiKey)
			const holdUntil = snapshotHoldUntilByUiKey.value[uiKey] ?? 0
			const result = applySnapshotItem({
				status,
				item,
				uiKey,
				now,
				holdUntil,
				clearHold: clearSnapshotHold,
			})
			if (result === "hold") continue
		}
	}

	const applySnapshotItems = (items: TSnapshotItem[]) => {
		applyBackendSnapshotItems(items || [])
		syncHealth.recordSuccess()
	}

	const resolveZoneIds = (options?: ToggleSnapshotZoneFilterOptions) =>
		resolveToggleSnapshotZoneIds(zones.value, selectedZone.value, options)

	const loadAllLocationStatuses = async (options?: ToggleSnapshotZoneFilterOptions & { force?: boolean }) => {
		if (inflightStatusRefresh) return inflightStatusRefresh

		inflightStatusRefresh = (async () => {
			try {
				const zoneIds = resolveZoneIds(options)
				const backendStatus = await fetchSnapshot(zoneIds, { force: options?.force })
				applyBackendSnapshotItems(backendStatus.items || [])
				syncHealth.recordSuccess()
			} catch (error) {
				syncHealth.recordFailure()
				handleError(error, loadErrorLabel)
			} finally {
				inflightStatusRefresh = null
			}
		})()

		return inflightStatusRefresh
	}

	const executeToggle = async (locationUiKey: string, targetValue: boolean) => {
		const found = findLocationByUiKey(locationUiKey, true)
		if (!found) return

		const { location } = found
		if (!canToggleLocation(location)) return
		if (locationToggling.value.has(locationUiKey)) return

		locationToggling.value.add(locationUiKey)
		setSnapshotHold(locationUiKey)

		const status = ensureStatus(locationUiKey)
		const previousValue = getToggleValue(status)

		try {
			setToggleValue(status, targetValue)
			const deviceConfig = await getLocationDeviceConfig(location)
			if (!deviceConfig) {
				setToggleValue(status, previousValue)
				clearSnapshotHold(locationUiKey)
				locationToggling.value.delete(locationUiKey)
				return
			}

			const modbus = location.modbus
			const writeAddresses = modbus ? extractWritePoints(modbus as Parameters<typeof extractWritePoints>[0]) : []
			if (writeAddresses.length === 0) {
				setToggleValue(status, previousValue)
				clearSnapshotHold(locationUiKey)
				locationToggling.value.delete(locationUiKey)
				return
			}

			await Promise.all(
				writeAddresses.map((address) => writeCoil(address, targetValue, deviceConfig))
			)

			setTimeout(async () => {
				try {
					await loadAllLocationStatuses({ loadAllZones: true, force: true })
				} finally {
					locationToggling.value.delete(locationUiKey)
				}
			}, TOGGLE_ROUNDTRIP_DELAY_MS)
		} catch (error) {
			setToggleValue(status, previousValue)
			onToggleFailed?.(status, previousValue)
			handleError(error, `控制 ${location.name ?? locationUiKey} 失敗`)
			clearSnapshotHold(locationUiKey)
			locationToggling.value.delete(locationUiKey)
		}
	}

	const handleLocationToggle = async (locationUiKey: string, targetValue: boolean) => {
		if (locationToggling.value.has(locationUiKey)) return
		const existingTimer = toggleDebounceTimers.get(locationUiKey)
		if (existingTimer) clearTimeout(existingTimer)

		const timer = setTimeout(async () => {
			await executeToggle(locationUiKey, targetValue)
			toggleDebounceTimers.delete(locationUiKey)
		}, TOGGLE_DEBOUNCE_DELAY_MS)
		toggleDebounceTimers.set(locationUiKey, timer)
	}

	const locationDisabledMap = computed(() => buildDisabledMap(locationToggling))

	const snapshotWs = useMonitoringSnapshotWebSocket({
		systems: [systemKey],
		enabled: canSubscribe,
		onSnapshotUpdated: (event) => {
			applySnapshotItems((event.items || []) as TSnapshotItem[])
		},
	})

	const startSnapshotSync = () => snapshotWs.start()
	const stopSnapshotSync = () => {
		snapshotWs.stop()
		toggleDebounceTimers.clear()
	}

	const handleVisibilityChange = async () => {
		if (typeof document === "undefined") return
		if (document.visibilityState === "visible") {
			await loadAllLocationStatuses({ loadAllZones: true })
		}
	}

	watch(
		() => zones.value,
		async () => {
			if (shouldFetchOnZonesChange && !shouldFetchOnZonesChange()) return
			initializeLocationStatuses?.(locationStatuses)
			await preloadDeviceInfos(zones.value, collectDeviceIds)
			// zones 變更後：預設以「當前 selectedZone」範圍補一輪狀態
			void loadAllLocationStatuses()
		},
		{ deep: true }
	)

	return {
		syncHealthState: syncHealth.state,
		lastSuccessAt: syncHealth.lastSuccessAt,
		locationStatuses,
		locationToggling,
		locationDisabledMap,
		initializeLocationStatuses: () => initializeLocationStatuses?.(locationStatuses),
		preloadDeviceInfos: () => preloadDeviceInfos(zones.value, collectDeviceIds),
		loadAllLocationStatuses,
		applySnapshotItems,
		handleLocationToggle,
		startSnapshotSync,
		stopSnapshotSync,
		handleVisibilityChange,
		...(buildExtraReturns?.({ locationStatuses }) ?? {}),
	}
}
