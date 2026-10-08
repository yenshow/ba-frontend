/**
 * 人流／門禁主畫面排版（與後端 system_config.dashboard_layout 一致）
 */

export const PEOPLE_COUNTING_DASHBOARD_LAYOUT = {
	EVENTS_GROUPS: "events_groups",
	GROUP_CARDS: "group_cards",
} as const

export type PeopleCountingDashboardLayout =
	(typeof PEOPLE_COUNTING_DASHBOARD_LAYOUT)[keyof typeof PEOPLE_COUNTING_DASHBOARD_LAYOUT]

export const PEOPLE_COUNTING_DASHBOARD_LAYOUT_LABELS: Record<
	PeopleCountingDashboardLayout,
	string
> = {
	events_groups: "事件 + 人員群組",
	group_cards: "群組 + 人員卡片",
}

export const normalizeDashboardLayout = (
	raw: unknown
): PeopleCountingDashboardLayout => {
	if (String(raw ?? "").trim() === PEOPLE_COUNTING_DASHBOARD_LAYOUT.GROUP_CARDS) {
		return PEOPLE_COUNTING_DASHBOARD_LAYOUT.GROUP_CARDS
	}
	return PEOPLE_COUNTING_DASHBOARD_LAYOUT.EVENTS_GROUPS
}

/** 門禁／YSCP／攝影機人臉可選人員卡片；攝影機分區人流僅事件＋群組 */
export const supportsGroupCardsDashboardLayout = (opts: {
	dataSource?: string | null
	cameraMode?: string | null
}): boolean => {
	const source = String(opts.dataSource ?? "").trim()
	if (source === "yscp" || source === "access_control") return true
	if (source === "isapi_camera") {
		return String(opts.cameraMode ?? "").trim() === "face_recognition"
	}
	return false
}

/** 執行期實際排版：不支援時強制回落事件＋群組 */
export const resolveDashboardLayout = (opts: {
	dashboardLayout?: unknown
	dataSource?: string | null
	cameraMode?: string | null
}): PeopleCountingDashboardLayout => {
	const normalized = normalizeDashboardLayout(opts.dashboardLayout)
	if (
		normalized === PEOPLE_COUNTING_DASHBOARD_LAYOUT.GROUP_CARDS &&
		!supportsGroupCardsDashboardLayout(opts)
	) {
		return PEOPLE_COUNTING_DASHBOARD_LAYOUT.EVENTS_GROUPS
	}
	return normalized
}
