import { test, expect } from "@playwright/test"
import { visitSystemPage, openZoneManagementDialog, attachPageGuards } from "./helpers/selectors"

test.describe("對講系統", () => {
	test("進頁與地點管理", async ({ page }) => {
		const guards = attachPageGuards(page)
		await visitSystemPage(page, {
			path: "/security/intercom",
			title: "對講系統",
			expectOverview: true,
			expectManageButton: "地點管理",
		})
		await openZoneManagementDialog(page)
		await expect(page.getByRole("heading", { name: "地點管理" })).toBeVisible()
		await guards.assertClean()
	})
})
