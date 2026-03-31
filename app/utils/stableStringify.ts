type JsonLike =
	| null
	| boolean
	| number
	| string
	| JsonLike[]
	| { [key: string]: JsonLike }

const isPlainObject = (v: unknown): v is Record<string, unknown> => {
	if (!v || typeof v !== "object") return false
	const proto = Object.getPrototypeOf(v)
	return proto === Object.prototype || proto === null
}

/**
 * 穩定序列化（key 依字典序排序），用於「變更偵測」而非資料傳輸。
 * - 會移除 object 中值為 undefined 的 key（避免 JSON.stringify 行為差異）
 * - 會避免循環參考爆炸（遇到循環以 "[Circular]" 表示）
 */
export const stableStringify = (input: unknown): string => {
	const seen = new WeakSet<object>()

	const normalize = (v: unknown): JsonLike => {
		if (v === null) return null
		const t = typeof v
		if (t === "string") return v
		if (t === "number") return Number.isFinite(v) ? v : String(v)
		if (t === "boolean") return v
		if (t === "undefined") return null
		if (t === "bigint") return String(v)
		if (t === "symbol") return String(v)
		if (t === "function") return "[Function]"

		if (v instanceof Date) return v.toISOString()
		if (v instanceof RegExp) return String(v)

		if (Array.isArray(v)) return v.map((x) => normalize(x))

		if (typeof v === "object") {
			const obj = v as object
			if (seen.has(obj)) return "[Circular]"
			seen.add(obj)

			if (!isPlainObject(v)) {
				// 非 plain object：轉為可列舉 key 的 plain object
				const out: Record<string, JsonLike> = {}
				for (const key of Object.keys(v as Record<string, unknown>).sort()) {
					const value = (v as Record<string, unknown>)[key]
					if (value === undefined) continue
					out[key] = normalize(value)
				}
				return out
			}

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

