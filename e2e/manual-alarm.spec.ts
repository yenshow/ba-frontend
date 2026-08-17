import { test, expect } from "@playwright/test"
import {
	attachPageGuards,
	expectStayAuthenticated,
	suppressAlertToasts,
} from "./helpers/selectors"

/**
 * 手動警報（煙霧）：選點位 → 觸發 → 清除（DB Incident；非硬體）。
 * 無可用點位時 skip。
 */
test.describe("手動警報", () => {
	test("/security/smoke-alarm：觸發後清除", async ({ page }) => {
		test.setTimeout(90_000)
		const guards = attachPageGuards(page)

		await page.goto("/security/smoke-alarm", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await suppressAlertToasts(page)
		await expect(page.locator(".system-title").getByText("煙霧警報")).toBeVisible({
			timeout: 30_000,
		})

		const panel = page.getByLabel("手動警報測試面板")
		await expect(panel).toBeVisible({ timeout: 20_000 })

		const target = panel.getByLabel("選擇目標點位")
		await expect(target).toBeVisible()
		await target.click({ force: true })
		const menuBtn = page.locator(".fixed.z-\\[9999\\] button, [class*='z-[9999]'] button").first()
		const hasOption = await menuBtn.isVisible({ timeout: 3_000 }).catch(() => false)
		test.skip(!hasOption, "無煙霧點位可供手動警報")

		await menuBtn.click({ force: true })
		const trigger = panel.getByRole("button", { name: "觸發警報" })
		await expect(trigger).toBeVisible({ timeout: 10_000 })
		await trigger.click({ force: true })
		await panel.getByRole("button", { name: "清除警報" }).click({ force: true })

		await guards.assertClean()
	})
})
