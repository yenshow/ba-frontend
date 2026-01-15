/**
 * 系統模組配置
 * 集中管理所有系統模組的配置
 * 
 * 方案 B - 工地管理系統分類說明：
 * - core: 核心基礎系統（設備、使用者、警示）
 * - construction-monitoring: 工地監控系統（環境、人流、車輛、影像）
 */

import type { SystemModule } from "~/types/system";

/**
 * 檢查模組是否啟用
 */
const isModuleEnabled = (module: SystemModule): boolean => module.enabled !== false;

/**
 * 系統模組列表（按分類組織，id 按順序編號）
 */
export const systemModules: SystemModule[] = [
	// ========== 核心基礎系統 ==========
	{ 
		id: 1, 
		name: "設備管理", 
		icon: "equipment-management", 
		route: "/core/equipment-management", 
		category: "core", 
		description: "設備管理系統"
	},
	{ 
		id: 2, 
		name: "使用者管理", 
		icon: "user-management", 
		route: "/core/users", 
		category: "core", 
		description: "使用者帳號與權限管理"
	},
	{ 
		id: 3, 
		name: "警示紀錄", 
		icon: "alert-log", 
		route: "/core/alert-log", 
		category: "core", 
		description: "系統警示與紀錄查詢"
	},

	// ========== 工地監控系統 ==========
	{ 
		id: 4, 
		name: "環境品質系統", 
		icon: "environment", 
		route: "/construction-monitoring/environment", 
		category: "construction-monitoring", 
		description: "環境品質監測與管理"
	},
	{ 
		id: 5, 
		name: "人流統計管理", 
		icon: "people-counting", 
		route: "/construction-monitoring/people-counting", 
		category: "construction-monitoring", 
		description: "人流統計與管理"
	},
	{ 
		id: 6, 
		name: "車輛進出管理", 
		icon: "vehicle-access", 
		route: "/construction-monitoring/vehicle-access", 
		category: "construction-monitoring", 
		description: "車輛進出管理系統"
	},
	{ 
		id: 7, 
		name: "影像監視系統", 
		icon: "surveillance", 
		route: "/construction-monitoring/surveillance", 
		category: "construction-monitoring", 
		description: "影像監視與錄影管理（整合 RTSP）"
	},

];

/**
 * 根據分類獲取系統模組
 */
export function getSystemModulesByCategory(
	category: SystemModule["category"] | "all" = "all"
): SystemModule[] {
	const enabledModules = systemModules.filter(isModuleEnabled);
	if (category === "all") {
		return enabledModules;
	}
	return enabledModules.filter((module) => module.category === category);
}

/**
 * 根據 ID 獲取系統模組
 */
export function getSystemModuleById(id: number): SystemModule | undefined {
	return systemModules.find((module) => module.id === id);
}

/**
 * 根據路由獲取系統模組
 */
export function getSystemModuleByRoute(route: string): SystemModule | undefined {
	return systemModules.find((module) => module.route === route);
}
