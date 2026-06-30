/** 舊版書籤／整合路徑 → 現行 routePrefix（永久 301） */
export const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
	"/construction-monitoring/people-counting": "/access-control/people-counting",
	"/construction-monitoring/vehicle-access": "/access-control/vehicle-access",
	"/construction-monitoring/surveillance": "/access-control/surveillance",
	"/construction-monitoring/environment": "/security/environment",
	"/infrastructure/elevator": "/access-control/elevator",
	"/infrastructure/lighting": "/utilities/lighting",
	"/infrastructure/hvac": "/utilities/hvac",
	"/infrastructure/power": "/utilities/power",
	"/infrastructure/drainage": "/utilities/drainage",
	"/infrastructure/air-circulation": "/utilities/air-circulation",
	"/infrastructure/fire": "/security/fire",
}

export const toLegacyRouteRedirectRules = () =>
	Object.fromEntries(
		Object.entries(LEGACY_ROUTE_REDIRECTS).map(([from, to]) => [
			from,
			{ redirect: { to, statusCode: 301 } },
		])
	)
