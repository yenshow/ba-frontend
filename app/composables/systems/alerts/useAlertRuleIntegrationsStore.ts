import type { AlertRuleIntegrationSummary, AlertRuleIntegrations } from "~/types/alert";
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi";

type CameraLinkageResult = {
	enabled: boolean;
	cameraDeviceIds: number[];
};

const FLUSH_DELAY_MS = 50;

const integrationsByRuleId = new Map<number, AlertRuleIntegrations | null>();
const summaryByRuleId = new Map<number, AlertRuleIntegrationSummary>();

const pendingRuleIds = new Set<number>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushPromise: Promise<void> | null = null;
let scheduledPromise: Promise<void> | null = null;
let resolveScheduled: (() => void) | null = null;

const normalizeRuleIds = (ruleIds: number[]): number[] =>
	[...new Set(ruleIds)]
		.map(v => Number(v))
		.filter(n => Number.isFinite(n) && n > 0)
		.slice(0, 1000);

const summarize = (
	integrations: AlertRuleIntegrations | null | undefined
): AlertRuleIntegrationSummary => {
	const cameraEnabled = Boolean(integrations?.cameraLinkage?.enabled);
	const emailEnabled = Boolean(integrations?.emailSubscription?.enabled);
	return {
		cameraEnabled,
		emailEnabled,
		hasAny: cameraEnabled || emailEnabled
	};
};

const setCacheForRule = (ruleId: number, integrations: AlertRuleIntegrations | null) => {
	integrationsByRuleId.set(ruleId, integrations);
	summaryByRuleId.set(ruleId, summarize(integrations));
};

export const useAlertRuleIntegrationsStore = () => {
	const alertApi = useAlertApi();

	const flush = async () => {
		if (flushPromise) {
			await flushPromise;
			return;
		}

		const ids = normalizeRuleIds([...pendingRuleIds]);
		pendingRuleIds.clear();
		if (ids.length === 0) return;

		flushPromise = (async () => {
			try {
				const res = await alertApi.getAlertRuleIntegrationsBatch(ids);
				for (const id of ids) {
					setCacheForRule(id, res?.[id] ?? null);
				}
			} catch {
				for (const id of ids) {
					setCacheForRule(id, null);
				}
			} finally {
				flushPromise = null;
			}
		})();

		await flushPromise;
	};

	const queue = (ruleId: number) => {
		const id = Number(ruleId);
		if (!Number.isFinite(id) || id <= 0) return;
		if (integrationsByRuleId.has(id)) return;

		pendingRuleIds.add(id);
		if (flushTimer) return;

		if (!scheduledPromise) {
			scheduledPromise = new Promise<void>(resolve => {
				resolveScheduled = resolve;
			});
		}

		flushTimer = setTimeout(() => {
			flushTimer = null;
			void flush().finally(() => {
				resolveScheduled?.();
				resolveScheduled = null;
				scheduledPromise = null;
			});
		}, FLUSH_DELAY_MS);
	};

	const prefetch = async (ruleIds: number[]) => {
		const ids = normalizeRuleIds(ruleIds);
		for (const id of ids) queue(id);
		await (scheduledPromise ?? flush());
	};

	const getSummary = (ruleId: number): AlertRuleIntegrationSummary => {
		const id = Number(ruleId);
		const cached = summaryByRuleId.get(id);
		if (cached) return cached;
		return { cameraEnabled: false, emailEnabled: false, hasAny: false };
	};

	const getCameraLinkage = (ruleId: number): CameraLinkageResult => {
		const id = Number(ruleId);
		const integrations = integrationsByRuleId.get(id);
		const enabled = Boolean(integrations?.cameraLinkage?.enabled);
		const rawIds = integrations?.cameraLinkage?.camera_device_ids;
		const idsFromArray = Array.isArray(rawIds)
			? rawIds.map(v => Number(v)).filter(n => Number.isFinite(n) && n > 0)
			: [];
		const merged = [...new Set(idsFromArray)].slice(0, 4);
		return { enabled, cameraDeviceIds: merged };
	};

	const ensureCameraLinkage = async (ruleId: number): Promise<CameraLinkageResult> => {
		const id = Number(ruleId);
		if (!integrationsByRuleId.has(id)) {
			await prefetch([id]);
		}
		return getCameraLinkage(id);
	};

	const invalidate = (ruleIds?: number[] | number) => {
		if (ruleIds == null) {
			integrationsByRuleId.clear();
			summaryByRuleId.clear();
			pendingRuleIds.clear();
			return;
		}
		const ids = Array.isArray(ruleIds) ? ruleIds : [ruleIds];
		for (const id of normalizeRuleIds(ids)) {
			integrationsByRuleId.delete(id);
			summaryByRuleId.delete(id);
		}
	};

	return {
		prefetch,
		getSummary,
		getCameraLinkage,
		ensureCameraLinkage,
		invalidate
	};
};
