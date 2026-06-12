import type { SystemModule } from "~/types/system"

/** Central 系統總覽／Header 專用分類（與後端 registry category 解耦） */
export type CentralShellCategory =
	| "core"
	| "access-control"
	| "utilities"
	| "security"
	| "business"
	| "multimedia"

export type CentralShellModule = SystemModule & {
	shellCategory: CentralShellCategory
	sortInCategory: number
}

type ModulePresentation = {
	shellCategory: CentralShellCategory
	sortInCategory: number
}

/** routePrefix → Central 展示分類、分類內排序（顯示名稱由後端 registry／catalog SSOT） */
const CENTRAL_MODULE_PRESENTATION: Record<string, ModulePresentation> = {
	"/core/device": { shellCategory: "core", sortInCategory: 1 },
	"/core/personnel": { shellCategory: "core", sortInCategory: 2 },
	"/core/alert-log": { shellCategory: "core", sortInCategory: 3 },
	"/core/area-point-map": { shellCategory: "core", sortInCategory: 4 },
	"/construction-monitoring/people-counting": {
		shellCategory: "access-control",
		sortInCategory: 1,
	},
	"/construction-monitoring/vehicle-access": {
		shellCategory: "access-control",
		sortInCategory: 2,
	},
	"/infrastructure/elevator": {
		shellCategory: "access-control",
		sortInCategory: 3,
	},
	"/construction-monitoring/surveillance": {
		shellCategory: "access-control",
		sortInCategory: 4,
	},
	"/infrastructure/lighting": { shellCategory: "utilities", sortInCategory: 1 },
	"/infrastructure/hvac": { shellCategory: "utilities", sortInCategory: 2 },
	"/infrastructure/power": { shellCategory: "utilities", sortInCategory: 3 },
	"/infrastructure/drainage": {
		shellCategory: "utilities",
		sortInCategory: 4,
	},
	"/infrastructure/air-circulation": { shellCategory: "utilities", sortInCategory: 5 },
	"/construction-monitoring/environment": { shellCategory: "security", sortInCategory: 1 },
	"/security/fire": { shellCategory: "security", sortInCategory: 2 },
	"/security/emergency": { shellCategory: "security", sortInCategory: 3 },
	"/security/smoke-alarm": { shellCategory: "security", sortInCategory: 4 },
	"/multimedia": { shellCategory: "multimedia", sortInCategory: 1 },
}

const BACKEND_CATEGORY_FALLBACK: Record<SystemModule["category"], CentralShellCategory> = {
	core: "core",
	"construction-monitoring": "access-control",
	infrastructure: "utilities",
	security: "security",
	business: "business",
	multimedia: "multimedia",
}

export const CENTRAL_SHELL_CATEGORY_ORDER = [
	"core",
	"access-control",
	"utilities",
	"security",
	"business",
	"multimedia",
] as const satisfies readonly CentralShellCategory[]

export const CENTRAL_SHELL_CATEGORY_LABELS: Record<CentralShellCategory, string> = {
	core: "核心基礎",
	"access-control": "門禁管制",
	utilities: "水電設施",
	security: "安全相關",
	business: "業務管理",
	multimedia: "多媒體",
}

export const CENTRAL_SHELL_CATEGORY_ACCENT_HEX: Record<CentralShellCategory, string> = {
	core: "#005064",
	"access-control": "#0096DC",
	utilities: "#4BC8C8",
	security: "#962328",
	business: "#00D296",
	multimedia: "#640082",
}

export const applyCentralModulePresentation = (modules: SystemModule[]): CentralShellModule[] =>
	modules.map((module) => {
		const preset = CENTRAL_MODULE_PRESENTATION[module.route]
		const shellCategory = preset?.shellCategory ?? BACKEND_CATEGORY_FALLBACK[module.category]
		return {
			...module,
			shellCategory,
			sortInCategory: preset?.sortInCategory ?? module.id,
		}
	})

export const resolveCentralShellCategory = (
	route: string,
	module?: Pick<SystemModule, "category">
): CentralShellCategory => {
	const preset = CENTRAL_MODULE_PRESENTATION[route]
	if (preset) return preset.shellCategory
	if (module) return BACKEND_CATEGORY_FALLBACK[module.category]
	return "core"
}

export const groupCentralShellModules = (modules: CentralShellModule[]) =>
	CENTRAL_SHELL_CATEGORY_ORDER.map((category) => ({
		category,
		label: CENTRAL_SHELL_CATEGORY_LABELS[category],
		modules: modules
			.filter((m) => m.shellCategory === category)
			.sort((a, b) => a.sortInCategory - b.sortInCategory),
	})).filter((group) => group.modules.length > 0)

/** 首頁／系統總覽不顯示的預留模組（registry 有登記但尚無頁面） */
export const CENTRAL_PLACEHOLDER_MODULE_ROUTES = [
	"/security/access-control",
	"/business/visitor",
	"/business/locker-management",
] as const

export const isCentralPlaceholderRoute = (route: string) =>
	CENTRAL_PLACEHOLDER_MODULE_ROUTES.some(
		(skip) => route === skip || route.startsWith(`${skip}/`)
	)

export const getCentralShellModules = (modules: SystemModule[]): CentralShellModule[] =>
	applyCentralModulePresentation(
		modules.filter((module) => module.route && !isCentralPlaceholderRoute(module.route))
	)

export const getCentralDefaultHomeModuleOrder = (modules: CentralShellModule[]): string[] =>
	groupCentralShellModules(modules).flatMap((group) => group.modules.map((m) => m.route))

export const reconcileModuleRouteOrder = (
	savedOrder: readonly string[],
	availableRoutes: readonly string[]
): string[] => {
	const available = new Set(availableRoutes)
	const kept = savedOrder.filter((route) => available.has(route))
	const keptSet = new Set(kept)
	const appended = availableRoutes.filter((route) => !keptSet.has(route))
	return [...kept, ...appended]
}

export const sortModulesByRouteOrder = <T extends { route: string }>(
	modules: T[],
	order: readonly string[]
): T[] => {
	const index = new Map(order.map((route, i) => [route, i]))
	return [...modules].sort((a, b) => {
		const ai = index.get(a.route) ?? Number.MAX_SAFE_INTEGER
		const bi = index.get(b.route) ?? Number.MAX_SAFE_INTEGER
		if (ai !== bi) return ai - bi
		return a.route.localeCompare(b.route)
	})
}
