export const MAX_ELEVATOR_FLOOR_COUNT = 128
export const DEFAULT_OPEN_DURATION = 5
export const MIN_OPEN_DURATION = 1
export const MAX_OPEN_DURATION = 255
/** 面板固定 6 列（由下往上填滿後換欄） */
export const PANEL_ROW_COUNT = 6
/** 與後端 elevatorFloorDetectionMonitor 輪詢間隔一致 */
export const ELEVATOR_RUNTIME_POLL_MS = 2000
/** 移動中 LED 逐層顯示間隔（呼梯後 DI 尚未回報時由前端補間） */
export const ELEVATOR_FLOOR_STEP_MS = 1000

export type ElevatorDeviceRole = {
	deviceId: number
	pointStart?: number
	pointEnd?: number
}

export type ElevatorLogicalFloor = {
	label: string
	rank: number
	panelCol: number
	panelRow: number
	openDuration: number
	ladderGateway?: number | null
	callGateway?: number | null
	diAddress?: number | null
	bindingOverridden?: boolean
}

export type ElevatorPanelConfig = {
	columns: number
	rows: number
}

export type ElevatorRuntimePhase = "idle" | "moving" | "arrived"

export type ElevatorFloorSnapshot = {
	index: number
	label: string
	rank?: number
}

export type ElevatorLiveState = {
	currentFloor: ElevatorFloorSnapshot | null
	direction: "up" | "down" | "idle"
	targetFloor: ElevatorFloorSnapshot | null
	phase: ElevatorRuntimePhase
	updatedAt?: string
}

export type FloorLabelToken = { kind: "B" | "F" | "R"; num: number }

export type ElevatorFloorCounts = {
	/** 地下層數（BF）：4 → B4F～B1F */
	basement: number
	/** 標準層數（F）：14 → 1F～14F */
	standard: number
	/** 頂層／屋頂層數（RF）：2 → R1F～R2F */
	roof: number
}

/** 解析 B4F / 3F / R2F 等樓層標籤 */
export const parseFloorLabelToken = (label: string): FloorLabelToken | null => {
	const trimmed = String(label || "").trim().toUpperCase()
	if (!trimmed) return null
	const basement = /^B(\d+)F?$/.exec(trimmed)
	if (basement) return { kind: "B", num: Number(basement[1]) }
	const roof = /^R(\d+)F?$/.exec(trimmed)
	if (roof) return { kind: "R", num: Number(roof[1]) }
	const standard = /^(\d+)F?$/.exec(trimmed)
	if (standard) return { kind: "F", num: Number(standard[1]) }
	return null
}

const clampFloorCount = (value: unknown) => {
	const n = Math.trunc(Number(value))
	if (!Number.isFinite(n) || n < 0) return 0
	return Math.min(n, MAX_ELEVATOR_FLOOR_COUNT)
}

/** 6×N 面板：同欄由下往上填，滿 6 層換下一欄（row 0 = 面板最上方） */
export const assignPanelCoordinates = (index: number) => ({
	panelCol: Math.floor(index / PANEL_ROW_COUNT),
	panelRow: PANEL_ROW_COUNT - 1 - (index % PANEL_ROW_COUNT),
})

export const computePanelColumns = (floorCount: number) =>
	Math.max(1, Math.ceil(Math.max(floorCount, 1) / PANEL_ROW_COUNT))

/** 依 BF / F / RF 層數產生邏輯樓層 */
export const buildFloorsFromFloorCounts = (counts: ElevatorFloorCounts): ElevatorLogicalFloor[] => {
	const basement = clampFloorCount(counts.basement)
	const standard = clampFloorCount(counts.standard)
	const roof = clampFloorCount(counts.roof)
	const labels: string[] = []

	for (let b = basement; b >= 1; b -= 1) labels.push(`B${b}F`)
	for (let n = 1; n <= standard; n += 1) labels.push(`${n}F`)
	for (let r = 1; r <= roof; r += 1) labels.push(`R${r}F`)

	if (!labels.length) return []
	if (labels.length > MAX_ELEVATOR_FLOOR_COUNT) {
		labels.splice(MAX_ELEVATOR_FLOOR_COUNT)
	}

	return labels.map((label, index) => ({
		label,
		rank: index,
		...assignPanelCoordinates(index),
		openDuration: DEFAULT_OPEN_DURATION,
		ladderGateway: null,
		callGateway: null,
		diAddress: null,
		bindingOverridden: false,
	}))
}

/** 從既有樓層推算 BF / F / RF 層數 */
export const inferFloorCountsFromFloors = (floors: ElevatorLogicalFloor[]): ElevatorFloorCounts => {
	let basement = 0
	let standard = 0
	let roof = 0
	for (const floor of floors) {
		const token = parseFloorLabelToken(floor.label)
		if (!token) continue
		if (token.kind === "B") basement += 1
		else if (token.kind === "F") standard += 1
		else if (token.kind === "R") roof += 1
	}
	return { basement, standard, roof }
}

export const autoFillFloorBindings = (
	floors: ElevatorLogicalFloor[],
	roles: {
		ladderDevice?: ElevatorDeviceRole | null
		callDevice?: ElevatorDeviceRole | null
		floorDetection?: ElevatorDeviceRole | null
	},
): ElevatorLogicalFloor[] =>
	floors.map((floor, index) => {
		if (floor.bindingOverridden) return floor
		const next = { ...floor }
		if (
			(next.ladderGateway == null || next.ladderGateway === undefined) &&
			roles.ladderDevice?.pointStart != null
		) {
			next.ladderGateway = roles.ladderDevice.pointStart + index
		}
		if (
			(next.callGateway == null || next.callGateway === undefined) &&
			roles.callDevice?.pointStart != null
		) {
			next.callGateway = roles.callDevice.pointStart + index
		}
		if (
			(next.diAddress == null || next.diAddress === undefined) &&
			roles.floorDetection?.pointStart != null
		) {
			next.diAddress = roles.floorDetection.pointStart + index
		}
		return next
	})

export const sortFloorsForPanel = (floors: ElevatorLogicalFloor[]) =>
	[...floors].sort((a, b) => {
		if (a.panelRow !== b.panelRow) return a.panelRow - b.panelRow
		return a.panelCol - b.panelCol
	})

export const sortFloorsByRank = (floors: ElevatorLogicalFloor[]) =>
	[...floors].sort((a, b) => a.rank - b.rank)

export const resolveFloorLabel = (floors: ElevatorLogicalFloor[], index: number) =>
	floors[index - 1]?.label ?? ""

export const resolveEventFloorLabel = (
	floors: ElevatorLogicalFloor[],
	gateway: number,
): string | null => {
	const byLadder = floors.find((f) => f.ladderGateway === gateway)
	if (byLadder) return byLadder.label
	const byCall = floors.find((f) => f.callGateway === gateway)
	return byCall?.label ?? null
}

export const formatElevatorLogFloorDisplay = (
	floor: number | string | null | undefined,
	floors: ElevatorLogicalFloor[],
): string => {
	if (floor == null || String(floor).trim() === "") return ""
	const parts = String(floor)
		.split("、")
		.map((part) => part.trim())
		.filter(Boolean)
	if (!parts.length) return String(floor).trim()
	return parts
		.map((part) => {
			const n = Number(part)
			if (!Number.isFinite(n) || n <= 0) return part
			return resolveEventFloorLabel(floors, n) ?? part
		})
		.join("、")
}

/** 呼梯固定為訪客呼梯 SDK command */
export const resolveElevatorCallCommand = (): "visitor_call" => "visitor_call"
