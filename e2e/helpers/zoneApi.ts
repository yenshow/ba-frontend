import { expect, type APIRequestContext } from "@playwright/test"
import { loginApiToken } from "./apiClient"
import { apiBase, unwrap } from "./http"

/** 1×1 PNG（照明等 require imageUrl） */
export const E2E_ZONE_PNG =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

export type InfraZoneSystem = "lighting" | "hvac" | "power" | "drainage" | "air-circulation"
/** `/api/locations/zones?locationType=`（門禁＋安防） */
export type AccessLocationType =
	| "people_counting"
	| "vehicle_access"
	| "elevator"
	| "environment"
	| "fire"
	| "emergency_rescue"
	| "smoke_alarm"

export type ZoneRef = { id: string; name: string }

export type E2eZoneApi = {
	token: string
	createInfraZone: (system: InfraZoneSystem, name: string) => Promise<ZoneRef>
	renameInfraZone: (system: InfraZoneSystem, id: string, name: string) => Promise<ZoneRef>
	deleteInfraZone: (system: InfraZoneSystem, id: string) => Promise<void>
	findInfraZoneByName: (system: InfraZoneSystem, name: string) => Promise<ZoneRef | null>
	createAccessZone: (locationType: AccessLocationType, name: string) => Promise<ZoneRef>
	renameAccessZone: (
		locationType: AccessLocationType,
		id: string,
		name: string,
	) => Promise<ZoneRef>
	deleteAccessZone: (locationType: AccessLocationType, id: string) => Promise<void>
	findAccessZoneByName: (
		locationType: AccessLocationType,
		name: string,
	) => Promise<ZoneRef | null>
}

const pickZone = (data: unknown): ZoneRef => {
	const root = data as {
		zone?: { id: string | number; name: string }
		id?: string | number
		name?: string
	}
	const z = root.zone ?? root
	const id = String(z.id ?? "")
	const name = String(z.name ?? "")
	expect(id && name, `zone payload: ${JSON.stringify(data).slice(0, 200)}`).toBeTruthy()
	return { id, name }
}

const infraSystemType = (system: InfraZoneSystem) =>
	system === "air-circulation" ? "air_circulation" : system

export const createE2eZoneApi = async (request: APIRequestContext): Promise<E2eZoneApi> => {
	const token = await loginApiToken(request)
	const headers = {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
	}

	const listAccessZones = async (locationType: AccessLocationType) => {
		const res = await request.get(
			`${apiBase()}/locations/zones?locationType=${encodeURIComponent(locationType)}`,
			{ headers },
		)
		const data = await unwrap<{ zones?: Array<{ name: string; locations?: unknown[] }> }>(res)
		return data.zones ?? []
	}

	/** 從既有地點複製最小可過驗證的 system config */
	const cloneAccessLocationTemplate = async (locationType: AccessLocationType) => {
		const zones = await listAccessZones(locationType)
		const loc = zones.find((z) => Array.isArray(z.locations) && z.locations.length > 0)
			?.locations?.[0] as
			| {
					systems?: Array<{ systemType: string; config: Record<string, unknown> }>
			  }
			| undefined
		const sys = loc?.systems?.find((s) => s.systemType === locationType)
		expect(sys?.config, `${locationType} 需要既有地點當範本`).toBeTruthy()
		return {
			name: "E2E點",
			systems: [
				{
					systemType: locationType,
					config: { ...sys!.config },
				},
			],
		}
	}

	const createInfraZone: E2eZoneApi["createInfraZone"] = async (system, name) => {
		const systemType = infraSystemType(system)
		const res = await request.post(`${apiBase()}/${system}/zones`, {
			headers,
			data: {
				name,
				imageUrl: E2E_ZONE_PNG,
				locations: [
					{
						name: "E2E點",
						position: { x: 10, y: 10 },
						systems: [{ systemType, config: {} }],
					},
				],
			},
		})
		return pickZone(await unwrap(res))
	}

	const renameInfraZone: E2eZoneApi["renameInfraZone"] = async (system, id, name) => {
		const getRes = await request.get(`${apiBase()}/${system}/zones/${id}`, { headers })
		const current = await unwrap<{ zone?: Record<string, unknown> } & Record<string, unknown>>(
			getRes,
		)
		const zone = (current.zone ?? current) as {
			imageUrl?: string
			locations?: unknown[]
		}
		const res = await request.put(`${apiBase()}/${system}/zones/${id}`, {
			headers,
			data: {
				name,
				imageUrl: zone.imageUrl || E2E_ZONE_PNG,
				locations: zone.locations ?? [],
			},
		})
		return pickZone(await unwrap(res))
	}

	const deleteInfraZone: E2eZoneApi["deleteInfraZone"] = async (system, id) => {
		const res = await request.delete(`${apiBase()}/${system}/zones/${id}`, { headers })
		await unwrap(res)
	}

	const findInfraZoneByName: E2eZoneApi["findInfraZoneByName"] = async (system, name) => {
		const res = await request.get(`${apiBase()}/${system}/zones`, { headers })
		const data = await unwrap<{ zones?: Array<{ id: string | number; name: string }> }>(res)
		const hit = (data.zones ?? []).find((z) => z.name === name)
		return hit ? { id: String(hit.id), name: hit.name } : null
	}

	const createAccessZone: E2eZoneApi["createAccessZone"] = async (locationType, name) => {
		const location = await cloneAccessLocationTemplate(locationType)
		const res = await request.post(`${apiBase()}/locations/zones`, {
			headers,
			data: {
				name,
				locationType,
				imageUrl: E2E_ZONE_PNG,
				locations: [location],
			},
		})
		return pickZone(await unwrap(res))
	}

	const renameAccessZone: E2eZoneApi["renameAccessZone"] = async (locationType, id, name) => {
		const getRes = await request.get(
			`${apiBase()}/locations/zones/${id}?locationType=${encodeURIComponent(locationType)}`,
			{ headers },
		)
		const current = await unwrap<{
			zone?: { locations?: unknown[]; imageUrl?: string }
			locations?: unknown[]
			imageUrl?: string
		}>(getRes)
		const zone = (current.zone ?? current) as {
			locations?: unknown[]
			imageUrl?: string
		}
		const res = await request.put(
			`${apiBase()}/locations/zones/${id}?locationType=${encodeURIComponent(locationType)}`,
			{
				headers,
				data: {
					name,
					locationType,
					imageUrl: zone.imageUrl || E2E_ZONE_PNG,
					locations: zone.locations ?? [],
				},
			},
		)
		return pickZone(await unwrap(res))
	}

	const deleteAccessZone: E2eZoneApi["deleteAccessZone"] = async (locationType, id) => {
		const res = await request.delete(
			`${apiBase()}/locations/zones/${id}?locationType=${encodeURIComponent(locationType)}`,
			{ headers },
		)
		await unwrap(res)
	}

	const findAccessZoneByName: E2eZoneApi["findAccessZoneByName"] = async (locationType, name) => {
		const zones = await listAccessZones(locationType)
		const hit = zones.find((z) => z.name === name) as
			| { id?: string | number; name: string }
			| undefined
		return hit?.id != null ? { id: String(hit.id), name: hit.name } : null
	}

	return {
		token,
		createInfraZone,
		renameInfraZone,
		deleteInfraZone,
		findInfraZoneByName,
		createAccessZone,
		renameAccessZone,
		deleteAccessZone,
		findAccessZoneByName,
	}
}
