import { useAuth, useAdminOnly } from "~/composables/core/useAuth"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import { canAccessAccountPage } from "~/composables/systems/users/useAccountSettings"
import type { User } from "~/types/user"
import {
	CENTRAL_OVERVIEW_SKIP_ROUTES,
	filterOverviewModules,
	groupModulesByCategory,
	MODULE_CATEGORY_ACCENT_HEX,
	MODULE_CATEGORY_LABELS,
	MODULE_CATEGORY_ORDER,
	type SystemSettingsMenuItem,
	toSystemSettingsSections,
} from "~/utils/appShellNavigationUtils"

const buildSystemSettingsItems = (
	user: Pick<User, "role"> | null | undefined,
	canAdmin: boolean,
	includeTheme: boolean
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
	if (includeTheme) {
		items.push({ id: "theme", label: "主題", kind: "theme", section: "appearance" })
	}
	items.push({ id: "logout", label: "登出", kind: "logout", section: "session" })

	return items
}

/** Central 殼層導航：系統總覽（Header）與系統設定 */
export const useAppShellNavigation = () => {
	const moduleRegistry = useModuleRegistry()
	const { user } = useAuth()
	const canAdmin = useAdminOnly()

	const centralOverviewCategoryGroups = computed(() => {
		const modules = filterOverviewModules(
			moduleRegistry.getAllModules(),
			CENTRAL_OVERVIEW_SKIP_ROUTES
		)
		return groupModulesByCategory(modules, MODULE_CATEGORY_ORDER, MODULE_CATEGORY_LABELS)
	})

	const systemSettingsSections = computed(() =>
		toSystemSettingsSections(buildSystemSettingsItems(user.value, canAdmin.value, true))
	)

	return {
		moduleCategoryAccentHex: MODULE_CATEGORY_ACCENT_HEX,
		centralOverviewCategoryGroups,
		systemSettingsSections,
	}
}
