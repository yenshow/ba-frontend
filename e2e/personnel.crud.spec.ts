import { test, expect } from "@playwright/test"
import { createE2eApi } from "./helpers/apiClient"
import { makeE2eEmployeeNo } from "./helpers/testData"
import {
	attachPageGuards,
	confirmDangerDialog,
	dismissToasts,
	expectStayAuthenticated,
	fillVueInput,
	rowContainingText,
	searchByLabel,
	suppressAlertToasts,
	waitForMainListReady,
} from "./helpers/selectors"

/**
 * Safe CRUD：建立走 API，列表／改名／刪除走 UI；finally API 清殘留。
 */
test.describe("人員管理 safe CRUD", () => {
	test("API 建立 → 列表 → UI 改名 → UI 刪除", async ({ page, request }) => {
		const guards = attachPageGuards(page)
		const api = await createE2eApi(request)
		const employeeNo = makeE2eEmployeeNo()
		const nameCreate = `E2E人員-${employeeNo}`
		const nameUpdated = `${nameCreate}-改`
		let personId: number | null = null

		try {
			const created = await api.createPerson({
				employeeNo,
				fullName: nameCreate,
			})
			personId = Number(created.id)
			expect(personId).toBeTruthy()

			await page.goto("/core/personnel", { waitUntil: "domcontentloaded" })
			await expectStayAuthenticated(page)
			await suppressAlertToasts(page)
			await expect(page.getByRole("heading", { name: "人員管理", level: 1 })).toBeVisible({
				timeout: 30_000,
			})
			await page.getByRole("button", { name: "顯示全部人員" }).click({ force: true })
			await waitForMainListReady(page)

			await searchByLabel(page, "搜尋 ID 或姓名", employeeNo)
			await expect(rowContainingText(page, employeeNo)).toBeVisible({ timeout: 20_000 })
			await expect(rowContainingText(page, nameCreate)).toBeVisible()

			await dismissToasts(page)
			await rowContainingText(page, employeeNo)
				.getByRole("button", { name: "編輯人員" })
				.click({ force: true })
			await expect(page.getByRole("heading", { name: "編輯人員" })).toBeVisible({
				timeout: 10_000,
			})
			const nameInput = page.locator("label").filter({ hasText: /^姓名/ }).locator("input")
			await fillVueInput(nameInput, nameUpdated)
			await page.getByRole("button", { name: "更新" }).click({ force: true })
			await expect(page.getByRole("heading", { name: "編輯人員" })).toBeHidden({
				timeout: 20_000,
			})
			await expect(rowContainingText(page, nameUpdated)).toBeVisible({ timeout: 20_000 })

			await dismissToasts(page)
			await rowContainingText(page, employeeNo)
				.getByRole("button", { name: "刪除人員" })
				.click({ force: true })
			await confirmDangerDialog(page, "確定")
			await expect(page.getByText(employeeNo, { exact: true })).toHaveCount(0, {
				timeout: 20_000,
			})
			personId = null
		} finally {
			if (personId != null) {
				await api.deletePerson(personId).catch(() => undefined)
			} else {
				const leftover = await api.findPersonByEmployeeNo(employeeNo).catch(() => null)
				if (leftover?.id) await api.deletePerson(leftover.id).catch(() => undefined)
			}
		}

		await guards.assertClean()
	})
})
