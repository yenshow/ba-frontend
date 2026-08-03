import type { AlertSource, AlertType, AlertSeverity } from "~/types/alert"
import type { ModbusStatusPointDef, SystemType } from "~/types/location"
import { SYSTEM_TYPE_LABELS } from "~/types/location"
import type { AlertRule } from "~/types/alert"
import { getParameterDisplayName } from "~/utils/sensorUtils"

/** 與環境／照明監控一致：透明度脈動頻率（對應 tailwind.css `.blink-slow` / `.blink-fast`、地圖點 `.alert-dot-flash-*`） */
export type AlertFlashMode = "none" | "slow" | "fast"

/** 監控 UI 常用健康狀態（Modbus／地點狀態列舉） */
export type UiHealthStatus = "normal" | "warning" | "error"

/**
 * 健康狀態 → 閃爍節奏
 * @param whenAbsent 未帶 `status` 時：`fast` ＝監控卡片視為需強調；`none` ＝不閃（例如平面圖點位尚未寫入狀態）
 */
export const healthStatusToAlertFlash = (
	status: UiHealthStatus | undefined | null,
	options?: { whenAbsent?: "none" | "fast" }
): AlertFlashMode => {
	const absent = options?.whenAbsent ?? "fast"
	if (status === "normal") return "none"
	if (status === "warning") return "slow"
	if (status === "error") return "fast"
	return absent === "fast" ? "fast" : "none"
}

/** 警報嚴重度（後端 Alert）→ 閃爍節奏，供環境／設備列表等複用 */
export const alertSeverityToAlertFlash = (
	severity: AlertSeverity | undefined | null
): AlertFlashMode => {
	if (severity === "warning") return "slow"
	if (severity === "error" || severity === "critical") return "fast"
	return "none"
}

/**
 * 平面圖點位（category-dot／location-dot）專用 class；需父層在 `.map-location-dots` 內
 */
export const alertFlashModeToMapDotClass = (mode: AlertFlashMode): string => {
	if (mode === "slow") return "alert-dot-flash-slow"
	if (mode === "fast") return "alert-dot-flash-fast"
	return ""
}

/** 警報來源顯示名稱（Central；Modbus 子系統對齊 SYSTEM_TYPE_LABELS） */
export const ALERT_SOURCE_LABELS: Record<string, string> = {
	device: "設備",
	environment: "環境品質",
	lighting: SYSTEM_TYPE_LABELS.lighting,
	hvac: SYSTEM_TYPE_LABELS.hvac,
	drainage: SYSTEM_TYPE_LABELS.drainage,
	air_circulation: SYSTEM_TYPE_LABELS.air_circulation,
	power: SYSTEM_TYPE_LABELS.power,
	energy: "能源管理",
	fire: SYSTEM_TYPE_LABELS.fire,
	smoke_alarm: SYSTEM_TYPE_LABELS.smoke_alarm,
	emergency_rescue: SYSTEM_TYPE_LABELS.emergency_rescue,
}

export const getSourceLabel = (source: AlertSource | string): string =>
	ALERT_SOURCE_LABELS[source] ?? String(source)

const ALERT_SOURCE_FILTER_SUFFIX_KEYS = new Set([
	"device",
	"environment",
	"air_circulation",
	"power",
	"energy",
	"fire",
	"smoke_alarm",
	"emergency_rescue",
])

export const getAlertSourceFilterLabel = (source: string): string => {
	const base = getSourceLabel(source)
	return ALERT_SOURCE_FILTER_SUFFIX_KEYS.has(source) ? `${base}系統` : base
}

export const buildAlertSourceFilterOptions = (sources: readonly string[]) => [
	{ value: "", label: "全部系統" },
	...sources.map((value) => ({
		value,
		label: getAlertSourceFilterLabel(value),
	})),
]

export const ALERT_LOG_SOURCE_FILTER_KEYS = [
	"device",
	"environment",
	"drainage",
	"air_circulation",
	"power",
	"energy",
	"fire",
	"smoke_alarm",
	"emergency_rescue",
] as const

export const ALERT_RULE_SOURCE_FILTER_KEYS = [
	"device",
	"environment",
	"lighting",
	"drainage",
	"power",
	"hvac",
	"air_circulation",
	"fire",
	"smoke_alarm",
	"emergency_rescue",
] as const

/**
 * 取得類型標籤
 */
