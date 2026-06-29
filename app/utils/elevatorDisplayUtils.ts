import type { ElevatorDirection } from "~/types/elevator"

export const formatElevatorLiveFloorText = (options: {
	floorLabel?: string
	currentFloor?: number | string | null
}): string => {
	const label = options.floorLabel?.trim()
	if (label) return label
	const floor = options.currentFloor
	if (floor == null || floor === "") return "--"
	const text = String(floor).trim()
	return text.endsWith("F") ? text : `${text}F`
}

export const buildElevatorDirectionLabel = (direction: ElevatorDirection): string => {
	if (direction === "up") return "上行"
	if (direction === "down") return "下行"
	return "靜止"
}

export const buildElevatorDeviceStatusLabel = (isConnected: boolean): "正常" | "異常" =>
	isConnected ? "正常" : "異常"

export const buildElevatorStatusAriaLabel = (options: {
	floorText: string
	direction: ElevatorDirection
	isConnected: boolean
	/** 總覽卡片用較完整連線描述 */
	verboseConnection?: boolean
	/** 詳情面板：以設備正常／異常描述連線 */
	deviceHealthLabel?: boolean
	todayEventCount?: number
}): string => {
	const dir = buildElevatorDirectionLabel(options.direction)
	let conn = ""
	if (options.deviceHealthLabel) {
		conn = `設備${buildElevatorDeviceStatusLabel(options.isConnected)}`
	} else {
		conn = options.isConnected ? (options.verboseConnection ? "連線正常" : "") : "待連線"
	}
	const parts = [`目前樓層 ${options.floorText}，${dir}`]
	if (conn) parts.push(conn)
	if (options.todayEventCount != null) {
		parts.push(`今日事件 ${options.todayEventCount} 筆`)
	}
	return parts.join("，")
}

export const elevatorLedArrowClass = (
	direction: ElevatorDirection,
	axis: "up" | "down",
	isConnected: boolean
): string => {
	if (!isConnected) return "text-amber-400/40 opacity-45"
	if (direction === axis) {
		return "text-cyan-300 opacity-100 drop-shadow-[0_0_5px_rgba(103,232,249,0.85)]"
	}
	return "text-cyan-400/35 opacity-60"
}

/** LED 面板連線：梯控必須在線；有樓層偵測時另檢 DI 設備與 readOk（對齊 DetailPanel／總覽） */
export const isElevatorPanelConnected = (options: {
	isLadderConnected: boolean
	hasFloorDetection: boolean
	isFloorDetectionConnected: boolean
	live?: { floorDetection?: { readOk?: boolean } | null } | null
}): boolean => {
	if (!options.isLadderConnected) return false
	if (!options.hasFloorDetection) return true
	if (!options.isFloorDetectionConnected) return false
	return options.live?.floorDetection?.readOk !== false
}
