import { computed, ref, watch, type ComputedRef, type Ref } from "vue"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePolling } from "~/composables/monitoring/usePolling"
import { useModbusPollingPolicy } from "~/composables/monitoring/modbus/useModbusPollingPolicy"
import type { StatusSnapshotFetchOptions } from "~/composables/monitoring/modbus/statusSnapshotPolicy"
import {
	patchOptimisticManualAlarmForZones,
	patchOptimisticUiStatusBySystemId,
	resolveStatusSnapshotSyncAlerts,
} from "~/composables/monitoring/modbus/statusSnapshotPolicy"
import type { ManualIssueRuleTriggerPayload, ManualSemanticAlertSource } from "~/utils/alertUtils"
import { createStatusSnapshotRaceChannel } from "~/composables/monitoring/modbus/useStatusSnapshotRaceChannel"
import {
	type ModbusIntegrationZone,
	useModbusIntegrationDeviceCache,
} from "~/composables/monitoring/modbus/modbusIntegrationShared"

type SnapshotStatusResult<TItem> = { items?: TItem[] | null }

type SnapshotPatchConfig =
	| { optimisticPatch: "manualAlarm"; manualAlarmSystemType: ManualSemanticAlertSource }
	| { optimisticPatch: "uiStatus" }

/** 快照型 Modbus 子系統薄包工廠（排水／電力／消防等 6 套共用） */
export const defineSnapshotModbusIntegration = <
	TItem extends { systemId: string | number; uiStatus: unknown },
	TZone extends ModbusIntegrationZone,
>(
	loadErrorLabel: string,
	useApiHook: () => {
		getStatus: (options: { syncAlerts: boolean }) => Promise<SnapshotStatusResult<TItem>>
	},
	patch: SnapshotPatchConfig
): ((zonesRef: Ref<TZone[]>) => SnapshotModbusIntegrationHandle<TItem>) => {
	return (zonesRef: Ref<TZone[]>) => {
		const api = useApiHook()
		return createSnapshotModbusIntegration<TItem, TZone>({
			zonesRef,
			loadErrorLabel,
			fetchStatus: (options) => api.getStatus(options),
			...patch,
		})
	}
}

export type SnapshotModbusIntegrationConfig<
	TItem extends { systemId: string | number; uiStatus: unknown },
	TZone extends ModbusIntegrationZone,
> = {
	zonesRef: Ref<TZone[]>
	loadErrorLabel: string
	fetchStatus: (options: { syncAlerts: boolean }) => Promise<SnapshotStatusResult<TItem>>
	optimisticPatch: "manualAlarm" | "uiStatus"
	/** `optimisticPatch: "manualAlarm"` 時必填（對應 `patchOptimisticManualAlarmForZones` 的 alertSource） */
	manualAlarmSystemType?: ManualSemanticAlertSource
}

/** 快照整合 composable 對外介面（含 manualAlarm / uiStatus 兩種樂觀更新，未啟用者為 no-op） */
export type SnapshotModbusIntegrationHandle<
	TItem extends { systemId: string | number; uiStatus: unknown },
> = {
	statusItems: ComputedRef<TItem[]>
	preloadDeviceInfos: () => Promise<void>
	loadStatusSnapshot: (options?: StatusSnapshotFetchOptions) => Promise<void>
	startAutoRefresh: () => void
	stopAutoRefresh: () => void
	handleVisibilityChange: () => void
	patchOptimisticManualAlarm: (systemId: string, rule?: ManualIssueRuleTriggerPayload) => void
	patchOptimistic: (systemId: string, uiStatus: TItem["uiStatus"]) => void
}

export const createSnapshotModbusIntegration = <
	TItem extends { systemId: string | number; uiStatus: unknown },
	TZone extends ModbusIntegrationZone,
>(
	config: SnapshotModbusIntegrationConfig<TItem, TZone>
): SnapshotModbusIntegrationHandle<TItem> => {
	const { zonesRef, loadErrorLabel, fetchStatus, optimisticPatch, manualAlarmSystemType } = config
	const { handleError } = useErrorHandler()
	const race = createStatusSnapshotRaceChannel()
	const { preloadDeviceInfos } = useModbusIntegrationDeviceCache()
	const pollingPolicy = useModbusPollingPolicy()

	const statusItems = ref<TItem[]>([]) as Ref<TItem[]>

	const loadStatusSnapshot = async (options?: StatusSnapshotFetchOptions) => {
		const syncAlerts = resolveStatusSnapshotSyncAlerts(options)
		await race.runSnapshotLoad(options, async ({ isStale }) => {
			try {
				const result = await fetchStatus({ syncAlerts })
				if (isStale()) return
				statusItems.value = result.items || []
				pollingPolicy.recordSuccess()
			} catch (error) {
				if (isStale()) return
				pollingPolicy.recordFailure()
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

	const { start: startPolling, stop: stopPolling } = usePolling({
		callback: async () => {
			if (typeof document === "undefined") return
			if (document.visibilityState !== "visible") return
			await loadStatusSnapshot()
		},
		interval: pollingPolicy.pollIntervalMs,
		immediate: true,
		enabled: () => typeof document !== "undefined" && document.visibilityState === "visible",
		onError: (err) => {
			handleError(err, loadErrorLabel)
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
			await preloadDeviceInfos(zonesRef.value)
			void loadStatusSnapshot()
		},
		{ deep: true }
	)

	const noopManualAlarm = (_systemId: string, _rule?: ManualIssueRuleTriggerPayload) => {}
	const noopUiStatus = (_systemId: string, _uiStatus: TItem["uiStatus"]) => {}

	return {
		statusItems: computed(() => statusItems.value),
		preloadDeviceInfos: () => preloadDeviceInfos(zonesRef.value),
		loadStatusSnapshot,
		startAutoRefresh: () => startPolling(),
		stopAutoRefresh: () => {
			stopPolling()
		},
		handleVisibilityChange,
		patchOptimisticManualAlarm:
			optimisticPatch === "manualAlarm" ? patchOptimisticManualAlarm : noopManualAlarm,
		patchOptimistic: optimisticPatch === "uiStatus" ? patchOptimistic : noopUiStatus,
	}
}
