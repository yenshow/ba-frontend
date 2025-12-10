import { useRequestFetch } from "#app";
import type { ModbusDataResponse, ModbusHealth, ModbusDeviceConfig } from "~/types/modbus";

export type { ModbusDeviceConfig as DeviceConfig };

type QueryParams = Record<string, string | number | boolean | undefined>;

const buildQuery = (params?: QueryParams): string => {
	if (!params) {
		return "";
	}
	const searchParams = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined) {
			searchParams.append(key, String(value));
		}
	});
	const query = searchParams.toString();
	return query ? `?${query}` : "";
};

// 將設備配置轉換為查詢參數
const deviceConfigToParams = (deviceConfig: ModbusDeviceConfig): QueryParams => {
	return {
		host: deviceConfig.host,
		port: deviceConfig.port,
		unitId: deviceConfig.unitId
	};
};

export const useModbusApi = () => {
	const config = useRuntimeConfig();
	const fetcher = useRequestFetch();
	const timeout = Number(config.public.modbusRequestTimeout || 5000);

	// 基於統一的 apiBase 構建 Modbus API URL
	const modbusApiBase = `${config.public.apiBase || "http://localhost:4000/api"}/modbus`;

	const request = async <T>(path: string, params?: QueryParams) => {
		const query = buildQuery(params);
		const url = `${modbusApiBase}${path}${query}`;

		try {
			return await fetcher<T>(url, {
				timeout,
				credentials: "include", // 配合後端 CORS credentials: true 設定
				headers: {
					Accept: "application/json"
				}
			});
		} catch (error: any) {
			// 處理 CORS 錯誤
			if (
				error?.message?.includes("CORS") ||
				error?.message?.includes("cross-origin") ||
				error?.statusCode === 0 ||
				(error?.statusCode === undefined && error?.status === undefined)
			) {
				throw new Error(`Modbus API CORS 錯誤: ${url}\n` + `請檢查後端 CORS_ORIGINS 設定是否包含前端地址`);
			}

			if (error instanceof Error) {
				throw new Error(`Modbus API 請求失敗: ${error.message}`);
			}
			throw error;
		}
	};

	const requestWithBody = async <T>(path: string, body: Record<string, unknown>, params?: QueryParams) => {
		const query = buildQuery(params);
		const url = `${modbusApiBase}${path}${query}`;

		try {
			return await fetcher<T>(url, {
				method: "PUT",
				timeout,
				credentials: "include", // 配合後端 CORS credentials: true 設定
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json"
				},
				body
			});
		} catch (error: any) {
			// 處理 CORS 錯誤
			if (
				error?.message?.includes("CORS") ||
				error?.message?.includes("cross-origin") ||
				error?.statusCode === 0 ||
				(error?.statusCode === undefined && error?.status === undefined)
			) {
				throw new Error(`Modbus API CORS 錯誤: ${url}\n` + `請檢查後端 CORS_ORIGINS 設定是否包含前端地址`);
			}

			if (error instanceof Error) {
				throw new Error(`Modbus API 請求失敗: ${error.message}`);
			}
			throw error;
		}
	};

	return {
		getHealth: (deviceConfig: ModbusDeviceConfig) => {
			const params = deviceConfigToParams(deviceConfig);
			return request<ModbusHealth>("/health", params);
		},
		getDiscreteInputs: (address: number, length: number, deviceConfig: ModbusDeviceConfig) => {
			const params = { address, length, ...deviceConfigToParams(deviceConfig) };
			return request<ModbusDataResponse<boolean>>("/discrete-inputs", params);
		},
		getCoils: (address: number, length: number, deviceConfig: ModbusDeviceConfig) => {
			const params = { address, length, ...deviceConfigToParams(deviceConfig) };
			return request<ModbusDataResponse<boolean>>("/coils", params);
		},
		getHoldingRegisters: (address: number, length: number, deviceConfig: ModbusDeviceConfig) => {
			const params = { address, length, ...deviceConfigToParams(deviceConfig) };
			return request<ModbusDataResponse<number>>("/holding-registers", params);
		},
		getInputRegisters: (address: number, length: number, deviceConfig: ModbusDeviceConfig) => {
			const params = { address, length, ...deviceConfigToParams(deviceConfig) };
			return request<ModbusDataResponse<number>>("/input-registers", params);
		},
		writeCoil: (address: number, value: boolean, deviceConfig: ModbusDeviceConfig) => {
			const params = deviceConfigToParams(deviceConfig);
			return requestWithBody<{ address: number; value: boolean; success: boolean; device: ModbusDeviceConfig }>("/coils", { address, value }, params);
		},
		writeCoils: (address: number, values: boolean[], deviceConfig: ModbusDeviceConfig) => {
			const params = deviceConfigToParams(deviceConfig);
			return requestWithBody<{ address: number; values: boolean[]; success: boolean; device: ModbusDeviceConfig }>("/coils", { address, values }, params);
		}
	};
};
