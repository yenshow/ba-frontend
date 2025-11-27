export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	duration?: number;
}

export const useToast = () => {
	const toasts = useState<Toast[]>("toasts", () => []);

	const showToast = (type: ToastType, message: string, duration = 3000) => {
		const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
		const toast: Toast = {
			id,
			type,
			message,
			duration
		};

		toasts.value.push(toast);

		// 自動移除
		if (duration > 0) {
			setTimeout(() => {
				removeToast(id);
			}, duration);
		}

		return id;
	};

	const removeToast = (id: string) => {
		const index = toasts.value.findIndex((t) => t.id === id);
		if (index > -1) {
			toasts.value.splice(index, 1);
		}
	};

	const success = (message: string, duration?: number) => showToast("success", message, duration);
	const error = (message: string, duration?: number) => showToast("error", message, duration);
	const warning = (message: string, duration?: number) => showToast("warning", message, duration);
	const info = (message: string, duration?: number) => showToast("info", message, duration);

	return {
		toasts: readonly(toasts),
		showToast,
		removeToast,
		success,
		error,
		warning,
		info
	};
};
