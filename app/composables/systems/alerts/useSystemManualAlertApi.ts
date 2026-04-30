import { useApiBase } from "~/composables/core/useApiBase"

type RuleTriggerPayload = {
	mode: "rule"
	rule: { alert_type: "di" | "do"; bit_key: string }
}

type ManualTriggerPayload = { mode?: "manual" } | Record<string, unknown>

export const useSystemManualAlertApi = (systemRoutePrefix: string) => {
	const { request } = useApiBase()

	const normalizePrefix = (raw: string) => String(raw || "").trim().replace(/^\/+/, "").replace(/\/+$/, "")
	const prefix = normalizePrefix(systemRoutePrefix)

	const triggerManualAlert = async (
		systemId: string | number,
		payload?: RuleTriggerPayload | ManualTriggerPayload
	) => {
		return request<{ ok: boolean }>(`/${prefix}/systems/${systemId}/alarms`, {
			method: "POST",
			body: payload ?? {},
		})
	}

	const clearManualAlert = async (
		systemId: string | number,
		payload?: RuleTriggerPayload | ManualTriggerPayload
	) => {
		return request<{ ok: boolean }>(`/${prefix}/systems/${systemId}/alarms`, {
			method: "DELETE",
			body: payload ?? {},
		})
	}

	return { triggerManualAlert, clearManualAlert }
}

