import type { Ref } from "vue"
import type { PermissionDefinition } from "~/types/user"
export type PermissionCategoryGroup = {
	key: string
	label: string
	items: PermissionDefinition[]
}

/** 權限定義分組（用於 UserPermissionEditor） */
export const usePermissionDefinitionsByCategory = (
	definitionsRef: Ref<PermissionDefinition[]>
) => {
	const groups = computed<PermissionCategoryGroup[]>(() => {
		const defs = definitionsRef.value
		if (!defs.length) return []

		const sorted = [...defs].sort((a, b) => a.sort_order - b.sort_order)
		return [
			{
				key: "modules",
				label: "模組頁面",
				items: sorted,
			},
		]
	})

	return { groups }
}
