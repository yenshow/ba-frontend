/**
 * Toast 文案 SSOT（業務成功／警告／資訊；API 錯誤仍走 useErrorHandler）
 * 業務 Toast 文案 SSOT（雙前端鏡像）
 */

export const TOAST = {
	// auth / account
	LOGIN_SUCCESS: "登入成功",
	PASSWORD_UPDATED_RELOGIN: "密碼已更新，請重新登入",
	USER_CREATED: "用戶已建立",

	// license
	LICENSE_ONLINE_ACTIVATED: "線上啟用成功",
	LICENSE_LOCAL_RESET: "已重置本地授權狀態",
	LICENSE_REQUEST_DOWNLOADED: "已下載 request file（Base64）",
	LICENSE_OFFLINE_IMPORTED: "離線授權匯入成功",
	LICENSE_FILE_LOADED: "已載入離線授權檔",
	LICENSE_INVALID_JSON: "檔案內容不是有效的授權 JSON",

	// settings / admin
	SETTINGS_SAVED: "設定已儲存",
	SETTINGS_UPLOAD_SUCCESS: "檔案上傳成功",
	SETTINGS_RESET_DEFAULT: "設定已重設為預設值",
	ADMIN_ONLY_RUNTIME_CONFIG: "僅管理員可儲存營運設定",
	ADMIN_ONLY_RECORD_EXPORT: "僅管理員可儲存",
	ADMIN_ONLY_EXTERNAL_DB: "僅管理員可設定",
	RECORD_EXPORT_HEADER_REQUIRED: "輸出欄位至少需填寫一項表頭",
	RECORD_EXPORT_GROUP_REQUIRED: "部門（人員群組）至少需選擇一項",
	RECORD_EXPORT_CREATED: "已新增規則",
	RECORD_EXPORT_UPDATED: "已更新規則",
	RECORD_EXPORT_DELETED: "已刪除",
	EXTERNAL_DB_CONNECTED: "連線成功",
	EXTERNAL_DB_SAVED: "已儲存資料庫對接設定",
	EXTERNAL_DB_DELETED: "已刪除資料庫對接設定",

	// device / model
	DEVICE_OPERATION_SUCCESS: "操作成功",
	DEVICE_MODEL_UPDATED: "設備型號已更新成功",
	DEVICE_MODEL_CREATED: "設備型號建立成功",
	DEVICE_MODEL_DELETED: (name: string) => `設備型號 "${name}" 已刪除`,

	// location / zone
	POINT_UPDATED: "已更新點位",
	ZONE_DELETED: "區域刪除成功",
	ZONE_SYSTEM_LOCATIONS_REMOVED: "已移除該系統在此區域的所有地點",
	ZONE_SAVED: "區域已儲存",
	ZONES_SAVED: (count: number) => `已儲存 ${count} 個區域`,
	ZONE_PARTIAL_SAVE_FAILED: (failed: number, total: number) =>
		`部分區域儲存失敗（${failed}/${total}）`,
	LOCATION_REMOVED_FROM_LIST: "已從清單移除此地點",
	VIEW_CATEGORY_NAME_REQUIRED: "請先輸入檢視分類名稱",
	VIEW_CATEGORY_NAME_BLANK: "分類名稱不可為空白",
	ACCESS_SECURITY_FLOOR_NAME_REQUIRED: "請先輸入樓層名稱",
	ACCESS_SECURITY_FLOOR_NAME_BLANK: "樓層名稱不可為空白",
	HOME_MODULE_ORDER_RESET: "已還原為預設順序",

	// personnel
	PERSONNEL_IMAGE_REQUIRED: "請選擇圖片檔案",
	PERSONNEL_DELETED: "已刪除人員",
	PERSONNEL_IMPORT_NONE: "未匯入任何資料",
	PERSONNEL_GROUP_MEMBERS_UPDATED: "已更新群組成員",
	PERSONNEL_GROUPS_SAVED: "已儲存群組變更",
	PERSONNEL_LIST_APPLIED: "已套用名單",
	PERSONNEL_LIST_APPLIED_SYNCED: "已套用名單並同步至設備",
	PERSONNEL_PLATE_RESYNCED: "已重新同步車牌至攝影機",
	PERSONNEL_PLATE_SAVED: "已儲存車牌",
	PERSONNEL_PLATE_DELETED: "已刪除車牌",
	SYNC_COMPLETE: "同步完成",
	SYNC_ALL_COMPLETE: "同步全部完成",
	SYNC_COMPLETE_WITH_WARNINGS: (count: number) => `同步完成（含 ${count} 筆警告）`,
	SYNC_ALL_COMPLETE_WITH_WARNINGS: (count: number) => `同步全部完成（含 ${count} 筆警告）`,
	PERSONNEL_IMPORTED: (count: number) => `已匯入 ${count} 筆`,
	PERSONNEL_IMPORT_WITH_ERRORS: (count: number) => `匯入完成，但有 ${count} 筆錯誤，請查看下方明細`,
	PERSONNEL_SAVED: (label: string) => `已儲存${label}`,

	// elevator
	ELEVATOR_FLOOR_ACCESS_APPLIED: "已套用樓層權限",
	ELEVATOR_FLOOR_NAME_SAVED: "已更新樓層名稱",
	ELEVATOR_COMMAND_SENT: "指令已送出",

	// vehicle / access
	VEHICLE_BARRIER_SENT: "已送出道閘指令",
	ACCESS_DOOR_SENT: "已送出門控指令",
	SURVEILLANCE_REFRESHED: "已重新整理",
	SURVEILLANCE_NO_STREAM_PERMISSION: "無串流控制權限",
	SURVEILLANCE_MAX_VIEWS: (max: number) => `最多只能顯示 ${max} 個畫面`,
	SURVEILLANCE_VIEW_ADDED: "已加入監控畫面",
	PEOPLE_COUNTING_RESET: "已重置人流統計",
	STATS_RESET_FAILED: "重置失敗",
	PARKING_STATS_RESET: "已重置停車場統計",

	// alerts
	ALERT_TRIGGERED: "已觸發警報",
	ALERT_CLEARED: "已清除警報",
	ALERT_RULE_UPDATED: "警報定義已更新",
	ALERT_RULE_CREATED: "警報定義已建立",
	ALERT_RULE_DELETED: "警報定義已刪除",
	ALERT_LOG_EXPORT_EMPTY: "無資料可匯出",
	ALERT_LOG_EXPORTED: (count: number) => `已匯出 ${count} 筆警示紀錄`,

	// multimedia
	MULTIMEDIA_UPLOAD_SUCCESS: "上傳成功",
	MULTIMEDIA_SAVED: "已儲存",
} as const
