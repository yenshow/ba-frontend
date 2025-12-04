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

export interface ModbusDevice {
	id: number;
	name: string;
	type_id: number;
	host: string;
	port: number;
	unitId: number;
	description?: string;
	status: "active" | "inactive" | "error";
	created_at?: string;
	updated_at?: string;
}

export interface CreateModbusDeviceData {
	name: string;
	type_id: number;
	device_type?: string; // 後端可能需要此欄位
	host: string;
	port: number;
	unitId: number;
	description?: string;
}

export interface UpdateModbusDeviceData {
	name?: string;
	type_id?: number;
	host?: string;
	port?: number;
	unitId?: number;
	description?: string;
	status?: "active" | "inactive" | "error";
}

export interface ModbusDeviceType {
	id: number;
	name: string;
	code: string;
	description?: string;
	created_at?: string;
	updated_at?: string;
}

