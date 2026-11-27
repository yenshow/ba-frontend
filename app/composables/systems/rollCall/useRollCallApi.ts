import { useApiBase } from "~/composables/core/useApiBase"
import type {
	RollCallAssignment,
	RollCallHistoryItem,
	RollCallReportAttendanceRow,
	RollCallReportSession,
	RollCallRule,
	RollCallRuleDraft,
	RollCallAttendanceRow,
	RollCallSessionDetail,
	RollCallTodayLocation,
} from "~/types/rollCall"

const draftToPayload = (draft: RollCallRuleDraft) => ({
	...(draft.id != null ? { id: draft.id } : {}),
	name: draft.name,
	windowStart: draft.windowStart,
	windowEnd: draft.windowEnd,
	enabled: draft.enabled,
})

export const useRollCallApi = () => {
	const { request, requestBlob } = useApiBase()

	const getToday = () =>
		request<{ date: string; locations: RollCallTodayLocation[] }>("/roll-call/today")

	const resetLocationStats = (locationId: number) =>
		request<{ resetSessionCount: number; statsResetAt: string }>(
			`/roll-call/locations/${locationId}/reset`,
			{ method: "POST" },
		)

	const listRules = (locationId?: number) => {
		const query = locationId ? `?locationId=${locationId}` : ""
		return request<{ rules: RollCallRule[] }>(`/roll-call/rules${query}`)
	}

	const replaceLocationRules = (locationId: number, rules: RollCallRuleDraft[]) =>
		request<{ rules: RollCallRule[] }>(`/roll-call/locations/${locationId}/rules`, {
			method: "PUT",
			body: { rules: rules.map(draftToPayload) },
		})

	const getSession = (id: number) =>
		request<{ session: RollCallSessionDetail }>(`/roll-call/sessions/${id}`)

	const getExpectedRoster = (
		locationId: number,
		params: { ruleId: number; date: string },
	) => {
		const q = new URLSearchParams({
			ruleId: String(params.ruleId),
			date: params.date,
		})
		return request<{
			locationId: number
			ruleId: number
			sessionDate: string
			rosterActive: boolean
			expectedCount: number
			attendance: RollCallAttendanceRow[]
		}>(`/roll-call/locations/${locationId}/expected-roster?${q.toString()}`)
	}

	const getHistory = (limit = 50, offset = 0) =>
		request<{
			total: number
			limit: number
			offset: number
			sessions: RollCallHistoryItem[]
		}>(`/roll-call/history?limit=${limit}&offset=${offset}`)

	const getReport = (params: { startDate: string; endDate: string; locationId?: number }) => {
		const q = new URLSearchParams({
			startDate: params.startDate,
			endDate: params.endDate,
		})
		if (params.locationId != null && Number.isFinite(params.locationId)) {
			q.set("locationId", String(params.locationId))
		}
		return request<{
			startDate: string
			endDate: string
			sessions: RollCallReportSession[]
			attendance: RollCallReportAttendanceRow[]
		}>(`/roll-call/report?${q.toString()}`)
	}

	/** 人數多時 list／replace／Excel 可能超過預設 5s */
	const ASSIGNMENT_REQUEST_TIMEOUT_MS = 120_000

	const listAssignments = (locationId: number, startDate: string, endDate: string) => {
		const q = new URLSearchParams({ startDate, endDate })
		return request<{ assignments: RollCallAssignment[] }>(
			`/roll-call/locations/${locationId}/assignments?${q.toString()}`,
			{ timeout: ASSIGNMENT_REQUEST_TIMEOUT_MS },
		)
	}

	const replaceAssignments = (
		locationId: number,
		body: {
			startDate: string
			endDate: string
			assignments: Array<{ personId: number; assignmentDate: string; ruleId: number }>
		},
	) =>
		request<{ assignments: RollCallAssignment[] }>(
			`/roll-call/locations/${locationId}/assignments`,
			{ method: "PUT", body, timeout: ASSIGNMENT_REQUEST_TIMEOUT_MS },
		)

	const downloadAssignmentTemplate = (locationId: number) =>
		requestBlob(`/roll-call/locations/${locationId}/assignments/import-template`, {
			timeout: ASSIGNMENT_REQUEST_TIMEOUT_MS,
		})

	const importAssignments = (locationId: number, form: FormData) =>
		request<{
			weeks: Array<{ startDate: string; endDate: string; count: number }>
			assignments: RollCallAssignment[]
		}>(`/roll-call/locations/${locationId}/assignments/import`, {
			method: "POST",
			body: form,
			timeout: 120000,
		})

	return {
		getToday,
		resetLocationStats,
		listRules,
		replaceLocationRules,
		getSession,
		getExpectedRoster,
		getHistory,
		getReport,
		listAssignments,
		replaceAssignments,
		downloadAssignmentTemplate,
		importAssignments,
	}
}
