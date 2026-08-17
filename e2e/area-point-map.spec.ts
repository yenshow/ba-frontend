import { test, expect } from "@playwright/test"
import {
	attachPageGuards,
	dismissToasts,
	expectStayAuthenticated,
} from "./helpers/selectors"

test.describe("全區點位圖 /core/area-point-map", () => {
	test("區域列表或空狀態、地點管理入口", async ({ page }) => {
		const guards = attachPageGuards(page)

		await page.goto("/core/area-point-map", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await expect(page.getByRole("heading", { name: "區域", level: 2 })).toBeVisible({
			timeout: 30_000,
		})
		await dismissToasts(page)
		await expect(page.getByText("載入中...")).toHaveCount(0, { timeout: 30_000 })

		const emptyMap = page.getByText(/沒有可檢視的地圖系統|尚無區域資料/)
		if (await emptyMap.isVisible().catch(() => false)) {
			await expect(emptyMap).toBeVisible()
		} else {
			await expect(page.locator("aside button").first()).toBeVisible({ timeout: 15_000 })
		}

		await expect(
			page.getByRole("button", { name: "地點管理" }).or(emptyMap),
		).toBeVisible({ timeout: 15_000 })

		await guards.assertClean()
	})
})
