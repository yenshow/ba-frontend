import { watch, type ComputedRef, type Ref, type WatchStopHandle } from "vue"
import type { MonitoringSnapshotUpdatedEvent } from "~/types/websocket"
import { useWebSocket } from "~/composables/websocket/useWebSocket"

type MonitoringSnapshotWebSocketOptions = {
	onSnapshotUpdated: (event: MonitoringSnapshotUpdatedEvent) => void
	/** 若指定，僅處理這些 systemKey */
	systems?: string[] | (() => string[])
	enabled?: Ref<boolean> | ComputedRef<boolean> | (() => boolean)
}

/**
 * 訂閱 monitoring:snapshot:updated（Push-First UI 更新）
 */
export const useMonitoringSnapshotWebSocket = (
	options: MonitoringSnapshotWebSocketOptions
) => {
	const { on, off, isConnected } = useWebSocket()
	let stopWatcher: WatchStopHandle | null = null
	let isStarted = false

	const isEnabled = () => {
		const gate = options.enabled
		if (!gate) return true
		return typeof gate === "function" ? gate() : gate.value
	}

	const resolveSystems = (): Set<string> | null => {
		const raw = options.systems
		if (!raw) return null
		const list = typeof raw === "function" ? raw() : raw
		return new Set(list)
	}

	const handleEvent = (event: MonitoringSnapshotUpdatedEvent) => {
		const allowed = resolveSystems()
		if (allowed && !allowed.has(event.system)) return
		options.onSnapshotUpdated(event)
	}

	const syncSubscription = () => {
		off("monitoring:snapshot:updated", handleEvent)
		if (!isStarted || !isConnected.value || !isEnabled()) return
		on("monitoring:snapshot:updated", handleEvent)
	}

	const start = () => {
		if (isStarted) return
		isStarted = true
		const sources = options.enabled ? [isConnected, options.enabled] : [isConnected]
		stopWatcher = watch(sources, syncSubscription, { immediate: true })
	}

	const stop = () => {
		if (!isStarted) return
		isStarted = false
		off("monitoring:snapshot:updated", handleEvent)
		if (stopWatcher) {
			stopWatcher()
			stopWatcher = null
		}
	}

	return { start, stop }
}
