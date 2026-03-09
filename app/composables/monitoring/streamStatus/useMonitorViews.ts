/**
 * 監控畫面管理 Composable（MJPEG 預覽）
 * 負責監控畫面的增刪改查，每個畫面以 previewUrl 顯示
 */

import type { MonitorView } from "~/types/surveillance";

export const useMonitorViews = () => {
	const monitorViews = ref<MonitorView[]>([]);

	const addMonitorView = (view: MonitorView) => {
		const existingIndex = monitorViews.value.findIndex(
			v => v.deviceId === view.deviceId
		);
		if (existingIndex >= 0) {
			monitorViews.value.splice(existingIndex, 1);
			reorderMonitorViews();
			return;
		}
		const newView: MonitorView = {
			...view,
			position: monitorViews.value.length
		};
		monitorViews.value.push(newView);
	};

	const removeMonitorView = (deviceId: number) => {
		const index = monitorViews.value.findIndex(v => v.deviceId === deviceId);
		if (index >= 0) {
			monitorViews.value.splice(index, 1);
			reorderMonitorViews();
		}
	};

	const updateMonitorView = (deviceId: number, updates: Partial<MonitorView>) => {
		const view = monitorViews.value.find(v => v.deviceId === deviceId);
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
