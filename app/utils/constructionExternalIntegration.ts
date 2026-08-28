/**
 * 工地（Construction）外部整合：eventType 子集與篩選預設
 * 對齊 operational-log、AlertRuleManagement 的 Construction 邊界。
 */
import { CONSTRUCTION_ALERT_RULE_SOURCE_KEYS } from "~/utils/alertUtils"
import { CONSTRUCTION_DEFAULT_SOURCES } from "~/composables/systems/useOperationalEvents"
import type { ExportEventTypeInfo, RecordExportFilterForm } from "~/utils/externalIntegration"

/** Central utilities 等；工地無對應模組 */
export const CONSTRUCTION_EXCLUDED_EXPORT_EVENT_TYPES = new Set<string>(["energy"])

/** 不含 state_change（DI/DO）、control_write、elevator、intercom */
export const CONSTRUCTION_OPERATIONAL_DEFAULT_EVENT_KINDS = "access,vehicle"

export const CONSTRUCTION_OPERATIONAL_DEFAULT_SOURCES = CONSTRUCTION_DEFAULT_SOURCES

export const CONSTRUCTION_ALERTS_DEFAULT_SOURCES = CONSTRUCTION_ALERT_RULE_SOURCE_KEYS.join(",")

export const filterExportEventTypesForConstruction = (
	types: ExportEventTypeInfo[] | null | undefined,
): ExportEventTypeInfo[] =>
	(types ?? []).filter((t) => !CONSTRUCTION_EXCLUDED_EXPORT_EVENT_TYPES.has(String(t.id)))

/** 新建／切換 eventType 時填入工地預設篩選（空白才補） */
export const applyConstructionExportFilterDefaults = (
	eventType: string,
	form: RecordExportFilterForm,
): RecordExportFilterForm => {
	if (eventType === "operational") {
		return {
			...form,
			eventKindsText: form.eventKindsText.trim() || CONSTRUCTION_OPERATIONAL_DEFAULT_EVENT_KINDS,
			sourcesText: form.sourcesText.trim() || CONSTRUCTION_OPERATIONAL_DEFAULT_SOURCES,
		}
	}
	if (eventType === "alerts") {
		return {
			...form,
			sourcesText: form.sourcesText.trim() || CONSTRUCTION_ALERTS_DEFAULT_SOURCES,
		}
	}
	return form
}
