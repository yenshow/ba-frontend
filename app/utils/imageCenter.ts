/**
 * 圖片處理中心（純函式）
 * - 顯示 URL 解析（http / data / uploads / 後端相對路徑 / picUri）
 * - base64 轉換、錯誤處理、File 轉換
 */
import { resolveProtectedUploadUrl } from "~/utils/apiUtils";

const trim = (raw: string | null | undefined): string => String(raw ?? "").trim();

/** 舊 ISAPI 上傳目錄（DB 可能仍存 isapi-vehicle-events）→ 現行 vehicle-events */
const normalizeLegacyUploadPath = (v: string): string =>
	v.replace(/^\/uploads\/isapi-vehicle-events\//i, "/uploads/vehicle-events/");

export const isAbsoluteUrl = (v: string): boolean => /^https?:\/\//i.test(v);
export const isDataUrl = (v: string): boolean => /^data:/i.test(v);

/** 是否可直接用 <img src> 顯示（不需 external-data 取圖） */
export const isDirectDisplayUrl = (raw: string | null | undefined): boolean => {
	const v = trim(raw);
	if (!v) return false;
	if (isAbsoluteUrl(v) || isDataUrl(v)) return true;
	if (v.startsWith("/uploads/") || v.startsWith("/")) return true;
	return false;
};

/** 是否為 external-data picUri（需批次/單筆 API 取 base64） */
export const isPicUri = (raw: string | null | undefined): boolean => {
	const v = trim(raw);
	if (!v) return false;
	return !isDirectDisplayUrl(v);
};

/**
 * 解析可顯示 URL
 * - http(s) / data: 原樣
 * - /uploads/... → resolveUploadUrl
 * - 其他 /path → 後端 origin
 * - picUri → 原樣回傳（由 useImageCenter 非同步取圖）
 */
export const resolveDisplayUrl = (
	raw: string | null | undefined,
	apiBase: string,
	accessToken?: string | null,
): string => {
	const v = normalizeLegacyUploadPath(trim(raw));
	if (!v) return "";
	if (isAbsoluteUrl(v) || isDataUrl(v)) return v;
	if (v.startsWith("/uploads/")) {
		return resolveProtectedUploadUrl(v, apiBase, accessToken);
	}
	if (v.startsWith("/")) {
		const base = trim(apiBase);
		const origin = base.replace(/\/api\/?$/, "");
		if (!origin || origin === "/") return `/api${v}`;
		return `${origin}${v}`;
	}
	return v;
};

/** 同步解析：可直接顯示則回 URL，picUri 回 null */
export const resolveDirectDisplayUrl = (
	raw: string | null | undefined,
	apiBase: string,
	accessToken?: string | null,
): string | null => {
	const v = trim(raw);
	if (!v) return null;
	if (isPicUri(v)) return null;
	return resolveDisplayUrl(v, apiBase, accessToken);
};
