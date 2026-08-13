type ZoneLike = { id?: string; name?: string }

const zoneKey = (zone: ZoneLike): string => String(zone.id || zone.name || "")

/**
 * 基礎設施頁讀取 `?zone=`：對得上就選該區，否則維持呼叫端的第一區後備。
 * 僅在 selectedZone 仍為空時套用，避免前景重載覆寫使用者切區。
 */
export const useInfraZoneDeepLink = () => {
	const route = useRoute()

	const resolveInitialZoneId = <T extends ZoneLike>(
		zones: T[],
		pickFirst: (zones: T[]) => T | null | undefined,
	): string => {
		if (!zones.length) return ""
		const queryZone = typeof route.query.zone === "string" ? route.query.zone.trim() : ""
		if (queryZone) {
			const match = zones.find(
				(zone) => String(zone.id || "") === queryZone || String(zone.name || "") === queryZone,
			)
			if (match) return zoneKey(match)
		}
		const first = pickFirst(zones)
		return first ? zoneKey(first) : ""
	}

	return { resolveInitialZoneId }
}
