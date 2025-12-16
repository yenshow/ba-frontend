export interface ModbusHealth {
	isOpen: boolean;
	host: string;
	port: number;
	unitId: number;
	lastConnectedAt: string | null;
}

export interface ModbusDeviceConfig {
	host: string;
	port: number;
	unitId: number;
}

export interface ModbusDataResponse<T = number | boolean> {
	address: number;
	length: number;
	data: T[];
	device?: ModbusDeviceConfig;
}

// 設備管理相關類型已遷移到 device.ts
// 請使用 Device, CreateDeviceData, UpdateDeviceData, DeviceType, DeviceModel 等類型
