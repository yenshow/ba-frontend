import { test, expect } from "@playwright/test"
import {
	attachPageGuards,
	expectStayAuthenticated,
	suppressAlertToasts,
} from "./helpers/selectors"

/**
 * 影像監控：畫面配置＋側欄／空態（不點攝影機，避免 stream/start）。
 */
test.describe("影像監控 /access-control/surveillance", () => {
	test("載入、畫面配置、攝影機列表／空態", async ({ page }) => {
		const guards = attachPageGuards(page)

		await page.goto("/access-control/surveillance", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await suppressAlertToasts(page)
		await expect(page).toHaveURL(/\/access-control\/surveillance/)
		await expect(page.locator(".system-title").getByText("影像監控")).toBeVisible({
			timeout: 30_000,
		})

		await expect(page.getByRole("button", { name: "1 畫面" })).toBeVisible({ timeout: 20_000 })
		await expect(page.getByRole("button", { name: "4 畫面" })).toBeVisible()
		await expect(page.getByRole("heading", { name: "攝影機列表" })).toBeVisible()
		await page.getByRole("button", { name: "4 畫面" }).click({ force: true })

		await expect(
			page
				.getByText("尚未加入攝影機")
				.or(page.getByText("請於側邊列表點選攝影機以加入監控畫面"))
				.or(page.getByText("沒有攝影機"))
				.or(page.getByText("此群組無攝影機"))
				.first(),
		).toBeVisible({ timeout: 20_000 })

		await guards.assertClean()
	})
})
