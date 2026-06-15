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

export const buildElevatorStatusAriaLabel = (options: {
	floorText: string
	direction: ElevatorDirection
	isConnected: boolean
	/** 總覽卡片用較完整連線描述 */
	verboseConnection?: boolean
	todayEventCount?: number
}): string => {
	const dir = buildElevatorDirectionLabel(options.direction)
	const conn = options.isConnected ? (options.verboseConnection ? "連線正常" : "") : "待連線"
	const parts = [`目前樓層 ${options.floorText}，${dir}`]
	if (conn) parts.push(conn)
	if (options.todayEventCount != null) {
		parts.push(`今日事件 ${options.todayEventCount} 筆`)
	}
	return parts.join("，")
}

export const elevatorDirectionArrowClass = (
	direction: ElevatorDirection,
	axis: "up" | "down"
): string => (direction === axis ? "text-white opacity-100" : "text-white opacity-25")
