import { test, expect, type Page, type Locator, type APIRequestContext } from "@playwright/test"
import { apiBase, unwrap } from "./helpers/http"
import { loginApiToken } from "./helpers/apiClient"
import {
	attachPageGuards,
	closeDialogByAria,
	dismissToasts,
	openDialogByButton,
	visitSystemPage,
} from "./helpers/selectors"

const SYNC_TIMEOUT_MS = 120_000

const pollPersonnelSyncJob = async (
	request: APIRequestContext,
	token: string,
	jobId: string,
	timeoutMs = SYNC_TIMEOUT_MS,
) => {
	const started = Date.now()
	while (Date.now() - started < timeoutMs) {
		const res = await request.get(
			`${apiBase()}/personnel/sync-location/jobs/${encodeURIComponent(jobId)}`,
			{ headers: { Authorization: `Bearer ${token}` } },
		)
		const job = await unwrap<{ status: string; error?: { message?: string } | string }>(res)
		if (job.status === "completed") return job
		await new Promise((r) => setTimeout(r, 2000))
	}
	throw new Error(`personnel sync job timeout: ${jobId}`)
}

const pollElevatorSyncJob = async (
	request: APIRequestContext,
	token: string,
	jobId: string,
	timeoutMs = SYNC_TIMEOUT_MS,
) => {
	const started = Date.now()
	while (Date.now() - started < timeoutMs) {
		const res = await request.get(
			`${apiBase()}/elevator/sync-location/jobs/${encodeURIComponent(jobId)}`,
			{ headers: { Authorization: `Bearer ${token}` } },
		)
		const raw = await unwrap<{ job?: { status: string; error?: string } }>(res)
		const job = raw?.job ?? (raw as { status?: string; error?: string })
		if (job?.status === "completed") return job
		await new Promise((r) => setTimeout(r, 2000))
	}
	throw new Error(`elevator sync job timeout: ${jobId}`)
}

const pollPlateSyncUntilSettled = async (
	request: APIRequestContext,
	token: string,
	locationId: number,
	timeoutMs = SYNC_TIMEOUT_MS,
) => {
	const started = Date.now()
	while (Date.now() - started < timeoutMs) {
		const res = await request.get(
			`${apiBase()}/personnel/locations/${locationId}/license-plates`,
			{ headers: { Authorization: `Bearer ${token}` } },
		)
		const data = await unwrap<{ items?: Array<{ isapi_sync_status?: string }> }>(res)
		const rows = data?.items ?? []
		const hasPending = rows.some(
			(row) => String(row.isapi_sync_status || "").toLowerCase() === "pending",
		)
		if (!hasPending) return rows
		await new Promise((r) => setTimeout(r, 2000))
	}
	throw new Error(`plate sync poll timeout: location ${locationId}`)
}

const membersEndpoint = /^\/api\/personnel\/locations\/(\d+)\/members$/
const floorsEndpoint = /^\/api\/elevator\/locations\/(\d+)\/floor-access$/

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
	test.skip(true, `${manageButton} 按鈕不可用`)
	return false
}

const withPermissionChange = async (
	page: Page,
	dialog: Locator,
	checkbox: Locator,
	endpoint: RegExp,
	verify: (sync: {
		jobId?: string
		plateTriggered?: boolean
		locationId: number
	}) => Promise<void>,
) => {
	const warnings = page.getByRole("dialog", { name: "同步結果與警告", exact: true })
	await page.addLocatorHandler(warnings, async () => {
		await warnings.getByRole("button", { name: "關閉", exact: true }).click()
	})
	const apply = dialog.getByRole("button", { name: "套用權限", exact: true })
	const original = await checkbox.isChecked()
	const submit = async (checked: boolean) => {
		await checkbox.setChecked(checked, { timeout: 30_000 })
		const [response] = await Promise.all([
			page.waitForResponse(
				(res) => res.request().method() === "PUT" && endpoint.test(new URL(res.url()).pathname),
				{ timeout: 30_000 },
			),
			apply.click({ timeout: 30_000 }),
		])
		expect(response.status(), response.ok() ? undefined : await response.text()).toBe(200)
		return response
	}

	try {
		const response = await submit(!original)
		const body = (await response.json()) as { data: {
			deviceSync?: { jobId?: string }
			plateSync?: { triggered?: boolean }
		} }
		await verify({
			jobId: body.data.deviceSync?.jobId,
			plateTriggered: body.data.plateSync?.triggered,
			locationId: Number(new URL(response.url()).pathname.match(endpoint)?.[1]),
		})
	} finally {
		try {
			await test.step("還原權限", async () => {
				await submit(original)
				await expect(apply).toBeEnabled({ timeout: 30_000 })
			})
		} finally {
			await page.removeLocatorHandler(warnings)
		}
	}
}

