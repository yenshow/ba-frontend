import type { SystemType } from "~/types/location"
import { getSystemTypeLabel } from "~/constants/systemLabels"

type DeleteConfirm = {
	title: string
	message: string
	details: string
	type: "danger" | "warning"
}

const systemTypeLabel = (systemType?: SystemType): string => {
	if (!systemType) return ""
	return getSystemTypeLabel(systemType)
}

export const buildDeleteLocationConfirmCopy = (args: {
	hasId: boolean
	systemType?: SystemType
	systemCount?: number
}): DeleteConfirm => {
	const systemCount = Number.isFinite(args.systemCount) ? Number(args.systemCount) : 0
	const hasSystemType = Boolean(args.systemType)
	const onlyCurrentSystem = !hasSystemType || systemCount <= 1

	if (!args.hasId) {
		return {
			title: "確認刪除",
			message: "確定要刪除此地點嗎？",
			details: "此地點尚未儲存，將直接從清單移除。",
			type: "danger",
		}
	}

	if (onlyCurrentSystem) {
		return {
			title: "確認刪除",
			message: "確定要刪除此地點嗎？",
			details: "此操作將刪除此地點，且無法復原。",
			type: "danger",
		}
	}

	return {
		title: "確認刪除",
		message: "確定要刪除此地點嗎？",
		details: `僅從本系統（${systemTypeLabel(args.systemType)}）移除此地點，其他系統下的此地點不受影響。`,
		type: "danger",
	}
}

export const buildDeleteZoneConfirmCopy = (args: { systemType?: SystemType }): DeleteConfirm => {
	if (!args.systemType) {
		return {
			title: "確認刪除",
			message: "確定要刪除此區域嗎？",
			details: "此操作將刪除該區域的所有地點資料，且無法復原。",
			type: "danger",
		}
	}

	return {
		title: "確認刪除",
		message: "確定要刪除此區域嗎？",
		details:
			`此操作可能會「僅移除本系統（${systemTypeLabel(args.systemType)}）」在此區域的地點，` +
			"或在此區域已無其他系統使用時刪除整個區域。此操作無法復原。",
		type: "danger",
	}
}
