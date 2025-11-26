export interface ModbusHealth {
	isOpen: boolean;
	host: string;
	port: number;
	unitId: number;
	lastConnectedAt: string | null;
}

export interface DeviceConfig {
	host: string;
	port: number;
	unitId: number;
}

export interface ModbusDataResponse<T = number | boolean> {
	address: number;
	length: number;
	data: T[];
	device?: DeviceConfig;
}

