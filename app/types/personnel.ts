export type { Paged } from "~/utils/pagingUtils";

/** 人員群組 */
export interface PersonGroup {
	id: number;
	name: string;
	parent_id?: number | null;
	children?: PersonGroup[];
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
	/** 後端 getPersonsPaged 會附上門禁權限摘要（JSON array） */
	access_locations?: AccessLocation[] | null;
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

/** 某可同步地點應寫入設備的候選人（GET sync-candidates） */
export interface SyncLocationCandidate {
	employee_no: string;
	full_name: string;
	has_face: boolean;
	has_password: boolean;
	has_card: boolean;
	fingerprint_count: number;
	needs_sync?: boolean;
	needs_sync_steps?: Array<"user_info" | "face" | "card" | "fingerprint" | string>;
	last_sync?: {
		user_info: {
			status: "success" | "failed" | "unchanged" | "no_data" | string;
			at: number | string | null;
		};
		face: {
			status: "success" | "failed" | "unchanged" | "no_data" | string;
			at: number | string | null;
		};
		card: {
			status: "success" | "failed" | "unchanged" | "no_data" | string;
			at: number | string | null;
		};
		fingerprint: {
			status: "success" | "failed" | "unchanged" | "no_data" | string;
			at: number | string | null;
		};
	};
}

/** 取得門禁權限回傳 */
export interface AccessLocationsResponse {
	person: { id: number; employeeNo: string; fullName: string | null };
	locations: AccessLocation[];
}

/** 批次匯入回傳 */
export interface ImportResult {
	created: number;
	createdIds?: Array<{ id: number; employeeNo: string }>;
	errors?: Array<{ row: number; employeeNo?: string; message: string }>;
}

/** 設備同步單筆警告（人臉／新增／更新／刪除失敗；sync-all 時可帶 locationName） */
export interface SyncWarning {
	type: string;
	employeeNo?: string;
	deviceId?: number;
	deviceName?: string | null;
	message: string;
	locationId?: number | null;
	locationName?: string;
}

/** 單一地點同步結果（sync-all-locations 用） */
export interface SyncLocationResult {
	locationId: number;
	locationName?: string;
	warnings: SyncWarning[];
}

export interface SyncAllLocationsJob {
	jobId: string;
	status: "queued" | "running" | "completed";
	createdAt: number;
	startedAt: number | null;
	finishedAt: number | null;
	/** 同步全部時，各子地點的逐人／逐 API 事件（帶 locationId） */
	items?: SyncLocationJobItem[];
	progress: {
		total: number;
		completed: number;
		currentLocationId: number | null;
		currentLocationName: string | null;
	};
	result: { synced: number; results: SyncLocationResult[] } | null;
	error: { message: string } | null;
}

export type SyncLocationJobItemStatus = "running" | "success" | "failed" | "unchanged";

export interface SyncLocationJobItem {
	/** 同步全部 job 的逐筆事件會帶上地點 id */
	locationId?: number | null;
	employeeNo: string | null;
	deviceId: number | null;
	/** add / update / delete / sync（sync 為子步驟，例如 userInfo/face/card/fingerprint） */
	action: "add" | "update" | "delete" | "sync" | string;
	/** person / userInfo / face / card / fingerprint:* / batch:* */
	stage: string | null;
	status: SyncLocationJobItemStatus;
	startedAt: number;
	finishedAt: number | null;
	message: string | null;
}

export interface SyncLocationJob {
	jobId: string;
	locationId: number;
	locationName: string | null;
	status: "queued" | "running" | "completed";
	createdAt: number;
	startedAt: number | null;
	finishedAt: number | null;
	progress?: {
		total: number;
		attempted: number;
		completed: number;
		succeeded: number;
		failed: number;
		deviceTotal: number;
		currentDeviceIndex: number;
		currentDeviceId: number | null;
		targetPersonsTotal: number;
		currentEmployeeNo: string | null;
		currentAction: string | null;
		currentStage: string | null;
	};
	/**
	 * issues：failed 明細（不建議輪詢時帶，請用 items API 分頁抓）
	 * 後端只有在 includeIssues=1 時才會回傳
	 */
	items?: SyncLocationJobItem[];
	/**
	 * tail：最後 N 筆事件（含 success/running/failed/unchanged），供 UI 即時顯示
	 * 後端只有在 includeTail=1 時才會回傳
	 */
	tailItems?: SyncLocationJobItem[];
	/** job items 的儲存策略摘要（後端固定提供） */
	itemsMeta?: {
		issuesTotal: number;
		tailTotal: number;
		issuesStored: number;
		tailStored: number;
	};
	result: { warnings: SyncWarning[] } | null;
	error: { message: string } | null;
}

export interface SyncLocationJobItemsPage {
	type: "issues" | "tail";
	items: SyncLocationJobItem[];
	total: number;
	limit: number;
	offset: number;
}
