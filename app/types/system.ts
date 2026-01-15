/**
 * 系統模組類型定義
 */

export interface SystemModule {
	id: number;
	name: string;
	icon: string;
	route: string;
	category: "core" | "construction-monitoring";
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
