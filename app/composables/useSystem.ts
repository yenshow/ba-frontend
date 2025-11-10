/**
 * 系統管理 Composables
 * 提供系統模組相關的共用邏輯
 */

import { systemModules, getSystemModulesByCategory, getSystemModuleById, getSystemModuleByRoute } from "~/config/system-modules";
import type { SystemModule } from "~/types/system";

/**
 * 使用系統模組
 */
export const useSystem = () => {
	/**
	 * 根據分類獲取系統模組
	 */
	const getModulesByCategory = (category: "primary" | "extended" | "all" = "all"): SystemModule[] => {
		return getSystemModulesByCategory(category);
	};

	/**
	 * 獲取所有啟用的系統模組
	 */
	const getAllModules = (): SystemModule[] => {
		return getModulesByCategory("all");
	};

	/**
	 * 根據 ID 獲取系統模組
	 */
	const getModuleById = (id: number): SystemModule | undefined => {
		return getSystemModuleById(id);
	};

	/**
	 * 根據路由獲取系統模組
	 */
	const getModuleByRoute = (route: string): SystemModule | undefined => {
		return getSystemModuleByRoute(route);
	};

	/**
	 * 獲取當前系統模組（根據當前路由）
	 */
	const getCurrentModule = (): SystemModule | undefined => {
		const route = useRoute();
		return getSystemModuleByRoute(route.path);
	};

	/**
	 * 檢查系統模組是否啟用
	 */
	const isModuleEnabled = (id: number): boolean => {
		const module = getSystemModuleById(id);
		return module?.enabled !== false;
	};

	return {
		getAllModules,
		getModulesByCategory,
		getModuleById,
		getModuleByRoute,
		getCurrentModule,
		isModuleEnabled
	};
};
