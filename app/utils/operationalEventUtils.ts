import {
	getSourceLabel,
	getAlertSourceFilterLabel,
} from "~/utils/alertUtils"
import { SYSTEM_TYPE_LABELS } from "~/types/location"

/** 營運事件來源篩選（基礎設施對齊警示紀錄命名；另含進出／連動） */
export const OPERATIONAL_SOURCE_FILTER_KEYS = [
	"environment",
	"lighting",
	"hvac",
	"drainage",
	"power",
	"air_circulation",
	"fire",
	"smoke_alarm",
	"emergency_rescue",
	"people_counting",
	"vehicle_access",
	"elevator",
	"alert_linkage",
] as const

const EXTRA_SOURCE_LABELS: Record<string, string> = {
	people_counting: SYSTEM_TYPE_LABELS.people_counting,
	vehicle_access: SYSTEM_TYPE_LABELS.vehicle_access,
	elevator: SYSTEM_TYPE_LABELS.elevator,
	alert_linkage: "警報連動",
}

export const getOperationalSourceLabel = (source: string): string =>
	EXTRA_SOURCE_LABELS[source] ?? getSourceLabel(source)

export const getOperationalSourceFilterLabel = (source: string): string => {
	if (Object.prototype.hasOwnProperty.call(EXTRA_SOURCE_LABELS, source)) {
		return EXTRA_SOURCE_LABELS[source]
	}
	return getAlertSourceFilterLabel(source)
}

export const buildOperationalSourceFilterOptions = () => [
	{ value: "", label: "全部系統" },
	...OPERATIONAL_SOURCE_FILTER_KEYS.map((value) => ({
		value,
		label: getOperationalSourceFilterLabel(value),
	})),
]

export const OPERATIONAL_KIND_OPTIONS = [
	{ value: "", label: "全部類型" },
	{ value: "control_write", label: "控制寫入" },
	{ value: "state_change", label: "狀態變化" },
	{ value: "linkage_write", label: "警報連動寫入" },
	{ value: "access", label: "門禁／人流" },
	{ value: "vehicle", label: "車輛進出" },
	{ value: "elevator", label: "電梯管理" },
] as const

const KIND_LABEL_MAP = Object.fromEntries(
	OPERATIONAL_KIND_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]),
)

export const getOperationalKindLabel = (kind: string): string =>
	KIND_LABEL_MAP[kind] || kind
