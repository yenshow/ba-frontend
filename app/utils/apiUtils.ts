/**
 * API 工具函數
 * 提供統一的查詢參數構建、路徑構建等共用功能
 * 注意：這些都是純函數，不需要響應式狀態
 */

/**
 * 解析上傳檔案的顯示 URL
 * 當 src 為後端上傳路徑（/uploads/）時，需加上伺服器 base URL
 *
 * @param src - 原始設定值（URL 或 /uploads/... 路徑）
 * @param apiBase - API base 設定（可含 /api 後綴，會自動 stripping）
 */
export const resolveUploadUrl = (src: string, apiBase: string): string => {
	const trimmed = src?.trim() ?? "";
	if (!trimmed) return "";
	if (trimmed.startsWith("/uploads/")) {
		const base = apiBase.replace(/\/api\/?$/, "");
		return `${base}${trimmed}`;
	}
	return trimmed;
};

/**
 * 構建查詢參數的通用函數
 * 自動過濾 undefined、null 和空字串
 */
export const buildQueryParams = (filters?: Record<string, unknown>): URLSearchParams => {
	const queryParams = new URLSearchParams();
	if (filters) {
		for (const [key, value] of Object.entries(filters)) {
			if (value !== undefined && value !== null && value !== "") {
				queryParams.append(key, typeof value === "string" ? value : String(value));
			}
		}
	}
	return queryParams;
};

/**
 * 構建帶查詢參數的路徑
 * @param basePath - 基礎路徑
 * @param params - 查詢參數（可以是 Record 或 URLSearchParams）
 * @returns 完整的路徑字串
 */
export const buildPathWithQuery = (
	basePath: string,
	params?: Record<string, unknown> | URLSearchParams
): string => {
	if (!params) {
		return basePath;
	}

	let queryParams: URLSearchParams;
	if (params instanceof URLSearchParams) {
		queryParams = params;
	} else {
		queryParams = buildQueryParams(params);
	}

	const queryString = queryParams.toString();
	return queryString ? `${basePath}?${queryString}` : basePath;
};

/**
 * 構建標準的 CRUD API 路徑
 * @param resourcePath - 資源路徑（如 "/devices"）
 * @param id - 資源 ID（可選）
 * @returns 完整的 API 路徑
 */
export const buildResourcePath = (resourcePath: string, id?: string | number): string => {
	if (id !== undefined) {
		return `${resourcePath}/${id}`;
	}
	return resourcePath;
};

/**
 * 構建分頁查詢參數
 * @param params - 分頁參數
 * @returns URLSearchParams
 */
export const buildPaginationParams = (params?: {
	limit?: number;
	offset?: number;
	orderBy?: string;
	order?: "asc" | "desc";
}): URLSearchParams => {
	const queryParams = new URLSearchParams();
	if (params?.limit !== undefined && params?.limit !== null) {
		queryParams.append("limit", String(params.limit));
	}
	if (params?.offset !== undefined && params?.offset !== null) {
		queryParams.append("offset", String(params.offset));
	}
	if (params?.orderBy) {
		queryParams.append("orderBy", params.orderBy);
	}
	if (params?.order) {
		queryParams.append("order", params.order);
	}
	return queryParams;
};

/**
 * 合併多個查詢參數
 * @param params - 要合併的參數陣列（可以是 Record 或 URLSearchParams）
 * @returns 合併後的 URLSearchParams
 */
export const mergeQueryParams = (
	...params: (Record<string, unknown> | URLSearchParams)[]
): URLSearchParams => {
	const merged = new URLSearchParams();
	for (const param of params) {
		let queryParams: URLSearchParams;
		if (param instanceof URLSearchParams) {
			queryParams = param;
		} else {
			queryParams = buildQueryParams(param);
		}
		for (const [key, value] of queryParams.entries()) {
			merged.append(key, value);
		}
	}
	return merged;
};

