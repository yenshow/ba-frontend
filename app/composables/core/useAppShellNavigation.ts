import { useAuth, useAdminOnly } from "~/composables/core/useAuth"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import { canAccessAccountPage } from "~/composables/systems/users/useAccountSettings"
import type { SystemModule } from "~/types/system"
import type { User } from "~/types/user"
import { type SystemSettingsMenuItem, toSystemSettingsSections } from "~/utils/appShellNavigationUtils"

const OVERVIEW_CATEGORY = "core" as const satisfies SystemModule["category"]

const OVERVIEW_SKIP_ROUTES = ["/core/alert-log", "/core/area-point-map"] as const

const matchesSkippedRoute = (route: string, skipRoutes: readonly string[]) =>
	skipRoutes.some((r) => route === r || route.startsWith(`${r}/`))

const filterOverviewModules = (modules: SystemModule[]) =>
	modules.filter((m) => m.route && !matchesSkippedRoute(m.route, OVERVIEW_SKIP_ROUTES))

const buildSystemSettingsItems = (
	user: Pick<User, "username"> | null | undefined,
	canAdmin: boolean
): SystemSettingsMenuItem[] => {
	const items: SystemSettingsMenuItem[] = []

	if (canAccessAccountPage(user)) {
		items.push({
			id: "account",
			label: "帳號設定",
			kind: "route",
			route: "/core/account",
			section: "personal",
		})
	}
	if (canAdmin) {
		items.push(
			{
				id: "users",
				label: "用戶管理",
				kind: "route",
				route: "/core/users",
				section: "platform",
			},
			{
				id: "license",
				label: "授權管理",
				kind: "route",
				route: "/core/license",
				section: "platform",
			},
			{
				id: "env",
				label: "環境設定",
				kind: "route",
				route: "/core/env",
				section: "platform",
			}
		)
	}
	items.push({ id: "theme", label: "主題", kind: "theme", section: "appearance" })
	items.push({ id: "logout", label: "登出", kind: "logout", section: "session" })

	return items
}

/** Construction 殼層導航：系統總覽（底欄）與系統設定 */
export const useAppShellNavigation = () => {
	const moduleRegistry = useModuleRegistry()
	const { user } = useAuth()
	const canAdmin = useAdminOnly()

	const constructionOverviewModules = computed(() =>
		filterOverviewModules(moduleRegistry.getModulesByCategory(OVERVIEW_CATEGORY))
	)

	const hasConstructionOverviewMenu = computed(
		() => constructionOverviewModules.value.length > 0
	)

	const systemSettingsSections = computed(() =>
		toSystemSettingsSections(buildSystemSettingsItems(user.value, canAdmin.value))
	)

	return {
		constructionOverviewModules,
		hasConstructionOverviewMenu,
		systemSettingsSections,
	}
}
