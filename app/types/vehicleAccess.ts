/**
 * 車輛進出系統類型（對齊後端 vehiclebiz.passageway_log_data）
 */

export interface VehicleDataLog {
	id: number;
	lane_name: string | null;
	/** 車道 ID（vehiclebiz.lane_info.id；用於依選中地點篩選過車記錄） */
	lane_id?: number | null;
	/** 放行結果：1=放行、0=未放行（未放行顯示「拒絕」） */
	allow_result?: number | null;
	/** 車道類型 1 進 2 出（由後端自 vehiclebiz.lane_info 帶入，放行時顯示進入/離開） */
	lane_type?: number | null;
	trigger_time: string | null;
	owner_id?: number | null;
	owner_name?: string | null;
	owner_phone?: string | null;
	license_plate: string | null;
	plate_license_image_url?: string | null;
	vehicle_list_id: number;
	vehicle_list_name: string | null;
	/** 組織/單位 ID（對應 platform.person_group.id）；-1 或無效表示無 */
	organization_id?: number | null;
	/** 依 organization_id 查 platform.person_group 取得的群組名稱（如 35 → 工程部） */
	person_group_name?: string | null;
	/** 車輛類別：數字或陣列（後端已正規化）；包含 5 即為黑名單，僅供警報系統用，不用於放行結果 */
	vehicle_category?: number | number[];
	is_blacklist: boolean;
}

/** 固定車輛名單（platform.vehicle_list）；plate_license 對應 passageway_log_data.license_plate */
export interface VehicleListItem {
	id: number;
	plate_license: string | null;
	owner_name?: string | null;
	person_id?: number | null;
	vehicle_group_id?: number | null;
	/** 所屬人員群組 ID（對應 platform.person_group.id）；用於穩定取得「有車輛的群組」 */
	person_group_id?: number | null;
}

/** 車輛名單項目 + 依當日過車記錄計算的進/出/在場 */
export interface VehicleListItemWithStatus extends VehicleListItem {
	entryCount: number;
	exitCount: number;
	onSiteCount: number;
}

/** 車道資訊（vehiclebiz.lane_info，deleted=0） */
export interface LaneInfo {
	id: number;
	lane_name: string | null;
	lane_type: number | null; // 1 進 2 出
	passageway_id?: number | null;
	deleted?: number;
}

/** 人員群組（platform.person_group，供其他功能使用；車輛群組已改為 anpr.vehicle_custom_list） */
export interface VehiclePersonGroup {
	id: number;
	name: string | null;
}

/** 後端車輛群組 API 單一車輛（platform.vehicle_list 對應欄位） */
export interface VehicleGroupVehicleItem {
	vehicle_id: number;
	plate_license: string | null;
	owner_name: string | null;
}

/** 後端車輛群組 API 回傳格式（anpr.vehicle_custom_list + vehicle_and_list_relation + platform.vehicle_list） */
export interface VehicleGroupFromApi {
	groups: Array<{
		id: number;
		list_name: string;
		list_sequence?: number;
		vehicles: VehicleGroupVehicleItem[];
	}>;
}

/** 車輛群組（來源：anpr.vehicle_custom_list list_type=0 + 未分類；進出／在場由 passageway_log_data 計算） */
export interface VehicleOrganizationGroupItem {
	/** 選取用 key（"vg_1" 或 "vg_0" 未分類） */
	groupKey: string;
	/** 群組 id（0 表示未分類） */
	personGroupId: number;
	/** 顯示名稱（list_name 或 未分類） */
	personGroupName: string;
	/** 該群組車輛數（分母） */
	vehicleCount: number;
	entryCount: number;
	exitCount: number;
	onSiteCount: number;
}

/** 群組彈窗內單一車輛（車主-車牌、進出場時間；無圖片欄位） */
export interface VehicleGroupMemberItem {
	id: number;
	plate_license: string | null;
	owner_name: string | null;
	/** 最近進場日期（如 2026/02/24） */
	lastEntryDate?: string | null;
	/** 進場時間（如 17:00:41） */
	entryTime?: string | null;
	/** 離開時間（如 17:15:36），未離場則顯示 - - */
	exitTime?: string | null;
	/** 是否在場（有進場且尚無離場） */
	isPresent?: boolean;
}

/** 總覽卡片用（對齊人流 LocationOverviewCard：進／出／在場） */
export interface VehicleAccessLocationSummary {
	id: string;
	zoneId: string;
	zoneName: string;
	locationId: string;
	name: string;
	todayPassCount?: number;
	todayBlacklistCount?: number;
	/** 今日進場車輛數（allow_result=1 且 lane_type=1） */
	entryCount?: number;
	/** 今日出場車輛數（allow_result=1 且 lane_type=2） */
	exitCount?: number;
	/** 在場車輛數（進場－出場，不小於 0） */
	currentCount?: number;
}

export interface VehicleAccessLocation {
	id?: string;
	/** 同區域內地點排序（小者在前） */
	sortOrder?: number;
	name: string;
	/** 入口車道 ID（vehiclebiz.lane_info，lane_type=1） */
	entryLaneId?: number | null;
	/** 出口車道 ID（vehiclebiz.lane_info，lane_type=2） */
	exitLaneId?: number | null;
	/** 業務層地點 ID（字串來自 loc.id，數字為舊版相容） */
	locationId?: number | string;
}

export interface VehicleAccessZone {
	id?: string;
	name: string;
	/** 區域排序（小者在前） */
	sortOrder?: number;
	locations: VehicleAccessLocation[];
}
