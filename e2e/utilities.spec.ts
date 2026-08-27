import { test, expect } from "@playwright/test"
import { createSettingsApi } from "./helpers/settingsApi"
import {
	attachPageGuards,
	closeDialogByAria,
	fillVueInput,
	openDialogByButton,
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

			await openDialogByButton(page, "開啟設定", "能源設定")

			const tariffToggle = page.locator("button").filter({ hasText: "電價／水價" }).first()
			const rateInput = page.getByLabel(/參考水價/)
			if (!(await rateInput.isVisible().catch(() => false))) {
				await expect(async () => {
					await tariffToggle.click()
					await expect(rateInput).toBeVisible({ timeout: 1_500 })
				}).toPass({ timeout: 10_000 })
			}
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

	test("Incident 門檻：表計異常、契約分級儲存並同步 alert_rules", async ({ page, request }) => {
		test.setTimeout(120_000)
		const guards = attachPageGuards(page)
		const api = await createSettingsApi(request)
		const original = await api.getEnergyConfig()

		const stages = Array.isArray(original.load_shed_stages)
			? (original.load_shed_stages as Array<{ level: number; threshold_pct: number }>)
			: []
		const stage1 = stages.find((s) => Number(s.level) === 1)
		const origStage1Pct = Number(stage1?.threshold_pct) || 80
		const nextStage1Pct = origStage1Pct >= 99 ? 78 : origStage1Pct + 1
		const origStaleMins = Number(original.meter_stale_minutes) || 15
		const nextStaleMins = origStaleMins >= 59 ? 14 : origStaleMins + 1

		try {
			await visitSystemPage(page, {
				path: "/utilities/energy",
				title: "能源管理",
				titleInSystemChrome: false,
			})
			await expect(page.getByText("今日用電量")).toBeVisible({ timeout: 20_000 })

			await openDialogByButton(page, "開啟設定", "能源設定")

			// 表計異常（devices 區塊預設展開）
			await expect(page.getByText("表計異常")).toBeVisible()
			const staleInput = page
				.locator("label")
				.filter({ hasText: /^逾時（分鐘）$/ })
				.locator("input")
			await expect(staleInput).toBeVisible()
			await fillVueInput(staleInput, String(nextStaleMins))

			// 契約與分級告警
			const contractToggle = page.locator("button").filter({ hasText: "契約與分級告警" }).first()
			const stage1Panel = page.locator("#energy-settings-contract").getByText("1 級")
			if (!(await stage1Panel.isVisible().catch(() => false))) {
				await expect(async () => {
					await contractToggle.click()
					await expect(stage1Panel).toBeVisible({ timeout: 1_500 })
				}).toPass({ timeout: 10_000 })
			}

			const stage1Threshold = page
				.locator("#energy-settings-contract label")
				.filter({ hasText: /^門檻（%）$/ })
				.first()
				.locator("input")
			await fillVueInput(stage1Threshold, String(nextStage1Pct))

			await page.getByRole("button", { name: "儲存", exact: true }).click({ force: true })
			await expect(page.getByRole("heading", { name: "能源設定" })).toBeHidden({
				timeout: 20_000,
			})

			const saved = await api.getEnergyConfig()
			expect(Number(saved.meter_stale_minutes)).toBe(nextStaleMins)
			const savedStages = saved.load_shed_stages as Array<{ level: number; threshold_pct: number }>
			expect(Number(savedStages.find((s) => s.level === 1)?.threshold_pct)).toBe(nextStage1Pct)

			const rules = await api.getEnergyAlertRules()
			const staleRule = rules.find((r) => r.dimension_key === "meter_stale")
			const stage1Rule = rules.find((r) => r.dimension_key === "contract_stage_1")
			expect(staleRule, "meter_stale rule").toBeTruthy()
			expect(Number(staleRule?.condition_config?.stale_minutes)).toBe(nextStaleMins)
			expect(stage1Rule, "contract_stage_1 rule").toBeTruthy()
			expect(Number(stage1Rule?.condition_config?.threshold_pct)).toBe(nextStage1Pct)
		} finally {
			await api.putEnergyConfig(original).catch(() => undefined)
		}

		await guards.assertClean()
	})
})
