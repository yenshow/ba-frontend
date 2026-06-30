/** 舊版書籤路徑 → 現行 routePrefix（永久 301） */
export const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
	"/construction-monitoring/people-counting": "/access-control/people-counting",
	"/construction-monitoring/vehicle-access": "/access-control/vehicle-access",
	"/construction-monitoring/surveillance": "/access-control/surveillance",
	"/construction-monitoring/environment": "/security/environment",
}

export const toLegacyRouteRedirectRules = () =>
	Object.fromEntries(
		Object.entries(LEGACY_ROUTE_REDIRECTS).map(([from, to]) => [
			from,
			{ redirect: { to, statusCode: 301 } },
		])
	)
