/**
 * 統一的時間處理工具函數
 *
 * TimeRangePicker／一般報表自訂區間：瀏覽器**本地日曆** 00:00，半開 `[start, endExclusive)`。
 * 人流／車輛 preset（today／yesterday／last7days）查詢請走後端營運日
 * （`buildLogsTimeQuery` → `timeRange`；Asia/Taipei），勿只用此檔 ISO 當營運日。
 *
 * 函式名 `getTimeRangeUTC` 為歷史名稱：實際為本地日界，回傳 Date 再 `toISOString()` 送 API。
 */

/**
 * 本地日曆時間範圍（半開區間）。
 * `last_7_days`＝含今天共 7 曆日（start＝today−6），與後端 last7days 天數對齊。
 */
export function getTimeRangeUTC(preset: string): { start: Date; end: Date } {
	const now = new Date();
	const y = now.getFullYear();
	const m = now.getMonth();
	const d = now.getDate();
	const endDefault = new Date(y, m, d + 1, 0, 0, 0, 0);

	switch (preset) {
		case "today":
			return { start: new Date(y, m, d, 0, 0, 0, 0), end: endDefault };
		case "yesterday":
			return {
				start: new Date(y, m, d - 1, 0, 0, 0, 0),
				end: new Date(y, m, d, 0, 0, 0, 0),
			};
		case "this_week": {
			const dayOfWeek = now.getDay();
			const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			return {
				start: new Date(y, m, d + toMonday, 0, 0, 0, 0),
				end: endDefault,
			};
		}
		case "last_week": {
			const dayOfWeek = now.getDay();
			const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			return {
				start: new Date(y, m, d + toMonday - 7, 0, 0, 0, 0),
				end: new Date(y, m, d + toMonday, 0, 0, 0, 0),
			};
		}
		case "last_7_days":
			return {
				start: new Date(y, m, d - 6, 0, 0, 0, 0),
				end: endDefault,
			};
		case "last_30_days":
			return {
				start: new Date(y, m, d - 29, 0, 0, 0, 0),
				end: endDefault,
			};
		default:
			return { start: new Date(), end: new Date() };
	}
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

/** YYYY-MM-DD → 本地日曆 00:00（勿接 `T00:00:00Z`，台灣會偏成當天 08:00） */
export function parseLocalDateInput(ymd: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || "").trim());
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
	if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
	return new Date(y, mo - 1, d, 0, 0, 0, 0);
}

/**
 * 含頭含尾日 → 本地半開區間 [start 00:00, endExclusive 次日 00:00)
 * 與 getTimeRangeUTC／TimeRangePicker 自訂區間一致
 */
export function localDayRangeFromInclusiveYmd(
	startYmd: string,
	endYmd: string,
): { start: Date; end: Date } | null {
	const start = parseLocalDateInput(startYmd);
	const endInclusive = parseLocalDateInput(endYmd);
	if (!start || !endInclusive || endInclusive < start) return null;
	const end = new Date(endInclusive);
	end.setDate(end.getDate() + 1);
	return { start, end };
}

/**
 * ISO 區間 → 含頭含尾本地 YYYY-MM-DD（date input／簽到報表 API）
 * - 半開 end（本地 00:00:00.000）→ 結束日＝前一日
 * - 含尾 end（營運日 23:59:59.999 等非午夜）→ 結束日＝該曆日（勿再 −1）
 */
export function isoRangeToInclusiveYmd(
	startIso: string,
	endIso: string,
): { startDate: string; endDate: string } {
	const start = new Date(startIso);
	const end = new Date(endIso);
	const endInclusive = new Date(end);
	const isLocalMidnight =
		endInclusive.getHours() === 0 &&
		endInclusive.getMinutes() === 0 &&
		endInclusive.getSeconds() === 0 &&
		endInclusive.getMilliseconds() === 0;
	if (isLocalMidnight) {
		endInclusive.setDate(endInclusive.getDate() - 1);
	}
	return {
		startDate: formatDateInput(start),
		endDate: formatDateInput(endInclusive),
	};
}

/** 自訂區間按鈕顯示：YYYY/MM/DD - YYYY/MM/DD（含頭含尾） */
export function formatInclusiveLocalRangeDisplay(startIso: string, endIso: string): string {
	const { startDate, endDate } = isoRangeToInclusiveYmd(startIso, endIso);
	return `${startDate.replace(/-/g, "/")} - ${endDate.replace(/-/g, "/")}`;
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
