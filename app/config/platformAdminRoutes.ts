/**
 * 僅平台管理員（role=admin）可進入的頁面。
 * 與 license.global middleware、useModuleRegistry.canAccessModule 對齊。
 *
 * 元件級（非路由）：ManualIssuePanel、useRuntimeConfigPage（/core/env）
 */
export const PLATFORM_ADMIN_ROUTES = [
	"/core/users",
	"/core/license",
	"/core/env",
] as const

export const matchesPlatformAdminRoute = (path: string): boolean =>
	PLATFORM_ADMIN_ROUTES.some((route) => path === route || path.startsWith(`${route}/`))
