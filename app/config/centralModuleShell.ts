import type { SystemModule } from "~/types/system"

/** Central 系統總覽／Header 分類（與 registry category 對齊） */
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

const isCentralShellCategory = (value: string): value is CentralShellCategory =>
	(CENTRAL_SHELL_CATEGORY_ORDER as readonly string[]).includes(value)

/** routePrefix → 分類內排序（顯示名稱由後端 registry／catalog SSOT） */
const CENTRAL_MODULE_SORT_IN_CATEGORY: Record<string, number> = {
	"/core/device": 1,
	"/core/personnel": 2,
	"/core/alert-log": 3,
	"/core/area-point-map": 4,
	"/access-control/people-counting": 1,
	"/access-control/vehicle-access": 2,
	"/access-control/elevator": 3,
	"/access-control/surveillance": 4,
	"/utilities/lighting": 1,
	"/utilities/hvac": 2,
	"/utilities/power": 3,
	"/utilities/drainage": 4,
	"/utilities/air-circulation": 5,
	"/security/environment": 1,
	"/security/fire": 2,
	"/security/emergency": 3,
	"/security/smoke-alarm": 4,
	"/multimedia": 1,
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

export const resolveCentralShellCategory = (
	route: string,
	module?: Pick<SystemModule, "category">
): CentralShellCategory => {
	if (module?.category && isCentralShellCategory(module.category)) {
		return module.category
	}
	return "core"
}

export const applyCentralModulePresentation = (modules: SystemModule[]): CentralShellModule[] =>
	modules.map((module) => ({
		...module,
		shellCategory: resolveCentralShellCategory(module.route, module),
		sortInCategory: CENTRAL_MODULE_SORT_IN_CATEGORY[module.route] ?? module.id,
	}))

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
