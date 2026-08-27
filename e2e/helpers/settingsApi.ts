import { expect, type APIRequestContext } from "@playwright/test"
import { loginApiToken } from "./apiClient"
import { apiBase, unwrap } from "./http"

const authHeaders = (token: string) => ({
	Authorization: `Bearer ${token}`,
	"Content-Type": "application/json",
})

/** 能源／多媒體設定讀寫（測試後還原） */
export const createSettingsApi = async (request: APIRequestContext) => {
	const token = await loginApiToken(request)
	const headers = authHeaders(token)

	const getEnergyConfig = async () => {
		const res = await request.get(`${apiBase()}/energy/settings`, { headers })
		const data = await unwrap<{ config: Record<string, unknown> }>(res)
		expect(data.config, "energy config").toBeTruthy()
		return data.config
	}

	const putEnergyConfig = async (config: Record<string, unknown>) => {
		const res = await request.put(`${apiBase()}/energy/settings`, {
			headers,
			data: config,
		})
		await unwrap(res)
	}

	type EnergyAlertRule = {
		id: number
		dimension_key: string
		enabled: boolean
		condition_type: string
		condition_config: Record<string, unknown>
	}

	const getEnergyAlertRules = async () => {
		const res = await request.get(`${apiBase()}/alerts/rules?source=energy`, { headers })
		const data = await unwrap<{ rules: EnergyAlertRule[] }>(res)
		return data.rules ?? []
	}

	const getMultimediaSettings = async () => {
		const res = await request.get(`${apiBase()}/multimedia/dashboard/settings`, { headers })
		const data = await unwrap<{ settings: Record<string, unknown> }>(res)
		expect(data.settings, "multimedia settings").toBeTruthy()
		return data.settings
	}

	const putMultimediaSettings = async (partial: Record<string, unknown>) => {
		const res = await request.put(`${apiBase()}/multimedia/dashboard/settings`, {
			headers,
			data: partial,
		})
		await unwrap(res)
	}

	const createRecordExportRule = async (input: {
		name: string
		filenamePrefix: string
		localDir: string
		exportTime?: string
	}) => {
		const res = await request.post(`${apiBase()}/record-export/rules`, {
			headers,
			data: {
				eventType: "operational",
				name: input.name,
				filenamePrefix: input.filenamePrefix,
				dateFormat: "yyyy-MM-dd",
				timeFormat: "HHmmss",
				outputFormat: "csv",
				storageType: "local",
				localDir: input.localDir,
				exportTime: input.exportTime ?? "03:17",
				filter: {},
				fields: [{ fieldKey: "summary", headerLabel: "摘要" }],
			},
		})
		const data = await unwrap<{ id: number }>(res)
		expect(data.id, "record-export rule id").toBeTruthy()
		return { id: Number(data.id) }
	}

	const deleteRecordExportRule = async (id: number) => {
		const res = await request.delete(`${apiBase()}/record-export/rules/${id}`, { headers })
		await unwrap(res)
	}

	const listRecordExportRules = async () => {
		const res = await request.get(`${apiBase()}/record-export/rules`, { headers })
		const data = await unwrap<{ rules?: Array<{ id: number; name: string }> }>(res)
		return data.rules ?? []
	}

	return {
		getEnergyConfig,
		putEnergyConfig,
		getEnergyAlertRules,
		getMultimediaSettings,
		putMultimediaSettings,
		createRecordExportRule,
		deleteRecordExportRule,
		listRecordExportRules,
	}
}
