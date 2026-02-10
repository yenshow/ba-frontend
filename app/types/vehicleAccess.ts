/**
 * 車輛進出系統類型（對齊後端 vehiclebiz.passageway_log_data）
 */

export interface VehicleDataLog {
	id: number;
	lane_name: string | null;
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
	locations: VehicleAccessLocation[];
}
