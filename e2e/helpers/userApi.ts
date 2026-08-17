import { expect, type APIRequestContext } from "@playwright/test"
import { CREDENTIALS } from "./selectors"

const apiBase = () => {
	const front = process.env.BA_FRONT_URL || "http://127.0.0.1:3001"
	return `${front.replace(/\/$/, "")}/api`
}

type ApiEnvelope<T> = { success?: boolean; data?: T }

const unwrap = async <T>(
	res: Awaited<ReturnType<APIRequestContext["fetch"]>>,
): Promise<T> => {
	const status = res.status()
	const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T> & {
		message?: string
		code?: string
	}
	expect(res.ok(), `API ${status}: ${body.message || body.code || JSON.stringify(body)}`).toBeTruthy()
	if (body && typeof body === "object" && "data" in body && body.data !== undefined) {
		return body.data as T
	}
	return body as T
}

/** Construction 僅需用戶建刪（P1 account）；不做 zone／設備 CRUD */
export const createManagedUserViaAdmin = async (
	request: APIRequestContext,
	input: { username: string; password: string },
) => {
	const loginRes = await request.post(`${apiBase()}/users/login`, {
		data: { username: CREDENTIALS.username, password: CREDENTIALS.password },
	})
	const loginData = await unwrap<{ token: string }>(loginRes)
	const token = loginData.token
	expect(token).toBeTruthy()
	const headers = {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
	}
	const createRes = await request.post(`${apiBase()}/users`, {
		headers,
		data: { username: input.username, password: input.password, role: "user" },
	})
	const created = await unwrap<{ user: { id: number; username: string } }>(createRes)
	return {
		user: created.user,
		deleteUser: async () => {
			await request.delete(`${apiBase()}/users/${created.user.id}`, { headers }).catch(() => undefined)
		},
	}
}
