/**
 * 電梯系統地點與事件型別
 */

export interface ElevatorLocation {
	id?: string
	sortOrder?: number
	name: string
	locationType?: "elevator"
	deviceIds?: number[]
	floorCount?: number
	floorNames?: string[]
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
	floor?: number | null
	deviceName?: string | null
	personName?: string | null
	cardNo?: string | null
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
	cardNo?: string
	deviceId?: number
	message?: string
}

export interface ElevatorSyncJob {
	jobId?: string
	status?: ElevatorSyncJobStatus
	error?: string | null
	progress?: { doneOps?: number; totalOps?: number }
	result?: { warnings?: ElevatorSyncWarning[]; deviceId?: number }
}
