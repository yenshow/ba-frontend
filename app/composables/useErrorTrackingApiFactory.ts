import { useApiBase } from "~/composables/useApiBase";

/**
 * 通用錯誤追蹤 API Factory
 * 用於統一管理不同系統的錯誤追蹤操作
 */
export const useErrorTrackingApiFactory = (resourcePath: string, defaultErrorMessage: string) => {
	const { request } = useApiBase();

	return {
		/**
		 * 記錄錯誤
		 */
		reportError: (resourceId: string | number, errorMessage?: string) => {
			return request<{ success: boolean; alertCreated: boolean }>(
				`${resourcePath}/${resourceId}/errors`,
				{
					method: "POST",
					body: JSON.stringify({ errorMessage: errorMessage || defaultErrorMessage })
				}
			);
		},

		/**
		 * 清除錯誤
		 */
		clearError: (resourceId: string | number) => {
			return request<{ success: boolean }>(`${resourcePath}/${resourceId}/errors`, {
				method: "DELETE"
			});
		}
	};
};

