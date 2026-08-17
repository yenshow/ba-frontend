import { test } from "@playwright/test"
import {
	attachPageGuards,
	closeDialogByAria,
	openAndCloseFullReport,
	openFloorZoneManagementDialog,
	openZoneManagementDialog,
	visitSystemPage,
} from "./helpers/selectors"

/** 消防／緊急／煙霧：水電同型樓層平面（樓層管理） */
const FLOOR_PAGES = [
	{ path: "/security/fire", title: "消防系統" },
	{ path: "/security/emergency", title: "緊急求救" },
	{ path: "/security/smoke-alarm", title: "煙霧警報" },
] as const

test.describe("安防（環境／消防／緊急／煙霧）", () => {
	test("環境品質 /security/environment：總覽、地點管理、完整報表", async ({ page }) => {
		const guards = attachPageGuards(page)
		await visitSystemPage(page, {
			path: "/security/environment",
			title: "環境品質",
			expectOverview: true,
			expectManageButton: "地點管理",
			expectFullReport: true,
		})
		await openZoneManagementDialog(page)
		await closeDialogByAria(page)
		await openAndCloseFullReport(page, "環境監控 - 完整報表")
		await guards.assertClean()
	})

	for (const { path, title } of FLOOR_PAGES) {
		test(`${title} ${path}：監控中心、樓層管理 → 區域管理`, async ({ page }) => {
			const guards = attachPageGuards(page)
			await visitSystemPage(page, {
				path,
				title,
				expectMonitorCenter: true,
				expectManageButton: "樓層管理",
			})
			await openFloorZoneManagementDialog(page)
			await closeDialogByAria(page)
			await guards.assertClean()
		})
	}
})
