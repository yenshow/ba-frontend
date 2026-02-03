import { useRequestFetch } from "#app";
import { useApiBase } from "~/composables/core/useApiBase";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";

export type UseAppSettingsOptions = {
	key: string;
	defaultValue: string;
};

/**
 * 系統設定 Composable
 * 提供與後端 system_settings 表互動的功能
 */
export const useAppSettings = (options: UseAppSettingsOptions) => {
	const { key, defaultValue } = options;
	const { request } = useApiBase();
	const { showToast } = useToast();
	const { handleError } = useErrorHandler();

	const value = ref<string>(defaultValue);
	const isLoading = ref(false);

	/**
	 * 從後端讀取設定
	 */
	const loadSetting = async () => {
		if (!process.client) {
			value.value = defaultValue;
			return;
		}

		isLoading.value = true;
		try {
			const response = await request<{ setting: { value: string | null } }>(`/settings/${key}`);
			if (response?.setting?.value?.trim()) {
				value.value = response.setting.value;
			} else {
				value.value = defaultValue;
			}
		} catch {
			// 所有錯誤（包含 404）靜默處理，使用預設值
			value.value = defaultValue;
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * 儲存設定（文字）
	 */
	const save = async (nextValue: string) => {
		const normalized = nextValue?.trim() ?? "";

		if (normalized.length === 0) {
			await reset();
			return;
		}

		isLoading.value = true;
		try {
			await request(`/settings/${key}`, {
				method: "PUT",
				body: JSON.stringify({ value: normalized })
			});

			value.value = normalized;
			showToast("success", "設定已儲存");
		} catch (error) {
			handleError(error, `儲存設定失敗: ${key}`);
			throw error;
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * 上傳檔案並儲存 URL
	 */
	const uploadFile = async (file: File) => {
		if (!file) {
			throw new Error("未選擇檔案");
		}

		isLoading.value = true;
		try {
			const formData = new FormData();
			formData.append("key", key);
			formData.append("file", file);

			// 使用 useApiBase 的 request，但需要移除 Content-Type header（讓瀏覽器自動設定）
			const config = useRuntimeConfig();
			const apiBase = config.public.apiBase || "http://localhost:4000/api";
			const fetcher = useRequestFetch();
			const cookie = useCookie("auth_token");
			const token = cookie.value;

			const headers: HeadersInit = {
				Accept: "application/json"
			};
			if (token) {
				headers.Authorization = `Bearer ${token}`;
			}
			// 注意：不設定 Content-Type，讓瀏覽器自動設定（包含 boundary）

			const response = await fetcher<{ success: boolean; data: { setting: { value: string }; file: { url: string } } }>(
				`${apiBase}/settings/upload`,
				{
					method: "POST",
					headers,
					body: formData,
					credentials: "include"
				}
			);

			// 處理響應格式
			const settingValue =
				(response as any)?.data?.setting?.value || (response as any)?.setting?.value;

			if (settingValue) {
				value.value = settingValue;
				showToast("success", "檔案上傳成功");
			}
		} catch (error) {
			handleError(error, `上傳檔案失敗: ${key}`);
			throw error;
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * 重設為預設值（刪除後端設定）
	 */
	const reset = async () => {
		// 如果當前值已經是預設值，直接視為成功
		if (value.value === defaultValue) {
			showToast("success", "設定已重設為預設值");
			return;
		}

		isLoading.value = true;
		try {
			await request(`/settings/${key}`, {
				method: "DELETE"
			});

			value.value = defaultValue;
			showToast("success", "設定已重設為預設值");
		} catch (error: any) {
			// 404 表示設定不存在，視為成功
			if (error?.statusCode === 404 || error?.status === 404) {
				value.value = defaultValue;
				showToast("success", "設定已重設為預設值");
			} else {
				handleError(error, `重設設定失敗: ${key}`);
				throw error;
			}
		} finally {
			isLoading.value = false;
		}
	};

	// 組件掛載時載入設定
	onMounted(() => {
		loadSetting();
	});

	return {
		value,
		isLoading,
		loadSetting,
		save,
		uploadFile,
		reset
	};
};
