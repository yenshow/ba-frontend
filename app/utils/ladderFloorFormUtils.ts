import type { Person, PersonLadderCard } from "~/types/personnel"

export type LadderFloorDefaultsByLocation = Record<number, number[]>

export type PersonLadderLocationFormItem = {
	locationId: string
}

export type ElevatorLocationFloorOption = {
	id: number
	name: string
	zoneName: string
	floorCount: number
	floors: Array<{ index: number; label: string }>
}

export type LadderFloorsStorage =
	| number[]
	| {
			byLocation?: Record<string, number[]>
	  }

const parseFloorIndices = (raw: unknown): number[] => {
	if (!Array.isArray(raw)) return []
	return raw.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0)
}

export const parseLadderFloorsStorage = (raw: unknown): LadderFloorsStorage | null => {
	if (raw == null) return null
	if (Array.isArray(raw)) return parseFloorIndices(raw)
	if (typeof raw === "object" && raw !== null && "byLocation" in raw) {
		const map = (raw as { byLocation?: Record<string, unknown> }).byLocation || {}
		const byLocation: Record<string, number[]> = {}
		for (const [key, value] of Object.entries(map)) {
			const floors = parseFloorIndices(value)
			if (floors.length) byLocation[String(key)] = floors
		}
		return { byLocation }
	}
	return null
}

export const ladderFloorsStorageToFormMap = (
	storage: LadderFloorsStorage | null,
): LadderFloorDefaultsByLocation => {
	if (!storage) return {}
	if (Array.isArray(storage)) {
		return storage.length ? { 0: storage } : {}
	}
	const result: LadderFloorDefaultsByLocation = {}
	for (const [key, floors] of Object.entries(storage.byLocation || {})) {
		const locationId = Number(key)
		if (!Number.isFinite(locationId) || locationId <= 0) continue
		const parsed = parseFloorIndices(floors)
		if (parsed.length) result[locationId] = parsed
	}
	return result
}

/** 表單 → API：僅保留有勾選樓層的地點 */
export const ladderFloorFormMapToPayload = (
	map: LadderFloorDefaultsByLocation,
): { byLocation: Record<string, number[]> } => {
	const byLocation: Record<string, number[]> = {}
	for (const [locationId, floors] of Object.entries(map)) {
		const parsed = parseFloorIndices(floors)
		if (parsed.length) byLocation[String(locationId)] = parsed
	}
	return { byLocation }
}

export const hasAnyLadderFloorSelection = (map: LadderFloorDefaultsByLocation): boolean =>
	Object.values(map).some((floors) => parseFloorIndices(floors).length > 0)

export const personHasLadderCard = (person: Person): boolean => {
	if (person.has_ladder_card != null) return Boolean(person.has_ladder_card)
	const card = person.ladder_card
	if (!card?.card_no?.trim()) return false
	return hasAnyLadderFloorSelection(mapLadderCardFloorsToForm(card))
}

export const mapLadderCardFloorsToForm = (card?: PersonLadderCard | null): LadderFloorDefaultsByLocation =>
	ladderFloorsStorageToFormMap(parseLadderFloorsStorage(card?.floors ?? null))

export const buildElevatorLocationFloorOptions = (
	zones: Array<{
		name: string
		locations?: Array<{
			id?: string
			name: string
			floors?: Array<{ label: string }>
		}>
	}>,
): ElevatorLocationFloorOption[] => {
	const options: ElevatorLocationFloorOption[] = []
	for (const zone of zones) {
		for (const loc of zone.locations || []) {
			const id = loc.id ? Number(loc.id) : NaN
			if (!Number.isFinite(id) || id <= 0) continue
			const floors = Array.isArray(loc.floors) ? loc.floors : []
			if (floors.length < 1) continue
			options.push({
				id,
				name: loc.name,
				zoneName: zone.name,
				floorCount: floors.length,
				floors: floors.map((f, i) => ({ index: i + 1, label: f.label })),
			})
		}
	}
	return options
}

export const createEmptyLadderLocationFormItem = (): PersonLadderLocationFormItem => ({
	locationId: "",
})

export const mapLadderFloorsToLocationItems = (
	map: LadderFloorDefaultsByLocation,
): PersonLadderLocationFormItem[] => {
	const ids = Object.entries(map)
		.filter(([, floors]) => parseFloorIndices(floors).length > 0)
		.map(([id]) => Number(id))
		.filter((n) => Number.isFinite(n) && n > 0)
	if (!ids.length) return [createEmptyLadderLocationFormItem()]
	return ids.map((id) => ({ locationId: String(id) }))
}

export const buildFloorOptionsForLocation = (loc: ElevatorLocationFloorOption) =>
	loc.floors.map((f) => ({
		index: f.index,
		label: f.label,
	}))

/** 舊版陣列樓層（key `0`）對應到第一個電梯地點 */
export const remapLegacyLadderFloorKey = (
	map: LadderFloorDefaultsByLocation,
	firstLocationId?: number | null,
): LadderFloorDefaultsByLocation => {
	if (!map[0] || !firstLocationId) return map
	const next = { ...map }
	next[firstLocationId] = map[0]
	delete next[0]
	return next
}
