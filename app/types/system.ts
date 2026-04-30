/**
 * 系統模組類型定義
 */

export interface SystemModule {
	id: number;
	name: string;
	icon: string;
	route: string;
	permissionCode?: string;
	category:
		| "core"
		| "construction-monitoring"
		| "infrastructure"
		| "security"
		| "business"
		| "multimedia";
	description?: string;
	enabled?: boolean;
}

export interface SystemPageConfig {
	title: string;
	layout?: "three-column" | "two-column" | "full-width";
	showHeader?: boolean;
	showSidebar?: boolean;
	showStatusCenter?: boolean;
}

export interface Zone {
	id: string;
	name: string;
	level: number;
}

/**
 * 點位/分類清單項目（舊版曾使用 room/roomIds；現行以 zone/location 為主）
 * - `location` 允許為 undefined，表示尚未定位
 */
export interface LocationCategory {
	id: string;
	name: string; // 分類名稱，如"健身房"、"管委會"
	zoneId: string;
	location?: {
		x: number;
		y: number;
	};
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
