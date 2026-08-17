import { test, expect } from "@playwright/test"
import { createE2eApi } from "./helpers/apiClient"
import {
	attachPageGuards,
	confirmDangerDialog,
	dismissToasts,
	expectStayAuthenticated,
	fillVueInput,
	rowContainingText,
	suppressAlertToasts,
} from "./helpers/selectors"

/**
 * 用戶管理 safe CRUD：API 建 → UI 改名 → UI 刪；finally API 清殘留。
 * 勿動 seed admin。
 */
test.describe("用戶管理 safe CRUD", () => {
	test("API 建立 → UI 改名 → UI 刪除", async ({ page, request }) => {
		test.setTimeout(90_000)
		const guards = attachPageGuards(page)
		const api = await createE2eApi(request)
		const stamp = Date.now().toString(36)
		const nameCreate = `e2e_u_${stamp}`
		const nameUpdated = `e2e_u_${stamp}_x`
		const password = "E2eTest!23456"
		let userId: number | null = null

		try {
			const created = await api.createUser({
				username: nameCreate,
				password,
				role: "user",
			})
			userId = created.user.id

			await page.goto("/core/users", { waitUntil: "domcontentloaded" })
			await expectStayAuthenticated(page)
			await suppressAlertToasts(page)
			await expect(page.getByRole("heading", { name: "用戶管理", level: 1 })).toBeVisible({
				timeout: 30_000,
			})
			await expect(rowContainingText(page, nameCreate)).toBeVisible({ timeout: 20_000 })

			await dismissToasts(page)
			await rowContainingText(page, nameCreate)
				.getByRole("button", { name: "編輯" })
				.click({ force: true })
			await expect(page.getByRole("heading", { name: "編輯用戶" })).toBeVisible({
				timeout: 10_000,
			})
			const nameInput = page.locator("label").filter({ hasText: /^用戶名/ }).locator("input")
			await fillVueInput(nameInput, nameUpdated)
			await page.getByRole("button", { name: "更新" }).click({ force: true })
			await expect(page.getByRole("heading", { name: "編輯用戶" })).toHaveCount(0, {
				timeout: 20_000,
			})
			await expect(rowContainingText(page, nameUpdated)).toBeVisible({ timeout: 20_000 })

			await dismissToasts(page)
			await rowContainingText(page, nameUpdated)
				.getByRole("button", { name: "刪除" })
				.click({ force: true })
			await confirmDangerDialog(page, "刪除")
			await expect(page.getByText(nameUpdated, { exact: true })).toHaveCount(0, {
				timeout: 20_000,
			})
			userId = null
		} finally {
			if (userId != null) await api.deleteUser(userId).catch(() => undefined)
		}

		await guards.assertClean()
	})
})
