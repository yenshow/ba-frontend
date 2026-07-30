/**
 * 警報輪詢邏輯：增量查詢（後備排程由 useWsFallbackPolling 負責）
 */

import type { Alert, AlertFilters } from "~/types/alert";
import { logger } from "~/utils/logger";
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";

const pollingLogger = logger.createLogger("AlertPolling");

export const useAlertPolling = () => {
	const alertApi = useAlertApi();
	const { handleError } = useErrorHandler();

	const lastCheckTime = ref<Date | null>(null);
	const isChecking = ref(false);

	const checkNewAlerts = async (
		shouldProcessAlert: (alert: Alert) => boolean,
		onAlertFound: (alert: Alert) => void,
		onStillActiveIds: (activeIds: Set<number>) => void
	) => {
		if (isChecking.value) {
			return;
		}

		isChecking.value = true;

		try {
			const filters: AlertFilters = {
				status: "active",
				limit: 50,
				offset: 0,
				orderBy: "updated_at",
				order: "desc"
			};

			if (lastCheckTime.value) {
				filters.updated_after = lastCheckTime.value.toISOString();
			}

			const result = await alertApi.getAlerts(filters);
			const currentActiveAlertIds = new Set<number>();

			for (const alert of result.alerts) {
				if (!shouldProcessAlert(alert)) {
					continue;
				}

				currentActiveAlertIds.add(alert.id);
				onAlertFound(alert);
			}

			onStillActiveIds(currentActiveAlertIds);
			lastCheckTime.value = new Date();
		} catch (error) {
			handleError(error, "檢查新警示失敗");
			pollingLogger.warn("檢查新警示失敗", { error });
		} finally {
			isChecking.value = false;
		}
	};

	const reset = () => {
		lastCheckTime.value = null;
	};

	return {
		isChecking: readonly(isChecking),
		lastCheckTime: readonly(lastCheckTime),
		checkNewAlerts,
		reset
	};
};
