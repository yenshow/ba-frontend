/** Construction 輔助系統路由前綴（layout: auxiliary） */
export const CONSTRUCTION_AUXILIARY_ROUTE_PREFIX = "/core" as const;

const normalizeRoutePath = (path: string): string => path.split("?")[0] ?? path;

/** 是否為輔助系統路由（/core/*） */
export const isConstructionAuxiliaryRoute = (path: string): boolean => {
	const normalized = normalizeRoutePath(path);
	return (
		normalized === CONSTRUCTION_AUXILIARY_ROUTE_PREFIX ||
		normalized.startsWith(`${CONSTRUCTION_AUXILIARY_ROUTE_PREFIX}/`)
	);
};

/**
 * 主系統 → 輔助系統：新分頁；
 * 輔助系統內互跳（如警示 → 人員）：同視窗。
 */
export const shouldOpenConstructionRouteInNewTab = (fromPath: string, toPath: string): boolean =>
	isConstructionAuxiliaryRoute(toPath) && !isConstructionAuxiliaryRoute(fromPath);

export const openConstructionRouteInNewTab = (routePath: string): void => {
	if (!import.meta.client) return;
	const url = routePath.startsWith("http")
		? routePath
		: `${window.location.origin}${routePath}`;
	window.open(url, "_blank", "noopener,noreferrer");
};

/** 依來源／目標決定新分頁或同視窗導航 */
export const navigateConstructionRoute = (
	fromPath: string,
	toPath: string,
	navigateSameWindow: (path: string) => unknown
): unknown => {
	if (!toPath) return;
	if (shouldOpenConstructionRouteInNewTab(fromPath, toPath)) {
		openConstructionRouteInNewTab(toPath);
		return;
	}
	return navigateSameWindow(toPath);
};
