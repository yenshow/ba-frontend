import { onBeforeUnmount, ref } from "vue"

type VisibilitySnapshotSyncOptions = {
	start: () => void
	stop: () => void
	onVisible: () => void | Promise<void>
}

/**
 * 統一處理：啟停快照 WS 訂閱 + visibilitychange（分頁回前景時補拉一次 REST）。
 *
 * 使用方式：
 * - 在完成初始載入後呼叫 `start()`（避免重複打 API）
 * - 不需要手動 add/remove visibility listener；unmount 會自動清理
 */
export const useVisibilitySnapshotSync = (options: VisibilitySnapshotSyncOptions) => {
	const { start, stop, onVisible } = options
	const isStarted = ref(false)

	const handleVisibilityChange = () => {
		if (typeof document === "undefined") return
		if (document.visibilityState !== "visible") return
		void onVisible()
	}

	const startAll = () => {
		if (isStarted.value) return
		isStarted.value = true
		start()
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange)
		}
	}

	const stopAll = () => {
		if (!isStarted.value) return
		isStarted.value = false
		stop()
		if (typeof document !== "undefined") {
			document.removeEventListener("visibilitychange", handleVisibilityChange)
		}
	}

	onBeforeUnmount(() => {
		stopAll()
	})

	return {
		isStarted,
		start: startAll,
		stop: stopAll,
	}
}
