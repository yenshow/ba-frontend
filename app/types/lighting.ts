import type { RoomCategory } from "~/types/system";

// Modbus API 方法類型
export type ModbusMethod =
	| "getCoils" // 讀取 DO (Coils)
	| "writeCoil" // 寫入單一 DO (Coil)
	| "writeCoils" // 寫入多個 DO (Coils)
	| "getDiscreteInputs" // 讀取 DI (Discrete Inputs)
	| "getHoldingRegisters" // 讀取 Holding Registers
	| "getInputRegisters"; // 讀取 Input Registers

// 點位配置介面
export interface ModbusPointConfig {
	address: number; // 點位地址
	method: ModbusMethod; // API 方法
	note?: string; // 備註
}

export interface CategoryModbusConfig {
	// 引用已建立的 Modbus 設備 ID
	deviceId: number;
	// 點位配置列表（包含 DI/DO 等所有點位）
	points?: ModbusPointConfig[];
	// 保留舊格式以向後兼容（如果 deviceId 不存在，則使用這些欄位）
	host?: string;
	port?: number;
	unitId?: number;
	address?: number;
	length?: number;
	// 向後兼容：舊的單一點位格式
	diAddress?: number;
	diLength?: number;
	doAddress?: number;
	doLength?: number;
	diAddresses?: number[];
	doAddresses?: number[];
}

export type LightingCategory = RoomCategory & {
	modbus?: CategoryModbusConfig;
};
