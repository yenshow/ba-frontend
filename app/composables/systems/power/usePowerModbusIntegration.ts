import { computed, ref, watch, type Ref } from "vue"
import type { ModbusStatusPointDef } from "~/types/location"
import type { PowerStatusItem, PowerZone } from "~/types/power"
import type { Device, ControllerDeviceConfig } from "~/types/device"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePolling } from "~/composables/monitoring/usePolling"
import { useModbusPollingPolicy } from "~/composables/monitoring/useModbusPollingPolicy"
import type { StatusSnapshotFetchOptions } from "~/composables/monitoring/statusSnapshotPolicy"
import {
	patchOptimisticManualAlarmForZones,
	resolveStatusSnapshotSyncAlerts,
} from "~/composables/monitoring/statusSnapshotPolicy"
import type { ManualIssueRuleTriggerPayload } from "~/utils/alertUtils"
import { createStatusSnapshotRaceChannel } from "~/composables/monitoring/useStatusSnapshotRaceChannel"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { usePowerApi } from "~/composables/systems/power/usePowerApi"

type DeviceConn = { host: string; port: number; unitId: number }

export const usePowerModbusIntegration = (zonesRef: Ref<PowerZone[]>) => {
	const powerApi = usePowerApi()
	const deviceApi = useDeviceApi()
	const { handleError } = useErrorHandler()
	const race = createStatusSnapshotRaceChannel()

	const statusItems = ref<PowerStatusItem[]>([])

	const deviceCache = ref<Map<number, Device>>(new Map())
	const deviceConfigCache = ref<Map<number, DeviceConn>>(new Map())

	const pollingPolicy = useModbusPollingPolicy()

	const extractDeviceConfig = (device: Device): DeviceConn | null => {
		const config = device.config as ControllerDeviceConfig & Record<string, unknown>
		if (!config?.host || config.port === undefined || config.unitId === undefined) return null
		const isController =
			config.type === "controller" ||
			(device as Device & { type_code?: string }).type_code === "controller"
		if (!isController) return null
		return { host: String(config.host), port: Number(config.port), unitId: Number(config.unitId) }
	}

	const loadDeviceInfo = async (deviceId: number): Promise<Device | null> => {
		if (deviceCache.value.has(deviceId)) return deviceCache.value.get(deviceId)!
		try {
			const result = await deviceApi.getDevice(deviceId)
			const device = result.device
			deviceCache.value.set(deviceId, device)
			const cfg = extractDeviceConfig(device)
			if (cfg) deviceConfigCache.value.set(deviceId, cfg)
			return device
		} catch (error) {
			handleError(error, `載入設備 ${deviceId} 失敗`)
			return null
		}
	}

	const preloadDeviceInfos = async () => {
		const ids = new Set<number>()
		for (const zone of zonesRef.value) {
			for (const loc of zone.locations) {
				if (typeof loc.deviceId === "number" && Number.isFinite(loc.deviceId)) ids.add(loc.deviceId)
				const mbId = (loc.modbus as { deviceId?: unknown } | undefined)?.deviceId
				if (typeof mbId === "number" && Number.isFinite(mbId)) ids.add(mbId)
				const points = loc.statusPoints || {}
				Object.values(points).forEach((p) => {
					const pid = (p as ModbusStatusPointDef | undefined)?.deviceId
					if (typeof pid === "number" && Number.isFinite(pid)) ids.add(pid)
				})
			}
		}
		const uncached = Array.from(ids).filter((id) => !deviceCache.value.has(id))
		if (uncached.length === 0) return
		await Promise.allSettled(uncached.map((id) => loadDeviceInfo(id)))
	}

	const patchOptimisticManualAlarm = (systemId: string, rule?: ManualIssueRuleTriggerPayload) => {
		patchOptimisticManualAlarmForZones(statusItems, zonesRef.value, systemId, "power", rule)
	}

	const loadStatusSnapshot = async (options?: StatusSnapshotFetchOptions) => {
		const syncAlerts = resolveStatusSnapshotSyncAlerts(options)
		await race.runSnapshotLoad(options, async ({ isStale }) => {
			try {
				const result = await powerApi.getStatus({ syncAlerts })
				if (isStale()) return
				statusItems.value = result.items || []
				pollingPolicy.recordSuccess()
			} catch (error) {
				if (isStale()) return
				pollingPolicy.recordFailure()
				handleError(error, "載入電力狀態失敗")
			}
		})
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
			handleError(err, "載入電力狀態失敗")
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
			await preloadDeviceInfos()
			void loadStatusSnapshot()
		},
		{ deep: true }
	)

	return {
		statusItems: computed(() => statusItems.value),
		preloadDeviceInfos,
		loadStatusSnapshot,
		patchOptimisticManualAlarm,
		startAutoRefresh: () => startPolling(),
		stopAutoRefresh: () => {
			stopPolling()
		},
		handleVisibilityChange,
	}
}
