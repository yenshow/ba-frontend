import type { RoomCategory } from "~/types/system";

export interface CategoryModbusConfig {
	host: string;
	port: number;
	unitId: number;
	address: number;
	length: number;
}

export type LightingCategory = RoomCategory & {
	modbus?: CategoryModbusConfig;
};

