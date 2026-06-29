/**
 * 警報事件匯流排（Alert Event Bus）
 *
 * 唯一的 alert:new / alert:updated WS 訂閱層。
 * 消費者（Toast、alert-log 列表、badge 等）透過 onAlertNew / onAlertUpdated 註冊回呼，
 * 生命週期由 useAlertMonitor 統一管理。
 */

import type { AlertNewEvent, AlertUpdatedEvent, AlertDailyRolloverEvent } from "~/types/websocket";
import { useAccessGate } from "~/composables/core/useAccessGate";
import { PERM } from "~/config/permissionCodes";
import { useWebSocketMonitor } from "~/composables/websocket/useWebSocketMonitor";

type AlertNewHandler = (alert: AlertNewEvent) => void;
type AlertUpdatedHandler = (data: AlertUpdatedEvent) => void;
type AlertDailyRolloverHandler = (data: AlertDailyRolloverEvent) => void;

const newHandlers = new Set<AlertNewHandler>();
const updatedHandlers = new Set<AlertUpdatedHandler>();
const dailyRolloverHandlers = new Set<AlertDailyRolloverHandler>();

let isSetup = false;

/**
 * 在模組層級建立單一 WS 訂閱
 */
export const useAlertEventBus = () => {
	const { setupListeners, removeListeners } = useWebSocketMonitor();
	const { useWsModuleGate } = useAccessGate();
	const alertGate = { permissionCode: PERM.alertLog.module } as const;
	const canSubscribe = useWsModuleGate(null, alertGate);

	const setup = () => {
		if (isSetup) {
			removeListeners(["alert:new", "alert:updated", "alert:daily_rollover"])
			isSetup = false
		}

		setupListeners(
			[
			{
				event: "alert:new",
				handler: (e: AlertNewEvent) => {
					for (const fn of newHandlers) fn(e);
				},
			},
			{
				event: "alert:updated",
				handler: (e: AlertUpdatedEvent) => {
					for (const fn of updatedHandlers) fn(e);
				},
			},
			{
				event: "alert:daily_rollover",
				handler: (e: AlertDailyRolloverEvent) => {
					for (const fn of dailyRolloverHandlers) fn(e);
				},
			},
		],
			{ enabled: canSubscribe },
		);

		isSetup = true;
	};

	const teardown = () => {
		if (!isSetup) return;
		removeListeners(["alert:new", "alert:updated", "alert:daily_rollover"]);
		isSetup = false;
	};

	const onAlertNew = (handler: AlertNewHandler) => {
		newHandlers.add(handler);
	};

	const onAlertUpdated = (handler: AlertUpdatedHandler) => {
		updatedHandlers.add(handler);
	};

	const offAlertNew = (handler: AlertNewHandler) => {
		newHandlers.delete(handler);
	};

	const offAlertUpdated = (handler: AlertUpdatedHandler) => {
		updatedHandlers.delete(handler);
	};

	const onAlertDailyRollover = (handler: AlertDailyRolloverHandler) => {
		dailyRolloverHandlers.add(handler);
	};

	const offAlertDailyRollover = (handler: AlertDailyRolloverHandler) => {
		dailyRolloverHandlers.delete(handler);
	};

	const clearAll = () => {
		newHandlers.clear();
		updatedHandlers.clear();
		dailyRolloverHandlers.clear();
	};

	return {
		setup,
		teardown,
		onAlertNew,
		onAlertUpdated,
		onAlertDailyRollover,
		offAlertDailyRollover,
		offAlertNew,
		offAlertUpdated,
		clearAll,
	};
};
