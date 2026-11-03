import { useApiBase } from "~/composables/core/useApiBase"
import type {
	RollCallAssignment,
	RollCallHistoryItem,
	RollCallReportAttendanceRow,
	RollCallReportSession,
	RollCallRule,
	RollCallRuleDraft,
	RollCallSessionDetail,
	RollCallTodayLocation,
} from "~/types/rollCall"

const draftToPayload = (draft: RollCallRuleDraft) => ({
	...(draft.id != null ? { id: draft.id } : {}),
	name: draft.name,
	windowStart: draft.windowStart,
	windowEnd: draft.windowEnd,
	weekdays: draft.weekdays,
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

	const setAttendanceLeave = (sessionId: number, personId: number, onLeave: boolean) =>
		request<{ session: RollCallSessionDetail }>(
			`/roll-call/sessions/${sessionId}/attendance/${personId}/leave`,
			{ method: "POST", body: { onLeave } },
		)

	const listAssignments = (locationId: number, startDate: string, endDate: string) => {
		const q = new URLSearchParams({ startDate, endDate })
		return request<{ assignments: RollCallAssignment[] }>(
			`/roll-call/locations/${locationId}/assignments?${q.toString()}`,
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
			{ method: "PUT", body },
		)

	const downloadAssignmentTemplate = (locationId: number, weekStart?: string) => {
		const q = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : ""
		return requestBlob(
			`/roll-call/locations/${locationId}/assignments/import-template${q}`,
		)
	}

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
		setAttendanceLeave,
		getHistory,
		getReport,
		listAssignments,
		replaceAssignments,
		downloadAssignmentTemplate,
		importAssignments,
	}
}
