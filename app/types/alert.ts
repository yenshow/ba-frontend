// 警報系統來源
export type AlertSource = "device" | "environment" | "lighting" | "hvac" | "fire" | "security";

// 警報狀態
export type AlertStatus = "pending" | "active" | "resolved" | "ignored";

// 警報類型
export type AlertType = "offline" | "error" | "threshold";

// 嚴重程度
export type AlertSeverity = "warning" | "error" | "critical";

export interface Alert {
	id: number;
	// 多系統來源支持
	source: AlertSource;
	source_id: number;
	source_type?: string;
	// 向後兼容（設備系統）
	device_id?: number;
	device_name?: string;
	device_type_name?: string;
	device_type_code?: string;
	// 警報資訊
	alert_type: AlertType;
	severity: AlertSeverity;
	message: string;
	// 狀態機
	status: AlertStatus;
	// 向後兼容（舊的狀態欄位）
	resolved?: boolean;
	ignored?: boolean;
	// 解決資訊
	resolved_at?: string | null;
	resolved_by?: number | null;
	resolved_by_username?: string | null;
	// 忽視資訊
	ignored_at?: string | null;
	ignored_by?: number | null;
	ignored_by_username?: string | null;
	// 額外資訊
	metadata?: Record<string, any>;
	alert_count?: number;
	latest_created_at?: string;
	created_at: string;
}

export interface AlertListResponse {
	alerts: Alert[];
	total: number;
	limit: number;
	offset: number;
}

export interface CreateAlertData {
	// 多系統來源支持
	source?: AlertSource;
	source_id?: number;
	source_type?: string;
	// 向後兼容
	device_id?: number;
	alert_type: AlertType;
	severity?: AlertSeverity;
	message: string;
	metadata?: Record<string, any>;
}

export interface AlertFilters {
	// 多系統來源篩選
	source?: AlertSource;
	source_id?: number;
	// 向後兼容
	device_id?: number;
	device_type_code?: string;
	alert_type?: AlertType;
	severity?: AlertSeverity;
	// 狀態篩選（新）
	status?: AlertStatus;
	// 向後兼容（舊的狀態篩選）
	resolved?: boolean;
	ignored?: boolean;
	// 時間範圍
	start_date?: string;
	end_date?: string;
	// 分頁
	limit?: number;
	offset?: number;
	orderBy?: string;
	order?: "asc" | "desc";
}

export interface UnresolvedAlertCountResponse {
	count: number;
}
