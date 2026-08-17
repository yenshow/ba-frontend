import { test, expect } from "@playwright/test"
import {
	attachPageGuards,
	closeDialogByAria,
	expectStayAuthenticated,
	openAndCloseFullReport,
	openZoneManagementByButton,
	suppressAlertToasts,
} from "./helpers/selectors"

/**
 * Construction 頁面為 Central 子集；Chrome 無 `.system-title`／`.home-panel`。
 * 業務僅：人流統計、車輛管理、環境品質、影像監控。
 */
test.describe("Construction 巡頁", () => {
	test("首頁載入（業務錨點）", async ({ page }) => {
		const guards = attachPageGuards(page)
		await page.goto("/", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await expect(page).toHaveURL(/\/$|\/\?/)
		await expect(page.locator("main").first()).toBeVisible({ timeout: 30_000 })
		await expect(
			page
				.locator("input.select-filter")
				.or(page.getByText("尚無資料"))
				.or(page.getByText("載入中..."))
				.first(),
		).toBeVisible({ timeout: 30_000 })
		await guards.assertClean()
	})

	const CORE_PAGES = [
		{ path: "/core/device", heading: "設備管理" },
		{ path: "/core/personnel", heading: "人員管理" },
		{ path: "/core/alert-log", heading: "警示紀錄" },
		{ path: "/core/operational-log", heading: "營運事件" },
		{ path: "/core/users", heading: "用戶管理" },
		{ path: "/core/license", heading: "授權管理" },
		{ path: "/core/env", heading: "環境設定" },
	] as const

	for (const { path, heading } of CORE_PAGES) {
		test(`${heading} ${path}`, async ({ page }) => {
			const guards = attachPageGuards(page)
			await page.goto(path, { waitUntil: "domcontentloaded" })
			await expectStayAuthenticated(page)
			await suppressAlertToasts(page)
			await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible({
				timeout: 30_000,
			})
			await guards.assertClean()
		})
	}

	test("/core/account：admin 導回首頁", async ({ page }) => {
		const guards = attachPageGuards(page)
		await page.goto("/core/account", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await expect(page).toHaveURL(/\/$|\/\?/, { timeout: 20_000 })
		await expect(page.locator("main").first()).toBeVisible({ timeout: 30_000 })
		await guards.assertClean()
	})
})

test.describe("Construction 業務頁（四系統）", () => {
	const ZONE_PAGES = [
		{
			name: "人流統計",
			path: "/access-control/people-counting",
			report: "門禁管理 - 完整報表",
		},
		{
			name: "車輛管理",
			path: "/access-control/vehicle-access",
			report: "車輛進出 - 完整報表",
		},
		{
			name: "環境品質",
			path: "/security/environment",
			report: "環境監控 - 完整報表",
		},
	] as const

	for (const { name, path, report } of ZONE_PAGES) {
		test(`${name}：總覽、地點管理、完整報表`, async ({ page }) => {
			const guards = attachPageGuards(page)
			await page.goto(path, { waitUntil: "domcontentloaded" })
			await expectStayAuthenticated(page)
			await suppressAlertToasts(page)
			await expect(page.getByRole("heading", { name: "總覽" })).toBeVisible({ timeout: 30_000 })
			await openZoneManagementByButton(page, "地點管理")
			await closeDialogByAria(page)
			await openAndCloseFullReport(page, report)
			await guards.assertClean()
		})
	}

	test("影像監控：畫面配置", async ({ page }) => {
		const guards = attachPageGuards(page)
		await page.goto("/access-control/surveillance", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await suppressAlertToasts(page)
		await expect(page.getByRole("button", { name: "1 畫面" })).toBeVisible({ timeout: 30_000 })
		await expect(page.getByRole("button", { name: "4 畫面" })).toBeVisible()
		await guards.assertClean()
	})
})
