import { test as setup, expect } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { CREDENTIALS } from "./helpers/selectors"

const authFile = path.join(path.dirname(fileURLToPath(import.meta.url)), ".auth/user.json")

setup("authenticate", async ({ page, request }) => {
	const baseURL = process.env.BA_FRONT_URL || "http://127.0.0.1:3001"
	const res = await request.post(`${baseURL}/api/users/login`, {
		data: { username: CREDENTIALS.username, password: CREDENTIALS.password },
	})
	expect(res.ok(), `login HTTP ${res.status()}`).toBeTruthy()

	const body = (await res.json()) as {
		data?: { user: { id: number; username: string; role: string; status: string }; token: string }
		user?: { id: number; username: string; role: string; status: string }
		token?: string
	}
	const user = body.data?.user ?? body.user
	const token = body.data?.token ?? body.token
	expect(user?.username && token).toBeTruthy()

	await page.context().addCookies([
		{ name: "auth_token", value: token!, url: baseURL, sameSite: "Lax" },
		{
			name: "auth_user",
			value: JSON.stringify({
				id: user!.id,
				username: user!.username,
				role: user!.role,
				status: user!.status,
			}),
			url: baseURL,
			sameSite: "Lax",
		},
	])

	await page.goto("/", { waitUntil: "domcontentloaded" })
	await expect(page).not.toHaveURL(/\/login/)
	await page.context().storageState({ path: authFile })
})
