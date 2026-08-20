import type { AlertRuleIntegrationSummary, AlertRuleIntegrations } from "~/types/alert"
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi"

type CameraLinkageResult = {
	enabled: boolean
	cameraDeviceIds: number[]
}

const FLUSH_DELAY_MS = 50

const pendingRuleIds = new Set<number>()
let flushTimer: ReturnType<typeof setTimeout> | null = null
let flushPromise: Promise<void> | null = null
let scheduledPromise: Promise<void> | null = null
let resolveScheduled: (() => void) | null = null

const normalizeRuleIds = (ruleIds: number[]): number[] =>
	[...new Set(ruleIds)]
		.map((v) => Number(v))
		.filter((n) => Number.isFinite(n) && n > 0)
		.slice(0, 1000)

const summarize = (
	integrations: AlertRuleIntegrations | null | undefined
): AlertRuleIntegrationSummary => {
	const doEnabled = Boolean(integrations?.doLinkage?.enabled)
	const cameraEnabled = Boolean(integrations?.cameraLinkage?.enabled)
	const accessDoorEnabled = Boolean(integrations?.accessDoorLinkage?.enabled)
	const sipRingEnabled = Boolean(integrations?.sipRingLinkage?.enabled)
	const elevatorCallEnabled = Boolean(integrations?.elevatorCallLinkage?.enabled)
	const emailEnabled = Boolean(integrations?.emailSubscription?.enabled)
	return {
		doEnabled,
		cameraEnabled,
		accessDoorEnabled,
		sipRingEnabled,
		elevatorCallEnabled,
		emailEnabled,
		hasAny:
			doEnabled ||
			cameraEnabled ||
			accessDoorEnabled ||
			sipRingEnabled ||
			elevatorCallEnabled ||
			emailEnabled,
	}
}

export const useAlertRuleIntegrationsStore = () => {
	const alertApi = useAlertApi()

	/**
	 * 方案 A（根本解法）：
	 * Nuxt 4 沒有 Pinia 時，使用 `useState()` 建立 SSR-safe 的全域 reactive store。
	 * 這能確保 integrations 資料更新時，列表「連動」欄位會自動刷新。
	 */
	const integrationsByRuleId = useState<Record<number, AlertRuleIntegrations | null>>(
		"alertRuleIntegrations:byRuleId",
		() => ({})
	)
	const summaryByRuleId = useState<Record<number, AlertRuleIntegrationSummary>>(
		"alertRuleIntegrations:summaryByRuleId",
		() => ({})
	)

	const flush = async () => {
		if (flushPromise) {
			await flushPromise
			return
		}

		const ids = normalizeRuleIds([...pendingRuleIds])
		pendingRuleIds.clear()
		if (ids.length === 0) return

		flushPromise = (async () => {
			try {
				const res = await alertApi.getAlertRuleIntegrationsBatch(ids)
				const nextIntegrations = { ...integrationsByRuleId.value }
				const nextSummary = { ...summaryByRuleId.value }
				for (const id of ids) {
					const v = res?.[id] ?? null
					nextIntegrations[id] = v
					nextSummary[id] = summarize(v)
				}
				integrationsByRuleId.value = nextIntegrations
				summaryByRuleId.value = nextSummary
			} catch {
				const nextIntegrations = { ...integrationsByRuleId.value }
				const nextSummary = { ...summaryByRuleId.value }
				for (const id of ids) {
					nextIntegrations[id] = null
					nextSummary[id] = summarize(null)
				}
				integrationsByRuleId.value = nextIntegrations
				summaryByRuleId.value = nextSummary
			} finally {
				flushPromise = null
			}
		})()

		await flushPromise
	}

	const queue = (ruleId: number) => {
		const id = Number(ruleId)
		if (!Number.isFinite(id) || id <= 0) return
		if (Object.prototype.hasOwnProperty.call(integrationsByRuleId.value, id)) return

		pendingRuleIds.add(id)
		if (flushTimer) return

		if (!scheduledPromise) {
			scheduledPromise = new Promise<void>((resolve) => {
				resolveScheduled = resolve
			})
		}

		flushTimer = setTimeout(() => {
			flushTimer = null
			void flush().finally(() => {
				resolveScheduled?.()
				resolveScheduled = null
				scheduledPromise = null
			})
		}, FLUSH_DELAY_MS)
	}

	const prefetch = async (ruleIds: number[]) => {
		const ids = normalizeRuleIds(ruleIds)
		for (const id of ids) queue(id)
		await (scheduledPromise ?? flush())
	}

	const getSummary = (ruleId: number): AlertRuleIntegrationSummary => {
		const id = Number(ruleId)
		const cached = summaryByRuleId.value[id]
		if (cached) return cached
		return {
			doEnabled: false,
			cameraEnabled: false,
			accessDoorEnabled: false,
			sipRingEnabled: false,
			elevatorCallEnabled: false,
			emailEnabled: false,
			hasAny: false,
		}
	}

	const getCameraLinkage = (ruleId: number): CameraLinkageResult => {
		const id = Number(ruleId)
		const integrations = integrationsByRuleId.value[id]
		const enabled = Boolean(integrations?.cameraLinkage?.enabled)
		const rawIds = integrations?.cameraLinkage?.camera_device_ids
		const idsFromArray = Array.isArray(rawIds)
			? rawIds.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0)
			: []
		const merged = [...new Set(idsFromArray)].slice(0, 4)
		return { enabled, cameraDeviceIds: merged }
	}

	const ensureCameraLinkage = async (ruleId: number): Promise<CameraLinkageResult> => {
		const id = Number(ruleId)
		if (!Object.prototype.hasOwnProperty.call(integrationsByRuleId.value, id)) {
			await prefetch([id])
		}
		return getCameraLinkage(id)
	}

	const invalidate = (ruleIds?: number[] | number) => {
		if (ruleIds == null) {
			pendingRuleIds.clear()
			integrationsByRuleId.value = {}
			summaryByRuleId.value = {}
			return
		}
		const ids = Array.isArray(ruleIds) ? ruleIds : [ruleIds]
		const normalized = normalizeRuleIds(ids)
		if (normalized.length === 0) return

		const nextIntegrations = { ...integrationsByRuleId.value }
		const nextSummary = { ...summaryByRuleId.value }
		for (const id of normalized) {
			delete nextIntegrations[id]
			delete nextSummary[id]
		}
		integrationsByRuleId.value = nextIntegrations
		summaryByRuleId.value = nextSummary
	}

	return {
		prefetch,
		getSummary,
		getCameraLinkage,
		ensureCameraLinkage,
		invalidate,
	}
}
