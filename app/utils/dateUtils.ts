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
	const todayStart = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
	);
	const todayEnd = new Date(todayStart);
	todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
	return { start: todayStart, end: todayEnd };
}

/**
 * 獲取時間範圍（回傳 Date 以 toISOString() 送後端）
 * 以「使用者本地日曆 00:00」為日界，避免 UTC 午夜在台灣變成 08:00 換日的錯覺
 */
export function getTimeRangeUTC(preset: string): { start: Date; end: Date } {
	const now = new Date();
	const y = now.getFullYear();
	const m = now.getMonth();
	const d = now.getDate();
	const endDefault = new Date(y, m, d + 1, 0, 0, 0, 0);
	let start = new Date(now);
	let end = new Date(endDefault);

	switch (preset) {
		case "today":
			return { start: new Date(y, m, d, 0, 0, 0, 0), end: endDefault };
		case "yesterday":
			return {
				start: new Date(y, m, d - 1, 0, 0, 0, 0),
				end: new Date(y, m, d, 0, 0, 0, 0)
			};
		case "this_week": {
			const dayOfWeek = now.getDay();
			const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			start = new Date(y, m, d + toMonday, 0, 0, 0, 0);
			end = endDefault;
			break;
		}
		case "last_week": {
			const dayOfWeek = now.getDay();
			const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			start = new Date(y, m, d + toMonday - 7, 0, 0, 0, 0);
			end = new Date(y, m, d + toMonday, 0, 0, 0, 0);
			return { start, end };
		}
		case "last_7_days":
			start = new Date(y, m, d - 7, 0, 0, 0, 0);
			end = endDefault;
			break;
		case "last_30_days":
			start = new Date(y, m, d - 30, 0, 0, 0, 0);
			end = endDefault;
			break;
		default:
			return { start: new Date(), end: new Date() };
	}

	return { start, end };
}

/**
 * 趨勢圖用時間範圍（本地日界）
 * - 「日」與完整報表「今天」一致（getTimeRangeUTC('today')）
 * - 週／月／年以本地日曆 00:00 為界
 */
export function getTimeRangeForTrend(
	period: "day" | "week" | "month" | "year"
): { start: Date; end: Date } {
	if (period === "day") {
		return getTimeRangeUTC("today");
	}
	const now = new Date();
	const y = now.getFullYear();
	const m = now.getMonth();
	const d = now.getDate();
	const end = new Date(y, m, d + 1, 0, 0, 0, 0);
	switch (period) {
		case "week":
			return { start: new Date(y, m, d - 6, 0, 0, 0, 0), end };
		case "month":
			return { start: new Date(y, m, d - 29, 0, 0, 0, 0), end };
		case "year":
			return { start: new Date(y, m - 11, d, 0, 0, 0, 0), end };
		default:
			return getTimeRangeUTC("today");
	}
}

/** 時間範圍預設選項（與 TimeRangePicker 共用） */
export const TIME_RANGE_PRESETS = [
	{ value: "today", label: "今天" },
	{ value: "yesterday", label: "昨天" },
	{ value: "this_week", label: "本週" },
	{ value: "last_week", label: "上周" },
	{ value: "last_7_days", label: "近七天" },
	{ value: "last_30_days", label: "最近三十天" },
	{ value: "custom", label: "自訂" },
] as const;

/** 完整報表用：與一般選項一致 */
export const TIME_RANGE_PRESETS_FULL_REPORT = TIME_RANGE_PRESETS;

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

export type ClockDisplayParts = {
	date: string;
	weekday: string;
	period: string;
	time: string;
};

/** 多媒體牆／儀表板標頭用時鐘顯示（12 小時制，含星期與上午／下午） */
export function formatClockDisplay(date: Date): ClockDisplayParts {
	const padZero = (n: number): string => String(n).padStart(2, "0");
	const year = date.getFullYear();
	const month = padZero(date.getMonth() + 1);
	const day = padZero(date.getDate());

	const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
	const weekday = weekdays[date.getDay()] ?? "";

	const hours = date.getHours();
	const minutes = padZero(date.getMinutes());
	const seconds = padZero(date.getSeconds());
	const period = hours < 12 ? "上午" : "下午";
	const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;

	return {
		date: `${year}/${month}/${day}`,
		weekday,
		period,
		time: `${padZero(displayHours)}:${minutes}:${seconds}`,
	};
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

/**
 * 格式化日期時間為本地顯示格式（僅時間，HH:mm:ss）
 * @param dateString - ISO 8601 格式的日期時間字符串（可選）
 * @returns 格式化後的本地時間字符串，如果為空則返回 "-"
 */
export function formatTime(dateString?: string | null): string {
	if (!dateString) return "-";
	return new Date(dateString).toLocaleTimeString("zh-TW", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false
	});
}

/**
 * 將內部值（YYYY-MM-DDTHH:mm）格式化為單一 input 顯示（24 小時制）
 */
export function formatDateTimeLocalDisplay(value: string): string {
	const parsed = parseDateTimeLocalInput(value);
	if (!parsed) return "";
	return parsed.replace("T", " ");
}

/**
 * 解析使用者輸入為 datetime-local 相容字串（YYYY-MM-DDTHH:mm）。
 * 接受 `YYYY-MM-DD[T ]HH:mm`、`YYYY/MM/DD HH:mm`（可含秒，會捨去）。
 */
export function parseDateTimeLocalInput(raw: string): string | null {
	const text = (raw || "").trim();
	if (!text) return null;
	const match =
		/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s]+(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/.exec(
			text
		);
	if (!match) return null;
	const year = match[1]!;
	const month = Number(match[2]);
	const day = Number(match[3]);
	const hour = Number(match[4]);
	const minute = Number(match[5]);
	if (
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > 31 ||
		hour < 0 ||
		hour > 23 ||
		minute < 0 ||
		minute > 59
	) {
		return null;
	}
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}
