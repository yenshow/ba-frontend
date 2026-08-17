import { defineConfig, devices } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.join(__dirname, "e2e/.auth/user.json")

/**
 * Construction E2E：假設本機已啟動後端 :4000 與 Construction :3001。
 */
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	timeout: 60_000,
	expect: { timeout: 15_000 },
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: process.env.BA_FRONT_URL || "http://127.0.0.1:3001",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		locale: "zh-TW",
		viewport: { width: 1440, height: 900 },
	},
	projects: [
		{ name: "setup", testMatch: /auth\.setup\.ts/ },
		{
			name: "login",
			testMatch: /login\.spec\.ts|account\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
				storageState: { cookies: [], origins: [] },
			},
		},
		{
			name: "chromium",
			dependencies: ["setup"],
			testIgnore: /auth\.setup\.ts|login\.spec\.ts|account\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
				storageState: authFile,
			},
		},
		{
			name: "firefox-smoke",
			dependencies: ["setup"],
			testMatch: /smoke\.spec\.ts/,
			grep: /首頁載入/,
			use: {
				...devices["Desktop Firefox"],
				storageState: authFile,
			},
		},
		{
			name: "webkit-smoke",
			dependencies: ["setup"],
			testMatch: /smoke\.spec\.ts/,
			grep: /首頁載入/,
			use: {
				...devices["Desktop WebKit"],
				storageState: authFile,
			},
		},
	],
})
