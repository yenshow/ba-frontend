import type { RoomCategory } from "~/types/system";

// 點位類型
export type ModbusPointType = "DI" | "DO";

// 點位配置介面
export interface ModbusPointConfig {
	id?: string; // 唯一 ID（用於 UI）
	address: number; // 點位地址
	type: ModbusPointType; // 點位類型：DI (數位輸入) 或 DO (數位輸出)
	note?: string; // 備註

	// 向後兼容：保留 method 欄位（舊格式）
	method?: string;
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
