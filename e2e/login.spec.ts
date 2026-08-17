import { test, expect } from "@playwright/test"
import { attachPageGuards, fillVueInput, loginViaForm } from "./helpers/selectors"

/**
 * 登入表單：獨立專案、無 storageState。
 */
test.describe("登入表單 /login", () => {
	test.use({ storageState: { cookies: [], origins: [] } })

	test("空提交觸發必填；reload 後正確帳密可登入", async ({ page }) => {
		test.setTimeout(90_000)
		const guards = attachPageGuards(page)

		await page.goto("/login", { waitUntil: "domcontentloaded" })
		const account = page.locator("#login-account")
		const password = page.locator("#login-password")
		await expect(account).toBeVisible({ timeout: 30_000 })
		await page.getByRole("button", { name: "登入" }).click()
		await expect(account).toHaveJSProperty("validity.valueMissing", true)
		await expect(password).toHaveJSProperty("validity.valueMissing", true)
		await expect(page).toHaveURL(/\/login/)

		await loginViaForm(page)
		await expect(page).not.toHaveURL(/\/login/)
		await expect(page.locator("main").first()).toBeVisible({ timeout: 30_000 })

		await guards.assertClean()
	})

	test("錯誤帳密顯示失敗訊息且停留登入頁", async ({ page }) => {
		test.setTimeout(60_000)
		const guards = attachPageGuards(page)

		await page.goto("/login", { waitUntil: "domcontentloaded" })
		const account = page.locator("#login-account")
		const password = page.locator("#login-password")
		await expect(account).toBeVisible({ timeout: 30_000 })
		await expect(account).toBeEditable()
		await fillVueInput(account, "e2e-no-such-user")
		await fillVueInput(password, "wrong-password-xxxxx")
		await page.getByRole("button", { name: "登入" }).click()
		await expect(page).toHaveURL(/\/login/)
		await expect(page.locator("#login-form-error")).toBeVisible({ timeout: 15_000 })
		await expect(page.locator("#login-form-error")).toContainText(/登入失敗/)

		await guards.assertClean()
	})
})
