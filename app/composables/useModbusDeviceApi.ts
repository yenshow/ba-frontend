import { useRequestFetch } from "#app";
import type { ModbusDevice, CreateModbusDeviceData, UpdateModbusDeviceData, ModbusDeviceType } from "~/types/modbus";

export const useModbusDeviceApi = () => {
	const config = useRuntimeConfig();
	const fetcher = useRequestFetch();

	// 使用環境變數配置的 API base URL
	const apiBase = config.public.apiBase || "http://localhost:4000/api";

	// 取得認證 headers
	const getAuthHeaders = (): HeadersInit => {
		const token = useCookie("auth_token").value;
		const headers: HeadersInit = {
			"Content-Type": "application/json",
			Accept: "application/json"
		};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		return headers;
	};

	const request = async <T>(path: string, options: RequestInit = {}) => {
		const url = `${apiBase}${path}`;
		const headers: Record<string, string> = {
			...(getAuthHeaders() as Record<string, string>),
			...(options.headers as Record<string, string>)
		};

		// 設置超時時間（10秒）
		const timeout = 10000;

		try {
			const response = await fetcher<T>(url, {
				...options,
				headers,
				credentials: "include",
				timeout
			} as any);
			return response;
		} catch (error: any) {
			// 處理網路連線錯誤
			const errorMessage = error?.message || "";
			const isNetworkError =
				errorMessage.includes("ERR_ADDRESS_UNREACHABLE") ||
				errorMessage.includes("ERR_CONNECTION_REFUSED") ||
				errorMessage.includes("ERR_NETWORK") ||
				errorMessage.includes("Failed to fetch") ||
				errorMessage.includes("NetworkError") ||
				errorMessage.includes("ECONNREFUSED") ||
				errorMessage.includes("ENOTFOUND") ||
				error?.code === "ECONNREFUSED" ||
				error?.code === "ENOTFOUND" ||
				(error?.statusCode === undefined && error?.status === undefined && errorMessage.includes("<no response>"));

			if (isNetworkError) {
				const targetHost = url.match(/https?:\/\/([^\/:]+)/)?.[1] || "未知";
				throw new Error(
					`無法連接到後端伺服器 (${targetHost})\n\n` +
						`請確認：\n` +
						`1. 後端服務是否正常運行\n` +
						`2. 後端地址是否正確：${url}\n` +
						`3. 前端和後端是否在同一網路或可以互相訪問`
				);
			}

			// 處理請求超時
			if (errorMessage.includes("timeout") || error?.name === "TimeoutError") {
				throw new Error(`請求超時 (${url})，請檢查網路連線或稍後再試`);
			}

			// 處理 CORS 錯誤
			if (
				errorMessage.includes("CORS") ||
				errorMessage.includes("cross-origin") ||
				errorMessage.includes("Access-Control") ||
				(error?.statusCode === 0 && !isNetworkError)
			) {
				throw new Error(
					`CORS 錯誤：無法連接到後端 API (${url})\n\n` +
						`請檢查後端 CORS_ORIGINS 環境變數是否包含前端地址`
				);
			}

			// 提取後端返回的錯誤訊息
			const backendErrorMsg = error?.data?.message || error?.data?.details || error?.data?.error?.message || error?.message || "";
			const statusCode = error?.statusCode || error?.status;

			// 處理各種 HTTP 狀態碼
			if (statusCode === 400) {
				throw new Error(backendErrorMsg || "請求參數錯誤");
			}

			if (statusCode === 401) {
				const { logout } = useAuth();
				logout();
				if (process.client) {
					const toast = useToast();
					toast.warning("登入已過期，請重新登入");
					const router = useRouter();
					await router.push({
						path: "/login",
						query: {
							redirect: router.currentRoute.value.fullPath
						}
					});
				}
				throw new Error("登入已過期，請重新登入");
			}

			if (statusCode === 403) {
				throw new Error(backendErrorMsg || "權限不足，無法執行此操作");
			}

			if (statusCode === 404) {
				throw new Error(backendErrorMsg || "請求的資源不存在");
			}

			if (statusCode === 500) {
				throw new Error(`伺服器錯誤 (500): ${backendErrorMsg || "Internal Server Error"}`);
			}

			if (error instanceof Error) {
				const statusCode = (error as any)?.statusCode || (error as any)?.status;
				if (statusCode) {
					throw new Error(`API 請求失敗 (${statusCode}): ${error.message}`);
				}
				throw new Error(`API 請求失敗: ${error.message}`);
			}
			throw error;
		}
	};

	return {
		// 建立 Modbus 設備
		createDevice: (data: CreateModbusDeviceData) => {
			return request<{ message: string; device: ModbusDevice }>("/modbus/devices", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		// 取得 Modbus 設備列表
		getDevices: (params?: {
			status?: string;
			limit?: number;
			offset?: number;
			orderBy?: string;
			order?: "asc" | "desc";
		}) => {
			const query = new URLSearchParams();
			if (params?.status) query.append("status", params.status);
			if (params?.limit !== undefined && params?.limit !== null) {
				query.append("limit", String(params.limit));
			}
			if (params?.offset !== undefined && params?.offset !== null) {
				query.append("offset", String(params.offset));
			}
			if (params?.orderBy) {
				query.append("orderBy", params.orderBy);
			}
			if (params?.order) {
				query.append("order", params.order);
			}

			const queryString = query.toString();
			return request<{ devices: ModbusDevice[]; total: number; limit: number; offset: number }>(
				`/modbus/devices${queryString ? `?${queryString}` : ""}`
			);
		},

		// 取得單一 Modbus 設備
		getDevice: (id: number) => {
			return request<ModbusDevice>(`/modbus/devices/${id}`);
		},

		// 更新 Modbus 設備
		updateDevice: (id: number, data: UpdateModbusDeviceData) => {
			return request<{ message: string; device: ModbusDevice }>(`/modbus/devices/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		// 刪除 Modbus 設備
		deleteDevice: (id: number) => {
			return request<{ message: string }>(`/modbus/devices/${id}`, {
				method: "DELETE"
			});
		},

		// 取得所有設備類型
		getDeviceTypes: () => {
			return request<{ device_types: ModbusDeviceType[] }>("/modbus/device-types");
		},

		// 取得單一設備類型
		getDeviceType: (id: number) => {
			return request<{ device_type: ModbusDeviceType }>(`/modbus/device-types/${id}`);
		}
	};
};

