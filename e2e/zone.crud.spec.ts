import { test, expect } from "@playwright/test"
import { createE2eZoneApi, type AccessLocationType } from "./helpers/zoneApi"
import { makeE2eTag } from "./helpers/testData"
import {
	attachPageGuards,
	closeDialogByAria,
	deleteZoneInDialog,
	expectStayAuthenticated,
	openZoneManagementByButton,
	suppressAlertToasts,
	zoneManagementPanel,
} from "./helpers/selectors"

/**
 * Construction 區域 safe CRUD（僅四業務中有地點管理的三頁）。
 * API 建 → UI 可見 → API 改名 → UI 刪。
 */
const ZONE_PAGES: Array<{
	path: string
	name: string
	locationType: AccessLocationType
}> = [
	{
		path: "/access-control/people-counting",
		name: "人流統計",
		locationType: "people_counting",
	},
	{
		path: "/access-control/vehicle-access",
		name: "車輛管理",
		locationType: "vehicle_access",
	},
	{
		path: "/security/environment",
		name: "環境品質",
		locationType: "environment",
	},
]

test.describe("Construction 區域 safe CRUD", () => {
	test.describe.configure({ timeout: 120_000 })

	for (const { path, name, locationType } of ZONE_PAGES) {
		test(`${name}：建 → 改名 → 刪`, async ({ page, request }) => {
			const guards = attachPageGuards(page)
			const api = await createE2eZoneApi(request)
			const tag = makeE2eTag()
			const nameCreate = `${tag}-cz`
			const nameUpdated = `${tag}-cz-改`
			let zoneId: string | null = null

			try {
				const created = await api.createAccessZone(locationType, nameCreate)
				zoneId = created.id

				await page.goto(path, { waitUntil: "domcontentloaded" })
				await expectStayAuthenticated(page)
				await suppressAlertToasts(page)
				await expect(page.getByRole("heading", { name: "總覽" })).toBeVisible({
					timeout: 30_000,
				})

				await openZoneManagementByButton(page, "地點管理")
				await expect(
					zoneManagementPanel(page).getByRole("heading", { name: nameCreate, exact: true }),
				).toBeVisible({ timeout: 15_000 })
				await closeDialogByAria(page)

				await api.renameAccessZone(locationType, zoneId, nameUpdated)
				await page.reload({ waitUntil: "domcontentloaded" })
				await suppressAlertToasts(page)
				await openZoneManagementByButton(page, "地點管理")
				await expect(
					zoneManagementPanel(page).getByRole("heading", { name: nameUpdated, exact: true }),
				).toBeVisible({ timeout: 15_000 })

				await deleteZoneInDialog(page, nameUpdated)
				zoneId = null
				await closeDialogByAria(page)
			} finally {
				if (zoneId != null) {
					await api.deleteAccessZone(locationType, zoneId).catch(() => undefined)
				} else {
					const leftover =
						(await api.findAccessZoneByName(locationType, nameCreate).catch(() => null)) ||
						(await api.findAccessZoneByName(locationType, nameUpdated).catch(() => null))
					if (leftover?.id) {
						await api.deleteAccessZone(locationType, leftover.id).catch(() => undefined)
					}
				}
			}

			await guards.assertClean()
		})
	}
})
