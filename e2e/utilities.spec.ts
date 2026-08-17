import { test, expect } from "@playwright/test"
import { createSettingsApi } from "./helpers/settingsApi"
import {
	attachPageGuards,
	closeDialogByAria,
	fillVueInput,
	openFloorZoneManagementDialog,
	visitSystemPage,
} from "./helpers/selectors"

/** 照明／空調／電力／排水／空氣循環：樓層平面＋狀態側欄（控制 UI 可見但不送指令） */
const INFRA_PAGES = [
	{ path: "/utilities/lighting", title: "照明系統", deepEdit: true, controlHint: "light" as const },
	{ path: "/utilities/hvac", title: "空調系統", deepEdit: false, controlHint: "hvac" as const },
	{ path: "/utilities/power", title: "電力系統", deepEdit: false, controlHint: null },
	{ path: "/utilities/drainage", title: "排水系統", deepEdit: false, controlHint: null },
	{ path: "/utilities/air-circulation", title: "空氣循環", deepEdit: false, controlHint: null },
] as const

test.describe("水電設施（樓層平面）", () => {
	for (const { path, title, deepEdit, controlHint } of INFRA_PAGES) {
		test(`${title} ${path}：樓層管理${deepEdit ? "、編輯定位" : ""}${controlHint ? "、控制 UI" : ""}`, async ({
			page,
		}) => {
			const guards = attachPageGuards(page)
			await visitSystemPage(page, {
				path,
				title,
				expectManageButton: "樓層管理",
			})
			await openFloorZoneManagementDialog(page)
			await closeDialogByAria(page)

			if (deepEdit) {
				const editBtn = page.getByRole("button", { name: "編輯定位" })
				await expect(editBtn).toBeVisible({ timeout: 20_000 })
				await expect(editBtn).toContainText("編輯定位")
				await editBtn.click({ force: true })
				await expect(editBtn).toContainText("完成編輯", { timeout: 10_000 })
				await editBtn.click({ force: true })
				await expect(editBtn).toContainText("編輯定位", { timeout: 10_000 })
			}

			if (controlHint === "light") {
				await expect(
					page.getByText("ON").or(page.getByText("OFF")).or(page.getByText("尚無")).first(),
				).toBeVisible({ timeout: 20_000 })
			}
			if (controlHint === "hvac") {
				await expect(
					page
						.getByText("空調開啟")
						.or(page.getByText("空調關閉"))
						.or(page.getByText("尚無"))
						.first(),
				).toBeVisible({ timeout: 20_000 })
			}

			await guards.assertClean()
		})
	}
})

test.describe("能源管理 /utilities/energy", () => {
	test("載入、KPI、改水價後還原", async ({ page, request }) => {
		test.setTimeout(90_000)
		const guards = attachPageGuards(page)
		const api = await createSettingsApi(request)
		const original = await api.getEnergyConfig()
		const water = (original.water_tariff as { rate?: number } | undefined)?.rate ?? 0
		const nextRate = Number((water + 0.01).toFixed(2))

		try {
			await visitSystemPage(page, {
				path: "/utilities/energy",
				title: "能源管理",
				titleInSystemChrome: false,
			})
			await expect(page.getByRole("heading", { name: "用電趨勢" })).toBeVisible({
				timeout: 20_000,
			})
			await expect(page.getByRole("heading", { name: "用水趨勢" })).toBeVisible()
			await expect(page.getByText("今日用電量")).toBeVisible()

			await page.getByRole("button", { name: "開啟設定" }).click({ force: true })
			await expect(page.getByRole("heading", { name: "能源設定" })).toBeVisible({
				timeout: 10_000,
			})

			const tariffToggle = page.locator("button").filter({ hasText: "電價／水價" }).first()
			if (await tariffToggle.isVisible().catch(() => false)) {
				const panel = page.locator("label").filter({ hasText: /參考水價/ })
				if (!(await panel.isVisible().catch(() => false))) {
					await tariffToggle.click({ force: true })
				}
			}

			const rateInput = page.locator("label").filter({ hasText: /參考水價/ }).locator("input")
			await expect(rateInput).toBeVisible({ timeout: 10_000 })
			await fillVueInput(rateInput, String(nextRate))
			await page.getByRole("button", { name: "儲存", exact: true }).click({ force: true })
			await expect(page.getByRole("heading", { name: "能源設定" })).toBeHidden({
				timeout: 20_000,
			})

			const saved = await api.getEnergyConfig()
			expect((saved.water_tariff as { rate: number }).rate).toBe(nextRate)
		} finally {
			await api.putEnergyConfig(original).catch(() => undefined)
		}

		await guards.assertClean()
	})
})
