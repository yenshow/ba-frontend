/**
 * 人員管理相關型別
 * 對接後端 /api/personnel
 */

/** 人員群組 */
export interface PersonGroup {
	id: number;
	name: string;
	description?: string | null;
	created_by?: number | null;
	created_at?: string;
	updated_at?: string;
}

/** 人員 */
export interface Person {
	id: number;
	employee_no: string;
	full_name?: string | null;
	person_group_id?: number | null;
	group_name?: string | null;
	status: "active" | "inactive" | "deleted";
	face_url?: string | null;
	config?: Record<string, unknown> | null;
	created_by?: number | null;
	user_id?: number | null;
	created_at?: string;
	updated_at?: string;
}

/** 門禁權限：人員可進出之地點 */
export interface AccessLocation {
	location_id: number;
	location_name: string;
	zone_name: string;
	zone_id: number;
}

/** 可同步地點 */
export interface SyncableLocation {
	id: number;
	name: string;
	zone_name: string;
}

/** 取得門禁權限回傳 */
export interface AccessLocationsResponse {
	person: { id: number; employeeNo: string; fullName: string };
	locations: AccessLocation[];
}

/** 匯入請求單筆 */
export interface ImportPersonRow {
	employeeNo: string;
	fullName?: string;
	personGroupId?: number;
	locationIds?: number[];
}
