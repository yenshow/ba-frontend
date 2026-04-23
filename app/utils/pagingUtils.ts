export type PagedResponse<T> = {
	items: T[]
	total: number
}

export type FetchPagedParams = {
	limit: number
	offset: number
}

export const fetchAllPaged = async <T,>(
	fetchPage: (params: FetchPagedParams) => Promise<PagedResponse<T>>,
	pageSize = 500
): Promise<T[]> => {
	const first = await fetchPage({ limit: pageSize, offset: 0 })
	const total = Number(first.total) || 0
	const all: T[] = Array.isArray(first.items) ? [...first.items] : []

	let offset = pageSize
	while (all.length < total) {
		const next = await fetchPage({ limit: pageSize, offset })
		const chunk = Array.isArray(next.items) ? next.items : []
		if (chunk.length === 0) break
		all.push(...chunk)
		offset += pageSize
	}

	return all
}
