// 設備類型代碼（從後端動態讀取，這裡僅作為類型參考）
export type DeviceTypeCode =
	| "camera"
	| "controller"
	| "sensor"
	| "access_control"
	| "modbus"
	| "di_do"
	| string;

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

/** Modbus 功能碼 / API 方法（對應後端 readCoils, readDiscreteInputs, readHoldingRegisters, readInputRegisters） */
export type ModbusRegisterType = "coils" | "discrete" | "holding" | "input";

// 感測器參數的 Modbus 配置（定義在設備型號中）
export interface SensorParameterModbusConfig {
	address: number; // Modbus 地址（必填）
	// length 已移除：後端預設為 1，前端不需要設定
	transform?: string; // 轉換公式（如：value / 10, value - 1）
}

// 設備型號中的感測器參數配置定義
export interface SensorParameterDefinition {
	type: string; // 參數類型（pm25, pm10, tvoc, hcho, humidity, temperature, co2, noise, wind）
	modbusConfig: SensorParameterModbusConfig; // Modbus 配置
}

// 設備型號配置（根據設備類型有不同的結構）
export interface SensorDeviceModelConfig {
	/** 本型號統一使用的 Modbus API 方法（FC01～FC04），預設 holding */
	registerType?: ModbusRegisterType;
	// 感測器型號的參數配置列表
	sensorParameters?: SensorParameterDefinition[];
}

/** 門禁設備型號：僅設定 CaptureFaceData 回傳格式，其餘參數由後端預設 */
export interface AccessControlDeviceModelConfig {
	isapi?: {
		captureFaceData?: {
			/** 回傳格式：AC-02 用 binary，AC-07 用 url */
			dataType?: "binary" | "url";
		};
	};
}

// 設備型號
export interface DeviceModel {
	id: number;
	name: string;
	type_id: number;
	port?: number | null; // 端口號（選填，Modbus 標準 502 可留空由設備填寫）
	unit_id?: number | null; // Unit ID（選填，感測器/控制器每設備可不同）
	description?: string;
	// 根據設備類型，可能包含不同的配置欄位
	// 對於感測器類型，config 應符合 SensorDeviceModelConfig 結構
	config?: Record<string, any> | SensorDeviceModelConfig;
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
	// unitId 由後端自動生成，前端不應提供（但在讀取時可能包含）
	unitId?: number;
}

// 影像設備配置（RTSP + WebRTC，僅 rtsp_url 必填）
export interface CameraDeviceConfig extends DeviceConfigBase {
	type: "camera";
	/** RTSP URL，必填，例：rtsp://admin:xxx@192.168.2.102:554/Streaming/Channels/102 */
	rtsp_url: string;
	host?: string;
	ip_address?: string;
	username?: string;
	password?: string;
	/** 攝影機群組（用於設備管理與影像監控篩選） */
	group?: string;
}

// 感測器配置
export interface SensorDeviceConfig extends DeviceConfigBase {
	type: "sensor";
	protocol: "modbus" | "http" | "mqtt";
	host?: string;
	port?: number;
	// unitId 由後端自動生成（僅 Modbus 協議），前端不應提供（但在讀取時可能包含）
	unitId?: number;
	connection_string?: string; // 其他協議用
	api_endpoint?: string; // HTTP 專用
}

// 門禁設備配置（ISAPI Digest Auth）
export interface AccessControlDeviceConfig extends DeviceConfigBase {
	type: "access_control";
	host: string;
	port?: number;
	username: string;
	password: string;
}

// 聯合類型
export type DeviceConfig =
	| ControllerDeviceConfig
	| CameraDeviceConfig
	| SensorDeviceConfig
	| AccessControlDeviceConfig;

/** 串流啟動回傳（POST /api/devices/:id/stream/start） */
export interface DeviceStreamStartResponse {
	streamId: string;
	pathName: string;
	webrtcUrl: string;
	status: string;
}

/** 串流狀態回傳（GET /api/devices/:id/stream/status） */
export interface DeviceStreamStatusResponse {
	streamId: string;
	webrtcUrl: string;
	status: "running" | "stopped";
}

// 通用設備介面
export interface Device {
	id: number;
	name: string;
	type_id: number;
	model_id: number; // 必填：設備型號 ID
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
	model_id: number; // 必填：設備型號 ID
	description?: string;
	status?: DeviceStatus;
	config: DeviceConfig;
}

// 更新設備資料
export interface UpdateDeviceData {
	name?: string;
	type_id?: number;
	model_id?: number; // 可選，但如果提供則必須是有效的 ID（不能為 0 或 null）
	description?: string;
	status?: DeviceStatus;
	config?: Partial<DeviceConfig>;
}

// 創建設備型號資料
export interface CreateDeviceModelData {
	name: string;
	type_id: number;
	port?: number | null; // 端口號（選填，留空則不設）
	unit_id?: number | null; // Unit ID（選填，1-255）
	description?: string;
	config?: Record<string, any>;
}

// 更新設備型號資料
export interface UpdateDeviceModelData {
	name?: string;
	type_id?: number;
	port?: number | null; // 端口號（選填）
	unit_id?: number | null; // Unit ID（選填，1-255）
	description?: string;
	config?: Record<string, any>;
}
