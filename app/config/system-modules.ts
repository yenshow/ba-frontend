/**
 * 系統模組配置
 * 集中管理所有系統模組的配置
 */

import type { SystemModule } from "~/types/system";

/**
 * 檢查模組是否啟用
 */
const isModuleEnabled = (module: SystemModule): boolean => module.enabled !== false;

/**
 * 系統模組列表
 */
export const systemModules: SystemModule[] = [
	{ id: 1, name: "區域平面圖", icon: "map", route: "/system/map", category: "primary", description: "建築物區域平面圖管理" },
	{ id: 2, name: "影像監視系統", icon: "surveillance", route: "/system/surveillance", category: "primary", description: "影像監視與錄影管理" },
	{ id: 3, name: "消防系統", icon: "fire", route: "/system/fire", category: "primary", description: "消防設備監控與管理" },
	{ id: 4, name: "門禁保全系統", icon: "security", route: "/system/security", category: "primary", description: "門禁與保全系統管理" },
	{ id: 5, name: "照明系統", icon: "lighting", route: "/system/lighting", category: "primary", description: "照明設備控制與監控" },
	{ id: 6, name: "電力系統", icon: "power", route: "/system/power", category: "primary", description: "電力系統監控與管理" },
	{ id: 7, name: "衛生排水系統", icon: "drainage", route: "/system/drainage", category: "primary", description: "衛生與排水系統管理" },
	{ id: 8, name: "空調系統", icon: "hvac", route: "/system/hvac", category: "primary", description: "空調系統控制與監控" },
	{ id: 9, name: "環境品質系統", icon: "environment", route: "/system/environment", category: "primary", description: "環境品質監測與管理" },
	{ id: 10, name: "電梯系統", icon: "elevator", route: "/system/elevator", category: "primary", description: "電梯系統監控與管理" },
	{ id: 11, name: "全區點位圖", icon: "all-points", route: "/system/all-points", category: "extended", description: "全區設備點位圖" },
	{ id: 12, name: "緊急求救系統", icon: "emergency", route: "/system/emergency", category: "extended", description: "緊急求救與通報系統" },
	{ id: 13, name: "使用者管理", icon: "user-management", route: "/system/user-management", category: "extended", description: "使用者帳號與權限管理" },
	{ id: 14, name: "機電維護", icon: "maintenance", route: "/system/maintenance", category: "extended", description: "機電設備維護管理" },
	{ id: 15, name: "設備運轉可靠度", icon: "reliability", route: "/system/reliability", category: "extended", description: "設備運轉可靠度分析" },
	{ id: 16, name: "設施管理系統", icon: "facility-management", route: "/system/facility-management", category: "extended", description: "設施管理與維護" },
	{ id: 17, name: "寄物管理", icon: "locker-management", route: "/system/locker-management", category: "extended", description: "寄物櫃管理系統" },
	{ id: 18, name: "訪客系統", icon: "visitor", route: "/system/visitor", category: "extended", description: "訪客登記與管理" },
	{ id: 19, name: "檔案系統", icon: "file-system", route: "/system/file-system", category: "extended", description: "檔案與文件管理" },
	{ id: 20, name: "空間管理", icon: "space-management", route: "/system/space-management", category: "extended", description: "空間使用與管理" },
	{ id: 21, name: "電視牆模組", icon: "video-wall", route: "/system/video-wall", category: "extended", description: "電視牆顯示控制" },
	{ id: 22, name: "多媒體伺服器", icon: "multimedia-server", route: "/system/multimedia-server", category: "extended", description: "多媒體伺服器管理" },
	{ id: 23, name: "警示紀錄", icon: "alert-log", route: "/system/alert-log", category: "extended", description: "系統警示與紀錄查詢" },
	{ id: 24, name: "資訊平台", icon: "info-platform", route: "/system/info-platform", category: "extended", description: "資訊發布平台" }
];

/**
 * 根據分類獲取系統模組
 */
export function getSystemModulesByCategory(category: "primary" | "extended" | "all" = "all"): SystemModule[] {
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
