import { ref, onBeforeUnmount, type Ref, type ComputedRef } from "vue";

/**
 * 輪詢管理 Composable
 * 提供統一的輪詢管理邏輯，自動處理清理和暫停/恢復機制
 */
export interface UsePollingOptions {
	/** 輪詢回調函數 */
	callback: () => void | Promise<void>;
	/** 輪詢間隔（毫秒）或響應式引用 */
	interval: number | Ref<number> | ComputedRef<number>;
	/** 是否立即執行一次 */
	immediate?: boolean;
	/** 是否啟用輪詢（函數形式，支持動態判斷） */
	enabled?: () => boolean;
	/** 錯誤處理回調 */
	onError?: (err: unknown) => void;
}

/**
 * 輪詢管理 Composable
 */
export const usePolling = (options: UsePollingOptions) => {
	const { callback, interval, immediate = false, enabled, onError } = options;

	const isActive = ref(false);
	let timer: ReturnType<typeof setInterval> | null = null;

	/**
	 * 執行輪詢回調
	 */
	const executeCallback = async () => {
		// 如果提供了 enabled 函數，檢查是否應該執行
		if (enabled && !enabled()) {
			return;
		}

		try {
			await callback();
		} catch (err) {
			onError?.(err);
		}
	};

	/**
	 * 獲取當前間隔時間
	 */
	const getInterval = (): number => {
		if (typeof interval === "number") {
			return interval;
		}
		return interval.value;
	};

	/**
	 * 啟動輪詢
	 */
	const start = () => {
		if (isActive.value) {
			return; // 已經啟動
		}

		isActive.value = true;

		// 如果設置了立即執行，先執行一次
		if (immediate) {
			void executeCallback();
		}

		// 設置定時器
		const currentInterval = getInterval();
		timer = setInterval(() => {
			void executeCallback();
		}, currentInterval);
	};

	/**
	 * 停止輪詢
	 */
	const stop = () => {
		if (!isActive.value) {
			return; // 已經停止
		}

		isActive.value = false;

		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	};

	/**
	 * 重新啟動輪詢（先停止再啟動）
	 */
	const restart = () => {
		stop();
		start();
	};

	// 組件卸載時自動清理
	onBeforeUnmount(() => {
		stop();
	});

	return {
		isActive,
		start,
		stop,
		restart
	};
};

