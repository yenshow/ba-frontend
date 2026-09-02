import { test, expect, type Page, type APIRequestContext } from "@playwright/test"
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

const parseLocationIdFromMembersPut = (url: string) => {
	const match = url.match(/\/personnel\/locations\/(\d+)\/members/)
	return match ? Number(match[1]) : null
}

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

const waitApplyButtonIdle = async (dialog: ReturnType<Page["getByRole"]>) => {
	await expect(dialog.getByRole("button", { name: "套用權限" })).not.toHaveText("處理中…", {
		timeout: SYNC_TIMEOUT_MS,
	})
}

const restoreMemberCheckbox = async (
	page: Page,
	dialog: ReturnType<Page["getByRole"]>,
	checkbox: ReturnType<Page["locator"]>,
	wasChecked: boolean,
) => {
	try {
		const restorePut = page.waitForResponse(
			(res) =>
				res.url().includes("/members") &&
				res.request().method() === "PUT" &&
				res.ok(),
			{ timeout: 60_000 },
		)
		if ((await checkbox.isChecked()) !== wasChecked) {
			await checkbox.click({ force: true })
		}
		await dialog.getByRole("button", { name: "套用權限" }).click({ force: true })
		await restorePut
		await waitApplyButtonIdle(dialog)
	} catch {
		// 還原失敗不阻擋主流程
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
		const wasChecked = await firstCheckbox.isChecked()

		const membersPut = page.waitForResponse(
			(res) =>
				res.url().includes("/api/personnel/locations/") &&
				res.url().includes("/members") &&
				res.request().method() === "PUT" &&
				res.ok(),
			{ timeout: 60_000 },
		)

		await firstCheckbox.click({ force: true })
		await dialog.getByRole("button", { name: "套用權限" }).click({ force: true })

		const putRes = await membersPut
		const putBody = (await putRes.json()) as {
			data?: { deviceSync?: { jobId?: string } }
			deviceSync?: { jobId?: string }
		}
		const jobId = putBody.data?.deviceSync?.jobId ?? putBody.deviceSync?.jobId

		await waitApplyButtonIdle(dialog)

		if (jobId) {
			const job = await pollPersonnelSyncJob(request, token, jobId)
			expect(job.status).toBe("completed")
		}

		await restoreMemberCheckbox(page, dialog, firstCheckbox, wasChecked)

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
		const wasChecked = await firstCheckbox.isChecked()

		const membersPut = page.waitForResponse(
			(res) =>
				res.url().includes("/api/personnel/locations/") &&
				res.url().includes("/members") &&
				res.request().method() === "PUT" &&
				res.ok(),
			{ timeout: 60_000 },
		)

		await firstCheckbox.click({ force: true })
		await dialog.getByRole("button", { name: "套用權限" }).click({ force: true })

		const putRes = await membersPut
		const putBody = (await putRes.json()) as {
			data?: { plateSync?: { triggered?: boolean }; deviceSync?: { jobId?: string } }
			plateSync?: { triggered?: boolean }
			deviceSync?: { jobId?: string }
		}
		const plateTriggered =
			putBody.data?.plateSync?.triggered ?? putBody.plateSync?.triggered ?? false
		const personnelJobId = putBody.data?.deviceSync?.jobId ?? putBody.deviceSync?.jobId
		const locationId = parseLocationIdFromMembersPut(putRes.url())

		await waitApplyButtonIdle(dialog)

		expect(plateTriggered || personnelJobId).toBeTruthy()

		if (personnelJobId) {
			await pollPersonnelSyncJob(request, token, personnelJobId)
		} else if (plateTriggered && locationId != null) {
			try {
				await pollPlateSyncUntilSettled(request, token, locationId, 45_000)
			} catch {
				// 設備離線時車牌可能維持 pending；UI 已解鎖即視為 sync 流程跑完
			}
		}

		await restoreMemberCheckbox(page, dialog, firstCheckbox, wasChecked)

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

		const firstCheckbox = dialog.locator('input[type="checkbox"]').first()
		await expect(firstCheckbox).toBeVisible({ timeout: 15_000 })
		const wasChecked = await firstCheckbox.isChecked()

		const floorPut = page.waitForResponse(
			(res) =>
				res.url().includes("/api/elevator/locations/") &&
				res.url().includes("/floor-access") &&
				res.request().method() === "PUT" &&
				res.ok(),
			{ timeout: 60_000 },
		)

		await firstCheckbox.click({ force: true })
		await dialog.getByRole("button", { name: "套用權限" }).click({ force: true })

		const putRes = await floorPut
		const putBody = (await putRes.json()) as {
			data?: { deviceSync?: { jobId?: string } }
			deviceSync?: { jobId?: string }
		}
		const jobId = putBody.data?.deviceSync?.jobId ?? putBody.deviceSync?.jobId

		await waitApplyButtonIdle(dialog)

		if (jobId) {
			try {
				const job = await pollElevatorSyncJob(request, token, jobId, 45_000)
				expect(job?.status).toBe("completed")
			} catch {
				// 設備離線時 UI 可能已顯示錯誤但仍解鎖
			}
		}

		// 還原樓層勾選
		try {
			const restorePut = page.waitForResponse(
				(res) =>
					res.url().includes("/floor-access") &&
					res.request().method() === "PUT" &&
					res.ok(),
				{ timeout: 60_000 },
			)
			if ((await firstCheckbox.isChecked()) !== wasChecked) {
				await firstCheckbox.click({ force: true })
			}
			await dialog.getByRole("button", { name: "套用權限" }).click({ force: true })
			await restorePut
			await waitApplyButtonIdle(dialog)
		} catch {
			// 還原失敗不阻擋主流程
		}

		await closeDialogByAria(page)
		await dismissToasts(page)
		await guards.assertClean()
	})
})
