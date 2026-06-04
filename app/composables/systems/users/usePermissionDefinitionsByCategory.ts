import type { Ref } from "vue"
import type { PermissionDefinition } from "~/types/user"

export type PermissionModuleGroup = {
	parent: PermissionDefinition
	children: PermissionDefinition[]
}

/** 權限定義分組：父層模組 + 子層動作（用於 UserPermissionEditor） */
export const usePermissionDefinitionsByCategory = (
	definitionsRef: Ref<PermissionDefinition[]>
) => {
	const groups = computed<PermissionModuleGroup[]>(() => {
		const defs = definitionsRef.value
		if (!defs.length) return []

		const sorted = [...defs].sort((a, b) => a.sort_order - b.sort_order)
		const parents = sorted.filter((d) => d.parent_id == null)
		const childrenByParent = new Map<number, PermissionDefinition[]>()
		for (const d of sorted) {
			if (d.parent_id == null) continue
			const list = childrenByParent.get(d.parent_id) ?? []
			list.push(d)
			childrenByParent.set(d.parent_id, list)
		}

		return parents.map((parent) => ({
			parent,
			children: (childrenByParent.get(parent.id) ?? []).sort(
				(a, b) => a.sort_order - b.sort_order
			),
		}))
	})

	return { groups }
}
