export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	duration: number; // 0 = 持久顯示（不自動移除），> 0 = 自動消失時間（毫秒）
	count?: number; // 疊加數量
	alertId?: number; // 警報 ID（用於警報 Toast 的去重和更新）
}

export const useToast = () => {
	const toasts = useState<Toast[]>("toasts", () => []);

	// Toast 去重機制：記錄最近顯示的 Toast 訊息和時間
	const recentToasts = new Map<string, number>(); // message -> timestamp

	/**
	 * 查找現有的 Toast（統一去重邏輯）
	 */
	const findExistingToast = (
		alertId?: number,
		message?: string,
		type?: ToastType
	): Toast | undefined => {
		if (alertId !== undefined) {
			// 警報 Toast：使用 alertId 匹配
			return toasts.value.find(t => t.alertId === alertId);
		}
		// 普通 Toast：使用 message + type 匹配（僅檢查非持久顯示的）
		return toasts.value.find(t => t.message === message && t.type === type && t.duration > 0);
	};

	const showToast = (
		type: ToastType,
		message: string,
		duration = 3000,
		options?: { count?: number; alertId?: number }
	) => {
		const { count, alertId } = options || {};

		// 統一去重邏輯
		const existingToast = findExistingToast(alertId, message, type);
		if (existingToast) {
			// 更新現有 Toast 的內容
			existingToast.message = message;
			existingToast.type = type;
			existingToast.count = count !== undefined ? count : (existingToast.count || 1) + 1;
			return existingToast.id;
		}

		// 非持久顯示的普通 Toast：檢查是否在 5 秒內顯示過相同訊息
		if (duration > 0 && !alertId) {
			const now = Date.now();
			const lastShown = recentToasts.get(message);
			if (lastShown && now - lastShown < 5000) {
				return; // 5 秒內不重複顯示
			}
			recentToasts.set(message, now);

			// 清理過期記錄（只在記錄過多時清理）
			if (recentToasts.size > 100) {
				const oneMinuteAgo = now - 60000;
				for (const [msg, timestamp] of recentToasts.entries()) {
					if (timestamp < oneMinuteAgo) {
						recentToasts.delete(msg);
					}
				}
			}
		}

		const id = Date.now().toString() + Math.random().toString(36).slice(2, 11);
		const toast: Toast = {
			id,
			type,
			message,
			duration, // 0 = 持久顯示，> 0 = 自動消失時間
			count: count || (duration === 0 ? 1 : undefined),
			alertId
		};

		toasts.value.push(toast);

		// 自動移除（只有非持久顯示的 Toast）
		if (duration > 0) {
			setTimeout(() => {
				removeToast(id);
			}, duration);
		}

		return id;
	};

	const removeToast = (id: string) => {
		const index = toasts.value.findIndex(t => t.id === id);
		if (index > -1) {
			toasts.value.splice(index, 1);
		}
	};

	/**
	 * 更新 Toast 的疊加數量
	 */
	const updateToastCount = (id: string, count: number | undefined) => {
		const index = toasts.value.findIndex(t => t.id === id);
		if (index > -1) {
			toasts.value[index].count = count;
		}
	};

	/**
	 * 更新 Toast 的內容（訊息、類型、數量等）
	 * @param id - Toast ID
	 * @param updates - 要更新的內容
	 */
	const updateToast = (
		id: string,
		updates: { message?: string; type?: ToastType; count?: number }
	) => {
		const index = toasts.value.findIndex(t => t.id === id);
		if (index > -1) {
			Object.assign(toasts.value[index], updates);
		}
	};

	const success = (
		message: string,
		duration?: number,
		options?: { count?: number; alertId?: number }
	) => showToast("success", message, duration, options);
	const error = (
		message: string,
		duration?: number,
		options?: { count?: number; alertId?: number }
	) => showToast("error", message, duration, options);
	const warning = (
		message: string,
		duration?: number,
		options?: { count?: number; alertId?: number }
	) => showToast("warning", message, duration, options);
	const info = (
		message: string,
		duration?: number,
		options?: { count?: number; alertId?: number }
	) => showToast("info", message, duration, options);

	return {
		toasts: readonly(toasts),
		showToast,
		removeToast,
		updateToastCount,
		updateToast,
		success,
		error,
		warning,
		info
	};
};
