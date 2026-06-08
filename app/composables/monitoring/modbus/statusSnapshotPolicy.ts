import type { Ref } from "vue"
import type { ModbusStatusPointDef } from "~/types/location"
import {
	resolveManualBitRuleSemanticRawPatch,
	type ManualIssueRuleTriggerPayload,
	type ManualSemanticAlertSource,
} from "~/utils/alertUtils"

/** Modbus 快照 GET 逾時：各 `use*Api` 的 `getStatus` / `getZoneStatus` 固定 `timeout: 30_000`（高於 useApiBase 預設 5s） */

const findLocationBySystemIdInZones = <L extends { systemId?: string | number | undefined }>(
	zones: Array<{ locations?: L[] }>,
	systemId: string
): L | null => {
	const sid = String(systemId)
	for (const z of zones) {
		for (const loc of z.locations || []) {
			if (String(loc.systemId ?? "") === sid) return loc
		}
	}
	return null
}

/** loadStatusSnapshot：force＝手動後強制重抓（略過 race 合併） */
export type StatusSnapshotFetchOptions = {
	force?: boolean
}

export function patchOptimisticUiStatusBySystemId<
	T extends { systemId: string | number; uiStatus: unknown },
>(items: Ref<T[]>, systemId: string, uiStatus: T["uiStatus"]) {
	const sid = String(systemId)
	items.value = items.value.map((it) => (String(it.systemId) === sid ? { ...it, uiStatus } : it))
}

export function patchOptimisticRawBySystemId<
	T extends { systemId: string | number; raw?: Record<string, unknown> | null | undefined },
>(items: Ref<T[]>, systemId: string, raw: NonNullable<T["raw"]>) {
	const sid = String(systemId)
	items.value = items.value.map((it) =>
		String(it.systemId) === sid ? { ...it, raw: { ...(it.raw || {}), ...(raw || {}) } } : it
	)
}

/** 手動 rule 警報：頂層 alarm + runningAlarm，並依 zones/status_points 對齊語意 raw（排水／消防／電力共用） */
export function patchOptimisticManualAlarmForZones<
	T extends {
		systemId: string | number
		uiStatus: unknown
		raw?: Record<string, unknown> | null | undefined
	},
>(
	items: Ref<T[]>,
	zones: Array<{
		locations?: Array<{
			systemId?: string | number
			equipmentKind?: string
			statusPoints?: Record<string, ModbusStatusPointDef | undefined>
		}>
	}>,
	systemId: string,
	alertSource: ManualSemanticAlertSource,
	rule?: ManualIssueRuleTriggerPayload
) {
	patchOptimisticUiStatusBySystemId(items, systemId, "alarm" as T["uiStatus"])
	const loc = findLocationBySystemIdInZones(zones, systemId)
	const semantic = resolveManualBitRuleSemanticRawPatch({
		alertSource,
		equipmentKind: loc?.equipmentKind,
		statusPoints: loc?.statusPoints,
		rule,
	})
	const raw = { runningAlarm: true, ...(semantic ?? {}) } as Record<string, boolean>
	patchOptimisticRawBySystemId(items, systemId, raw as NonNullable<T["raw"]>)
}
