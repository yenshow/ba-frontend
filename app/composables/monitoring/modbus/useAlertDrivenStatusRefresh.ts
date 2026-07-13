/**
 * 警報離開／進入 active（或日界線批次結案）時 force 重抓 status，
 * 避免 toast 已撤但 mergeActiveAlerts overlay 仍卡住。
 */
import { onScopeDispose } from "vue"
import { useAlertEventBus } from "~/composables/monitoring/alertMonitor/useAlertEventBus"
import type { AlertUpdatedEvent } from "~/types/websocket"

const REFRESH_DEBOUNCE_MS = 300

export const useAlertDrivenStatusRefresh = (params: {
	systemKey: string
	/** 一律以 force 重抓（略過 race／cache） */
	reload: () => void | Promise<void>
}) => {
	const { systemKey, reload } = params
	const { onAlertUpdated, offAlertUpdated, onAlertDailyRollover, offAlertDailyRollover } =
		useAlertEventBus()

	let timer: ReturnType<typeof setTimeout> | null = null
	const scheduleReload = () => {
		if (timer) clearTimeout(timer)
		timer = setTimeout(() => {
			timer = null
			void reload()
		}, REFRESH_DEBOUNCE_MS)
	}

	const handleAlertUpdated = (data: AlertUpdatedEvent) => {
		if (String(data.alert?.source || "") !== systemKey) return
		if (data.oldStatus === data.newStatus) return
		if (data.oldStatus !== "active" && data.newStatus !== "active") return
		scheduleReload()
	}

	onAlertUpdated(handleAlertUpdated)
	onAlertDailyRollover(scheduleReload)

	onScopeDispose(() => {
		offAlertUpdated(handleAlertUpdated)
		offAlertDailyRollover(scheduleReload)
		if (timer) clearTimeout(timer)
	})
}
