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
