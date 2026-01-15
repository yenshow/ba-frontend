/**
 * 環境監測系統類型定義
 */

// 從 device.ts 導入類型定義，避免重複
import type { SensorParameterModbusConfig, SensorParameterDefinition } from "~/types/device";

/**
 * 感測器參數類型
 */
export type SensorParameterType =
	| "pm25"
	| "pm10"
	| "tvoc"
	| "hcho"
	| "humidity"
	| "temperature"
	| "co2"
	| "noise"
	| "wind";

// 重新導出類型，方便其他文件使用
export type { SensorParameterModbusConfig, SensorParameterDefinition };

/**
 * 感測器參數（用於地點配置，只需指定類型和啟用狀態）
 */
export interface SensorParameter {
	id?: string;
	type: SensorParameterType; // 參數類型（名稱由類型推導）
	enabled: boolean; // 是否啟用此參數
}

/**
 * 環境監測位置（不需要 location 座標）
 * 注意：floor 欄位已移除，樓層資訊應從父層級 EnvironmentFloor.name 取得
 */
export interface EnvironmentLocation {
	id?: string;
	name: string; // 位置名稱（如：管理中心、展廳）
	// floor 欄位已移除（冗餘），樓層資訊從 EnvironmentFloor.name 取得
	deviceId?: number; // 關聯的感測器設備 ID
	// 該位置支援的感測器參數列表（不同感測器支援不同參數）
	parameters: SensorParameter[];
}

/**
 * 環境監測樓層
 */
export interface EnvironmentFloor {
	id?: string;
	name: string; // 樓層名稱（如：1F、2F）
	locations: EnvironmentLocation[]; // 位置列表
}

/**
 * 感測器讀數資料（用於儲存歷史資料）
 */
export interface SensorReading {
	id?: string;
	locationId: string; // 位置 ID
	timestamp: string; // ISO 8601 時間戳
	// 各參數的讀數值
	data: {
		pm25?: number | null;
		pm10?: number | null;
		tvoc?: number | null;
		hcho?: number | null;
		humidity?: number | null;
		temperature?: number | null;
		co2?: number | null;
		noise?: number | null;
		wind?: number | null;
	};
}

/**
 * 樓層管理表單資料
 */
export interface EnvironmentFloorFormData {
	name: string;
}

