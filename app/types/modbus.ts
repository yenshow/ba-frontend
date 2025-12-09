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
	model_id?: number;
	type_id: number;
	host: string;
	port: number;
	unitId: number;
	description?: string;
	status: "active" | "inactive" | "error";
	created_at?: string;
	updated_at?: string;
	// 關聯資料（從 JOIN 查詢中獲取）
	model_name?: string;
	model_port?: number;
	type_name?: string;
	type_code?: string;
}

export interface CreateModbusDeviceData {
	name: string;
	model_id: number; // 必填：選擇設備型號
	host: string;
	unitId: number;
	description?: string;
	status?: "active" | "inactive" | "error";
	// port 和 type_id 會從 model_id 自動繼承，不需要前端傳送
}

export interface UpdateModbusDeviceData {
	name?: string;
	model_id?: number;
	host?: string;
	unitId?: number;
	description?: string;
	status?: "active" | "inactive" | "error";
	// port 和 type_id 會從 model_id 自動繼承
}

export interface ModbusDeviceType {
	id: number;
	name: string;
	code: string;
	description?: string;
	created_at?: string;
	updated_at?: string;
}

export interface ModbusDeviceModel {
	id: number;
	name: string;
	type_id: number;
	port: number;
	description?: string;
	type_name?: string;
	type_code?: string;
	created_at?: string;
	updated_at?: string;
}

export interface CreateModbusDeviceModelData {
	name: string;
	type_id: number;
	port: number;
	description?: string;
}

export interface UpdateModbusDeviceModelData {
	name?: string;
	type_id?: number;
	port?: number;
	description?: string;
}

