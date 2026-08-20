export const normalizeAlertRuleCameraDeviceIds = (
	ids: Array<number | null | undefined>,
): number[] =>
	ids
		.map((v) => (v == null ? null : Number(v)))
		.filter((n): n is number => n != null && Number.isFinite(n) && n > 0)

/** 去重後的正整數 id 清單（門禁／語音廣播連動用） */
export const normalizeAlertRuleDeviceIds = (
	ids: Array<number | null | undefined>,
): number[] => [...new Set(normalizeAlertRuleCameraDeviceIds(ids))]

/** @deprecated 請改用 normalizeAlertRuleDeviceIds */
export const normalizeAlertRuleAccessDeviceIds = normalizeAlertRuleDeviceIds

export const parseAlertRuleEmailsFromText = (text: string): string[] =>
	String(text || "")
		.split(/\r?\n|,|;/g)
		.map((v) => v.trim())
		.filter(Boolean)

export type AlertRuleEmailValidationInput = {
	smtp_host: string
	smtp_port: number
	smtp_user: string
	to_emails_text: string
	repeat_min_interval_seconds: number
	repeat_max_send_count: number
}

export type AlertRuleFormValidationInput = {
	target_type: string | null
	target_id: number | null
	doLinkage?: {
		enabled: boolean
		do_device_id: number | null
		do_address: number | null
		auto_off_seconds: number | null
	}
	cameraLinkage: {
		enabled: boolean
		camera_device_ids: number[]
	}
	accessDoorLinkage?: {
		enabled: boolean
		allDevices: boolean
		device_ids: number[]
	}
	sipRingLinkage?: {
		enabled: boolean
		allDevices: boolean
		device_ids: number[]
	}
	elevatorCallLinkage?: {
		enabled: boolean
		allLocations: boolean
		location_ids: number[]
	}
	email: AlertRuleEmailValidationInput & { enabled: boolean }
}

export const validateAlertRuleEmailSubscription = (
	email: AlertRuleEmailValidationInput,
	label = "Email 通知",
): string | null => {
	if (!email.smtp_host.trim()) return `${label}：SMTP Host 為必填`
	if (!Number.isFinite(Number(email.smtp_port)) || Number(email.smtp_port) <= 0) {
		return `${label}：SMTP Port 需為正整數`
	}
	if (!email.smtp_user.trim()) return `${label}：寄件人 Email 為必填`
	if (parseAlertRuleEmailsFromText(email.to_emails_text).length === 0) {
		return `${label}：收件人 To 為必填`
	}
	return null
}

/** 警報規則表單儲存前集中驗證 */
export const validateAlertRuleFormForSave = (input: AlertRuleFormValidationInput): string | null => {
	const targetType = input.target_type || null
	const targetId = input.target_id != null ? Number(input.target_id) : null
	if (targetType && (targetId == null || !Number.isFinite(targetId))) {
		return "請選擇有效的監控目標"
	}

	if (input.doLinkage?.enabled) {
		if (!input.doLinkage.do_device_id) return "DO 聯動：請選擇控制器"
		if (input.doLinkage.do_address == null || Number(input.doLinkage.do_address) < 0) {
			return "DO 聯動：請填寫有效的 DO 位址"
		}
		if (
			input.doLinkage.auto_off_seconds != null &&
			Number(input.doLinkage.auto_off_seconds) <= 0
		) {
			return "DO 聯動：自動關閉秒數需大於 0"
		}
	}

	if (input.cameraLinkage.enabled) {
		const ids = input.cameraLinkage.camera_device_ids.filter(
			(n) => Number.isFinite(n) && n > 0,
		)
		if (ids.length === 0) return "攝影機聯動：請至少選擇一台攝影機"
	}

	if (input.accessDoorLinkage?.enabled && !input.accessDoorLinkage.allDevices) {
		if (input.accessDoorLinkage.device_ids.length === 0) {
			return "門禁連動：請至少選擇一台門禁設備"
		}
	}

	if (input.sipRingLinkage?.enabled && !input.sipRingLinkage.allDevices) {
		if (input.sipRingLinkage.device_ids.length === 0) {
			return "門禁保全語音廣播：請至少選擇一台室內機"
		}
	}

	if (input.elevatorCallLinkage?.enabled && !input.elevatorCallLinkage.allLocations) {
		if (input.elevatorCallLinkage.location_ids.length === 0) {
			return "電梯呼梯連動：請至少選擇一個電梯地點"
		}
	}

	if (input.email.enabled) {
		const emailErr = validateAlertRuleEmailSubscription(input.email)
		if (emailErr) return emailErr
		if (Number(input.email.repeat_min_interval_seconds) < 15) {
			return "Email 通知：重複發送間隔最短 15 秒"
		}
		if (
			Number(input.email.repeat_max_send_count) < 1 ||
			Number(input.email.repeat_max_send_count) > 10
		) {
			return "Email 通知：最大發送次數需介於 1~10"
		}
	}

	return null
}
