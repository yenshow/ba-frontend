import { test, expect } from "@playwright/test"
import { createE2eApi } from "./helpers/apiClient"
import { attachPageGuards, fillVueInput, loginViaForm } from "./helpers/selectors"

/**
 * 一般 user 帳號頁（與 login 同專案、無 admin storageState）。
 */
test.describe("帳號設定（一般 user）", () => {
	test.use({ storageState: { cookies: [], origins: [] } })

	test("/core/account：變更密碼後登出並可用新密登入", async ({ page, request }) => {
		test.setTimeout(120_000)
		const guards = attachPageGuards(page)
		const api = await createE2eApi(request)
		const username = `e2e_u_${Date.now().toString(36)}`
		const passwordOld = "E2eTest!23456"
		const passwordNew = "E2eTest!65432"
		let userId: number | null = null

		try {
			const created = await api.createUser({
				username,
				password: passwordOld,
				role: "user",
			})
			userId = created.user.id

			await loginViaForm(page, { username, password: passwordOld })
			await page.goto("/core/account", { waitUntil: "domcontentloaded" })
			await expect(page).toHaveURL(/\/core\/account/, { timeout: 20_000 })
			await expect(page.getByRole("heading", { name: "變更密碼" })).toBeVisible({
				timeout: 30_000,
			})

			await fillVueInput(
				page.locator("label").filter({ hasText: /^舊密碼/ }).locator("input"),
				passwordOld,
			)
			await fillVueInput(
				page.locator("label").filter({ hasText: /^新密碼$/ }).locator("input"),
				passwordNew,
			)
			await fillVueInput(
				page.locator("label").filter({ hasText: /^確認新密碼/ }).locator("input"),
				passwordNew,
			)
			await Promise.all([
				page.waitForURL((url) => url.pathname.includes("/login"), { timeout: 45_000 }),
				page.getByRole("button", { name: "更新密碼" }).click(),
			])
			await expect(page).toHaveURL(/\/login/)

			await loginViaForm(page, { username, password: passwordNew })
			await expect(page).not.toHaveURL(/\/login/)
		} finally {
			if (userId != null) await api.deleteUser(userId).catch(() => undefined)
		}

		await guards.assertClean()
	})
})
