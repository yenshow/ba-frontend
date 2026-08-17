import { test, expect } from "@playwright/test"
import {
	attachPageGuards,
	closeDialogByAria,
	dismissToasts,
	expectStayAuthenticated,
	openDialogByButton,
} from "./helpers/selectors"

test.describe("設備管理 /core/device", () => {
	test("Tab、列表、Dialog 開關", async ({ page }) => {
		const guards = attachPageGuards(page)

		await page.goto("/core/device", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await expect(page.getByRole("heading", { name: "設備管理", level: 1 })).toBeVisible({
			timeout: 30_000,
		})
		await dismissToasts(page)

		await expect(page.getByRole("tablist", { name: "設備類型" })).toBeVisible()
		await page.getByRole("tab", { name: "感測器" }).click({ force: true })
		await page.getByRole("tab", { name: "攝影機" }).click({ force: true })
		await expect(
			page.getByText("尚無設備資料").or(page.locator("main table").first()).first(),
		).toBeVisible({ timeout: 20_000 })

		await expect(page.getByRole("button", { name: "新增設備" })).toBeVisible()
		await openDialogByButton(page, "編輯設備", "編輯設備")
		await closeDialogByAria(page)

		await guards.assertClean()
	})
})
