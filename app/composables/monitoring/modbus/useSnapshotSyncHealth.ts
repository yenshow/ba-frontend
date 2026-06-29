import { computed, ref } from "vue"

export type SnapshotSyncHealthState = "HEALTHY" | "DEGRADED" | "OFFLINE"

const OFFLINE_FAILURE_THRESHOLD = 3

/** Push-First 快照同步健康度（REST / WS 成功與失敗計數） */
export const useSnapshotSyncHealth = () => {
	const failureStreak = ref(0)
	const lastSuccessAt = ref<number | null>(null)

	const state = computed<SnapshotSyncHealthState>(() => {
		if (failureStreak.value >= OFFLINE_FAILURE_THRESHOLD) return "OFFLINE"
		if (failureStreak.value > 0) return "DEGRADED"
		return "HEALTHY"
	})

	const recordSuccess = () => {
		failureStreak.value = 0
		lastSuccessAt.value = Date.now()
	}

	const recordFailure = () => {
		failureStreak.value = Math.min(failureStreak.value + 1, OFFLINE_FAILURE_THRESHOLD)
	}

	return {
		state,
		lastSuccessAt,
		recordSuccess,
		recordFailure,
	}
}
