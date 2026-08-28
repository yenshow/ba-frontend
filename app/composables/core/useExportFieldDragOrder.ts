import { reorderFieldInOrder } from "~/utils/exportFieldOrder"

type DisabledSource = Ref<boolean> | ComputedRef<boolean>

export const useExportFieldDragOrder = (
	fieldOrderKeys: Ref<string[]>,
	options?: { disabled?: DisabledSource },
) => {
	const draggingFieldKey = ref<string | null>(null)
	const dragOverFieldKey = ref<string | null>(null)
	const isDisabled = computed(() => unref(options?.disabled) ?? false)

	const handleFieldDragStart = (event: DragEvent, fieldKey: string) => {
		if (isDisabled.value) return
		draggingFieldKey.value = fieldKey
		event.dataTransfer?.setData("text/plain", fieldKey)
		if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
	}

	const handleFieldDragEnd = () => {
		draggingFieldKey.value = null
		dragOverFieldKey.value = null
	}

	const handleFieldDragOver = (event: DragEvent, fieldKey: string) => {
		if (isDisabled.value || !draggingFieldKey.value || draggingFieldKey.value === fieldKey) return
		event.preventDefault()
		if (event.dataTransfer) event.dataTransfer.dropEffect = "move"
		dragOverFieldKey.value = fieldKey
	}

	const handleFieldDragLeave = (fieldKey: string) => {
		if (dragOverFieldKey.value === fieldKey) dragOverFieldKey.value = null
	}

	const handleFieldDrop = (event: DragEvent, targetFieldKey: string) => {
		event.preventDefault()
		const fromKey = draggingFieldKey.value || event.dataTransfer?.getData("text/plain")
		if (!fromKey || fromKey === targetFieldKey || isDisabled.value) {
			handleFieldDragEnd()
			return
		}
		fieldOrderKeys.value = reorderFieldInOrder(fieldOrderKeys.value, fromKey, targetFieldKey)
		handleFieldDragEnd()
	}

	return {
		draggingFieldKey,
		dragOverFieldKey,
		handleFieldDragStart,
		handleFieldDragEnd,
		handleFieldDragOver,
		handleFieldDragLeave,
		handleFieldDrop,
	}
}
