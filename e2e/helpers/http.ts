import { expect, type APIRequestContext } from "@playwright/test"

export const apiBase = () => {
	const front = process.env.BA_FRONT_URL || "http://127.0.0.1:3001"
	return `${front.replace(/\/$/, "")}/api`
}

type ApiEnvelope<T> = { success?: boolean; data?: T }

export const unwrap = async <T>(
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
