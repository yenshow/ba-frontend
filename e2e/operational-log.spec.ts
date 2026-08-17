import { test, expect } from "@playwright/test"
import { attachPageGuards, expectStayAuthenticated } from "./helpers/selectors"

test.describe("營運事件 /core/operational-log", () => {
	test("標題、篩選、列表", async ({ page }) => {
		const guards = attachPageGuards(page)

		await page.goto("/core/operational-log", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await expect(page.getByRole("heading", { name: "營運事件", level: 1 })).toBeVisible({
			timeout: 30_000,
		})

		await expect(page.getByRole("textbox", { name: "全部系統" })).toBeVisible()
		await expect(page.getByRole("textbox", { name: "全部類型" })).toBeVisible()
		await expect(page.getByRole("textbox", { name: /選擇時間範圍|近七天|今天/ })).toBeVisible()
		await expect(
			page.getByText("目前沒有營運事件").or(page.getByText(/總計|筆/)).first(),
		).toBeVisible({ timeout: 20_000 })

		await guards.assertClean()
	})
})
