import { test } from "@playwright/test"
import { runZoneSafeCrud } from "./helpers/zoneCrud"
import type { InfraZoneSystem } from "./helpers/zoneApi"

/**
 * 水電設施 safe CRUD（區域）：API 建 → UI 可見 → API 改名 → UI 刪。
 * 能源管理為 Dashboard／設定，不做區域 CRUD。
 */
const INFRA_PAGES: Array<{ path: string; title: string; system: InfraZoneSystem }> = [
	{ path: "/utilities/lighting", title: "照明系統", system: "lighting" },
	{ path: "/utilities/hvac", title: "空調系統", system: "hvac" },
	{ path: "/utilities/power", title: "電力系統", system: "power" },
	{ path: "/utilities/drainage", title: "排水系統", system: "drainage" },
	{ path: "/utilities/air-circulation", title: "空氣循環", system: "air-circulation" },
]

test.describe("水電設施 safe CRUD（區域）", () => {
	test.describe.configure({ timeout: 120_000 })

	for (const { path, title, system } of INFRA_PAGES) {
		test(`${title}：建 → 改名 → 刪`, async ({ page, request }) => {
			await runZoneSafeCrud(page, request, {
				kind: "infra",
				path,
				title,
				system,
				nameSuffix: "ut",
			})
		})
	}
})
