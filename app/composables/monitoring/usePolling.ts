import { ref, getCurrentInstance, onBeforeUnmount, watch, type Ref, type ComputedRef } from "vue";

/**
 * 輪詢管理 Composable
 * 提供統一的輪詢管理邏輯，自動處理清理和暫停/恢復機制
 */
export interface UsePollingOptions {
	/** 輪詢回調函數 */
	callback: () => void | Promise<void>;
	/** 輪詢間隔（毫秒）或響應式引用（執行中變更會重排下一 tick） */
	interval: number | Ref<number> | ComputedRef<number>;
	/** 是否立即執行一次 */
	immediate?: boolean;
	/** 是否啟用輪詢（函數形式，支持動態判斷） */
	enabled?: () => boolean;
	/** 錯誤處理回調 */
	onError?: (err: unknown) => void;
}

/**
 * 輪詢管理 Composable（遞迴 setTimeout，支援動態 interval）
 */
export const usePolling = (options: UsePollingOptions) => {
	const { callback, interval, immediate = false, enabled, onError } = options;

	const isActive = ref(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	const instance = getCurrentInstance();

	const getInterval = (): number => {
		const raw = typeof interval === "number" ? interval : interval.value;
		return Math.max(0, Number(raw) || 0);
	};

	const clearTimer = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	};

	const executeCallback = async () => {
		if (enabled && !enabled()) {
			return;
		}

		try {
			await callback();
		} catch (err) {
			onError?.(err);
		}
	};

	const scheduleNext = () => {
		clearTimer();
		if (!isActive.value) return;

		timer = setTimeout(async () => {
			await executeCallback();
			scheduleNext();
		}, getInterval());
	};

	const start = () => {
		if (isActive.value) {
			return;
		}

		isActive.value = true;

		if (immediate) {
			void executeCallback().finally(() => scheduleNext());
			return;
		}

		scheduleNext();
	};

	const stop = () => {
		if (!isActive.value) {
			return;
		}

		isActive.value = false;
		clearTimer();
	};

	const restart = () => {
		stop();
		start();
	};

	if (typeof interval !== "number" && instance) {
		watch(interval, () => {
			if (isActive.value) {
				scheduleNext();
			}
		});
	}

	if (instance) {
		onBeforeUnmount(() => {
			stop();
		});
	}

	return {
		isActive,
		start,
		stop,
		restart,
	};
};
