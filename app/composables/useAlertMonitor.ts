import { useAlertApi } from "~/composables/useAlertApi";
import { useToast } from "~/composables/useToast";
import type { Alert } from "~/types/alert";
import { getSourceLabel, getTypeLabel } from "~/utils/alertUtils";

/**
 * 警示監聽器
 * 用於監聽新的警示並顯示通知
 */
export const useAlertMonitor = () => {
	const alertApi = useAlertApi();
	const toast = useToast();

	// 已處理的警示 ID 集合（用於避免重複通知）
	const processedAlertIds = ref<Set<number>>(new Set());
	
	// 上次檢查時間
	const lastCheckTime = ref<Date | null>(null);
	
	// 輪詢間隔（毫秒）
	const POLLING_INTERVAL = 10000; // 10 秒
	
	// 輪詢計時器
	let pollingTimer: ReturnType<typeof setInterval> | null = null;
	
	// 是否正在檢查
	const isChecking = ref(false);

	/**
	 * 檢查新的警示
	 */
	const checkNewAlerts = async () => {
		if (isChecking.value) {
			return;
		}

		isChecking.value = true;

		try {
			// 獲取未解決的警示（只獲取最近的，按創建時間降序）
			const result = await alertApi.getAlerts({
				status: "active",
				limit: 50, // 增加限制以確保不會遺漏
				offset: 0,
				orderBy: "created_at",
				order: "desc"
			});

			// 如果有上次檢查時間，只處理新創建的警示
			if (lastCheckTime.value) {
				const newAlerts = result.alerts.filter(alert => {
					// 使用 latest_created_at 或 created_at 來判斷是否為新警報
					const alertTime = alert.latest_created_at 
						? new Date(alert.latest_created_at) 
						: new Date(alert.created_at);
					
					return alertTime > lastCheckTime.value! && !processedAlertIds.value.has(alert.id);
				});

				// 顯示新警示通知
				for (const alert of newAlerts) {
					showAlertNotification(alert);
					processedAlertIds.value.add(alert.id);
				}
			} else {
				// 首次檢查，記錄所有警示 ID，但不顯示通知
				for (const alert of result.alerts) {
					processedAlertIds.value.add(alert.id);
				}
			}

			// 更新最後檢查時間
			lastCheckTime.value = new Date();
		} catch (error) {
			console.error("[alertMonitor] 檢查新警示失敗", error);
		} finally {
			isChecking.value = false;
		}
	};

	/**
	 * 顯示警示通知
	 */
	const showAlertNotification = (alert: Alert) => {
		// 根據嚴重程度選擇 Toast 類型
		let toastType: "warning" | "error" | "info" = "warning";
		if (alert.severity === "critical") {
			toastType = "error";
		} else if (alert.severity === "error") {
			toastType = "error";
		} else if (alert.severity === "warning") {
			toastType = "warning";
		}

		// 構建通知訊息
		const sourceLabel = getSourceLabel(alert.source);
		const message = `${sourceLabel}: ${alert.message}`;

		// 顯示 Toast 通知（持續時間根據嚴重程度調整）
		const duration = alert.severity === "critical" ? 10000 : 5000;
		toast.showToast(toastType, message, duration);
	};

	/**
	 * 開始監聽
	 */
	const startMonitoring = () => {
		if (pollingTimer) {
			return;
		}

		// 立即執行一次檢查
		void checkNewAlerts();

		// 設置定時輪詢
		pollingTimer = setInterval(() => {
			void checkNewAlerts();
		}, POLLING_INTERVAL);
	};

	/**
	 * 停止監聽
	 */
	const stopMonitoring = () => {
		if (pollingTimer) {
			clearInterval(pollingTimer);
			pollingTimer = null;
		}
		lastCheckTime.value = null;
		processedAlertIds.value.clear();
	};

	/**
	 * 重置監聽器（清除已處理的警示記錄）
	 */
	const reset = () => {
		processedAlertIds.value.clear();
		lastCheckTime.value = null;
	};

	return {
		startMonitoring,
		stopMonitoring,
		reset,
		checkNewAlerts,
		isChecking: readonly(isChecking)
	};
};

