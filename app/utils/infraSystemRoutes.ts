/** 地圖型 8 套系統頁路徑（全區點位圖深鏈／篩選後跳轉） */
export const INFRA_SYSTEM_ROUTES = {
	lighting: "/utilities/lighting",
	hvac: "/utilities/hvac",
	drainage: "/utilities/drainage",
	power: "/utilities/power",
	air_circulation: "/utilities/air-circulation",
	fire: "/security/fire",
	emergency_rescue: "/security/emergency",
	smoke_alarm: "/security/smoke-alarm",
} as const

export type InfraSystemRouteKey = keyof typeof INFRA_SYSTEM_ROUTES

export const getInfraSystemRoute = (systemType: string | null | undefined): string | null => {
	if (!systemType || !(systemType in INFRA_SYSTEM_ROUTES)) return null
	return INFRA_SYSTEM_ROUTES[systemType as InfraSystemRouteKey]
}
