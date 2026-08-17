import { test, expect } from "@playwright/test"
import { attachPageGuards, expectStayAuthenticated } from "./helpers/selectors"

test.describe("首頁 /", () => {
	test("載入、模組區、面板、營運事件、WebSocket", async ({ page }) => {
		const guards = attachPageGuards(page)
		const wsPromise = page.waitForEvent("websocket", { timeout: 30_000 })

		await page.goto("/", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await expect(page.locator(".home-panel").first()).toBeVisible({ timeout: 30_000 })

		const ws = await wsPromise
		expect(ws.url()).toMatch(/4000|socket\.io/i)

		await expect(
			page
				.getByRole("button", { name: "調整系統模組順序" })
				.or(page.getByRole("button", { name: "上一頁模組" }))
				.or(page.getByRole("button", { name: "下一頁模組" }))
				.first(),
		).toBeVisible({ timeout: 20_000 })

		const toggle = page.getByRole("button", { name: /點擊切換/ })
		if (await toggle.isVisible().catch(() => false)) {
			await toggle.click()
			await expect(page.locator(".home-sensor-panel-frame")).toBeVisible()
		} else {
			await expect(page.locator(".home-sensor-panel-frame")).toBeVisible()
		}

		const eventCard = page.locator('article[role="link"]').first()
		if (await eventCard.isVisible().catch(() => false)) {
			await eventCard.click()
			await expect(page).toHaveURL(/\/core\/operational-log/)
		} else {
			await expect(
				page.getByText("尚無營運事件紀錄").or(page.getByRole("status")).first(),
			).toBeVisible({ timeout: 20_000 })
		}

		await guards.assertClean()
	})
})
