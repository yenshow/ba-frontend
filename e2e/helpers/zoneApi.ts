import { expect, type APIRequestContext } from "@playwright/test"
import { CREDENTIALS } from "./selectors"
import { apiBase, unwrap } from "./http"

export const E2E_ZONE_PNG =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

/** Construction 業務區域（僅三系統） */
export type AccessLocationType = "people_counting" | "vehicle_access" | "environment"

export type ZoneRef = { id: string; name: string }

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

export const createE2eZoneApi = async (request: APIRequestContext) => {
	const loginRes = await request.post(`${apiBase()}/users/login`, {
		data: { username: CREDENTIALS.username, password: CREDENTIALS.password },
	})
	const loginData = await unwrap<{ token: string }>(loginRes)
	const headers = {
		Authorization: `Bearer ${loginData.token}`,
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

	return {
		createAccessZone: async (locationType: AccessLocationType, name: string) => {
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
		},
		renameAccessZone: async (locationType: AccessLocationType, id: string, name: string) => {
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
		},
		deleteAccessZone: async (locationType: AccessLocationType, id: string) => {
			const res = await request.delete(
				`${apiBase()}/locations/zones/${id}?locationType=${encodeURIComponent(locationType)}`,
				{ headers },
			)
			await unwrap(res)
		},
		findAccessZoneByName: async (locationType: AccessLocationType, name: string) => {
			const zones = await listAccessZones(locationType)
			const hit = zones.find((z) => z.name === name) as
				| { id?: string | number; name: string }
				| undefined
			return hit?.id != null ? { id: String(hit.id), name: hit.name } : null
		},
	}
}
