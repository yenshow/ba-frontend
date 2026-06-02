import { computed, ref } from "vue"

export type PollingHealthState = "HEALTHY" | "DEGRADED" | "OFFLINE"

const BASE_INTERVAL_MS = 5000
const BACKOFF_STEPS_MS = [5000, 10000, 20000, 40000, 60000] as const
const OFFLINE_LEVEL_INDEX = 3

const normalizeErrorMessage = (error: unknown): string => {
	if (typeof error === "string") return error
	if (error instanceof Error) return error.message
	return String(error ?? "")
}

export const isSuppressibleModbusError = (error: unknown): boolean => {
	const message = normalizeErrorMessage(error).toLowerCase()
	return (
		message.includes("503") ||
		message.includes("service unavailable") ||
		message.includes("timeout") ||
		message.includes("超時") ||
		message.includes("network") ||
		message.includes("err_network") ||
		message.includes("failed to fetch") ||
		message.includes("connection refused") ||
		message.includes("econnrefused") ||
		message.includes("設備離線") ||
		message.includes("連接")
	)
}

export const useModbusPollingPolicy = () => {
	const failureLevel = ref(0)
	const pollIntervalMs = ref(BASE_INTERVAL_MS)
	const lastSuccessAt = ref<number | null>(null)
	const lastFailureAt = ref<number | null>(null)

	const state = computed<PollingHealthState>(() => {
		if (failureLevel.value >= OFFLINE_LEVEL_INDEX) return "OFFLINE"
		if (failureLevel.value > 0) return "DEGRADED"
		return "HEALTHY"
	})

	const recordSuccess = () => {
		failureLevel.value = 0
		pollIntervalMs.value = BASE_INTERVAL_MS
		lastSuccessAt.value = Date.now()
	}

	const recordFailure = () => {
		const next = Math.min(failureLevel.value + 1, BACKOFF_STEPS_MS.length - 1)
		failureLevel.value = next
		pollIntervalMs.value = BACKOFF_STEPS_MS[next] ?? BASE_INTERVAL_MS
		lastFailureAt.value = Date.now()
	}

	return {
		state,
		failureLevel,
		pollIntervalMs,
		lastSuccessAt,
		lastFailureAt,
		recordSuccess,
		recordFailure,
	}
}
