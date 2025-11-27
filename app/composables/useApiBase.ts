/**
 * 共用的 API Base URL 處理
 * 自動處理 localhost 到 IP 地址的轉換
 */
export const useApiBase = () => {
	/**
	 * 調整 API Base URL
	 * 如果當前訪問使用的是 IP 地址，自動將 localhost 替換為當前 IP
	 */
	const adjustApiBase = (baseUrl: string, apiName: string = "API"): string => {
		if (!process.client) {
			return baseUrl;
		}

		const currentHost = window.location.hostname;
		// 如果當前訪問的是 IP 地址（不是 localhost），且 API URL 使用 localhost
		if (currentHost !== "localhost" && currentHost !== "127.0.0.1" && baseUrl.includes("localhost")) {
			const adjustedUrl = baseUrl.replace("localhost", currentHost);
			if (process.dev) {
				console.log(`[${apiName}] 已自動調整 API Base: ${adjustedUrl}`);
			}
			return adjustedUrl;
		}

		if (process.dev) {
			console.log(`[${apiName}] API Base URL: ${baseUrl}`);
		}

		return baseUrl;
	};

	return {
		adjustApiBase
	};
};