export const getTypeLabel = (type: AlertType | string): string => {
	const labels: Record<string, string> = {
		offline: "離線",
		error: "錯誤",
		threshold: "閾值",
		di: "DI",
		do: "DO",
	}
	return labels[type] || type
}

/**
 * 取得嚴重程度標籤（Central 統一用語：異常／警報，與規則表單「狀態」一致）
 * API 仍為 `warning` / `critical` / `error`；`error` 與 `critical` 同列為「警報」層級。
 */
export const getSeverityLabel = (severity: AlertSeverity | string): string => {
	const labels: Record<string, string> = {
		warning: "異常",
		error: "錯誤",
		critical: "警報",
	}
	return labels[severity] || severity
}

/**
 * 取得嚴重程度徽章樣式類名
 */
export const getSeverityBadgeClass = (severity: AlertSeverity | string): string => {
	const classes: Record<string, string> = {
		warning: "bg-yellow-500/80 text-white",
		error: "bg-orange-500/80 text-white",
		critical: "bg-red-500/80 text-white",
	}
	return classes[severity] || "bg-gray-500/80 text-white"
}

/**
 * 取得類型徽章樣式類名
 */
export const getTypeBadgeClass = (type: AlertType | string): string => {
	const classes: Record<string, string> = {
		offline: "bg-gray-500/80 text-white",
		error: "bg-red-500/80 text-white",
		threshold: "bg-purple-500/80 text-white",
		di: "bg-emerald-500/80 text-white",
		do: "bg-sky-500/80 text-white",
	}
	return classes[type] || "bg-gray-500/80 text-white"
}

/** 是否已解決（僅依 status；後端無 resolved_at/resolved_by） */
export const isAlertResolved = (alert: { status?: string }): boolean => alert.status === "resolved"

/** 是否已忽視 */
export const isAlertIgnored = (alert: { status?: string }): boolean => alert.status === "ignored"

/** 後端 evaluateThreshold 允許的 operator（不支援 = / ==） */
export const ALLOWED_THRESHOLD_OPERATORS = [">", ">=", "<", "<="] as const

export const isAllowedThresholdOperator = (operator: string | undefined | null): boolean => {
	const op = String(operator ?? "").trim()
	return (ALLOWED_THRESHOLD_OPERATORS as readonly string[]).includes(op)
}

/**
 * 與後端 getThresholdOperatorDisplayLabel 一致：訊息／列表顯示「超過」「低於」
 */
export const getThresholdOperatorDisplayLabel = (operator: string | undefined | null): string => {
	const op = String(operator ?? "").trim()
	if (op === ">" || op === ">=") return "超過"
	if (op === "<" || op === "<=") return "低於"
	return ""
}

/** 與後端 getParameterDisplayName 對齊（警報條件列表用） */
export const getAlertParameterDisplayName = (parameter: string | undefined | null): string => {
	const code = String(parameter ?? "").trim()
	if (!code) return "-"
	return getParameterDisplayName(code)
}

/** 列表欄位用：與 canonical 訊息本體一致（不含來源／區域前綴，該欄由「目標」呈現） */
export type AlertRuleConditionDisplayInput = {
	alert_type?: string
	condition_type?: string
	condition_config?: Record<string, unknown> | null
}

export const formatAlertRuleConditionDisplay = (rule: AlertRuleConditionDisplayInput): string => {
	const config = (rule.condition_config || {}) as Record<string, unknown>
	const ct = rule.condition_type

	if (ct === "threshold") {
		const parameter = getAlertParameterDisplayName(String(config.parameter || ""))
		const opLabel = getThresholdOperatorDisplayLabel(String(config.operator || ""))
		const value = String(config.value ?? "-")
		const unit = String(config.unit || "").trim()
		const opPart = opLabel || String(config.operator || "").trim() || "-"
		const line = `${parameter} ${opPart} ${value}${unit ? ` ${unit}` : ""}`
		return line.replace(/\s+/g, " ").trim()
	}

	if (ct === "error_count") {
		const raw = config.min_errors
		const n = raw != null && raw !== "" ? Number(raw) : 5
		const count = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 5
		return `連續 ${count} 次無法連接`
	}

	if (ct === "bit_state") {
		const bitKey = String(config.bit_key ?? "")
		const match = bitKey.match(/^(di|do):(\d+)$/i)
		const addr = match?.[2] ?? (bitKey.replace(/^(di|do):/i, "").trim() || "?")
		const isDo = rule.alert_type === "do" || String(match?.[1] ?? "").toLowerCase() === "do"
		return `${isDo ? "DO" : "DI"} 位址 ${addr} 觸發`
	}

	return "-"
}

