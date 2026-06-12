import type { SystemModule } from "~/types/system"

export type SystemSettingsItemKind = "route" | "theme" | "logout"

export type SystemSettingsMenuItem = {
	id: string
	label: string
	kind: SystemSettingsItemKind
	route?: string
	section: "personal" | "platform" | "appearance" | "session"
}

export const SYSTEM_SETTINGS_SECTION_LABELS: Record<
	Exclude<SystemSettingsMenuItem["section"], "session">,
	string
> = {
	personal: "個人",
	platform: "平台管理",
	appearance: "外觀",
}

/** 系統設定選單 route 項目的 SVG path */
export const SYSTEM_SETTINGS_ROUTE_ICON_D: Record<string, string> = {
	account: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
	users:
		"M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
	license:
		"M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
	env: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
}

const SETTINGS_SECTION_ORDER: SystemSettingsMenuItem["section"][] = [
	"personal",
	"platform",
	"appearance",
	"session",
]

export const toSystemSettingsSections = (items: SystemSettingsMenuItem[]) =>
	SETTINGS_SECTION_ORDER.map((section) => ({
		section,
		items: items.filter((i) => i.section === section),
	})).filter((g) => g.items.length > 0)
