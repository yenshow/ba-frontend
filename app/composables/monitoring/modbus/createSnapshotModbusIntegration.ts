import { computed, ref, watch, type ComputedRef, type Ref } from "vue"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useSnapshotSyncHealth, type SnapshotSyncHealthState } from "~/composables/monitoring/modbus/useSnapshotSyncHealth"
import type { StatusSnapshotFetchOptions } from "~/composables/monitoring/modbus/statusSnapshotPolicy"
import {
	resolveToggleSnapshotZoneIds,
	type ModbusIntegrationZone,
	useModbusIntegrationDeviceCache,
} from "~/composables/monitoring/modbus/modbusIntegrationShared"
import type { ZoneUiKeyable } from "~/utils/locationUiId"
import {
	patchOptimisticManualAlarmForZones,
	patchOptimisticUiStatusBySystemId,
} from "~/composables/monitoring/modbus/statusSnapshotPolicy"
import type { ManualIssueRuleTriggerPayload, ManualSemanticAlertSource } from "~/utils/alertUtils"
import { createStatusSnapshotRaceChannel } from "~/composables/monitoring/modbus/useStatusSnapshotRaceChannel"
import { useMonitoringSnapshotWebSocket } from "~/composables/monitoring/useMonitoringSnapshotWebSocket"
import { useAccessGate } from "~/composables/core/useAccessGate"
import type { FeatureKey } from "~/types/license"
import type { StatusSnapshotQuery } from "~/composables/monitoring/statusSnapshotQuery"

type SnapshotStatusResult<TItem> = { items?: TItem[] | null }

type SnapshotPatchConfig =
	| { optimisticPatch: "manualAlarm"; manualAlarmSystemType: ManualSemanticAlertSource }
	| { optimisticPatch: "uiStatus" }

const mergeStatusItemsBySystemId = <TItem extends { systemId: string | number }>(
	current: TItem[],
	incoming: TItem[]
): TItem[] => {
	if (!incoming.length) return current
	const map = new Map(current.map((it) => [String(it.systemId), it]))
	for (const item of incoming) {
		map.set(String(item.systemId), item)
	}
	return [...map.values()]
}

/** 快照型 Modbus 子系統薄包工廠（排水／電力／消防等 6 套共用） */
export const defineSnapshotModbusIntegration = <
	TItem extends { systemId: string | number; uiStatus: unknown },
	TZone extends ModbusIntegrationZone & ZoneUiKeyable,
>(
	loadErrorLabel: string,
	systemKey: string,
	useApiHook: () => {
		getStatus: (options?: StatusSnapshotQuery) => Promise<SnapshotStatusResult<TItem>>
	},
	patch: SnapshotPatchConfig
): ((
	zonesRef: Ref<TZone[]>,
	selectedZone?: Ref<string>,
	options?: { shouldFetchOnZonesChange?: () => boolean }
) => SnapshotModbusIntegrationHandle<TItem>) => {
	return (zonesRef, selectedZone, options) => {
		const api = useApiHook()
		return createSnapshotModbusIntegration<TItem, TZone>({
			zonesRef,
			selectedZone,
			systemKey,
			loadErrorLabel,
			fetchStatus: (fetchOptions) => api.getStatus(fetchOptions),
			shouldFetchOnZonesChange: options?.shouldFetchOnZonesChange,
			...patch,
		})
	}
}

export type SnapshotModbusIntegrationConfig<
	TItem extends { systemId: string | number; uiStatus: unknown },
	TZone extends ModbusIntegrationZone & ZoneUiKeyable,
> = {
	zonesRef: Ref<TZone[]>
	selectedZone?: Ref<string>
	systemKey: string
	loadErrorLabel: string
	fetchStatus: (options?: StatusSnapshotQuery) => Promise<SnapshotStatusResult<TItem>>
	optimisticPatch: "manualAlarm" | "uiStatus"
	/** `optimisticPatch: "manualAlarm"` 時必填（對應 `patchOptimisticManualAlarmForZones` 的 alertSource） */
	manualAlarmSystemType?: ManualSemanticAlertSource
	/** 為 false 時 zones 變更不觸發 preload／status 請求（全區點位聚合快照用） */
	shouldFetchOnZonesChange?: () => boolean
}

/** 快照整合 composable 對外介面（含 manualAlarm / uiStatus 兩種樂觀更新；未使用該模式者為 no-op） */
export type SnapshotModbusIntegrationHandle<
	TItem extends { systemId: string | number; uiStatus: unknown },
> = {
	syncHealthState: ComputedRef<SnapshotSyncHealthState>
	lastSuccessAt: Ref<number | null>
	setStatusItems: (items: TItem[]) => void
	patchStatusItems: (items: TItem[]) => void
	statusItems: ComputedRef<TItem[]>
	preloadDeviceInfos: () => Promise<void>
	loadStatusSnapshot: (options?: StatusSnapshotFetchOptions) => Promise<void>
	startSnapshotSync: () => void
	stopSnapshotSync: () => void
	handleVisibilityChange: () => void
	patchOptimisticManualAlarm: (systemId: string, rule?: ManualIssueRuleTriggerPayload) => void
	patchOptimistic: (systemId: string, uiStatus: TItem["uiStatus"]) => void
}

