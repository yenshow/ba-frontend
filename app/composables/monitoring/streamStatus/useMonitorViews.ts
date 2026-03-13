/**
 * 監控畫面管理 Composable（WebRTC 串流）
 * 負責監控畫面的增刪改查；同一 deviceId 可對應多格（reference counting 在 useStreamStatus）
 */

import type { MonitorView } from "~/types/surveillance";

export const useMonitorViews = () => {
	const monitorViews = ref<MonitorView[]>([]);

	const addMonitorView = (view: MonitorView) => {
		const newView: MonitorView = {
			...view,
			position: monitorViews.value.length
		};
		monitorViews.value.push(newView);
	};

	/** 移除第一個符合 deviceId 的畫面（同一攝影機可有多格） */
	const removeMonitorView = (deviceId: number) => {
		const index = monitorViews.value.findIndex((v) => v.deviceId === deviceId);
		if (index >= 0) {
			monitorViews.value.splice(index, 1);
			reorderMonitorViews();
		}
	};

	const updateMonitorView = (deviceId: number, updates: Partial<MonitorView>) => {
		const view =
			monitorViews.value.find(
				(v) => v.deviceId === deviceId && v.streamStatus === "loading"
			) ?? monitorViews.value.find((v) => v.deviceId === deviceId);
		if (view) {
			Object.assign(view, updates);
		}
	};

	const reorderMonitorViews = () => {
		monitorViews.value.forEach((v, idx) => {
			v.position = idx;
		});
	};

	return {
		monitorViews: readonly(monitorViews),
		addMonitorView,
		removeMonitorView,
		updateMonitorView,
		reorderMonitorViews
	};
};
