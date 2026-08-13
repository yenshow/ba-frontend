/**
 * 電梯系統地點與事件型別
 */

import type {
	ElevatorDeviceRole,
	ElevatorLiveState,
	ElevatorLogicalFloor,
	ElevatorPanelConfig,
} from "~/utils/elevatorFloorModel"

export type { ElevatorLiveState, ElevatorLogicalFloor, ElevatorPanelConfig }

export interface ElevatorLocation {
	id?: string
	sortOrder?: number
	name: string
	locationType?: "elevator"
	panel?: ElevatorPanelConfig
	floors?: ElevatorLogicalFloor[]
	ladderDevice?: ElevatorDeviceRole | null
	callDevice?: ElevatorDeviceRole | null
	floorDetection?: ElevatorDeviceRole | null
	accessDeviceIds?: number[]
	/** 呼梯 SDK command：固定 visitor=5 */
	callCommandType?: ElevatorCallCommandType
	locationId?: number
	todayEventCount?: number
	live?: ElevatorLiveState
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

export type ElevatorCallCommandType = "visitor"

/** 梯控門操作（ladder_device + ladder_gateway） */
export type ElevatorDoorControlCommand = "open" | "normally_open" | "normally_closed"

/** 呼梯 SDK command（call_device + call_gateway） */
export type ElevatorCallCommand = "visitor_call"

export type ElevatorDirection = "up" | "down" | "idle"

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
	/** 平台固定樓層代號（如 B4F、1F） */
	code: string
	/** 梯控顯示名稱（可為空） */
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
	authorized_floor_labels: string[]
	authorized_ladder_gateways: number[]
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
