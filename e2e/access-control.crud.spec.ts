import { test } from "@playwright/test"
import { runZoneSafeCrud } from "./helpers/zoneCrud"
import type { AccessLocationType } from "./helpers/zoneApi"

/**
 * 門禁管制 safe CRUD（區域）：
 * API 建 → UI 可見 → API 改名 → reload UI 可見 → UI 刪。
 */
const ACCESS_PAGES: Array<{
	path: string
	title: string
	locationType: AccessLocationType
}> = [
	{ path: "/access-control/people-counting", title: "門禁管理", locationType: "people_counting" },
	{ path: "/access-control/vehicle-access", title: "車輛管理", locationType: "vehicle_access" },
	{ path: "/access-control/elevator", title: "電梯管理", locationType: "elevator" },
]

test.describe("門禁管制 safe CRUD（區域）", () => {
	test.describe.configure({ timeout: 120_000 })

	for (const { path, title, locationType } of ACCESS_PAGES) {
		test(`${title}：建 → 改名 → 刪`, async ({ page, request }) => {
			await runZoneSafeCrud(page, request, {
				kind: "access",
				path,
				title,
				locationType,
				openDialog: "location",
				nameSuffix: "ac",
			})
		})
	}
})
