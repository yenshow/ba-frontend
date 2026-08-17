import { test } from "@playwright/test"
import { runZoneSafeCrud } from "./helpers/zoneCrud"
import type { AccessLocationType } from "./helpers/zoneApi"

/**
 * 安防 safe CRUD（區域）：API 建 → UI 可見 → API 改名 → UI 刪。
 * 環境＝地點管理；消防／緊急／煙霧＝樓層管理。
 */
const SECURITY_PAGES: Array<{
	path: string
	title: string
	locationType: AccessLocationType
	openDialog: "location" | "floor"
}> = [
	{
		path: "/security/environment",
		title: "環境品質",
		locationType: "environment",
		openDialog: "location",
	},
	{ path: "/security/fire", title: "消防系統", locationType: "fire", openDialog: "floor" },
	{
		path: "/security/emergency",
		title: "緊急求救",
		locationType: "emergency_rescue",
		openDialog: "floor",
	},
	{
		path: "/security/smoke-alarm",
		title: "煙霧警報",
		locationType: "smoke_alarm",
		openDialog: "floor",
	},
]

test.describe("安防 safe CRUD（區域）", () => {
	test.describe.configure({ timeout: 120_000 })

	for (const pageCfg of SECURITY_PAGES) {
		test(`${pageCfg.title}：建 → 改名 → 刪`, async ({ page, request }) => {
			await runZoneSafeCrud(page, request, {
				kind: "access",
				path: pageCfg.path,
				title: pageCfg.title,
				locationType: pageCfg.locationType,
				openDialog: pageCfg.openDialog,
				nameSuffix: "sec",
			})
		})
	}
})
