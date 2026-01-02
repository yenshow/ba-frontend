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

	// ========== 基礎設施系統 ==========
	{ 
		id: 8, 
		name: "照明系統", 
		icon: "lighting", 
		route: "/infrastructure/lighting", 
		category: "infrastructure", 
		description: "照明設備控制與監控"
	},
	{ 
		id: 9, 
		name: "空調系統", 
		icon: "hvac", 
		route: "/infrastructure/hvac", 
		category: "infrastructure", 
		description: "空調系統控制與監控"
	},
	{ 
		id: 10, 
		name: "電力系統", 
		icon: "power",
		route: "/infrastructure/power", 
		category: "infrastructure", 
		description: "電力系統監控與管理"
	},
	{ 
		id: 11, 
		name: "電梯系統", 
		icon: "elevator", 
		route: "/infrastructure/elevator", 
		category: "infrastructure", 
		description: "電梯系統監控與管理"
	},
	{ 
		id: 12, 
		name: "衛生排水系統", 
		icon: "drainage", 
		route: "/infrastructure/drainage", 
		category: "infrastructure", 
		description: "衛生與排水系統管理"
	},

	// ========== 安全相關系統 ==========
	{ 
		id: 13, 
		name: "消防系統", 
		icon: "fire", 
		route: "/security/fire", 
		category: "security", 
		description: "消防設備監控與管理"
	},
	{ 
		id: 14, 
		name: "門禁保全系統", 
		icon: "security", 
		route: "/security/access-control", 
		category: "security", 
		description: "門禁與保全系統管理"
	},
	{ 
		id: 15, 
		name: "緊急求救系統", 
		icon: "emergency", 
		route: "/security/emergency", 
		category: "security", 
		description: "緊急求救與通報系統"
	},

	// ========== 視覺化系統（整合：區域平面圖 + 全區點位圖）==========
	{ 
		id: 16, 
		name: "空間視覺化系統", 
		icon: "map", 
		route: "/visualization/map", 
		category: "visualization", 
		description: "整合區域平面圖與全區點位圖"
	},

	// ========== 維護管理系統（整合：機電維護 + 可靠度 + 設施管理）==========
	{ 
		id: 17, 
		name: "設備維護管理系統", 
		icon: "maintenance", 
		route: "/maintenance/equipment", 
		category: "maintenance", 
		description: "整合機電維護、設備運轉可靠度、設施管理"
	},

	// ========== 業務管理系統 ==========
	{ 
		id: 18, 
		name: "訪客系統", 
		icon: "visitor", 
		route: "/business/visitor", 
		category: "business", 
		description: "訪客登記與管理"
	},
	{ 
		id: 19, 
		name: "寄物管理", 
		icon: "locker-management",
		route: "/business/locker-management", 
		category: "business", 
		description: "寄物櫃管理系統"
	},

	// ========== 多媒體系統（整合：電視牆 + 多媒體 + 資訊平台）==========
	{ 
		id: 20, 
		name: "多媒體資訊系統", 
		icon: "video-wall", 
		route: "/multimedia/info", 
		category: "multimedia", 
		description: "整合電視牆模組、多媒體伺服器、資訊平台"
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
