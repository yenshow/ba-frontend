/**
 * 監控畫面管理 Composable（WebRTC 串流）
 * 以 viewKey 為主鍵（cam:{id} / nvr:{nvrId}:{proxyChannelId}）
 */

import type { MonitorView } from "~/types/surveillance"

export const useMonitorViews = () => {
	const monitorViews = ref<MonitorView[]>([])

	const addMonitorView = (view: MonitorView) => {
		const newView: MonitorView = {
			...view,
			position: monitorViews.value.length,
		}
		monitorViews.value.push(newView)
	}

	/** 移除第一個符合 viewKey 的畫面 */
	const removeMonitorView = (viewKey: string) => {
		const index = monitorViews.value.findIndex((v) => v.viewKey === viewKey)
		if (index >= 0) {
			monitorViews.value.splice(index, 1)
			reorderMonitorViews()
		}
	}

	/** 更新指定 viewKey 的畫面（優先更新 streamStatus 為 loading 的那一筆） */
	const updateMonitorView = (viewKey: string, updates: Partial<MonitorView>) => {
		const view =
			monitorViews.value.find(
				(v) => v.viewKey === viewKey && v.streamStatus === "loading"
			) ?? monitorViews.value.find((v) => v.viewKey === viewKey)
		if (view) {
			Object.assign(view, updates)
		}
	}

	const reorderMonitorViews = () => {
		monitorViews.value.forEach((v, idx) => {
			v.position = idx
		})
	}

	return {
		monitorViews: readonly(monitorViews),
		addMonitorView,
		removeMonitorView,
		updateMonitorView,
		reorderMonitorViews,
	}
}
