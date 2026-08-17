import { test, expect } from "@playwright/test"
import {
	attachPageGuards,
	dismissToasts,
	expectStayAuthenticated,
	suppressAlertToasts,
} from "./helpers/selectors"

test.describe("警示紀錄 /core/alert-log", () => {
	test("列表、篩選、警報設定、編輯規則 Dialog", async ({ page }) => {
		const guards = attachPageGuards(page)

		await page.goto("/core/alert-log", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await expect(page.getByRole("heading", { name: "警示紀錄", level: 1 })).toBeVisible({
			timeout: 30_000,
		})
		await dismissToasts(page)

		const tablist = page.getByRole("tablist", { name: "警示紀錄分頁" })
		await expect(tablist).toBeVisible()
		await expect(page.getByRole("textbox", { name: "全部系統" })).toBeVisible()
		await expect(page.getByRole("textbox", { name: "全部狀態" })).toBeVisible()
		await expect(page.getByRole("textbox", { name: /選擇時間範圍|今天|近七天/ })).toBeVisible()
		await expect(page.getByText(/總計：|目前沒有警示紀錄/).first()).toBeVisible({
			timeout: 20_000,
		})

		const rulesTab = page.locator("#alert-log-tab-rules")
		if (await rulesTab.isVisible().catch(() => false)) {
			await dismissToasts(page)
			await expect
				.poll(
					async () => {
						await rulesTab.click({ force: true })
						return rulesTab.getAttribute("aria-selected")
					},
					{ timeout: 15_000 },
				)
				.toBe("true")
			await expect(page.getByRole("button", { name: "新增警報" })).toBeVisible()
			await expect(page.getByRole("textbox", { name: "全部類型" })).toBeVisible()

			const editRule = page.getByRole("button", { name: "編輯警報規則" }).first()
			if (await editRule.isVisible().catch(() => false)) {
				await suppressAlertToasts(page)
				await editRule.click({ force: true })
				await expect(page.getByRole("heading", { name: "編輯警報規則" })).toBeVisible({
					timeout: 10_000,
				})
				await page.getByRole("button", { name: "關閉規則對話框" }).click({ force: true })
				await expect(page.getByRole("heading", { name: "編輯警報規則" })).toHaveCount(0, {
					timeout: 10_000,
				})
			}

			await page.locator("#alert-log-tab-alerts").click({ force: true })
		} else {
			await expect(tablist.getByRole("tab")).toHaveCount(1)
		}

		await guards.assertClean()
	})
})