const SOURCE_SYSTEM_TYPE_MAP: Partial<Record<AlertSource, SystemType>> = {
	environment: "environment",
	drainage: "drainage",
	fire: "fire",
	smoke_alarm: "smoke_alarm",
	emergency_rescue: "emergency_rescue",
	air_circulation: "air_circulation",
	power: "power",
}

export const alertSourceToSystemType = (source: AlertSource): SystemType | null =>
	SOURCE_SYSTEM_TYPE_MAP[source] ?? null

/** 手動警報 rule 模式：與 ManualIssuePanel 送出給後端的 bit_state 一致 */
export type ManualIssueRuleTriggerPayload = {
	alert_type: "di" | "do"
	bit_key: string
}

/** 手動警報面板：操作完成後回報給父層，供 optimistic UI / 強制刷新快照 */
export type ManualIssueChangedPayload = {
	systemId: string
	action: "trigger" | "clear"
	/** rule 模式時帶上，供前端依 status_points 與後端語意對齊（避免僅頂層 alarm、細項慢一拍） */
	rule?: ManualIssueRuleTriggerPayload
}

const normalizePointRegisterTypeForManualRule = (pointDef: ModbusStatusPointDef): string => {
	// 相容舊資料：部分來源可能仍使用 `type: "DI" | "DO"`（非 ModbusStatusPointDef 的 SSOT 介面）
	const legacyType =
		pointDef && typeof pointDef === "object" && "type" in pointDef
			? (pointDef as { type?: unknown }).type
			: undefined
	let registerType = String(pointDef?.registerType || legacyType || "")
		.toLowerCase()
		.trim()
	if (registerType === "di") registerType = "discrete"
	if (registerType === "do") registerType = "coil"
	return registerType
}

/** DI/DO bit_key → status_points 語意鍵（對齊後端 matchBitStateRuleToStatusPointKey） */
const matchManualBitRuleToStatusPointSemanticKey = (
	alertType: "di" | "do",
	bitKey: string,
	statusPoints: Record<string, ModbusStatusPointDef | undefined>,
	candidateKeys: string[]
): string | null => {
	const bk = String(bitKey || "")
		.trim()
		.toLowerCase()
	const m = bk.match(/^(di|do|discrete|coil):(\d+)$/)
	if (!m) return null
	const prefix = m[1].toLowerCase()
	const addr = Number(m[2])
	if (!Number.isFinite(addr)) return null

	let expectedRt: string | null = null
	if (prefix === "di" || prefix === "discrete") expectedRt = "discrete"
	else if (prefix === "do" || prefix === "coil") expectedRt = "coil"
	else return null

	const at = String(alertType || "")
		.trim()
		.toLowerCase()
	if (at === "di" && expectedRt !== "discrete") return null
	if (at === "do" && expectedRt !== "coil") return null

	for (const key of candidateKeys) {
		const def = statusPoints[key]
		if (!def || typeof def !== "object") continue
		const rt = normalizePointRegisterTypeForManualRule(def)
		if (rt !== expectedRt) continue
		const a = Number(def.address)
		if (!Number.isFinite(a) || a !== addr) continue
		return key
	}
	return null
}

export type ManualSemanticAlertSource = "drainage" | "fire" | "power"

/**
 * 手動觸發當下可 OR 進快照 raw 的語意旗標（與 mergeRuleSemantics 鍵名一致）
 */
export const resolveManualBitRuleSemanticRawPatch = (params: {
	alertSource: ManualSemanticAlertSource
	equipmentKind?: string
	statusPoints?: Record<string, ModbusStatusPointDef | undefined> | null
	rule?: ManualIssueRuleTriggerPayload
}): Record<string, true> | null => {
	const { alertSource, equipmentKind, statusPoints, rule } = params
	if (!rule) return null
	const sp = statusPoints || {}
	const ek = String(equipmentKind || "")
		.trim()
		.toLowerCase()

	let allowed: string[]
	if (alertSource === "drainage" || alertSource === "fire") {
		allowed = ek === "tank" ? ["coverAlarm", "highLevel", "lowLevel"] : ["running"]
	} else {
		allowed = ek === "oil_level" || ek === "ats" ? ["running"] : ["fault", "highOil", "lowOil"]
	}

	const configured = allowed.filter((k) => sp[k] != null && typeof sp[k] === "object")
	if (configured.length === 0) return null

	const key = matchManualBitRuleToStatusPointSemanticKey(
		rule.alert_type,
		rule.bit_key,
		sp,
		configured
	)
	if (!key) return null
	return { [key]: true }
}

