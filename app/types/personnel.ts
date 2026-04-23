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
	/** 後端 getPersonsPaged 會附上門禁權限摘要（JSON array） */
	access_locations?: AccessLocation[] | null;
	config?: Record<string, unknown> | null;
	created_by?: number | null;
	user_id?: number | null;
	created_at?: string;
	updated_at?: string;
}

export interface PagedResult<T> {
	items: T[];
	total: number;
	limit: number;
	offset: number;
}

/** 群組成員清單回傳（GET /personnel/groups/:id/members） */
export interface GroupMembersResult {
	items: Person[];
	total: number;
	limit: number;
	offset: number;
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
	employeeNo: string;
	fullName: string;
	hasFace: boolean;
	hasPassword: boolean;
	hasCard: boolean;
	fingerprintCount: number;
	needsSync?: boolean;
	needsSyncSteps?: Array<"userInfo" | "face" | "card" | "fingerprint" | string>;
	lastSync?: {
		userInfo: { status: "never" | "partial" | "success" | "failed" | string; at: number | string | null };
		face: { status: "never" | "partial" | "success" | "failed" | string; at: number | string | null };
		card: { status: "never" | "partial" | "success" | "failed" | string; at: number | string | null };
		fingerprint: { status: "never" | "partial" | "success" | "failed" | string; at: number | string | null };
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
	message: string;
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

export type SyncLocationJobItemStatus = "running" | "success" | "failed" | "skipped";

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
	items?: SyncLocationJobItem[];
	result: { warnings: SyncWarning[] } | null;
	error: { message: string } | null;
}