test.describe("地點名單 — 修改 + 設備同步", () => {
	test.setTimeout(180_000)

	test("門禁管理：勾選變更 → 套用權限 → 等待 sync job", async ({ page, request }) => {
		const guards = attachPageGuards(page)
		const token = await loginApiToken(request)

		await visitSystemPage(page, {
			path: "/access-control/people-counting",
			title: "門禁管理",
			expectOverview: true,
			expectManageButton: "地點管理",
		})

		if (!(await selectLocationForManageButton(page, "門禁管理"))) return

		await openDialogByButton(page, "門禁管理", "門禁管理")
		const dialog = page.getByRole("dialog")
		await expect(dialog.getByLabel("搜尋人員")).toBeVisible({ timeout: 20_000 })

		const firstCheckbox = dialog.locator('input[type="checkbox"]').first()
		await expect(firstCheckbox).toBeVisible({ timeout: 15_000 })
		await withPermissionChange(page, dialog, firstCheckbox, membersEndpoint, async ({ jobId }) => {
			if (jobId) await pollPersonnelSyncJob(request, token, jobId)
		})

		await closeDialogByAria(page)
		await dismissToasts(page)
		await guards.assertClean()
	})

	test("車牌管理：勾選變更 → 套用權限 → 等待車牌 sync", async ({ page, request }) => {
		const guards = attachPageGuards(page)
		const token = await loginApiToken(request)

		await visitSystemPage(page, {
			path: "/access-control/vehicle-access",
			title: "車輛管理",
			expectOverview: true,
			expectManageButton: "地點管理",
		})

		if (!(await selectLocationForManageButton(page, "車牌管理"))) return

		await openDialogByButton(page, "車牌管理", "車牌管理")
		const dialog = page.getByRole("dialog")
		await expect(dialog.getByLabel("搜尋人員")).toBeVisible({ timeout: 20_000 })

		const firstCheckbox = dialog.locator('input[type="checkbox"]').first()
		await expect(firstCheckbox).toBeVisible({ timeout: 15_000 })
		await withPermissionChange(
			page,
			dialog,
			firstCheckbox,
			membersEndpoint,
			async ({ jobId, plateTriggered, locationId }) => {
				expect(plateTriggered || jobId).toBeTruthy()
				if (jobId) await pollPersonnelSyncJob(request, token, jobId)
				else await pollPlateSyncUntilSettled(request, token, locationId, 45_000)
			},
		)

		await closeDialogByAria(page)
		await dismissToasts(page)
		await guards.assertClean()
	})

	test("樓層管理：勾選變更 → 套用權限 → 等待梯控 sync job", async ({ page, request }) => {
		const guards = attachPageGuards(page)
		const token = await loginApiToken(request)

		await visitSystemPage(page, {
			path: "/access-control/elevator",
			title: "電梯管理",
			expectOverview: true,
			expectManageButton: "地點管理",
		})

		if (!(await selectLocationForManageButton(page, "樓層管理"))) return

		await openDialogByButton(page, "樓層管理", "樓層管理")
		const dialog = page.getByRole("dialog")
		await expect(dialog.getByLabel("搜尋人員")).toBeVisible({ timeout: 20_000 })

		const firstPerson = dialog.locator('input[type="checkbox"]').first()
		await expect(firstPerson).toBeVisible({ timeout: 15_000 })
		await firstPerson.check()

		const firstFloor = dialog.getByRole("checkbox", { name: /^授權 / }).first()
		await expect(firstFloor).toBeVisible({ timeout: 15_000 })
		await withPermissionChange(page, dialog, firstFloor, floorsEndpoint, async ({ jobId }) => {
			if (jobId) await pollElevatorSyncJob(request, token, jobId, 45_000)
		})

		await closeDialogByAria(page)
		await dismissToasts(page)
		await guards.assertClean()
	})
})
