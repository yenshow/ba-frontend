/** 分頁 API 統一形狀（items / total / limit / offset） */
export type Paged<T> = {
	items: T[]
	total: number
	limit: number
	offset: number
}

export type FetchPagedParams = {
	limit: number
	offset: number
}

export const fetchAllPaged = async <T,>(
	fetchPage: (params: FetchPagedParams) => Promise<Paged<T>>,
	pageSize = 500
): Promise<T[]> => {
	const first = await fetchPage({ limit: pageSize, offset: 0 })
	const total = Number(first.total) || 0
	const all: T[] = Array.isArray(first.items) ? [...first.items] : []

	// 重要：offset 推進必須以「實際回傳筆數/實際 limit」為準，避免後端 clamp limit 造成跳頁漏抓
	const firstStep =
		Number(first.limit) > 0
			? Math.trunc(Number(first.limit))
			: all.length > 0
				? all.length
				: pageSize
	let offset = firstStep
	while (all.length < total) {
		const next = await fetchPage({ limit: pageSize, offset })
		const chunk = Array.isArray(next.items) ? next.items : []
		if (chunk.length === 0) break
		all.push(...chunk)
		const step = Number(next.limit) > 0 ? Math.trunc(Number(next.limit)) : chunk.length
		// fallback：避免 step=0 造成無窮迴圈
		offset += step > 0 ? step : pageSize
	}

	return all
}
