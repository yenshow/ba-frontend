/**
 * 通用 key 拖曳重排（對齊轉存欄位 export-field-drag-handle 互動）
 * 僅允許相同前綴的 key 互拖（例如 zone: ↔ zone:）
 */
export const useKeyDragReorder = (options?: { disabled?: () => boolean }) => {
	const draggingKey = ref<string | null>(null)
	const dragOverKey = ref<string | null>(null)

	const isDisabled = () => options?.disabled?.() ?? false

	const keyPrefix = (key: string) => {
		const i = key.indexOf(":")
		return i > 0 ? key.slice(0, i) : ""
	}

	const canDropOn = (fromKey: string, toKey: string) =>
		Boolean(fromKey && toKey && fromKey !== toKey && keyPrefix(fromKey) === keyPrefix(toKey))

	const handleDragStart = (event: DragEvent, key: string) => {
		if (isDisabled()) return
		draggingKey.value = key
		event.dataTransfer?.setData("text/plain", key)
		if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
	}

	const handleDragEnd = () => {
		draggingKey.value = null
		dragOverKey.value = null
	}

	const handleDragOver = (event: DragEvent, key: string) => {
		if (isDisabled() || !draggingKey.value || !canDropOn(draggingKey.value, key)) return
		event.preventDefault()
		if (event.dataTransfer) event.dataTransfer.dropEffect = "move"
		dragOverKey.value = key
	}

	const handleDragLeave = (key: string) => {
		if (dragOverKey.value === key) dragOverKey.value = null
	}

	const handleDrop = (
		event: DragEvent,
		targetKey: string,
		onReorder: (fromKey: string, toKey: string) => void
	) => {
		event.preventDefault()
		const fromKey = draggingKey.value || event.dataTransfer?.getData("text/plain") || ""
		if (!canDropOn(fromKey, targetKey) || isDisabled()) {
			handleDragEnd()
			return
		}
		onReorder(fromKey, targetKey)
		handleDragEnd()
	}

	const rowDragClass = (key: string) => ({
		"export-mapping-row--dragging": draggingKey.value === key,
		"export-mapping-row--drag-over": dragOverKey.value === key,
	})

	return {
		handleDragStart,
		handleDragEnd,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		rowDragClass,
	}
}
