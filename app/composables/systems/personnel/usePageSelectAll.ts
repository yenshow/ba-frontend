import type { ComputedRef, Ref } from "vue"

type MaybeRef<T> = Ref<T> | ComputedRef<T>

/**
 * 統一「目前列表（page）全選/取消全選」的 UI 狀態機。
 *
 * 規則（以群組管理 dialog 的行為為準）：
 * - 只影響「目前可見 items」
 * - 若 items 皆已被選取 -> toggle 會取消全選（移除這批 ids）
 * - 否則 -> toggle 會全選（加入這批 ids）
 */
export const usePageSelectAll = <TItem>(params: {
	items: MaybeRef<TItem[]>
	getId?: (item: TItem) => number
	isSelected: (id: number) => boolean
	setMany: (ids: number[], checked: boolean) => void
}) => {
	const { items, isSelected, setMany } = params
	const getId = params.getId ?? ((item: any) => Number(item?.id))

	const pageIds = computed<number[]>(() => {
		const list = unref(items) || []
		const ids: number[] = []
		for (const it of list) {
			const id = Number(getId(it))
			if (!Number.isFinite(id)) continue
			ids.push(Math.trunc(id))
		}
		return ids
	})

	const isAllSelectedOnPage = computed(() => {
		const ids = pageIds.value
		if (ids.length === 0) return false
		return ids.every((id) => isSelected(id))
	})

	const toggleSelectAllOnPage = () => {
		const ids = pageIds.value
		if (ids.length === 0) return
		setMany(ids, !isAllSelectedOnPage.value)
	}

	return {
		pageIds,
		isAllSelectedOnPage,
		toggleSelectAllOnPage,
	}
}

