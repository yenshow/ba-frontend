import {
	getSystemModulesByCategory,
	getSystemModuleById,
	getSystemModuleByRoute
} from "~/config/system-modules";
import type { SystemModule } from "~/types/system";

/**
 * 根據分類獲取系統模組
 */
export const getModulesByCategory = (
	category: SystemModule["category"] | "all" = "all"
): SystemModule[] => {
	return getSystemModulesByCategory(category);
};

/**
 * 獲取所有啟用的系統模組
 */
export const getAllModules = (): SystemModule[] => {
	return getModulesByCategory("all");
};

/**
 * 根據 ID 獲取系統模組
 */
export const getModuleById = (id: number): SystemModule | undefined => {
	return getSystemModuleById(id);
};

/**
 * 根據路由獲取系統模組
 */
export const getModuleByRoute = (route: string): SystemModule | undefined => {
	return getSystemModuleByRoute(route);
};

/**
 * 獲取當前系統模組（根據當前路由）
 * 注意：此函數需要在 composable 上下文中使用（因為使用了 useRoute）
 */
export const getCurrentModule = (): SystemModule | undefined => {
	// 注意：useRoute() 需要在 composable 上下文中使用
	// 如果不在 composable 上下文中，請直接使用 getModuleByRoute(route.path)
	const route = useRoute();
	return getSystemModuleByRoute(route.path);
};

/**
 * 檢查系統模組是否啟用
 */
export const isModuleEnabled = (id: number): boolean => {
	const module = getSystemModuleById(id);
	return module?.enabled !== false;
};

