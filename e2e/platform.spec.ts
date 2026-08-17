import { test, expect } from "@playwright/test"
import {
	attachPageGuards,
	closeDialogByAria,
	dismissToasts,
	expectStayAuthenticated,
	suppressAlertToasts,
} from "./helpers/selectors"

/**
 * 平台管理／帳號頁（admin session）。
 * `/core/account`：admin 應被導回首頁（僅一般 user 可用）。
 * 一般 user 變更密碼見 `account.spec.ts`。
 */
test.describe("平台管理", () => {
	test("/core/users：列表、開啟編輯用戶 Dialog 後關閉", async ({ page }) => {
		const guards = attachPageGuards(page)

		await page.goto("/core/users", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await suppressAlertToasts(page)
		await expect(page.getByRole("heading", { name: "用戶管理", level: 1 })).toBeVisible({
			timeout: 30_000,
		})
		await expect(page.getByRole("button", { name: "新增用戶" })).toBeVisible()

		await dismissToasts(page)
		const editBtn = page.getByRole("button", { name: "編輯" }).first()
		await expect(editBtn).toBeVisible({ timeout: 15_000 })
		await editBtn.click({ force: true })
		await expect(page.getByRole("heading", { name: "編輯用戶" })).toBeVisible({
			timeout: 10_000,
		})
		await closeDialogByAria(page)
		await expect(page.getByRole("heading", { name: "編輯用戶" })).toHaveCount(0, {
			timeout: 10_000,
		})

		await guards.assertClean()
	})

	test("/core/license：狀態、線上啟用、離線授權、總覽", async ({ page }) => {
		const guards = attachPageGuards(page)

		await page.goto("/core/license", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await suppressAlertToasts(page)
		await expect(page.getByRole("heading", { name: "授權管理", level: 1 })).toBeVisible({
			timeout: 30_000,
		})
		await expect(page.getByText("授權狀態")).toBeVisible({ timeout: 20_000 })
		await expect(page.getByRole("heading", { name: "線上啟用（LK）" })).toBeVisible()
		await expect(page.getByRole("heading", { name: "離線授權" })).toBeVisible()
		await expect(page.getByRole("heading", { name: "授權總覽" })).toBeVisible()
		await expect(page.getByLabel("License Key 輸入")).toBeVisible()

		const resetBtn = page.getByRole("button", { name: "重置授權" })
		if (await resetBtn.isVisible().catch(() => false)) {
			await resetBtn.click({ force: true })
			const panel = page.locator(".dialog-panel-bg").filter({ hasText: "確認重置內容" }).last()
			await expect(panel.getByRole("heading", { name: "確認重置內容" })).toBeVisible({
				timeout: 10_000,
			})
			await panel.getByRole("button", { name: "取消" }).click({ force: true })
			await expect(panel).toBeHidden({ timeout: 10_000 })
		}

		await guards.assertClean()
	})

	test("/core/env：備份排程、資料匯出分頁", async ({ page }) => {
		const guards = attachPageGuards(page)

		await page.goto("/core/env", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await suppressAlertToasts(page)
		await expect(page.getByRole("heading", { name: "環境設定", level: 1 })).toBeVisible({
			timeout: 30_000,
		})
		await expect(page.getByRole("heading", { name: "備份排程" })).toBeVisible({
			timeout: 20_000,
		})
		await expect(page.getByRole("heading", { name: "資料匯出" })).toBeVisible()

		const tabDb = page.locator("#data-export-tab-database")
		const tabExport = page.locator("#data-export-tab-export")
		await expect(tabDb).toBeVisible()
		await expect(tabExport).toBeVisible()
		await suppressAlertToasts(page)
		await expect
			.poll(
				async () => {
					await tabExport.evaluate((el) => (el as HTMLElement).click())
					return tabExport.getAttribute("aria-selected")
				},
				{ timeout: 10_000 },
			)
			.toBe("true")
		await expect
			.poll(
				async () => {
					await tabDb.evaluate((el) => (el as HTMLElement).click())
					return tabDb.getAttribute("aria-selected")
				},
				{ timeout: 10_000 },
			)
			.toBe("true")

		// 開「新增設定」Dialog 後取消（不儲存、不測連線）
		await dismissToasts(page)
		await page.getByRole("button", { name: "新增設定" }).click({ force: true })
		await expect(page.getByRole("heading", { name: "新增資料庫對接" })).toBeVisible({
			timeout: 10_000,
		})
		await page.getByRole("button", { name: "取消" }).click({ force: true })
		await expect(page.getByRole("heading", { name: "新增資料庫對接" })).toHaveCount(0, {
			timeout: 10_000,
		})

		await expect
			.poll(
				async () => {
					await tabExport.evaluate((el) => (el as HTMLElement).click())
					return tabExport.getAttribute("aria-selected")
				},
				{ timeout: 10_000 },
			)
			.toBe("true")
		await dismissToasts(page)
		await page.getByRole("button", { name: "新增規則" }).click({ force: true })
		await expect(page.getByRole("heading", { name: "新增規則" })).toBeVisible({
			timeout: 10_000,
		})
		await page.getByRole("button", { name: "取消" }).click({ force: true })
		await expect(page.getByRole("heading", { name: "新增規則" })).toHaveCount(0, {
			timeout: 10_000,
		})

		await guards.assertClean()
	})

	test("/core/account：admin 導回首頁", async ({ page }) => {
		const guards = attachPageGuards(page)

		await page.goto("/core/account", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await expect(page).toHaveURL(/\/$|\/\?/, { timeout: 20_000 })
		await expect(page.locator(".home-panel").first()).toBeVisible({ timeout: 30_000 })

		await guards.assertClean()
	})
})
