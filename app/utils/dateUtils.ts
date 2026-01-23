/**
 * 統一的時間處理工具函數
 * 使用 UTC 時間，與後端保持一致
 */

/**
 * 獲取當天的開始和結束時間（UTC）
 * 與後端 getTodayDateRange() 邏輯一致
 */
export function getTodayDateRangeUTC(): { start: Date; end: Date } {
	const now = new Date();
	const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
	const todayEnd = new Date(todayStart);
	todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
	return { start: todayStart, end: todayEnd };
}

/**
 * 獲取時間範圍（UTC）
 * 統一處理所有時間範圍預設選項
 */
export function getTimeRangeUTC(preset: string): { start: Date; end: Date } {
	const now = new Date();
	const end = new Date(now);
	let start = new Date(now);

	switch (preset) {
		case "past_hour":
			start = new Date(now.getTime() - 60 * 60 * 1000);
			break;
		case "today": {
			const { start: todayStart, end: todayEnd } = getTodayDateRangeUTC();
			return { start: todayStart, end: todayEnd };
		}
		case "yesterday": {
			const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0));
			const yesterdayEnd = new Date(yesterday);
			yesterdayEnd.setUTCDate(yesterdayEnd.getUTCDate() + 1);
			return { start: yesterday, end: yesterdayEnd };
		}
		case "this_week": {
			// 週一為第一天
			const dayOfWeek = now.getUTCDay();
			const diff = now.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
			start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
			end.setUTCDate(end.getUTCDate() + 1);
			break;
		}
		case "last_week": {
			const dayOfWeek = now.getUTCDay();
			const diff = now.getUTCDate() - dayOfWeek - 6 + (dayOfWeek === 0 ? -6 : 1);
			start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
			const lastWeekEnd = new Date(start);
			lastWeekEnd.setUTCDate(lastWeekEnd.getUTCDate() + 7);
			return { start, end: lastWeekEnd };
		}
		case "last_7_days": {
			start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7, 0, 0, 0, 0));
			end.setUTCDate(end.getUTCDate() + 1);
			break;
		}
		case "last_30_days": {
			start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30, 0, 0, 0, 0));
			end.setUTCDate(end.getUTCDate() + 1);
			break;
		}
		default:
			return { start: new Date(), end: new Date() };
	}

	return { start, end };
}

/**
 * 格式化日期為本地顯示格式（YYYY/MM/DD）
 */
export function formatDateLocal(date: Date): string {
	const padZero = (n: number): string => String(n).padStart(2, "0");
	return `${date.getFullYear()}/${padZero(date.getMonth() + 1)}/${padZero(date.getDate())}`;
}

/**
 * 格式化日期為 date input 格式（YYYY-MM-DD）
 */
export function formatDateInput(date: Date): string {
	const padZero = (n: number): string => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
}

/**
 * 格式化日期時間為本地顯示格式（YYYY/MM/DD HH:mm）
 * @param dateString - ISO 8601 格式的日期時間字符串
 * @param includeSeconds - 是否包含秒數（預設為 false）
 * @returns 格式化後的本地日期時間字符串
 */
export function formatDateTime(dateString: string, includeSeconds = false): string {
	return new Date(dateString).toLocaleString("zh-TW", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: includeSeconds ? "2-digit" : undefined,
		hour12: false
	});
}

/**
 * 格式化日期時間為本地顯示格式（僅日期，YYYY/MM/DD）
 * @param dateString - ISO 8601 格式的日期時間字符串（可選）
 * @returns 格式化後的本地日期字符串，如果為空則返回 "-"
 */
export function formatDate(dateString?: string | null): string {
	if (!dateString) return "-";
	return formatDateLocal(new Date(dateString));
}

