import { useApiBase } from "~/composables/core/useApiBase"
import type {
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
	const { request } = useApiBase()

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

	const markAttendance = (sessionId: number, personId: number, status: "present" | "absent") =>
		request<{ session: RollCallSessionDetail }>(
			`/roll-call/sessions/${sessionId}/attendance/${personId}`,
			{ method: "PUT", body: { status } },
		)

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

	return {
		getToday,
		resetLocationStats,
		listRules,
		replaceLocationRules,
		getSession,
		markAttendance,
		getHistory,
		getReport,
	}
}
