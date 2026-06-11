import type { MaybeRefOrGetter, Ref } from "vue"
import { computed, toValue } from "vue"

export const clampFormTabIndex = (index: number, length: number) =>
	Math.min(Math.max(index, 0), Math.max(length - 1, 0))

type FormItemTabHandlersOptions<T> = {
	/** 未設定時不限制筆數（梯控地點 tab） */
	max?: MaybeRefOrGetter<number>
	createEmpty: () => T
	onClearLastItem?: () => void
	/** 自訂新增（例如梯控需同步 composable 狀態） */
	onAdd?: () => void
	/** 自訂移除（例如梯控需清除樓層 map） */
	onRemove?: (index: number) => void
}

/** 人員表單多筆 tab（卡片／指紋／車牌等）共用新增／移除邏輯 */
export const createFormItemTabHandlers = <T>(
	items: Ref<T[]>,
	activeTab: Ref<number>,
	options: FormItemTabHandlersOptions<T>,
) => {
	const activeItem = computed(() => items.value[activeTab.value] ?? null)

	const handleAdd = () => {
		if (options.max !== undefined) {
			const max = toValue(options.max)
			if (items.value.length >= max) return
		}
		if (options.onAdd) {
			options.onAdd()
		} else {
			items.value.push(options.createEmpty())
		}
		activeTab.value = items.value.length - 1
	}

	const handleRemove = () => {
		if (items.value.length <= 1) {
			options.onClearLastItem?.()
			activeTab.value = 0
			return
		}
		if (options.onRemove) {
			options.onRemove(activeTab.value)
		} else {
			items.value.splice(activeTab.value, 1)
		}
		activeTab.value = clampFormTabIndex(activeTab.value, items.value.length)
	}

	return { activeItem, handleAdd, handleRemove }
}
