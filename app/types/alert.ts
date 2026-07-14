// 警報系統來源
export type AlertSource =
	| "device"
	| "environment"
	| "people_counting"
	| "surveillance"
	| "vehicle_access"

export type AlertStatus = "active" | "resolved" | "ignored"

// 警報類型（工地 UI 僅用 offline／threshold；相容後端可能回傳之其他型）
export type AlertType = "offline" | "error" | "threshold" | "di" | "do"

// 嚴重程度
export type AlertSeverity = "warning" | "error" | "critical"
export type AlertConditionType = "threshold" | "error_count" | "bit_state"
export type AlertTargetType = "system" | "location" | "zone"

export interface Alert {
	id: number
	source: AlertSource
	source_id: number
	dimension_key?: string
	rule_id?: number | null
	device_id?: number
	device_name?: string
	device_type_name?: string
	device_type_code?: string
	alert_type: AlertType
	severity: AlertSeverity
	message: string
	status: AlertStatus
	resolved?: boolean
	ignored?: boolean
	// 忽視資訊
	ignored_at?: string | null
	ignored_by?: number | null
	ignored_by_username?: string | null
	// 時間戳
	created_at: string
	updated_at: string
	source_name?: string | null
	zone_name?: string | null
	device_config?: Record<string, unknown> | null
	/** 地點名稱（系統來源時多為 location.name；與 source_display_name 同源語意） */
	location_name?: string | null
	/** 建議顯示名稱：device 為裝置名；系統來源為地點名（與後端 enrich 一致） */
	source_display_name?: string | null
}

export interface AlertListResponse {
	alerts: Alert[]
	total: number
	limit: number
	offset: number
}

export interface AlertHistoryItem {
	id: number
	alert_id: number
	old_status: "active" | "resolved" | "ignored" | null
	new_status: "active" | "resolved" | "ignored"
	changed_by: number | null
	changed_by_username: string | null
	changed_at: string
	reason: string | null
}

export interface AlertFilters {
	source?: AlertSource
	source_id?: number
	exclude_sources?: AlertSource[]
	alert_type?: AlertType
	dimension_key?: string
	severity?: AlertSeverity
	status?: AlertStatus
	start_date?: string
	end_date?: string
	time_field?: "created_at" | "updated_at"
	updated_after?: string
	limit?: number
	offset?: number
	orderBy?: string
	order?: "asc" | "desc"
}

export interface UnresolvedAlertCountResponse {
	count: number
	dimension_keys?: string[]
	rule_ids?: number[]
}

export interface AlertRule {
	id: number
	source: AlertSource
	alert_type: AlertType
	severity: AlertSeverity
	name?: string | null
	dimension_key?: string | null
	target_type?: AlertTargetType | null
	target_id?: number | null
	condition_type: AlertConditionType | null
	condition_config: Record<string, unknown> | null
	message_template: string | null
	message_suffix?: string | null
	enabled: boolean
	created_at: string
	updated_at: string
}

export interface CreateAlertRulePayload {
	source: AlertSource
	alert_type: AlertType
	severity: AlertSeverity
	condition_type: AlertConditionType
	condition_config: Record<string, unknown>
	name?: string
	dimension_key?: string
	target_type?: AlertTargetType | null
	target_id?: number | null
	message_suffix?: string | null
	enabled?: boolean
}

export type UpdateAlertRulePayload = Partial<CreateAlertRulePayload>

export interface AlertDoLinkage {
	id: number
	enabled: boolean
	rule_id: number
	do_device_id: number | null
	do_address: number | null
	do_output_value: "on" | "off"
	auto_off_seconds?: number | null
	created_by?: number | null
	created_at: string
	updated_at: string
}

export interface AlertCameraLinkage {
	id: number
	enabled: boolean
	rule_id: number
	camera_device_ids: number[]
	created_by?: number | null
	created_at: string
	updated_at: string
}

/** 警報觸發時對全部門禁設備送 alwaysOpen（無設備清單） */
export interface AlertAccessDoorLinkage {
	id: number
	enabled: boolean
	rule_id: number
	created_by?: number | null
	created_at: string
	updated_at: string
}

export type SmtpSecurity = "none" | "ssl" | "tls"

export interface AlertEmailSubscription {
	id: number
	enabled: boolean
	rule_id: number
	smtp_host: string | null
	smtp_port: number | null
	smtp_user: string | null
	smtp_password?: string | null
	smtp_security: SmtpSecurity
	to_emails: string[]
	repeat_min_interval_seconds: number
	repeat_max_send_count: number
	created_by?: number | null
	created_at: string
	updated_at: string
}

/** 用於 SMTP 測試（可不帶 id/rule_id；後端會與 DB 既有設定 merge） */
export type AlertEmailSubscriptionSmtpOverride = Pick<
	AlertEmailSubscription,
	| "enabled"
	| "smtp_host"
	| "smtp_port"
	| "smtp_user"
	| "smtp_password"
	| "smtp_security"
	| "to_emails"
>

export interface AlertEmailSmtpTestResponse {
	ok: boolean
	messageId?: string | null
	accepted?: unknown
	rejected?: unknown
	response?: unknown
}

export interface AlertRuleIntegrations {
	doLinkage: AlertDoLinkage | null
	cameraLinkage: AlertCameraLinkage | null
	accessDoorLinkage: AlertAccessDoorLinkage | null
	emailSubscription: AlertEmailSubscription | null
}

export type AlertRuleIntegrationSummary = {
	doEnabled: boolean
	cameraEnabled: boolean
	accessDoorEnabled: boolean
	emailEnabled: boolean
	hasAny: boolean
}
