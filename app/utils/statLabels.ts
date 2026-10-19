/** 地點統計顯示名稱（與後端 entryExit/statLabels.js 對齊） */

export const STAT_LABEL_MAX_LEN = 6

export type EntryExitStatLabels = {
	entry: string
	exit: string
	current: string
}

export type RollCallStatLabels = {
	expected: string
	present: string
	absent: string
}

export const DEFAULT_PEOPLE_COUNTING_STAT_LABELS: EntryExitStatLabels = Object.freeze({
	entry: "進場人數",
	exit: "出場人數",
	current: "在場人數",
})

export const DEFAULT_VEHICLE_ACCESS_STAT_LABELS: EntryExitStatLabels = Object.freeze({
	entry: "進場車輛",
	exit: "出場車輛",
	current: "在場車輛",
})

export const DEFAULT_ROLL_CALL_STAT_LABELS: RollCallStatLabels = Object.freeze({
	expected: "應到人數",
	present: "實到人數",
	absent: "未到人數",
})

const ENTRY_EXIT_KEYS = ["entry", "exit", "current"] as const
const ROLL_CALL_KEYS = ["expected", "present", "absent"] as const

const trimLabel = (raw: unknown): string => {
	if (raw == null) return ""
	return String(raw).trim()
}

const clipLabel = (raw: unknown): string =>
	trimLabel(raw).slice(0, STAT_LABEL_MAX_LEN)

const asRecord = (raw: unknown): Record<string, unknown> =>
	raw && typeof raw === "object" && !Array.isArray(raw)
		? (raw as Record<string, unknown>)
		: {}

const normalizeKeyed = <K extends string>(
	raw: unknown,
	keys: readonly K[],
	defaults: Record<K, string>,
): Record<K, string> => {
	const src = asRecord(raw)
	const out = { ...defaults }
	for (const key of keys) {
		const custom = clipLabel(src[key])
		out[key] = custom || defaults[key]
	}
	return out
}

const draftKeyed = <K extends string>(
	raw: unknown,
	keys: readonly K[],
): Record<K, string> => {
	const src = asRecord(raw)
	const out = {} as Record<K, string>
	for (const key of keys) {
		out[key] = clipLabel(src[key])
	}
	return out
}

const toStoredKeyed = <K extends string>(
	raw: unknown,
	keys: readonly K[],
): Partial<Record<K, string>> | undefined => {
	const draft = draftKeyed(raw, keys)
	const out: Partial<Record<K, string>> = {}
	let any = false
	for (const key of keys) {
		const v = draft[key]
		if (!v) continue
		out[key] = v
		any = true
	}
	return any ? out : undefined
}

const resolveShared = <K extends string>(
	list: Array<Record<K, string>>,
	defaults: Record<K, string>,
	keys: readonly K[],
): Record<K, string> => {
	if (!list.length) return { ...defaults }
	const first = list[0]!
	for (let i = 1; i < list.length; i += 1) {
		const cur = list[i]!
		for (const key of keys) {
			if (first[key] !== cur[key]) return { ...defaults }
		}
	}
	return { ...first }
}

export const normalizePeopleCountingStatLabels = (
	raw?: unknown,
): EntryExitStatLabels =>
	normalizeKeyed(raw, ENTRY_EXIT_KEYS, { ...DEFAULT_PEOPLE_COUNTING_STAT_LABELS })

export const normalizeVehicleAccessStatLabels = (
	raw?: unknown,
): EntryExitStatLabels =>
	normalizeKeyed(raw, ENTRY_EXIT_KEYS, { ...DEFAULT_VEHICLE_ACCESS_STAT_LABELS })

export const normalizeRollCallStatLabels = (raw?: unknown): RollCallStatLabels =>
	normalizeKeyed(raw, ROLL_CALL_KEYS, { ...DEFAULT_ROLL_CALL_STAT_LABELS })

/** 表單草稿：保留使用者輸入（可空）；超長截斷 */
export const draftEntryExitStatLabels = (raw?: unknown): EntryExitStatLabels =>
	draftKeyed(raw, ENTRY_EXIT_KEYS)

export const draftRollCallStatLabels = (raw?: unknown): RollCallStatLabels =>
	draftKeyed(raw, ROLL_CALL_KEYS)

/** 寫入 API：全空則 undefined */
export const toStoredEntryExitStatLabels = (
	raw?: unknown,
): EntryExitStatLabels | undefined => {
	const stored = toStoredKeyed(raw, ENTRY_EXIT_KEYS)
	return stored as EntryExitStatLabels | undefined
}

export const toStoredRollCallStatLabels = (
	raw?: unknown,
): RollCallStatLabels | undefined => {
	const stored = toStoredKeyed(raw, ROLL_CALL_KEYS)
	return stored as RollCallStatLabels | undefined
}

/** adapter 用：有自訂才帶 `statLabels` */
export const withStoredStatLabels = <T extends object>(
	stored: T | undefined,
): { statLabels: T } | Record<string, never> =>
	stored ? { statLabels: stored } : {}

export const resolveSharedEntryExitStatLabels = (
	list: EntryExitStatLabels[],
	defaults: EntryExitStatLabels,
): EntryExitStatLabels => resolveShared(list, defaults, ENTRY_EXIT_KEYS)

export const resolveSharedRollCallStatLabels = (
	list: RollCallStatLabels[],
): RollCallStatLabels =>
	resolveShared(list, DEFAULT_ROLL_CALL_STAT_LABELS, ROLL_CALL_KEYS)

/** 是否有自訂某鍵（未填則視為未自訂） */
export const hasCustomStatLabel = (raw: unknown, key: string): boolean =>
	clipLabel(asRecord(raw)[key]) !== ""
