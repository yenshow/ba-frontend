import { expect, type APIRequestContext } from "@playwright/test"
import { apiBase, unwrap } from "./http"
import { CREDENTIALS } from "./selectors"

export const loginApiToken = async (request: APIRequestContext): Promise<string> => {
	const res = await request.post(`${apiBase()}/users/login`, {
		data: { username: CREDENTIALS.username, password: CREDENTIALS.password },
	})
	const data = await unwrap<{ token: string } | { token?: string }>(res)
	const token =
		typeof data === "object" && data && "token" in data
			? (data as { token: string }).token
			: undefined
	expect(token, "login token missing").toBeTruthy()
	return token!
}

const authHeaders = (token: string) => ({
	Authorization: `Bearer ${token}`,
	"Content-Type": "application/json",
})

export type E2eApi = {
	token: string
	createPerson: (input: {
		employeeNo: string
		fullName: string
		status?: string
	}) => Promise<{ id: number; employee_no: string; full_name: string }>
	updatePerson: (
		id: number,
		input: { fullName?: string; status?: string },
	) => Promise<{ id: number }>
	deletePerson: (id: number) => Promise<void>
	findPersonByEmployeeNo: (
		employeeNo: string,
	) => Promise<{ id: number; employee_no: string; full_name: string } | null>
	createControllerDevice: (input: {
		name: string
	}) => Promise<{ device: { id: number; name: string } }>
	updateDevice: (id: number, input: { name: string }) => Promise<{ device?: { id: number } }>
	deleteDevice: (id: number) => Promise<void>
	findDeviceByName: (name: string, typeCode?: string) => Promise<{ id: number; name: string } | null>
	createUser: (input: {
		username: string
		password: string
		role?: "admin" | "user"
	}) => Promise<{ user: { id: number; username: string; role: string } }>
	deleteUser: (id: number) => Promise<void>
}

export const createE2eApi = async (request: APIRequestContext): Promise<E2eApi> => {
	const token = await loginApiToken(request)
	const headers = authHeaders(token)

	const createPerson: E2eApi["createPerson"] = async (input) => {
		const res = await request.post(`${apiBase()}/personnel/persons`, {
			headers,
			data: {
				employeeNo: input.employeeNo,
				fullName: input.fullName,
				status: input.status ?? "active",
			},
		})
		return unwrap(res)
	}

	const updatePerson: E2eApi["updatePerson"] = async (id, input) => {
		const res = await request.put(`${apiBase()}/personnel/persons/${id}`, {
			headers,
			data: input,
		})
		return unwrap(res)
	}

	const deletePerson: E2eApi["deletePerson"] = async (id) => {
		const res = await request.delete(`${apiBase()}/personnel/persons/${id}`, { headers })
		await unwrap(res)
	}

	const findPersonByEmployeeNo: E2eApi["findPersonByEmployeeNo"] = async (employeeNo) => {
		const res = await request.get(
			`${apiBase()}/personnel/persons/by-employee-no/${encodeURIComponent(employeeNo)}`,
			{ headers },
		)
		if (res.status() === 404) return null
		return unwrap(res)
	}

	const pickControllerModelId = async (): Promise<number> => {
		const res = await request.get(`${apiBase()}/devices/models?type_code=controller`, {
			headers,
		})
		const data = await unwrap<{ device_models?: Array<{ id: number }> }>(res)
		const models = data.device_models ?? []
		const first = models[0]
		expect(first?.id, "需要至少一個 controller 型號").toBeTruthy()
		return first!.id
	}

	const createControllerDevice: E2eApi["createControllerDevice"] = async (input) => {
		const model_id = await pickControllerModelId()
		const unitId = (Date.now() % 200) + 50
		const res = await request.post(`${apiBase()}/devices`, {
			headers,
			data: {
				name: input.name,
				type_code: "controller",
				model_id,
				config: {
					type: "controller",
					host: "127.0.0.1",
					port: 502,
					unitId,
					username: "e2e",
					password: "e2e",
				},
			},
		})
		const data = await unwrap<{ device: { id: number; name: string } }>(res)
		expect(data.device?.id, "create device id").toBeTruthy()
		return { device: data.device }
	}

	const updateDevice: E2eApi["updateDevice"] = async (id, input) => {
		const res = await request.put(`${apiBase()}/devices/${id}`, {
			headers,
			data: { name: input.name },
		})
		return unwrap(res)
	}

	const deleteDevice: E2eApi["deleteDevice"] = async (id) => {
		const res = await request.delete(`${apiBase()}/devices/${id}`, { headers })
		await unwrap(res)
	}

	const findDeviceByName: E2eApi["findDeviceByName"] = async (name, typeCode = "controller") => {
		const res = await request.get(
			`${apiBase()}/devices?type_code=${encodeURIComponent(typeCode)}&limit=100&offset=0&order=desc`,
			{ headers },
		)
		const data = await unwrap<{ devices: Array<{ id: number; name: string }> }>(res)
		return data.devices?.find((d) => d.name === name) ?? null
	}

	const createUser: E2eApi["createUser"] = async (input) => {
		const res = await request.post(`${apiBase()}/users`, {
			headers,
			data: {
				username: input.username,
				password: input.password,
				role: input.role ?? "user",
			},
		})
		return unwrap(res)
	}

	const deleteUser: E2eApi["deleteUser"] = async (id) => {
		const res = await request.delete(`${apiBase()}/users/${id}`, { headers })
		await unwrap(res)
	}

	return {
		token,
		createPerson,
		updatePerson,
		deletePerson,
		findPersonByEmployeeNo,
		createControllerDevice,
		updateDevice,
		deleteDevice,
		findDeviceByName,
		createUser,
		deleteUser,
	}
}
