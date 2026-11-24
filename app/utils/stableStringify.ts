type JsonLike =
	| null
	| boolean
	| number
	| string
	| JsonLike[]
	| { [key: string]: JsonLike }

/**
 * 穩定序列化（key 依字典序排序），用於「變更偵測」而非資料傳輸。
 * - 會移除 object 中值為 undefined 的 key（避免 JSON.stringify 行為差異）
 * - 會避免循環參考爆炸（遇到循環以 "[Circular]" 表示）
 */
export const stableStringify = (input: unknown): string => {
	const seen = new WeakSet<object>()

	const normalize = (v: unknown): JsonLike => {
		if (v === null) return null
		if (typeof v === "string" || typeof v === "boolean") return v
		if (typeof v === "number") return Number.isFinite(v) ? v : String(v)
		if (v === undefined) return null
		if (typeof v === "function") return "[Function]"

		if (v instanceof Date) return v.toISOString()
		if (v instanceof RegExp) return String(v)

		if (Array.isArray(v)) {
			if (seen.has(v)) return "[Circular]"
			seen.add(v)
			const values = v.map(normalize)
			seen.delete(v)
			return values
		}

		if (typeof v === "object") {
			const obj = v as object
			if (seen.has(obj)) return "[Circular]"
			seen.add(obj)

			const record = v as Record<string, unknown>
			const out: Record<string, JsonLike> = {}
			for (const key of Object.keys(record).sort()) {
				const value = record[key]
				if (value === undefined) continue
				out[key] = normalize(value)
			}
			return out
		}

		return String(v)
	}

	return JSON.stringify(normalize(input))
}

export const stableEqual = (a: unknown, b: unknown): boolean => stableStringify(a) === stableStringify(b)

