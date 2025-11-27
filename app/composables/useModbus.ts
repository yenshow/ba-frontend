import { useRequestFetch } from "#app";
import type { ModbusDataResponse, ModbusHealth, DeviceConfig } from "~/types/modbus";

export type { DeviceConfig };

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
const deviceConfigToParams = (deviceConfig: DeviceConfig): QueryParams => {
	return {
		host: deviceConfig.host,
		port: deviceConfig.port,
		unitId: deviceConfig.unitId
	};
};

export const useModbusApi = () => {
	const config = useRuntimeConfig();
	const fetcher = useRequestFetch();
	const { adjustApiBase } = useApiBase();
	const timeout = Number(config.public.modbusRequestTimeout || 5000);

	// 基於統一的 apiBase 構建 Modbus API URL
	const modbusApiBase = adjustApiBase(`${config.public.apiBase}/modbus`, "Modbus API");

	const request = async <T>(path: string, params?: QueryParams) => {
		const query = buildQuery(params);
		const url = `${modbusApiBase}${path}${query}`;

		try {
			return await fetcher<T>(url, {
				timeout,
				headers: {
					Accept: "application/json"
				}
			});
		} catch (error) {
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
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json"
				},
				body
			});
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`Modbus API 請求失敗: ${error.message}`);
			}
			throw error;
		}
	};

	return {
		getHealth: (deviceConfig: DeviceConfig) => {
			const params = deviceConfigToParams(deviceConfig);
			return request<ModbusHealth>("/health", params);
		},
		getDiscreteInputs: (address: number, length: number, deviceConfig: DeviceConfig) => {
			const params = { address, length, ...deviceConfigToParams(deviceConfig) };
			return request<ModbusDataResponse<boolean>>("/discrete-inputs", params);
		},
		getCoils: (address: number, length: number, deviceConfig: DeviceConfig) => {
			const params = { address, length, ...deviceConfigToParams(deviceConfig) };
			return request<ModbusDataResponse<boolean>>("/coils", params);
		},
		getHoldingRegisters: (address: number, length: number, deviceConfig: DeviceConfig) => {
			const params = { address, length, ...deviceConfigToParams(deviceConfig) };
			return request<ModbusDataResponse<number>>("/holding-registers", params);
		},
		getInputRegisters: (address: number, length: number, deviceConfig: DeviceConfig) => {
			const params = { address, length, ...deviceConfigToParams(deviceConfig) };
			return request<ModbusDataResponse<number>>("/input-registers", params);
		},
		writeCoil: (address: number, value: boolean, deviceConfig: DeviceConfig) => {
			const params = deviceConfigToParams(deviceConfig);
			return requestWithBody<{ address: number; value: boolean; success: boolean; device: DeviceConfig }>("/coils", { address, value }, params);
		},
		writeCoils: (address: number, values: boolean[], deviceConfig: DeviceConfig) => {
			const params = deviceConfigToParams(deviceConfig);
			return requestWithBody<{ address: number; values: boolean[]; success: boolean; device: DeviceConfig }>("/coils", { address, values }, params);
		}
	};
};
