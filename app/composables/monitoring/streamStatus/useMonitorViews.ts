/**
 * 監控畫面管理 Composable
 * 負責監控畫面的增刪改查和與串流狀態的同步
 */

import type { MonitorView } from "~/types/surveillance";

/**
 * 監控畫面管理
 */
export const useMonitorViews = () => {
	// 監控畫面列表（統一管理）
	const monitorViews = ref<MonitorView[]>([]);

	/**
	 * 自動同步 monitorViews 與串流狀態
	 * 當串流狀態更新時，自動更新 monitorViews 中的 hlsUrl 和 streamId
	 */
	const syncMonitorViewsWithStreamStatus = (
		streamStatusMap: ReadonlyMap<number, { readonly hlsUrl?: string; readonly streamId?: string; readonly [key: string]: any }>,
		testStream: { readonly hlsUrl?: string; readonly streamId?: string } | null
	) => {
		monitorViews.value.forEach(view => {
			if (view.isTestStream) {
				// 測試串流：從 testStream 獲取最新狀態
				if (testStream) {
					view.hlsUrl = testStream.hlsUrl;
					view.streamId = testStream.streamId;
				}
			} else {
				// 正常串流：從 streamStatusMap 獲取最新狀態
				const status = streamStatusMap.get(view.deviceId);
				if (status) {
					view.hlsUrl = status.hlsUrl;
					view.streamId = status.streamId;
				}
			}
		});
	};

	/**
	 * 添加監控畫面
	 */
	const addMonitorView = (view: MonitorView | number) => {
		if (typeof view === "number") {
			// 如果是 deviceId，創建 MonitorView
			const deviceId = view;
			const existingIndex = monitorViews.value.findIndex(v => v.deviceId === deviceId && !v.isTestStream);
			if (existingIndex >= 0) {
				// 如果已存在，移除
				monitorViews.value.splice(existingIndex, 1);
				reorderMonitorViews();
				return;
			}
			view = {
				deviceId,
				position: monitorViews.value.length
			};
		}

		// 檢查是否已存在
		const existingIndex = monitorViews.value.findIndex(
			v => v.deviceId === view.deviceId && v.isTestStream === view.isTestStream
		);
		if (existingIndex >= 0) {
			// 更新現有視圖
			monitorViews.value[existingIndex] = { ...monitorViews.value[existingIndex], ...view };
		} else {
			// 添加新視圖
			monitorViews.value.push(view);
		}
	};

	/**
	 * 移除監控畫面
	 */
	const removeMonitorView = (deviceId: number) => {
		const index = monitorViews.value.findIndex(v => v.deviceId === deviceId);
		if (index >= 0) {
			monitorViews.value.splice(index, 1);
			reorderMonitorViews();
		}
	};

	/**
	 * 根據 streamId 移除測試串流視圖
	 */
	const removeTestViewByStreamId = (streamId: string) => {
		const testViewIndex = monitorViews.value.findIndex(
			v => v.isTestStream && v.streamId === streamId
		);
		if (testViewIndex >= 0) {
			monitorViews.value.splice(testViewIndex, 1);
			reorderMonitorViews();
		}
	};

	/**
	 * 更新測試串流視圖（用於 WebSocket 事件同步）
	 */
	const updateTestView = (streamId: string, hlsUrl: string) => {
		monitorViews.value.forEach(view => {
			if (view.isTestStream && view.streamId === streamId) {
				view.hlsUrl = hlsUrl;
				view.streamId = streamId;
			}
		});
	};

	/**
	 * 更新監控畫面
	 */
	const updateMonitorView = (deviceId: number, updates: Partial<MonitorView>) => {
		const view = monitorViews.value.find(v => v.deviceId === deviceId);
		if (view) {
			Object.assign(view, updates);
		}
	};

	/**
	 * 重新排序監控畫面
	 */
	const reorderMonitorViews = () => {
		monitorViews.value.forEach((view, idx) => {
			view.position = idx;
		});
	};

	/**
	 * 檢查是否為測試串流
	 */
	const isTestStream = (streamId: string): boolean => {
		return monitorViews.value.some(v => v.isTestStream && v.streamId === streamId);
	};

	return {
		// 狀態
		monitorViews: readonly(monitorViews),

		// 方法
		addMonitorView,
		removeMonitorView,
		removeTestViewByStreamId,
		updateMonitorView,
		reorderMonitorViews,
		syncMonitorViewsWithStreamStatus,
		updateTestView,
		isTestStream
	};
};

