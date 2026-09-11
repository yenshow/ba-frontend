import type { Person, PersonLadderCard } from "~/types/personnel"

const parseFloorIndices = (raw: unknown): number[] => {
	if (!Array.isArray(raw)) return []
	return raw.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0)
}

const countLadderFloors = (card?: PersonLadderCard | null): number => {
	const floors = card?.floors
	if (Array.isArray(floors)) return parseFloorIndices(floors).length
	if (floors && typeof floors === "object" && floors.byLocation) {
		return Object.values(floors.byLocation).reduce(
			(sum, arr) => sum + parseFloorIndices(arr).length,
			0,
		)
	}
	return 0
}

/** 列表／平台 icon：是否已有梯控樓層授權 */
export const personHasLadderCard = (person: Person): boolean => {
	if (person.has_ladder_card != null) return Boolean(person.has_ladder_card)
	const card = person.ladder_card
	if (!card?.card_no?.trim()) return false
	return countLadderFloors(card) > 0
}
