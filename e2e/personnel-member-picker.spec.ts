import { test, expect, type Page } from "@playwright/test"
import {
	attachPageGuards,
	closeDialogByAria,
	dismissToasts,
	expectStayAuthenticated,
	openDialogByButton,
	suppressAlertToasts,
	visitSystemPage,
} from "./helpers/selectors"

/** 選取地點直到管理按鈕出現（設備類型不符則 skip） */
const selectLocationForManageButton = async (page: Page, manageButton: string) => {
	const expandBtn = page.getByRole("button", { name: "展開總覽" })
	if (await expandBtn.isVisible().catch(() => false)) {
		await expandBtn.click({ force: true })
	}

	const cards = page.locator(
		"[data-overview-location-id], .overview-sidebar [role='button'][tabindex='0']",
	)
	await expect(async () => {
		expect(await cards.count()).toBeGreaterThan(0)
	}).toPass({ timeout: 30_000 })

	const count = await cards.count()
	for (let i = 0; i < count; i++) {
		await cards.nth(i).click({ force: true })
		const manageBtn = page.getByRole("button", { name: manageButton })
		if (await manageBtn.isVisible().catch(() => false)) return true
	}

	test.skip(true, `${manageButton} 按鈕不可用（地點類型不符）`)
	return false
}

/** Member Picker：管理群組 Dialog（無 role=dialog） */
const assertGroupsMemberPickerLoaded = async (page: Page) => {
	const panel = page.locator(".dialog-panel-bg").filter({ has: page.getByRole("heading", { name: "管理群組" }) })
	await expect(panel.getByLabel("搜尋人員")).toBeVisible({ timeout: 20_000 })
	await expect(panel.getByRole("button", { name: "全選可見人員" })).toBeVisible()
	await expect(panel.locator('input[type="checkbox"]').first()).toBeVisible({ timeout: 15_000 })
}

/** Member Picker：地點名單 Dialog（DeviceManageDialogShell） */
const assertMemberPickerInDialog = async (page: Page) => {
	const dialog = page.getByRole("dialog")
	await expect(dialog.getByLabel("搜尋人員")).toBeVisible({ timeout: 20_000 })
	await expect(dialog.getByRole("button", { name: "全選可見人員" })).toBeVisible()
	await expect(dialog.locator('input[type="checkbox"]').first()).toBeVisible({ timeout: 15_000 })
}

test.describe("人員 Member Picker — 管理群組", () => {
	test("開啟管理群組 Dialog、群組樹與人員清單", async ({ page }) => {
		const guards = attachPageGuards(page)

		await page.goto("/core/personnel", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await dismissToasts(page)

		await openDialogByButton(page, "管理群組", "管理群組")
		await assertGroupsMemberPickerLoaded(page)

		await expect(page.getByText("群組", { exact: true }).first()).toBeVisible()
		await expect(page.getByRole("button", { name: "新增主群組" })).toBeVisible()

		await expect(page.getByRole("tree", { name: "人員群組樹" })).toBeVisible()

		await page.getByLabel("搜尋人員").fill("A0001")
		await page.getByLabel("搜尋人員").press("Enter")
		await page.waitForTimeout(500)

		await closeDialogByAria(page)
		await guards.assertClean()
	})
})

const ACCESS_MANAGE_CASES = [
	{
		path: "/access-control/people-counting",
		pageTitle: "門禁管理",
		manageButton: "門禁管理",
		dialogTitle: "門禁管理",
	},
	{
		path: "/access-control/vehicle-access",
		pageTitle: "車輛管理",
		manageButton: "車牌管理",
		dialogTitle: "車牌管理",
	},
	{
		path: "/access-control/elevator",
		pageTitle: "電梯管理",
		manageButton: "樓層管理",
		dialogTitle: "樓層管理",
	},
] as const

test.describe("地點名單 Dialog — Member Picker", () => {
	for (const { path, pageTitle, manageButton, dialogTitle } of ACCESS_MANAGE_CASES) {
		test(`${dialogTitle} ${path}：開啟 picker、不觸發重新同步`, async ({ page }) => {
			const guards = attachPageGuards(page)

			await visitSystemPage(page, {
				path,
				title: pageTitle,
				expectOverview: true,
				expectManageButton: "地點管理",
			})

			const hasLocation = await selectLocationForManageButton(page, manageButton)
			if (!hasLocation) return

			await openDialogByButton(page, manageButton, dialogTitle)

			if (dialogTitle === "樓層管理") {
				const dialog = page.getByRole("dialog")
				const selectedFloor = dialog.getByRole("option", { selected: true })
				if ((await selectedFloor.count()) === 0) {
					await dialog.getByRole("option").first().click({ force: true })
				}
			}

			await assertMemberPickerInDialog(page)

			const dialog = page.getByRole("dialog")
			await expect(dialog.getByRole("button", { name: "套用權限" })).toBeVisible()

			// 不點「重新同步」— 避免設備連線
			const resync = dialog.getByRole("button", { name: "重新同步" })
			if (await resync.isVisible().catch(() => false)) {
				await expect(resync).toBeEnabled()
			}

			await closeDialogByAria(page)
			await guards.assertClean()
		})
	}
})
