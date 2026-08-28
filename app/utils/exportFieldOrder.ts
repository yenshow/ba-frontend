import type { ExportFieldCatalogItem } from "~/utils/externalIntegration"

/** 依 catalog 預設順序取得欄位 key 列表 */
export const buildCatalogFieldOrder = (catalog: Array<{ key: string }>) =>
	catalog.map((f) => f.key)

/**
 * 合併已儲存順序與 catalog：保留既有順序，catalog 新增欄位補在末尾。
 */
export const mergeFieldOrder = (savedKeys: string[], catalogKeys: string[]) => {
	const catalogSet = new Set(catalogKeys)
	const out: string[] = []
	for (const key of savedKeys) {
		if (catalogSet.has(key) && !out.includes(key)) out.push(key)
	}
	for (const key of catalogKeys) {
		if (!out.includes(key)) out.push(key)
	}
	return out
}

/** 拖曳重排：將 fromKey 移到 toKey 位置 */
export const reorderFieldInOrder = (order: string[], fromKey: string, toKey: string): string[] => {
	const fromIndex = order.indexOf(fromKey)
	const toIndex = order.indexOf(toKey)
	if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return order
	const next = [...order]
	const [moved] = next.splice(fromIndex, 1)
	next.splice(toIndex, 0, moved)
	return next
}

/** 依 fieldOrderKeys 解析出排序後的 catalog 項目 */
export const resolveOrderedFields = (
	catalog: ExportFieldCatalogItem[],
	fieldOrderKeys: string[],
): ExportFieldCatalogItem[] => {
	const byKey = new Map(catalog.map((f) => [f.key, f]))
	return fieldOrderKeys.map((key) => byKey.get(key)).filter((f): f is ExportFieldCatalogItem =>
		Boolean(f),
	)
}
