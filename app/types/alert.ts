// 警報系統來源
export type AlertSource = "device" | "environment" | "lighting" | "hvac" | "fire" | "security";

// 警報狀態（移除 pending，只保留 active, resolved, ignored）
export type AlertStatus = "active" | "resolved" | "ignored";

// 警報類型
export type AlertType = "offline" | "error" | "threshold";

// 嚴重程度
export type AlertSeverity = "warning" | "error" | "critical";

export interface Alert {
	id: number;
	// 多系統來源支持
	source: AlertSource;
	source_id: number;
	// 向後兼容（設備系統）
	device_id?: number;
	device_name?: string;
	device_type_name?: string;
	device_type_code?: string; // 保留用於顯示，但不再用於篩選
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
	// 時間戳
	created_at: string;
	updated_at: string | null; // 可能為 null（新創建的警報可能還沒有更新）
	// 來源名稱（統一欄位，適用於所有來源類型）
	source_name?: string | null; // 設備名稱、環境位置名稱、照明區域名稱等
	environment_floor_name?: string | null; // 環境位置樓層名稱（僅適用於環境來源）
	lighting_floor_name?: string | null; // 照明區域樓層名稱（僅適用於照明來源）
	// 統計欄位（僅在列表查詢時存在）
	alert_count?: number; // 合併的警報數量（後端 GROUP BY 查詢返回）
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
	changed_at: string; // ISO 8601
	reason: string | null;
}

export interface AlertFilters {
	// 多系統來源篩選
	source?: AlertSource;
	source_id?: number;
	// 向後兼容
	device_id?: number;
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
	// 增量查詢（只獲取更新時間在此之後的警報）
	updated_after?: string;
	// 分頁
	limit?: number;
	offset?: number;
	orderBy?: string;
	order?: "asc" | "desc";
}

export interface UnresolvedAlertCountResponse {
	count: number;
}
