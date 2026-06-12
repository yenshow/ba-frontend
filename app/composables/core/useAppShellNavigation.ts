import { useAuth, useAdminOnly } from "~/composables/core/useAuth"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import { canAccessAccountPage } from "~/composables/systems/users/useAccountSettings"
import type { User } from "~/types/user"
import {
	CENTRAL_SHELL_CATEGORY_ACCENT_HEX,
	getCentralShellModules,
	groupCentralShellModules,
} from "~/config/centralModuleShell"
import { type SystemSettingsMenuItem, toSystemSettingsSections } from "~/utils/appShellNavigationUtils"

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

	const centralOverviewCategoryGroups = computed(() =>
		groupCentralShellModules(getCentralShellModules(moduleRegistry.getAllModules()))
	)

	const systemSettingsSections = computed(() =>
		toSystemSettingsSections(buildSystemSettingsItems(user.value, canAdmin.value, true))
	)

	return {
		moduleCategoryAccentHex: CENTRAL_SHELL_CATEGORY_ACCENT_HEX,
		centralOverviewCategoryGroups,
		systemSettingsSections,
	}
}
