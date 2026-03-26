// 警報系統來源
export type AlertSource =
	| "device"
	| "environment"
	| "lighting"
	| "drainage"
	| "people_counting"
	| "hvac"
	| "fire"
	| "security";

export type AlertStatus = "active" | "resolved" | "ignored";

// 警報類型
export type AlertType = "offline" | "error" | "threshold";

// 嚴重程度
export type AlertSeverity = "warning" | "error" | "critical";
export type AlertConditionType = "threshold" | "error_count" | "bit_state";
export type AlertTargetType = "system" | "location" | "zone";

export interface Alert {
	id: number;
	source: AlertSource;
	source_id: number;
	dimension_key?: string;
	rule_id?: number | null;
	device_id?: number;
	device_name?: string;
	device_type_name?: string;
	device_type_code?: string;
	alert_type: AlertType;
	severity: AlertSeverity;
	message: string;
	status: AlertStatus;
	resolved?: boolean;
	ignored?: boolean;
	// 忽視資訊
	ignored_at?: string | null;
	ignored_by?: number | null;
	ignored_by_username?: string | null;
	// 時間戳
	created_at: string;
	updated_at: string;
	source_name?: string | null;
	zone_name?: string | null;
	device_config?: Record<string, unknown> | null;
}

export interface AlertListResponse {
	alerts: Alert[];
	total: number;
	limit: number;
	offset: number;
}

export interface AlertHistoryItem {
	id: number;
	alert_id: number;
	old_status: "active" | "resolved" | "ignored" | null;
	new_status: "active" | "resolved" | "ignored";
	changed_by: number | null;
	changed_by_username: string | null;
	changed_at: string;
	reason: string | null;
}

export interface AlertFilters {
	source?: AlertSource;
	source_id?: number;
	device_id?: number;
	exclude_sources?: AlertSource[];
	alert_type?: AlertType;
	dimension_key?: string;
	severity?: AlertSeverity;
	status?: AlertStatus;
	resolved?: boolean;
	ignored?: boolean;
	start_date?: string;
	end_date?: string;
	updated_after?: string;
	limit?: number;
	offset?: number;
	orderBy?: string;
	order?: "asc" | "desc";
}

export interface UnresolvedAlertCountResponse {
	count: number;
	dimension_keys?: string[];
	rule_ids?: number[];
}

export interface AlertRule {
	id: number;
	source: AlertSource;
	alert_type: AlertType;
	severity: AlertSeverity;
	name?: string | null;
	dimension_key?: string | null;
	target_type?: AlertTargetType | null;
	target_id?: number | null;
	condition_type: AlertConditionType | null;
	condition_config: Record<string, unknown> | null;
	message_template: string | null;
	enabled: boolean;
	created_at: string;
	updated_at: string;
}

export interface CreateAlertRulePayload {
	source: AlertSource;
	alert_type: AlertType;
	severity: AlertSeverity;
	condition_type: AlertConditionType;
	condition_config: Record<string, unknown>;
	name?: string;
	dimension_key?: string;
	target_type?: AlertTargetType | null;
	target_id?: number | null;
	message_template?: string;
	enabled?: boolean;
}

export type UpdateAlertRulePayload = Partial<CreateAlertRulePayload>;
