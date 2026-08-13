import { computed } from "vue"
import { joinDailyHHmm, splitDailyHHmm } from "~/utils/externalIntegration"

/** 將 HH:mm 字串綁定為時／分兩個下拉（資料庫對接、記錄轉存共用） */
export const useDailyHHmmField = (
	getValue: () => string,
	setValue: (value: string) => void,
	fallback: string,
) => {
	const hour = computed({
		get: () => splitDailyHHmm(getValue(), fallback).hour,
		set: (nextHour: string) => {
			const { minute } = splitDailyHHmm(getValue(), fallback)
			setValue(joinDailyHHmm(nextHour, minute, fallback))
		},
	})

	const minute = computed({
		get: () => splitDailyHHmm(getValue(), fallback).minute,
		set: (nextMinute: string) => {
			const { hour: currentHour } = splitDailyHHmm(getValue(), fallback)
			setValue(joinDailyHHmm(currentHour, nextMinute, fallback))
		},
	})

	return { hour, minute }
}
