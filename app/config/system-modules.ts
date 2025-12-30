/**
 * 系統模組配置
 * 集中管理所有系統模組的配置
 * 
 * 分類說明：
 * - core: 核心基礎系統（設備、使用者、警示）
 * - construction-monitoring: 工地監控系統（環境、人流、車輛、影像）
 * - infrastructure: 基礎設施系統（照明、空調、電力、電梯、衛生排水）
 * - security: 安全相關系統（消防、門禁、緊急求救）
 * - visualization: 視覺化系統（整合：區域平面圖 + 全區點位圖）
 * - maintenance: 維護管理系統（整合：機電維護 + 可靠度 + 設施管理）
 * - business: 業務管理系統（訪客、寄物）
 * - multimedia: 多媒體系統（整合：電視牆 + 多媒體 + 資訊平台）
 */

import type { SystemModule } from "~/types/system";

/**
 * 檢查模組是否啟用
 */
const isModuleEnabled = (module: SystemModule): boolean => module.enabled !== false;

/**
 * 系統模組列表（按新分類重新組織）
 */
export const systemModules: SystemModule[] = [
	// ========== 核心基礎系統 ==========
	{ 
		id: 8, 
		name: "設備管理", 
		icon: "equipment-management", 
		route: "/system/equipment-management", 
		category: "core", 
		description: "設備管理系統",
		priority: "P0",
		status: "completed"
	},
	{ 
		id: 17, 
		name: "使用者管理", 
		icon: "user-management", 
		route: "/system/users", 
		category: "core", 
		description: "使用者帳號與權限管理",
		priority: "P0",
		status: "completed"
	},
	{ 
		id: 27, 
		name: "警示紀錄", 
		icon: "alert-log", 
		route: "/system/alert-log", 
		category: "core", 
		description: "系統警示與紀錄查詢",
		priority: "P0",
		status: "completed"
	},

	// ========== 工地監控系統 ==========
	{ 
		id: 3, 
		name: "環境品質系統", 
		icon: "environment", 
		route: "/system/environment", 
		category: "construction-monitoring", 
		description: "環境品質監測與管理",
		priority: "P0",
		status: "completed"
	},
	{ 
		id: 5, 
		name: "人流統計管理", 
		icon: "people-counting", 
		route: "/system/people-counting", 
		category: "construction-monitoring", 
		description: "人流統計與管理",
		priority: "P0",
		status: "in-progress"
	},
	{ 
		id: 4, 
		name: "車輛進出管理", 
		icon: "vehicle-access", 
		route: "/system/vehicle-access", 
		category: "construction-monitoring", 
		description: "車輛進出管理系統",
		priority: "P0",
		status: "planned"
	},
	{ 
		id: 2, 
		name: "影像監視系統", 
		icon: "surveillance", 
		route: "/system/surveillance", 
		category: "construction-monitoring", 
		description: "影像監視與錄影管理（整合 RTSP）",
		priority: "P1",
		status: "in-progress"
	},

	// ========== 基礎設施系統 ==========
	{ 
		id: 6, 
		name: "照明系統", 
		icon: "lighting", 
		route: "/system/lighting", 
		category: "infrastructure", 
		description: "照明設備控制與監控",
		priority: "P0",
		status: "completed"
	},
	{ 
		id: 12, 
		name: "空調系統", 
		icon: "hvac", 
		route: "/system/hvac", 
		category: "infrastructure", 
		description: "空調系統控制與監控",
		priority: "P0",
		status: "planned"
	},
	{ 
		id: 11, 
		name: "電力系統", 
		icon: "power", 
		route: "/system/power", 
		category: "infrastructure", 
		description: "電力系統監控與管理",
		priority: "P0",
		status: "planned"
	},
	{ 
		id: 13, 
		name: "電梯系統", 
		icon: "elevator", 
		route: "/system/elevator", 
		category: "infrastructure", 
		description: "電梯系統監控與管理",
		priority: "P2",
		status: "planned"
	},
	{ 
		id: 7, 
		name: "衛生排水系統", 
		icon: "drainage", 
		route: "/system/drainage", 
		category: "infrastructure", 
		description: "衛生與排水系統管理",
		priority: "P2",
		status: "planned"
	},

	// ========== 安全相關系統 ==========
	{ 
		id: 9, 
		name: "消防系統", 
		icon: "fire", 
		route: "/system/fire", 
		category: "security", 
		description: "消防設備監控與管理",
		priority: "P0",
		status: "planned"
	},
	{ 
		id: 10, 
		name: "門禁保全系統", 
		icon: "security", 
		route: "/system/security", 
		category: "security", 
		description: "門禁與保全系統管理",
		priority: "P0",
		status: "planned"
	},
	{ 
		id: 16, 
		name: "緊急求救系統", 
		icon: "emergency", 
		route: "/system/emergency", 
		category: "security", 
		description: "緊急求救與通報系統",
		priority: "P1",
		status: "planned"
	},

	// ========== 視覺化系統（整合：區域平面圖 + 全區點位圖）==========
	{ 
		id: 1, 
		name: "空間視覺化系統", 
		icon: "map", 
		route: "/system/visualization", 
		category: "visualization", 
		description: "整合區域平面圖與全區點位圖",
		priority: "P1",
		status: "planned"
	},

	// ========== 維護管理系統（整合：機電維護 + 可靠度 + 設施管理）==========
	{ 
		id: 18, 
		name: "設備維護管理系統", 
		icon: "maintenance", 
		route: "/system/maintenance", 
		category: "maintenance", 
		description: "整合機電維護、設備運轉可靠度、設施管理",
		priority: "P2",
		status: "planned"
	},

	// ========== 業務管理系統 ==========
	{ 
		id: 22, 
		name: "訪客系統", 
		icon: "visitor", 
		route: "/system/visitor", 
		category: "business", 
		description: "訪客登記與管理",
		priority: "P3",
		status: "planned"
	},
	{ 
		id: 21, 
		name: "寄物管理", 
		icon: "locker-management", 
		route: "/system/locker-management", 
		category: "business", 
		description: "寄物櫃管理系統",
		priority: "P3",
		status: "planned"
	},

	// ========== 多媒體系統（整合：電視牆 + 多媒體 + 資訊平台）==========
	{ 
		id: 25, 
		name: "多媒體資訊系統", 
		icon: "video-wall", 
		route: "/system/multimedia", 
		category: "multimedia", 
		description: "整合電視牆模組、多媒體伺服器、資訊平台",
		priority: "P3",
		status: "planned"
	}
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
 * 根據優先級獲取系統模組
 */
export function getSystemModulesByPriority(
	priority: SystemModule["priority"] | "all" = "all"
): SystemModule[] {
	const enabledModules = systemModules.filter(isModuleEnabled);
	if (priority === "all") {
		return enabledModules;
	}
	return enabledModules.filter((module) => module.priority === priority);
}

/**
 * 根據狀態獲取系統模組
 */
export function getSystemModulesByStatus(
	status: SystemModule["status"] | "all" = "all"
): SystemModule[] {
	const enabledModules = systemModules.filter(isModuleEnabled);
	if (status === "all") {
		return enabledModules;
	}
	return enabledModules.filter((module) => module.status === status);
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
