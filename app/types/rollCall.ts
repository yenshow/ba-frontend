export interface RollCallRuleDraft {
	clientKey: string
	id?: number
	name: string
	windowStart: string
	windowEnd: string
	weekdays: number[]
	enabled: boolean
}

export interface RollCallLocation {
	id?: string
	sortOrder?: number
	name: string
	deviceIds?: number[]
	locationId?: number
	zoneName?: string
	/** 地點表單草稿；儲存區域時一併落庫 */
	rules?: RollCallRuleDraft[]
}

export interface RollCallZone {
	id?: string
	name: string
	sortOrder?: number
	locations: RollCallLocation[]
}

export interface RollCallRule {
	id: number
	locationId: number
	name: string
	windowStart: string
	windowEnd: string
	weekdays: number[]
	enabled: boolean
}

export interface RollCallSessionSummary {
	id: number | null
	ruleId: number
	ruleName: string
	windowStart: string
	windowEnd: string
	status: "open" | "closed" | "not_started"
	sessionDate: string
	expectedCount: number
	presentCount: number
	absentCount: number
}

/** 對齊人流 PeopleCountingUnit（currentCount／totalCount） */
export interface RollCallUnitSummary {
	id: number
	name: string
	currentCount: number
	totalCount: number
}

export interface RollCallTodayLocation {
	locationId: number
	name: string
	zoneName: string
	deviceIds: number[]
	sessions: RollCallSessionSummary[]
	/** 主場次單位格（對齊人流 units） */
	units?: RollCallUnitSummary[]
}

export interface RollCallAttendanceRow {
	personId: number
	employeeNo: string
	fullName: string
	groupId: number
	groupName: string
	status: "pending" | "present" | "absent"
	source: "face" | "manual" | null
	checkedInAt: string | null
	/** 與人流單位人員名單 photoUrl 同語意（persons.face_url） */
	photoUrl?: string | null
}

export interface RollCallSessionDetail {
	id: number
	ruleId: number
	ruleName: string
	locationId: number
	locationName: string
	zoneName: string
	sessionDate: string
	windowStart: string
	windowEnd: string
	status: string
	canMark: boolean
	expectedCount: number
	presentCount: number
	absentCount: number
	attendance: RollCallAttendanceRow[]
}

export interface RollCallHistoryItem {
	id: number
	sessionDate: string
	status: string
	ruleName: string
	locationName: string
	zoneName: string
	expectedCount: number
	presentCount: number
	absentCount: number
}

export const ROLL_CALL_WEEKDAY_OPTIONS = [
	{ value: 1, label: "一" },
	{ value: 2, label: "二" },
	{ value: 3, label: "三" },
	{ value: 4, label: "四" },
	{ value: 5, label: "五" },
	{ value: 6, label: "六" },
	{ value: 7, label: "日" },
] as const

export const createRollCallRuleDraft = (
	partial?: Partial<RollCallRuleDraft>,
): RollCallRuleDraft => ({
	clientKey: partial?.clientKey || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	id: partial?.id,
	name: partial?.name ?? "",
	windowStart: partial?.windowStart ?? "21:00",
	windowEnd: partial?.windowEnd ?? "22:30",
	weekdays: partial?.weekdays ? [...partial.weekdays] : [1, 2, 3, 4, 5],
	enabled: partial?.enabled !== false,
})

export const ruleToDraft = (rule: RollCallRule): RollCallRuleDraft =>
	createRollCallRuleDraft({
		clientKey: `rule-${rule.id}`,
		id: rule.id,
		name: rule.name,
		windowStart: rule.windowStart,
		windowEnd: rule.windowEnd,
		weekdays: [...rule.weekdays],
		enabled: rule.enabled,
	})
