import { test, expect } from "@playwright/test"
import { visitSystemPage, openZoneManagementDialog, attachPageGuards } from "./helpers/selectors"

test.describe("門禁保全", () => {
	test("進頁與地點管理", async ({ page }) => {
		const guards = attachPageGuards(page)
		await visitSystemPage(page, {
			path: "/security/access-control",
			title: "門禁保全系統",
			expectOverview: true,
			expectManageButton: "地點管理",
		})
		await openZoneManagementDialog(page)
		await expect(page.getByRole("heading", { name: "區域管理" })).toBeVisible()
		await guards.assertClean()
	})
})
