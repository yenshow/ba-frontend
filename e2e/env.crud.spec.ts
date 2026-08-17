import { test, expect } from "@playwright/test"
import { createSettingsApi } from "./helpers/settingsApi"
import {
	attachPageGuards,
	confirmDangerDialog,
	dismissToasts,
	expectStayAuthenticated,
	suppressAlertToasts,
} from "./helpers/selectors"

/**
 * 環境設定記錄轉存：API 建 ephemeral 規則 → UI 可見 → UI 刪。
 */
test.describe("環境設定 record-export CRUD", () => {
	test("/core/env：新增規則可見後刪除", async ({ page, request }) => {
		test.setTimeout(90_000)
		const guards = attachPageGuards(page)
		const api = await createSettingsApi(request)
		const name = `E2E-export-${Date.now().toString(36)}`
		let ruleId: number | null = null

		try {
			const created = await api.createRecordExportRule({
				name,
				filenamePrefix: "E2E_Export",
				localDir: "C:\\\\Temp\\\\ba-e2e-export",
			})
			ruleId = created.id

			await page.goto("/core/env", { waitUntil: "domcontentloaded" })
			await expectStayAuthenticated(page)
			await suppressAlertToasts(page)
			await expect(page.getByRole("heading", { name: "環境設定", level: 1 })).toBeVisible({
				timeout: 30_000,
			})

			const tabExport = page.locator("#data-export-tab-export")
			await expect
				.poll(
					async () => {
						await tabExport.evaluate((el) => (el as HTMLElement).click())
						return tabExport.getAttribute("aria-selected")
					},
					{ timeout: 10_000 },
				)
				.toBe("true")

			await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 20_000 })
			await dismissToasts(page)
			const row = page.locator("tr, li, div").filter({ hasText: name }).first()
			await row.getByRole("button", { name: "刪除" }).click({ force: true })
			await confirmDangerDialog(page, "確定")
			await expect(page.getByText(name, { exact: true })).toHaveCount(0, { timeout: 20_000 })
			ruleId = null
		} finally {
			if (ruleId != null) await api.deleteRecordExportRule(ruleId).catch(() => undefined)
			else {
				const leftover = (await api.listRecordExportRules().catch(() => [])).find(
					(r) => r.name === name,
				)
				if (leftover?.id) await api.deleteRecordExportRule(leftover.id).catch(() => undefined)
			}
		}

		await guards.assertClean()
	})
})