export const createSnapshotModbusIntegration = <
	TItem extends { systemId: string | number; uiStatus: unknown },
	TZone extends ModbusIntegrationZone & ZoneUiKeyable,
>(
	config: SnapshotModbusIntegrationConfig<TItem, TZone>
): SnapshotModbusIntegrationHandle<TItem> => {
	const {
		zonesRef,
		selectedZone,
		systemKey,
		loadErrorLabel,
		fetchStatus,
		optimisticPatch,
		manualAlarmSystemType,
		shouldFetchOnZonesChange,
	} = config
	const { handleError } = useErrorHandler()
	const race = createStatusSnapshotRaceChannel()
	const { preloadDeviceInfos } = useModbusIntegrationDeviceCache()
	const syncHealth = useSnapshotSyncHealth()
	const { useWsModuleGate } = useAccessGate()
	const canSubscribe = useWsModuleGate(systemKey as FeatureKey)

	const statusItems = ref<TItem[]>([]) as Ref<TItem[]>
	const setStatusItems = (items?: TItem[] | null) => {
		statusItems.value = items ?? []
		syncHealth.recordSuccess()
	}

	const patchStatusItems = (items: TItem[]) => {
		if (!items.length) return
		statusItems.value = mergeStatusItemsBySystemId(statusItems.value, items)
		syncHealth.recordSuccess()
	}

	const resolveZoneIds = () =>
		selectedZone ? resolveToggleSnapshotZoneIds(zonesRef.value, selectedZone.value) : undefined

	const loadStatusSnapshot = async (options?: StatusSnapshotFetchOptions) => {
		const zoneIds = resolveZoneIds()
		await race.runSnapshotLoad(options, async ({ isStale }) => {
			try {
				const result = await fetchStatus({ zoneIds, force: options?.force })
				if (isStale()) return
				statusItems.value = result.items || []
				syncHealth.recordSuccess()
			} catch (error) {
				if (isStale()) return
				syncHealth.recordFailure()
				handleError(error, loadErrorLabel)
			}
		})
	}

	const patchOptimisticManualAlarm = (systemId: string, rule?: ManualIssueRuleTriggerPayload) => {
		if (optimisticPatch !== "manualAlarm" || !manualAlarmSystemType) return
		patchOptimisticManualAlarmForZones(
			statusItems,
			zonesRef.value,
			systemId,
			manualAlarmSystemType,
			rule
		)
	}

	const patchOptimistic = (systemId: string, uiStatus: TItem["uiStatus"]) => {
		if (optimisticPatch !== "uiStatus") return
		patchOptimisticUiStatusBySystemId(statusItems, systemId, uiStatus)
	}

	const snapshotWs = useMonitoringSnapshotWebSocket({
		systems: [systemKey],
		enabled: canSubscribe,
		onSnapshotUpdated: (event) => {
			const zoneIds = resolveZoneIds()
			let incoming = (event.items || []) as TItem[]
			if (zoneIds?.length) {
				const want = new Set(zoneIds.map(String))
				incoming = incoming.filter((it) =>
					want.has(String((it as { zoneId?: string }).zoneId ?? ""))
				)
			}
			patchStatusItems(incoming)
		},
	})

	const handleVisibilityChange = () => {
		if (typeof document === "undefined") return
		if (document.visibilityState === "visible") {
			void loadStatusSnapshot()
		}
	}

	watch(
		() => zonesRef.value,
		async () => {
			if (shouldFetchOnZonesChange && !shouldFetchOnZonesChange()) return
			await preloadDeviceInfos(zonesRef.value)
			void loadStatusSnapshot()
		},
		{ deep: true }
	)

	const noopManualAlarm = (_systemId: string, _rule?: ManualIssueRuleTriggerPayload) => {}
	const noopUiStatus = (_systemId: string, _uiStatus: TItem["uiStatus"]) => {}

	return {
		syncHealthState: syncHealth.state,
		lastSuccessAt: syncHealth.lastSuccessAt,
		setStatusItems,
		patchStatusItems,
		statusItems: computed(() => statusItems.value),
		preloadDeviceInfos: () => preloadDeviceInfos(zonesRef.value),
		loadStatusSnapshot,
		startSnapshotSync: () => snapshotWs.start(),
		stopSnapshotSync: () => snapshotWs.stop(),
		handleVisibilityChange,
		patchOptimisticManualAlarm:
			optimisticPatch === "manualAlarm" ? patchOptimisticManualAlarm : noopManualAlarm,
		patchOptimistic: optimisticPatch === "uiStatus" ? patchOptimistic : noopUiStatus,
	}
}
