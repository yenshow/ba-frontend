/**
 * 轉存資料區間說明（概略，不計算具體日時）
 * 語意對齊後端 exportSchedule.js：半開窗 [上一排程錨點, 本次排程錨點)
 */
import { normalizeScheduleFreq, type ScheduleFreq } from "~/utils/externalIntegration"

const DATA_WINDOW_HINT: Record<ScheduleFreq, string> = {
	daily: "前一日全日",
	weekly: "前一週（上一排程日～本次排程日前）",
	monthly: "前一個月（上一排程日～本次排程日前）",
}

export const formatExportDataWindowHint = (scheduleFreq?: unknown): string =>
	DATA_WINDOW_HINT[normalizeScheduleFreq(scheduleFreq)] ?? DATA_WINDOW_HINT.daily

/** 列表／表單共用 */
export const formatExportSchedulePreview = (input: { scheduleFreq?: unknown }) => ({
	window: formatExportDataWindowHint(input.scheduleFreq),
})
