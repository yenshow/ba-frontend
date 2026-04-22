import type { SystemModule } from "~/types/system";

export const MODULE_CATEGORY_LABELS: Record<SystemModule["category"], string> = {
	core: "核心基礎",
	"construction-monitoring": "工地監控",
	infrastructure: "基礎設施",
	security: "安全相關",
	business: "業務管理",
	multimedia: "多媒體"
} as const;

export const MODULE_CATEGORY_ORDER = [
	"core",
	"construction-monitoring"
] as const satisfies readonly SystemModule["category"][];
