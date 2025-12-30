/**
 * 系統模組類型定義
 */

export interface SystemModule {
	id: number;
	name: string;
	icon: string;
	route: string;
	category: "core" | "construction-monitoring" | "infrastructure" | "security" | "visualization" | "maintenance" | "business" | "multimedia";
	description?: string;
	enabled?: boolean;
	priority?: "P0" | "P1" | "P2" | "P3"; // 優先級
	status?: "completed" | "in-progress" | "planned"; // 狀態
}

export interface SystemPageConfig {
	title: string;
	layout?: "three-column" | "two-column" | "full-width";
	showHeader?: boolean;
	showSidebar?: boolean;
	showStatusCenter?: boolean;
}

export interface Floor {
	id: string;
	name: string;
	level: number;
}

export interface Room {
	id: string;
	name: string;
	floorId: string;
	area: string;
	type: "indoor" | "outdoor";
	location?: {
		x: number;
		y: number;
	};
}

export interface RoomCategory {
	id: string;
	name: string; // 分類名稱，如"健身房"、"管委會"
	floorId: string;
	location: {
		x: number;
		y: number;
	};
	roomIds: string[]; // 該分類下的房間 ID 列表
}

export interface ControlPoint {
	id: string;
	name: string;
	status: "normal" | "warning" | "error";
	isRunning: boolean;
	location: {
		x: number;
		y: number;
	};
	roomId?: string;
}
