import type { UnifiedZone, SystemType } from "~/types/location"
import { useLocationApi } from "~/composables/location/api/useLocationApi"

type CacheItem = { ts: number; zones: UnifiedZone[] }

const CACHE_TTL_MS = 5 * 60 * 1000
const zonesCache = new Map<string, CacheItem>()
const inFlight = new Map<string, Promise<UnifiedZone[]>>()

const normalizeKey = (systemType?: SystemType): string => (systemType ? String(systemType) : "__all__")

export const useZonesCache = () => {
	const locationApi = useLocationApi()

	const getZones = async (systemType?: SystemType): Promise<UnifiedZone[]> => {
		const key = normalizeKey(systemType)
		const cached = zonesCache.get(key)
		if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
			return cached.zones
		}

		const existing = inFlight.get(key)
		if (existing) return await existing

		const promise = (async () => {
			try {
				const res = await locationApi.getZones(systemType)
				const zones = Array.isArray(res?.zones) ? res.zones : []
				zonesCache.set(key, { ts: Date.now(), zones })
				return zones
			} catch {
				zonesCache.set(key, { ts: Date.now(), zones: [] })
				return []
			} finally {
				inFlight.delete(key)
			}
		})()

		inFlight.set(key, promise)
		return await promise
	}

	const clear = (systemType?: SystemType) => {
		if (!systemType) {
			zonesCache.clear()
			inFlight.clear()
			return
		}
		const key = normalizeKey(systemType)
		zonesCache.delete(key)
		inFlight.delete(key)
	}

	return { getZones, clear }
}

