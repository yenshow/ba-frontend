/**
 * 取得用於解析上傳檔案 URL 的伺服器根路徑
 * 會自動處理 apiBase 結尾的 /api 後綴
 */
export const useUploadBaseUrl = () => {
	const config = useRuntimeConfig();
	const apiBase = config.public.apiBase || "http://localhost:4000";
	return apiBase.replace(/\/api\/?$/, "");
};
