import { expect, type Locator, type Page } from "@playwright/test"

/** 帳密優先讀 env；未設時僅供本機預設（請以 BA_USERNAME／BA_PASSWORD 覆寫） */
export const CREDENTIALS = {
	username: process.env.BA_USERNAME || "admin",
	password: process.env.BA_PASSWORD || "Aa83124007",
}

export const fillVueInput = async (locator: Locator, value: string) => {
	await locator.evaluate((el, v) => {
		const input = el as HTMLInputElement
		const setter = Object.getOwnPropertyDescriptor(
			window.HTMLInputElement.prototype,
			"value",
		)?.set
		setter?.call(input, v)
		input.dispatchEvent(new Event("input", { bubbles: true }))
		input.dispatchEvent(new Event("change", { bubbles: true }))
	}, value)
	await expect(locator).toHaveValue(value)
}

export const loginViaForm = async (
	page: Page,
	creds: { username: string; password: string } = CREDENTIALS,
) => {
	await page.goto("/login", { waitUntil: "networkidle" }).catch(async () => {
		await page.goto("/login", { waitUntil: "domcontentloaded" })
	})
	const account = page.locator("#login-account")
	const password = page.locator("#login-password")
	await expect(account).toBeVisible({ timeout: 30_000 })
	await expect(account).toBeEditable()
	await fillVueInput(account, creds.username)
	await fillVueInput(password, creds.password)
	await Promise.all([
		page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 45_000 }),
		page.getByRole("button", { name: "登入" }).click(),
	])
}

export const suppressAlertToasts = async (page: Page) => {
	await page.addStyleTag({
		content: `
			[role="alert"] {
				display: none !important;
				pointer-events: none !important;
				visibility: hidden !important;
			}
		`,
	})
}

export const attachPageGuards = (page: Page) => {
	const pageErrors: string[] = []
	page.on("pageerror", (err) => {
		pageErrors.push(err.message)
	})
	return {
		assertClean: async () => {
			expect(pageErrors, `pageerror: ${pageErrors.join("; ")}`).toEqual([])
		},
	}
}

export const expectStayAuthenticated = async (page: Page) => {
	await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
}

export const closeDialogByAria = async (page: Page) => {
	await suppressAlertToasts(page)
	const close = page.getByRole("button", { name: "關閉對話框" }).first()
	if ((await close.count()) === 0) return
	await close.click({ force: true })
	const unsaved = page.locator(".dialog-panel-bg").filter({ hasText: "尚未儲存" }).last()
	if (await unsaved.isVisible().catch(() => false)) {
		await unsaved.getByRole("button", { name: "確定", exact: true }).click({ force: true })
	}
}

export const openZoneManagementByButton = async (page: Page, buttonName: string) => {
	await suppressAlertToasts(page)
	const btn = page.getByRole("button", { name: buttonName, exact: true })
	const heading = page.getByRole("heading", { name: "區域管理" })
	await expect(btn).toBeVisible({ timeout: 15_000 })
	await expect(async () => {
		if (await heading.isVisible().catch(() => false)) return
		await btn.click({ force: true })
		await expect(heading).toBeVisible({ timeout: 1_500 })
	}).toPass({ timeout: 12_000 })
}

/** 完整報表開／關（不操作匯出；與 Central 慣例鏡像） */
export const openAndCloseFullReport = async (page: Page, reportTitle: string | RegExp) => {
	await suppressAlertToasts(page)
	const btn = page.getByRole("button", { name: "開啟完整報表" })
	await expect(btn).toBeVisible({ timeout: 15_000 })
	const dialog = page.getByRole("dialog", { name: reportTitle })
	await expect(async () => {
		if (await dialog.isVisible().catch(() => false)) return
		await btn.click({ force: true })
		await expect(dialog).toBeVisible({ timeout: 1_500 })
	}).toPass({ timeout: 12_000 })
	await dialog.getByRole("button", { name: "關閉完整報表" }).click({ force: true })
	await expect(dialog).toBeHidden({ timeout: 10_000 })
}

export const confirmDangerDialog = async (
	page: Page,
	confirmButtonName: string | RegExp = "確定",
) => {
	await suppressAlertToasts(page)
	const panel = page.locator(".dialog-panel-bg").filter({ hasText: "確認刪除" }).last()
	await expect(panel.getByRole("heading", { name: "確認刪除" })).toBeVisible({
		timeout: 10_000,
	})
	await panel.getByRole("button", { name: confirmButtonName, exact: true }).click({ force: true })
}

export const zoneManagementPanel = (page: Page) =>
	page.locator(".dialog-panel-bg").filter({ hasText: "區域管理" }).first()

export const deleteZoneInDialog = async (page: Page, zoneName: string) => {
	await suppressAlertToasts(page)
	const panel = zoneManagementPanel(page)
	const card = panel
		.locator("div")
		.filter({ has: page.getByRole("heading", { name: zoneName, exact: true }) })
		.filter({ has: page.getByRole("button", { name: "刪除區域" }) })
		.first()
	await expect(card).toBeVisible({ timeout: 15_000 })
	await card.getByRole("button", { name: "刪除區域" }).click({ force: true })
	await confirmDangerDialog(page, "確定")
	await expect(panel.getByRole("heading", { name: zoneName, exact: true })).toHaveCount(0, {
		timeout: 20_000,
	})
}
