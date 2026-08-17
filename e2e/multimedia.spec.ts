import { test, expect } from "@playwright/test"
import { createSettingsApi } from "./helpers/settingsApi"
import {
	attachPageGuards,
	expectStayAuthenticated,
	fillVueInput,
	suppressAlertToasts,
} from "./helpers/selectors"

/**
 * 多媒體：RO 分頁／看板＋橫幅寫入（API 還原）。
 */
test.describe("多媒體資訊", () => {
	test("/multimedia：分頁、基本設定、公告列表、看板連結", async ({ page }) => {
		const guards = attachPageGuards(page)

		await page.goto("/multimedia", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await suppressAlertToasts(page)
		await expect(page).toHaveURL(/\/multimedia\/?$/)
		await expect(page.getByRole("heading", { name: "多媒體資訊", level: 1 })).toBeVisible({
			timeout: 30_000,
		})
		await expect(page.getByRole("link", { name: "開啟資訊牆看板" })).toBeVisible()
		await expect(page.getByRole("button", { name: "儲存" })).toBeVisible()

		const tablist = page.getByRole("tablist", { name: "多媒體資訊分頁" }).first()
		await expect(tablist.getByRole("tab", { name: "基本設定" })).toBeVisible()
		await expect(tablist.getByRole("tab", { name: "公告列表" })).toBeVisible()
		await expect(page.getByRole("heading", { name: "基本設定" })).toBeVisible({
			timeout: 15_000,
		})
		await expect(page.getByRole("heading", { name: "布局橫幅" })).toBeVisible()
		await expect(page.getByRole("heading", { name: "環境資訊來源" })).toBeVisible()

		await suppressAlertToasts(page)
		const contentTab = page.locator("#multimedia-tab-content")
		await expect(async () => {
			await contentTab.click({ force: true })
			await expect(contentTab).toHaveAttribute("aria-selected", "true")
		}).toPass({ timeout: 10_000 })
		await expect(page.getByRole("heading", { name: "社區公告" })).toBeVisible({
			timeout: 15_000,
		})
		await expect(page.getByRole("heading", { name: "今日社區排程" })).toBeVisible()

		await guards.assertClean()
	})

	test("/multimedia：改橫幅文字後還原", async ({ page, request }) => {
		test.setTimeout(90_000)
		const guards = attachPageGuards(page)
		const api = await createSettingsApi(request)
		const original = await api.getMultimediaSettings()
		const base = String(original.bannerMarqueeText ?? "")
		const marker = ` [e2e-${Date.now().toString(36)}]`
		const next = `${base}${marker}`.slice(0, 200)

		try {
			await page.goto("/multimedia", { waitUntil: "domcontentloaded" })
			await expectStayAuthenticated(page)
			await suppressAlertToasts(page)
			await expect(page.getByRole("heading", { name: "布局橫幅" })).toBeVisible({
				timeout: 15_000,
			})

			const banner = page
				.locator("section, div")
				.filter({ has: page.getByRole("heading", { name: "布局橫幅" }) })
				.locator("textarea")
				.first()
			await expect(banner).toBeVisible()
			await fillVueInput(banner, next)
			await page.getByRole("button", { name: "儲存", exact: true }).click({ force: true })

			await expect
				.poll(async () => {
					const saved = await api.getMultimediaSettings()
					return String(saved.bannerMarqueeText ?? "")
				}, { timeout: 20_000 })
				.toContain("e2e-")
		} finally {
			await api
				.putMultimediaSettings({ bannerMarqueeText: original.bannerMarqueeText ?? "" })
				.catch(() => undefined)
		}

		await guards.assertClean()
	})

	test("/multimedia/dashboard：社區公告、環境偵測、今日排程", async ({ page }) => {
		const guards = attachPageGuards(page)

		await page.goto("/multimedia/dashboard", { waitUntil: "domcontentloaded" })
		await expectStayAuthenticated(page)
		await suppressAlertToasts(page)
		await expect(page).toHaveURL(/\/multimedia\/dashboard/)
		await expect(page.getByRole("heading", { name: "社區公告" })).toBeVisible({
			timeout: 30_000,
		})
		await expect(page.getByText("社區環境偵測")).toBeVisible()
		await expect(page.getByRole("heading", { name: "今日社區排程" })).toBeVisible()

		await guards.assertClean()
	})
})
