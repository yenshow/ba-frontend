export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	duration?: number;
	count?: number; // 疊加數量
	persistent?: boolean; // 是否持久顯示（不自動移除）
}

export const useToast = () => {
	const toasts = useState<Toast[]>("toasts", () => []);

	// Toast 去重機制：記錄最近顯示的 Toast 訊息和時間
	const recentToasts = new Map<string, number>(); // message -> timestamp

	const showToast = (type: ToastType, message: string, duration = 3000, options?: { count?: number; persistent?: boolean }) => {
		const { count, persistent = false } = options || {};
		const now = Date.now();

		// 持久顯示的 Toast：檢查是否已存在相同的 Toast，如果存在則更新疊加數量
		if (persistent) {
			const existingToast = toasts.value.find(
				t => t.message === message && t.type === type && t.persistent
			);

			if (existingToast) {
				existingToast.count = count !== undefined ? count : (existingToast.count || 1) + 1;
				return existingToast.id;
			}
		} else {
			// 非持久顯示的 Toast：檢查是否在 5 秒內顯示過相同訊息
			const lastShown = recentToasts.get(message);
			if (lastShown && now - lastShown < 5000) {
				return; // 5 秒內不重複顯示
			}

			// 記錄此次顯示時間
			recentToasts.set(message, now);

			// 清理過期記錄（只在記錄過多時清理，保留最近 1 分鐘）
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
			duration: persistent ? 0 : duration, // 持久顯示的 Toast 不自動移除
			count: count || (persistent ? 1 : undefined),
			persistent
		};

		toasts.value.push(toast);

		// 自動移除（只有非持久顯示的 Toast）
		if (!persistent && duration > 0) {
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

	const success = (message: string, duration?: number, options?: { count?: number; persistent?: boolean }) => 
		showToast("success", message, duration, options);
	const error = (message: string, duration?: number, options?: { count?: number; persistent?: boolean }) => 
		showToast("error", message, duration, options);
	const warning = (message: string, duration?: number, options?: { count?: number; persistent?: boolean }) => 
		showToast("warning", message, duration, options);
	const info = (message: string, duration?: number, options?: { count?: number; persistent?: boolean }) => 
		showToast("info", message, duration, options);

	return {
		toasts: readonly(toasts),
		showToast,
		removeToast,
		updateToastCount,
		success,
		error,
		warning,
		info
	};
};
