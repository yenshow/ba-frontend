/** 人員勾選名單草稿（群組子群組／門禁地點等「儲存才生效」表單共用） */

export type KeptIdsByBucket = Record<number, number[]>

export const memberIdSetsEqual = (a: number[], b: number[]) => {
	if (a.length !== b.length) return false
	const set = new Set(a)
	return b.every((id) => set.has(id))
}

export const cloneKeptIdsByBucket = (map: KeptIdsByBucket): KeptIdsByBucket =>
	JSON.parse(JSON.stringify(map)) as KeptIdsByBucket

export const isKeptInBucket = (kept: KeptIdsByBucket, bucketId: number, personId: number) =>
	(kept[bucketId] || []).includes(personId)

export const getKeptCountInBucket = (kept: KeptIdsByBucket, bucketId: number) =>
	(kept[bucketId] || []).length

export const hasKeptIdsMapChanges = (
	bucketIds: number[],
	kept: KeptIdsByBucket,
	initial: KeptIdsByBucket
) => {
	for (const bucketId of bucketIds) {
		const next = kept[bucketId] || []
		const prev = initial[bucketId] || []
		if (!memberIdSetsEqual(next, prev)) return true
	}
	return false
}

/** 儲存前整併：同一人在多個 bucket 勾選時，以 buckets 列表較下方為準 */
export const normalizeKeptIdsByBucketsForSave = <T extends { id: number }>(
	buckets: T[],
	kept: KeptIdsByBucket
): { map: KeptIdsByBucket; hadDuplicates: boolean } => {
	const personToFinalBucket = new Map<number, number>()
	let hadDuplicates = false

	for (const bucket of buckets) {
		for (const personId of kept[bucket.id] || []) {
			if (personToFinalBucket.has(personId)) hadDuplicates = true
			personToFinalBucket.set(personId, bucket.id)
		}
	}

	const next: KeptIdsByBucket = {}
	for (const bucket of buckets) next[bucket.id] = []
	for (const [personId, bucketId] of personToFinalBucket) {
		next[bucketId].push(personId)
	}
	return { map: next, hadDuplicates }
}

export const toggleKeepInBucket = (
	kept: KeptIdsByBucket,
	bucketId: number,
	personId: number,
	checked: boolean
): KeptIdsByBucket => {
	const map = { ...kept }
	const current = map[bucketId] || []
	if (checked) {
		if (!current.includes(personId)) map[bucketId] = [...current, personId]
	} else {
		map[bucketId] = current.filter((x) => x !== personId)
	}
	return map
}

export const toggleManyInBucket = (
	kept: KeptIdsByBucket,
	bucketId: number,
	personIds: number[],
	checked: boolean
): KeptIdsByBucket => {
	const map = { ...kept }
	const set = new Set(map[bucketId] || [])
	for (const id of personIds || []) {
		const n = Number(id)
		if (!Number.isFinite(n)) continue
		if (checked) set.add(Math.trunc(n))
		else set.delete(Math.trunc(n))
	}
	map[bucketId] = Array.from(set)
	return map
}

export const isAllPageIdsKeptInBucket = (
	kept: KeptIdsByBucket,
	bucketId: number,
	pageIds: number[]
) => {
	if (pageIds.length === 0) return false
	return pageIds.every((id) => isKeptInBucket(kept, bucketId, id))
}

export const toggleAllPageIdsInBucket = (
	kept: KeptIdsByBucket,
	bucketId: number,
	pageIds: number[]
): KeptIdsByBucket => {
	if (pageIds.length === 0) return kept
	const allKept = isAllPageIdsKeptInBucket(kept, bucketId, pageIds)
	return toggleManyInBucket(kept, bucketId, pageIds, !allKept)
}
