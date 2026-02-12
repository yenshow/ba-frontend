/**
 * 共用 CSV 匯出工具（與後端備份格式一致：BOM + 標題列 + 資料列）
 */

const escapeCsv = (value: unknown): string => {
	if (value === null || value === undefined) return "";
	const str = String(value);
	if (str.includes(",") || str.includes('"') || str.includes("\n")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
};

/** 與後端備份一致：每格加引號、逗號改分號 */
export const escapeCsvBackup = (value: unknown): string => {
	if (value === null || value === undefined) return '""';
	const str = String(value).replace(/"/g, '""').replace(/,/g, ";");
	return `"${str}"`;
};

export type ExportCsvOptions = {
	/** 與後端備份檔格式一致（每格加引號、逗號改分號） */
	backupStyle?: boolean;
};

/**
 * 將表格資料匯出為 CSV 並觸發下載
 * @param headers 欄位名稱（順序即為 CSV 欄位順序）
 * @param rows 每筆為 key 對應 header 的物件
 * @param filename 下載檔名（不含路徑）
 * @param options.backupStyle 為 true 時與後端備份 CSV 格式一致
 */
export const exportCsv = (
	headers: string[],
	rows: Record<string, string>[],
	filename: string,
	options: ExportCsvOptions = {}
): void => {
	if (rows.length === 0) return;
	const { backupStyle = false } = options;
	const escapeCell = backupStyle ? escapeCsvBackup : escapeCsv;
	const headerLine = backupStyle ? headers.join(",") : headers.map((h) => escapeCsv(h)).join(",");
	const csvContent = [
		headerLine,
		...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(",")),
	].join("\n");
	const BOM = "\uFEFF";
	const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

/**
 * 組出單一區塊的 CSV 字串（標題列 + 資料列），供多區塊匯出使用
 */
export const buildCsvSection = (
	headers: string[],
	rows: Record<string, string>[],
	options: ExportCsvOptions = {}
): string => {
	const { backupStyle = false } = options;
	const escapeCell = backupStyle ? escapeCsvBackup : escapeCsv;
	const headerLine = backupStyle ? headers.join(",") : headers.map((h) => escapeCsv(h)).join(",");
	if (rows.length === 0) return headerLine;
	return [
		headerLine,
		...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(",")),
	].join("\n");
};
