import { expect, type Locator, type Page } from "@playwright/test"

/** 帳密優先讀 env；未設時僅供本機預設（請以 BA_USERNAME／BA_PASSWORD 覆寫） */
export const CREDENTIALS = {
	username: process.env.BA_USERNAME || "admin",
	password: process.env.BA_PASSWORD || "Aa83124007",
}

/** Vue 受控 input／textarea：Native value setter（勿先 click／fill 空字串，會清掉 v-model） */
export const fillVueInput = async (locator: Locator, value: string) => {
	await locator.evaluate((el, v) => {
		const input = el as HTMLInputElement | HTMLTextAreaElement
		const proto =
			input instanceof HTMLTextAreaElement
				? window.HTMLTextAreaElement.prototype
				: window.HTMLInputElement.prototype
		const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
		setter?.call(input, v)
		input.dispatchEvent(new Event("input", { bubbles: true }))
		input.dispatchEvent(new Event("change", { bubbles: true }))
	}, value)
	await expect(locator).toHaveValue(value)
}

/** 表單登入（無 storageState；用於 login.spec） */
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

/** 隱藏警報 toast，避免 z-9999 攔截點擊（WS 會持續推播） */
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

/** 等 URL 穩定後確認仍在已登入區（非瞬間 snapshot） */
export const expectStayAuthenticated = async (page: Page) => {
	await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
}

/** 警報 toast（z-9999）會擋住點擊；關閉後再以 CSS 持續隱藏 */
export const dismissToasts = async (page: Page) => {
	for (let i = 0; i < 8; i++) {
		const closes = page.locator('[role="alert"] button[aria-label="關閉"]')
		const n = await closes.count()
		if (n === 0) break
		for (let j = n - 1; j >= 0; j--) {
			await closes.nth(j).click({ force: true }).catch(() => undefined)
		}
	}
	await suppressAlertToasts(page)
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

export const openDialogByButton = async (
	page: Page,
	buttonName: string | RegExp,
	dialogHeading: string | RegExp,
) => {
	await dismissToasts(page)
	const btn = page.getByRole("button", { name: buttonName }).first()
	const heading = page.getByRole("heading", { name: dialogHeading })
	await expect(btn).toBeVisible({ timeout: 15_000 })
	await expect(async () => {
		if (await heading.isVisible().catch(() => false)) return
		await btn.click()
		await expect(heading).toBeVisible({ timeout: 1_500 })
	}).toPass({ timeout: 12_000 })
}

/** 確認刪除 Dialog（ConfirmDialog：標題「確認刪除」） */
export const confirmDangerDialog = async (
	page: Page,
	confirmButtonName: string | RegExp = "確定",
) => {
	await dismissToasts(page)
	const panel = page.locator(".dialog-panel-bg").filter({ hasText: "確認刪除" }).last()
	await expect(panel.getByRole("heading", { name: "確認刪除" })).toBeVisible({
		timeout: 10_000,
	})
	await panel.getByRole("button", { name: confirmButtonName, exact: true }).click({ force: true })
}

export const rowContainingText = (page: Page, text: string) =>
	page.locator("main table tbody tr").filter({ hasText: text }).first()

/** 等列表區就緒（避開 onMounted／首屏 load 與第一次 Tab 點擊的 race） */
export const waitForMainListReady = async (page: Page) => {
	await expect(
		page
			.getByText("尚無設備資料")
			.or(page.getByText("尚無人員"))
			.or(page.locator("main table").first()),
	).toBeVisible({ timeout: 30_000 })
}

/** 設備類型 Tab：必要時重試（首擊偶發無效） */
export const selectDeviceTypeTab = async (page: Page, typeCode: string, heading: string) => {
	await dismissToasts(page)
	await waitForMainListReady(page)
	const tab = page.locator(`#device-tab-${typeCode}`)
	await expect(tab).toBeVisible({ timeout: 15_000 })
	await expect(async () => {
		await tab.click({ force: true })
		await expect(tab).toHaveAttribute("aria-selected", "true")
	}).toPass({ timeout: 10_000 })
	await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout: 15_000 })
}

/** Vue 受控 input：fill 後再確認值並 Enter 搜尋 */
export const searchByLabel = async (page: Page, label: string, query: string) => {
	await dismissToasts(page)
	const input = page.getByLabel(label)
	await expect(input).toBeVisible({ timeout: 15_000 })
	await fillVueInput(input, query)
	const personsResponse = page.waitForResponse(
		(res) =>
			res.url().includes("/api/personnel/persons") &&
			res.request().method() === "GET" &&
			res.ok(),
		{ timeout: 20_000 },
	)
	await input.press("Enter")
	await personsResponse
}

/**
 * ZoneManagementDialog：依入口按鈕開啟（門禁＝地點管理；水電 infra＝樓層管理）
 */
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

/** 門禁／車輛／電梯／環境：按鈕「地點管理」→「區域管理」 */
export const openZoneManagementDialog = (page: Page) =>
	openZoneManagementByButton(page, "地點管理")

/** 水電／消防／緊急／煙霧：按鈕「樓層管理」→「區域管理」 */
export const openFloorZoneManagementDialog = (page: Page) =>
	openZoneManagementByButton(page, "樓層管理")

/** 區域管理 Dialog 面板 */
export const zoneManagementPanel = (page: Page) =>
	page.locator(".dialog-panel-bg").filter({ hasText: "區域管理" }).first()

/** 區域管理 Dialog 內：刪除指定區域並確認 */
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

/** 完整報表 SimulationFrame：開啟後關閉（不操作匯出） */
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

export type VisitSystemPageOpts = {
	path: string
	title: string
	/** 預設 true：斷言 `.system-title`；false 則用 h1 */
	titleInSystemChrome?: boolean
	expectOverview?: boolean
	expectMonitorCenter?: boolean
	expectManageButton?: "地點管理" | "樓層管理"
	expectFullReport?: boolean
}

/** 業務監控／樓層頁共用載入斷言 */
export const visitSystemPage = async (page: Page, opts: VisitSystemPageOpts) => {
	await page.goto(opts.path, { waitUntil: "domcontentloaded" })
	await expectStayAuthenticated(page)
	await suppressAlertToasts(page)
	await expect(page).toHaveURL(new RegExp(opts.path.replace(/\//g, "\\/")))
	if (opts.titleInSystemChrome === false) {
		await expect(page.getByRole("heading", { name: opts.title, level: 1 })).toBeVisible({
			timeout: 30_000,
		})
	} else {
		await expect(page.locator(".system-title").getByText(opts.title)).toBeVisible({
			timeout: 30_000,
		})
	}
	if (opts.expectOverview) {
		await expect(page.getByRole("heading", { name: "總覽" })).toBeVisible({ timeout: 20_000 })
	}
	if (opts.expectMonitorCenter) {
		await expect(page.getByRole("heading", { name: "監控中心" })).toBeVisible({
			timeout: 20_000,
		})
	}
	if (opts.expectManageButton) {
		await expect(page.getByRole("button", { name: opts.expectManageButton })).toBeVisible({
			timeout: 20_000,
		})
	}
	if (opts.expectFullReport) {
		await expect(page.getByRole("button", { name: "開啟完整報表" })).toBeVisible()
	}
}
