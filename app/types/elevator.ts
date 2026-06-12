/**
 * 電梯系統地點與事件型別
 */

export interface ElevatorLocation {
	id?: string
	sortOrder?: number
	name: string
	locationType?: "elevator"
	deviceIds?: number[]
	accessDeviceIds?: number[]
	floorCount?: number
	floorNames?: string[]
	/** 各樓層繼電器動作時間（秒，1–255） */
	floorOpenDurations?: number[]
	logDisplayColumns?: string[]
	locationId?: number
	region?: string
	todayEventCount?: number
}

export interface ElevatorZone {
	id?: string
	name: string
	sortOrder?: number
	locations: ElevatorLocation[]
}

export interface ElevatorLog {
	id: number
	deviceId?: number
	floor?: number | string | null
	deviceName?: string | null
	personName?: string | null
	event?: string | null
	time?: string
	employeeNo?: string | null
	personId?: number | null
	locationId?: number
}

export type ElevatorControlCommand = "open" | "close" | "normally_open" | "normally_closed"

export type ElevatorSyncJobStatus = "queued" | "running" | "completed"

export interface ElevatorSyncWarning {
	type: string
	employeeNo?: string
	fullName?: string | null
	cardNo?: string
	deviceId?: number
	deviceName?: string | null
	message?: string
}

export interface ElevatorSyncJob {
	jobId?: string
	status?: ElevatorSyncJobStatus
	error?: string | null
	progress?: { doneOps?: number; totalOps?: number }
	result?: { warnings?: ElevatorSyncWarning[]; deviceId?: number; deviceIds?: number[] }
}

export interface ElevatorFloorAccessSlot {
	index: number
	name: string
	personIds: number[]
}

export interface ElevatorFloorAccessResponse {
	floors: ElevatorFloorAccessSlot[]
	defaultsApplied?: boolean
	hasStoredAccess?: boolean
	deviceSync?: { triggered: boolean; jobId: string }
}

export type ElevatorAccessSyncStepStatus = {
	status: string
	at: string | number | null
}

export interface ElevatorSyncCandidate {
	employee_no: string
	full_name: string
	has_ladder_card: boolean
	authorized_floors: number[]
	needs_sync?: boolean
	needs_ladder_sync?: boolean
	needs_access_sync?: boolean
	last_sync?: {
		card: ElevatorAccessSyncStepStatus
		access?: {
			user_info: ElevatorAccessSyncStepStatus
			face: ElevatorAccessSyncStepStatus
			card: ElevatorAccessSyncStepStatus
			fingerprint: ElevatorAccessSyncStepStatus
		}
	}
}
