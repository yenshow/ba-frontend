/**
 * Modbus 點位轉換公式（與後端 `utils/modbusTransform.js`、設備型號感測器同語意）
 * 前端僅需：hydrate 表單、寫入反解 raw
 */

type PointScaleTransform = {
	transform?: string
	scale?: number
}

const normalizeTransform = (transform: string | null | undefined): string | null => {
	if (transform == null) return null
	const t = String(transform).trim()
	if (!t) return null
	if (/^[+\-*/]/.test(t)) {
		return t.startsWith("-") ? `value - ${t.substring(1).trim()}` : `value ${t}`
	}
	if (/^-?\d+(\.\d+)?$/.test(t)) {
		return `value - ${t}`
	}
	return t.replace(/value/gi, "value")
}

/** 舊 scale 且無 transform → `value * scale` */
const resolveFormulaFromDef = (def: PointScaleTransform | null | undefined): string | null => {
	if (!def) return null
	const fromTransform = normalizeTransform(def.transform)
	if (fromTransform) return fromTransform
	const scale = def.scale != null ? Number(def.scale) : NaN
	if (Number.isFinite(scale) && scale !== 0 && scale !== 1) {
		return `value * ${scale}`
	}
	return null
}

/** 反解 `value *|/|+|- N`；無法反解回 null；無公式則 round(display) */
const invertFormulaToRaw = (
	displayValue: number,
	formula: string | null | undefined
): number | null => {
	const display = Number(displayValue)
	if (!Number.isFinite(display)) return null
	const normalized = normalizeTransform(formula)
	if (!normalized) return Math.round(display)

	const m = /^\s*value\s*([*/+\-])\s*(-?\d+(?:\.\d+)?)\s*$/i.exec(normalized)
	if (!m) return null

	const op = m[1]
	const n = Number(m[2])
	if (!Number.isFinite(n)) return null

	let raw: number
	switch (op) {
		case "*":
			if (n === 0) return null
			raw = display / n
			break
		case "/":
			if (n === 0) return null
			raw = display * n
			break
		case "+":
			raw = display - n
			break
		case "-":
			raw = display + n
			break
		default:
			return null
	}
	if (!Number.isFinite(raw)) return null
	return Math.round(raw)
}

export const invertDefToRaw = (
	displayValue: number,
	def: PointScaleTransform | null | undefined
): number | null => {
	const formula = resolveFormulaFromDef(def)
	if (!formula) return Math.round(Number(displayValue))
	return invertFormulaToRaw(displayValue, formula)
}

/** 表單 hydrate：保留使用者輸入的 transform；舊 scale → `value * N` */
export const hydrateTransformDisplay = (def: PointScaleTransform | null | undefined): string => {
	if (!def) return ""
	const t = def.transform != null ? String(def.transform).trim() : ""
	if (t) return t
	return resolveFormulaFromDef({ scale: def.scale }) ?? ""
}
