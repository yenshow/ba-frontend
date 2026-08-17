import { test, expect } from "@playwright/test"
import { createE2eApi } from "./helpers/apiClient"
import { makeE2eTag } from "./helpers/testData"
import {
	attachPageGuards,
	confirmDangerDialog,
	dismissToasts,
	expectStayAuthenticated,
	fillVueInput,
	rowContainingText,
	selectDeviceTypeTab,
	suppressAlertToasts,
} from "./helpers/selectors"

/**
 * Safe CRUD：建立走 API（避開複雜型號表單），列表／改名／刪除走 UI；finally API 清殘留。
 */
test.describe("設備管理 safe CRUD", () => {
	test("API 建立 → 列表 → UI 改名 → UI 刪除", async ({ page, request }) => {
		const guards = attachPageGuards(page)
		const api = await createE2eApi(request)
		const tag = makeE2eTag()
		const nameCreate = `${tag}-ctrl`
		const nameUpdated = `${tag}-ctrl-改`
		let deviceId: number | null = null

		try {
			const created = await api.createControllerDevice({ name: nameCreate })
			deviceId = created.device.id

			await page.goto("/core/device", { waitUntil: "domcontentloaded" })
			await expectStayAuthenticated(page)
			await suppressAlertToasts(page)
			await expect(page.getByRole("heading", { name: "設備管理", level: 1 })).toBeVisible({
				timeout: 30_000,
			})

			await selectDeviceTypeTab(page, "controller", "控制器管理")
			await expect(rowContainingText(page, nameCreate)).toBeVisible({ timeout: 20_000 })

			await dismissToasts(page)
			await rowContainingText(page, nameCreate)
				.getByRole("button", { name: "編輯設備" })
				.click({ force: true })
			await expect(page.getByRole("heading", { name: "編輯設備" })).toBeVisible({
				timeout: 10_000,
			})
			const nameInput = page
				.locator("label")
				.filter({ hasText: /^設備名稱/ })
				.locator("input")
			await fillVueInput(nameInput, nameUpdated)
			await page.getByRole("button", { name: "儲存變更" }).click({ force: true })
			await expect(page.getByRole("heading", { name: "編輯設備" })).toBeHidden({
				timeout: 20_000,
			})
			await expect(rowContainingText(page, nameUpdated)).toBeVisible({ timeout: 20_000 })

			await dismissToasts(page)
			await rowContainingText(page, nameUpdated)
				.getByRole("button", { name: "刪除設備" })
				.click({ force: true })
			await confirmDangerDialog(page, "刪除")
			await expect(page.getByText(nameUpdated, { exact: true })).toHaveCount(0, {
				timeout: 20_000,
			})
			deviceId = null
		} finally {
			if (deviceId != null) {
				await api.deleteDevice(deviceId).catch(() => undefined)
			} else {
				const leftover =
					(await api.findDeviceByName(nameCreate).catch(() => null)) ||
					(await api.findDeviceByName(nameUpdated).catch(() => null))
				if (leftover?.id) await api.deleteDevice(leftover.id).catch(() => undefined)
			}
		}

		await guards.assertClean()
	})
})
