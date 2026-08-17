import { test, expect } from "@playwright/test"
import {
	attachPageGuards,
	dismissToasts,
	expectStayAuthenticated,
} from "./helpers/selectors"

test.describe("人員管理 /core/personnel", () => {
	test("搜尋、側欄與管理入口（非用戶管理）", async ({ page }) => {
		const guards = attachPageGuards(page)

		await page.goto("/core/personnel", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await expect(page.getByRole("heading", { name: "人員管理", level: 1 })).toBeVisible({
			timeout: 30_000,
		})
		expect(page.url()).toContain("/core/personnel")
		expect(page.url()).not.toContain("/core/users")
		await dismissToasts(page)

		await expect(page.getByLabel("搜尋 ID 或姓名")).toBeVisible({ timeout: 20_000 })
		await page.getByRole("button", { name: "顯示全部人員" }).click({ force: true })
		await expect(page.getByRole("button", { name: "管理群組" })).toBeVisible()
		await expect(page.getByRole("button", { name: "新增人員" })).toBeVisible()

		await guards.assertClean()
	})
})
