import type { SystemModule } from "~/types/system"

export const MODULE_CATEGORY_LABELS: Record<SystemModule["category"], string> = {
	core: "核心基礎",
	"construction-monitoring": "工地監控",
	infrastructure: "基礎設施",
	security: "安全相關",
	business: "業務管理",
	multimedia: "多媒體",
} as const

export const MODULE_CATEGORY_ORDER = [
	"core",
	"construction-monitoring",
	"infrastructure",
	"security",
	"business",
	"multimedia",
] as const satisfies readonly SystemModule["category"][]

/** 導覽分類標題色（底線、更多功能分類標籤、System Title 強調色） */
export const MODULE_CATEGORY_ACCENT_HEX: Record<SystemModule["category"], string> = {
	core: "#005064",
	"construction-monitoring": "#0096DC",
	infrastructure: "#4BC8C8",
	security: "#962328",
	business: "#00D296",
	multimedia: "#640082",
} as const
