/**
 * API 工具函數
 * 提供統一的查詢參數構建、路徑構建等共用功能
 * 注意：這些都是純函數，不需要響應式狀態
 */

const isAbsoluteHttpUrl = (v: string): boolean => /^https?:\/\//i.test(v);

/** 是否為受保護的上傳讀取路徑（/api/uploads） */
export const isApiProxiedUploadPath = (url: string): boolean => {
	const v = String(url || "").trim();
	if (!v) return false;
	if (v.startsWith("/api/uploads/")) return true;
	if (isAbsoluteHttpUrl(v)) {
		try {
			return new URL(v).pathname.startsWith("/api/uploads/");
		} catch {
			return false;
		}
	}
	return false;
};

const resolveBackendAssetUrl = (raw: string, apiBase: string): string => {
	const v = String(raw || "").trim();
	if (!v) return "";

	if (isAbsoluteHttpUrl(v)) return v;

	if (!v.startsWith("/uploads/")) return v;

	const base = String(apiBase || "").trim();
	const assetBase = base.endsWith("/api") ? base.slice(0, -4) : base;
	if (!assetBase || assetBase === "/") {
		return `/api${v}`;
	}
	return `${assetBase}/api${v}`;
};

export const appendUploadAccessToken = (
	url: string,
	accessToken: string | null | undefined,
): string => {
	const u = String(url || "").trim();
	const token = String(accessToken || "").trim();
	if (!u || !token || !isApiProxiedUploadPath(u)) return u;

	try {
		const parsed = isAbsoluteHttpUrl(u)
			? new URL(u)
			: new URL(u, "http://local.invalid");
		parsed.searchParams.set("access_token", token);
		if (isAbsoluteHttpUrl(u)) return parsed.toString();
		return `${parsed.pathname}${parsed.search}${parsed.hash}`;
	} catch {
		const sep = u.includes("?") ? "&" : "?";
		return `${u}${sep}access_token=${encodeURIComponent(token)}`;
	}
};

export const resolveUploadUrl = (src: string, apiBase: string): string => {
	return resolveBackendAssetUrl(src, apiBase);
};

export const resolveProtectedUploadUrl = (
	src: string,
	apiBase: string,
	accessToken: string | null | undefined,
): string => appendUploadAccessToken(resolveUploadUrl(src, apiBase), accessToken);

export const buildQueryParams = (filters?: Record<string, unknown>): URLSearchParams => {
	const queryParams = new URLSearchParams();
	if (filters) {
		for (const [key, value] of Object.entries(filters)) {
			if (value === undefined || value === null || value === "") {
				continue;
			}
			if (Array.isArray(value)) {
				for (const v of value) {
					if (v === undefined || v === null || v === "") continue;
					queryParams.append(key, typeof v === "string" ? v : String(v));
				}
				continue;
			}
			queryParams.append(key, typeof value === "string" ? value : String(value));
		}
	}
	return queryParams;
};

export const buildPathWithQuery = (
	basePath: string,
	params?: Record<string, unknown> | URLSearchParams,
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

export const buildResourcePath = (resourcePath: string, id?: string | number): string => {
	if (id !== undefined) {
		return `${resourcePath}/${id}`;
	}
	return resourcePath;
};

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
