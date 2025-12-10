// 設備類型代碼
export type DeviceTypeCode = "camera" | "controller" | "sensor" | "tablet" | "network";

// 設備狀態
export type DeviceStatus = "active" | "inactive" | "error";

// 設備類型
export interface DeviceType {
	id: number;
	name: string;
	code: DeviceTypeCode;
	description?: string;
	created_at?: string;
	updated_at?: string;
}

// 設備型號
export interface DeviceModel {
	id: number;
	name: string;
	type_id: number;
	description?: string;
	// 根據設備類型，可能包含不同的配置欄位
	config?: Record<string, any>;
	type_name?: string;
	type_code?: string;
	created_at?: string;
	updated_at?: string;
}

// 設備配置 - 根據不同設備類型有不同的配置
export interface DeviceConfigBase {
	type: DeviceTypeCode;
}

// 控制器（Modbus）配置
export interface ControllerDeviceConfig extends DeviceConfigBase {
	type: "controller";
	host: string;
	port: number;
	unitId: number;
}

// 影像設備配置
export interface CameraDeviceConfig extends DeviceConfigBase {
	type: "camera";
	rtsp_url?: string;
	ip_address: string;
	port?: number;
	username?: string;
	password?: string;
}

// 感測器配置
export interface SensorDeviceConfig extends DeviceConfigBase {
	type: "sensor";
	protocol: "modbus" | "http" | "mqtt";
	host?: string;
	port?: number;
	unitId?: number; // Modbus 專用
	connection_string?: string; // 其他協議用
	api_endpoint?: string; // HTTP 專用
}

// 平板配置
export interface TabletDeviceConfig extends DeviceConfigBase {
	type: "tablet";
	mac_address: string;
	ip_address?: string;
	location?: string;
}

// 網路裝置配置
export interface NetworkDeviceConfig extends DeviceConfigBase {
	type: "network";
	ip_address: string;
	mac_address?: string;
	device_type: "router" | "switch" | "access_point" | "other";
	port?: number;
}

// 聯合類型
export type DeviceConfig = ControllerDeviceConfig | CameraDeviceConfig | SensorDeviceConfig | TabletDeviceConfig | NetworkDeviceConfig;

// 通用設備介面
export interface Device {
	id: number;
	name: string;
	type_id: number;
	model_id?: number;
	description?: string;
	status: DeviceStatus;
	config: DeviceConfig; // JSON 格式儲存，根據 type_id 解析
	created_at?: string;
	updated_at?: string;
	// 關聯資料（從 JOIN 查詢中獲取）
	model_name?: string;
	type_name?: string;
	type_code?: DeviceTypeCode;
}

// 創建設備資料
export interface CreateDeviceData {
	name: string;
	type_id: number;
	model_id?: number;
	description?: string;
	status?: DeviceStatus;
	config: DeviceConfig;
}

// 更新設備資料
export interface UpdateDeviceData {
	name?: string;
	type_id?: number;
	model_id?: number;
	description?: string;
	status?: DeviceStatus;
	config?: Partial<DeviceConfig>;
}

// 創建設備型號資料
export interface CreateDeviceModelData {
	name: string;
	type_id: number;
	description?: string;
	config?: Record<string, any>;
}

// 更新設備型號資料
export interface UpdateDeviceModelData {
	name?: string;
	type_id?: number;
	description?: string;
	config?: Record<string, any>;
}
