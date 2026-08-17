import { test } from "@playwright/test"
import {
	attachPageGuards,
	closeDialogByAria,
	openAndCloseFullReport,
	openZoneManagementDialog,
	visitSystemPage,
} from "./helpers/selectors"

/** 門禁／車輛／電梯：監控頁 RO（含完整報表開／關） */
const MONITORING_PAGES = [
	{
		path: "/access-control/people-counting",
		title: "門禁管理",
		report: "門禁管理 - 完整報表",
	},
	{
		path: "/access-control/vehicle-access",
		title: "車輛管理",
		report: "車輛進出 - 完整報表",
	},
	{
		path: "/access-control/elevator",
		title: "電梯管理",
		report: "電梯管理 - 完整報表",
	},
] as const

test.describe("門禁管制（監控頁）", () => {
	for (const { path, title, report } of MONITORING_PAGES) {
		test(`${title} ${path}：總覽、區域管理、完整報表`, async ({ page }) => {
			const guards = attachPageGuards(page)
			await visitSystemPage(page, {
				path,
				title,
				expectOverview: true,
				expectManageButton: "地點管理",
				expectFullReport: true,
			})
			await openZoneManagementDialog(page)
			await closeDialogByAria(page)
			await openAndCloseFullReport(page, report)
			await guards.assertClean()
		})
	}
})
