export const MAX_ELEVATOR_FLOOR_COUNT = 128
export const DEFAULT_OPEN_DURATION = 5
export const MIN_OPEN_DURATION = 1
export const MAX_OPEN_DURATION = 255
/** 面板固定 6 列（由下往上填滿後換欄） */
export const PANEL_ROW_COUNT = 6
/** DI rank 變化時前端追趕式逐層補間 */
export { ELEVATOR_FLOOR_STEP_MS } from "~/utils/realtimeTiming"

export type ElevatorDeviceRole = {
	deviceId: number
	pointStart?: number
	pointEnd?: number
}

export type ElevatorLogicalFloor = {
	label: string
	/** 梯控設備顯示名稱（可自訂）；未填時同步與顯示 fallback 為 label */
	name?: string
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

export type ElevatorFloorDetectionLive = {
	readOk: boolean
}

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
	floorDetection?: ElevatorFloorDetectionLive | null
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
	const trimmed = String(label || "")
		.trim()
		.toUpperCase()
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

const floorIdentityKey = (label: string): string | null => {
	const token = parseFloorLabelToken(label)
	return token ? `${token.kind}:${token.num}` : null
}

/** 依層數重建樓層，並保留同樓層代號（B3F、1F 等）的既有自訂欄位 */
export const rebuildFloorsFromFloorCounts = (
	counts: ElevatorFloorCounts,
	previous: ElevatorLogicalFloor[] = []
): ElevatorLogicalFloor[] => {
	const next = buildFloorsFromFloorCounts(counts)
	if (!previous.length) return next

	const prevByIdentity = new Map<string, ElevatorLogicalFloor>()
	for (const floor of previous) {
		const key = floorIdentityKey(floor.label)
		if (key) prevByIdentity.set(key, floor)
	}

	return next.map((floor) => {
		const identityKey = floorIdentityKey(floor.label)
		const prev = identityKey ? prevByIdentity.get(identityKey) : undefined
		if (!prev) return floor

		return {
			...floor,
			...(prev.name?.trim() ? { name: prev.name.trim() } : {}),
			openDuration: prev.openDuration ?? floor.openDuration,
			ladderGateway: prev.ladderGateway ?? floor.ladderGateway,
			callGateway: prev.callGateway ?? floor.callGateway,
			diAddress: prev.diAddress ?? floor.diAddress,
			bindingOverridden: prev.bindingOverridden ?? false,
		}
	})
}

export const clampOpenDuration = (value: unknown): number => {
	const n = Math.trunc(Number(value))
	if (!Number.isFinite(n)) return DEFAULT_OPEN_DURATION
	return Math.min(MAX_OPEN_DURATION, Math.max(MIN_OPEN_DURATION, n))
}

/** 梯控設備門名／介面顯示：自訂名稱優先，否則使用樓層代號 */
export const resolveFloorDoorName = (floor: Pick<ElevatorLogicalFloor, "label" | "name">) => {
	const name = String(floor.name ?? "").trim()
	return name || String(floor.label ?? "").trim()
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
	}
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

export type ElevatorFloorBindingField = "ladderGateway" | "callGateway" | "diAddress"

const ELEVATOR_FLOOR_BINDING_FIELDS: ElevatorFloorBindingField[] = [
	"ladderGateway",
	"callGateway",
	"diAddress",
]

export const isElevatorFloorBindingValue = (value: unknown): value is number => {
	const n = Number(value)
	return Number.isFinite(n) && n >= 0 && Number.isInteger(n)
}

/** 回傳重複點位的 key 集合，格式 `${field}:${floorIndex}` */
export const getDuplicateElevatorFloorBindingKeys = (
	floors: ElevatorLogicalFloor[]
): Set<string> => {
	const duplicates = new Set<string>()
	for (const field of ELEVATOR_FLOOR_BINDING_FIELDS) {
		const byValue = new Map<number, number[]>()
		floors.forEach((floor, index) => {
			const raw = floor[field]
			if (!isElevatorFloorBindingValue(raw)) return
			const list = byValue.get(raw) ?? []
			list.push(index)
			byValue.set(raw, list)
		})
		for (const indices of byValue.values()) {
			if (indices.length <= 1) continue
			for (const index of indices) {
				duplicates.add(`${field}:${index}`)
			}
		}
	}
	return duplicates
}

export const findFloorByRank = (
	floors: ElevatorLogicalFloor[],
	rank: number
): ElevatorLogicalFloor | null => floors.find((f) => f.rank === rank) ?? null

/** 依 rank 由 from 到 to 的逐步序列（不含 from，含 to） */
export const buildRankStepPath = (
	floors: ElevatorLogicalFloor[],
	fromRank: number,
	toRank: number
): number[] => {
	if (fromRank === toRank) return []
	const ranks = [...new Set(floors.map((f) => f.rank))].sort((a, b) => a - b)
	const fromIdx = ranks.indexOf(fromRank)
	const toIdx = ranks.indexOf(toRank)
	if (fromIdx < 0 || toIdx < 0) {
		return toRank !== fromRank ? [toRank] : []
	}
	const step = toRank > fromRank ? 1 : -1
	const path: number[] = []
	for (let i = fromIdx + step; step > 0 ? i <= toIdx : i >= toIdx; i += step) {
		const rank = ranks[i]
		if (rank != null) path.push(rank)
	}
	return path
}

export const floorSnapshotFromRank = (
	floors: ElevatorLogicalFloor[],
	rank: number
): ElevatorFloorSnapshot | null => {
	const floor = findFloorByRank(floors, rank)
	if (!floor) return null
	const index = floors.indexOf(floor) + 1
	return { index, label: floor.label, rank: floor.rank }
}

export const resolveFloorLabel = (floors: ElevatorLogicalFloor[], index: number) =>
	floors[index - 1]?.label ?? ""

export const resolveEventFloorLabel = (
	floors: ElevatorLogicalFloor[],
	gateway: number
): string | null => {
	const byLadder = floors.find((f) => f.ladderGateway === gateway)
	if (byLadder) return resolveFloorDoorName(byLadder)
	const byCall = floors.find((f) => f.callGateway === gateway)
	return byCall ? resolveFloorDoorName(byCall) : null
}

export const formatElevatorLogFloorDisplay = (
	floor: number | string | null | undefined,
	floors: ElevatorLogicalFloor[]
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

/** 後端加速輪詢階段（moving / arrived） */
export const isElevatorPollAccelerated = (live?: ElevatorLiveState | null): boolean =>
	live?.phase === "moving" || live?.phase === "arrived"

/** 監控頁需追蹤連線的設備（梯控、呼梯、樓層偵測） */
export const collectElevatorMonitoringDeviceIds = (
	locations: Array<{
		ladderDevice?: ElevatorDeviceRole | null
		callDevice?: ElevatorDeviceRole | null
		floorDetection?: ElevatorDeviceRole | null
	}>
): number[] => [
	...new Set(
		locations.flatMap((loc) =>
			[loc.ladderDevice?.deviceId, loc.callDevice?.deviceId, loc.floorDetection?.deviceId].filter(
				(id): id is number => id != null
			)
		)
	),
]

/** 呼梯固定為訪客呼梯 SDK command */
export const resolveElevatorCallCommand = (): "visitor_call" => "visitor_call"