/** 各監控頁 zones/locations 最小結構（供對齊規則 target） */
export type ManualIssueZoneLike = {
	id?: string
	locations?: Array<{ id?: string; systemId?: string | number | undefined }>
}

export type ManualIssueScope = {
	systemId: number
	locationId: number
	zoneId: number
}

/** 與後端 systemAlertHelper.ruleAppliesToScope 對齊（含 system target） */
export const ruleAppliesToManualIssueScope = (
	rule: AlertRule,
	scope: ManualIssueScope
): boolean => {
	const t = String(rule.target_type ?? "")
		.trim()
		.toLowerCase()
	const tid = rule.target_id != null ? Number(rule.target_id) : null
	if (!t) return true
	if (!Number.isFinite(tid)) return false
	if (t === "location") {
		return Number.isFinite(scope.locationId) && scope.locationId === tid
	}
	if (t === "zone") {
		return Number.isFinite(scope.zoneId) && scope.zoneId === tid
	}
	if (t === "system") {
		return Number.isFinite(scope.systemId) && scope.systemId === tid
	}
	return true
}

export type ManualIssueRuleBitOption = {
	ruleId: number
	alert_type: "di" | "do"
	bit_key: string
	label: string
}

export const normalizeDiDoBitKeyFromRule = (rule: AlertRule): string | null => {
	const raw = rule.condition_config?.bit_key
	const bk = typeof raw === "string" ? raw.trim().toLowerCase() : ""
	if (!/^(di|do|discrete|coil):\d+$/.test(bk)) return null
	return bk
}

const bitKeySortKey = (bk: string): number => {
	const m = bk.match(/:(\d+)$/)
	return m ? Number(m[1]) : 0
}

/**
 * 依目前區域／地點樹狀資料，算出每個 location_system id 可用的 DI/DO bit_state 規則選項。
 */
export const buildManualIssueRuleBitOptionsBySystemId = (
	rules: AlertRule[],
	zones: ManualIssueZoneLike[]
): Record<string, ManualIssueRuleBitOption[]> => {
	const diDoRules = rules.filter(
		(r) =>
			(r.enabled ?? true) &&
			(r.alert_type === "di" || r.alert_type === "do") &&
			r.condition_type === "bit_state"
	)

	const out: Record<string, ManualIssueRuleBitOption[]> = {}

	for (const zone of zones || []) {
		const zoneId = Number(zone.id)
		const zoneIdOk = Number.isFinite(zoneId)
		for (const loc of zone.locations || []) {
			const sidRaw = loc.systemId
			if (sidRaw === undefined || sidRaw === null || sidRaw === "") continue
			const systemId = Number(sidRaw)
			if (!Number.isFinite(systemId)) continue

			const lid = Number(loc.id)
			const scope: ManualIssueScope = {
				systemId,
				locationId: Number.isFinite(lid) ? lid : Number.NaN,
				zoneId: zoneIdOk ? zoneId : Number.NaN,
			}

			const opts: ManualIssueRuleBitOption[] = []
			for (const rule of diDoRules) {
				const bk = normalizeDiDoBitKeyFromRule(rule)
				if (!bk) continue
				if (!ruleAppliesToManualIssueScope(rule, scope)) continue
				const name =
					typeof rule.name === "string" && rule.name.trim().length > 0 ? rule.name.trim() : ""
				const label = name || bk
				opts.push({
					ruleId: rule.id,
					alert_type: rule.alert_type as "di" | "do",
					bit_key: bk,
					label,
				})
			}

			opts.sort((a, b) => {
				const da = bitKeySortKey(a.bit_key)
				const db = bitKeySortKey(b.bit_key)
				if (da !== db) return da - db
				return a.ruleId - b.ruleId
			})

			if (opts.length > 0) {
				out[String(systemId)] = opts
			}
		}
	}

	return out
}
