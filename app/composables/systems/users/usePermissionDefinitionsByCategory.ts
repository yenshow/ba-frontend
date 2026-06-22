import type { Ref } from "vue"
import type { PermissionDefinition } from "~/types/user"
import type { FeatureKey } from "~/types/license"
import { LICENSE_FEATURE_KEYS } from "~/types/license"
import { PERM } from "~/config/permissionCodes"
import { useLicense } from "~/composables/core/useLicense"

export type PermissionModuleGroup = {
	parent: PermissionDefinition
	children: PermissionDefinition[]
}

const MODULE_FEATURE_OVERRIDE: Record<string, FeatureKey> = {
	"system.video_surveillance": "surveillance",
}

const collectPermissionCodes = (root: object): Set<string> => {
	const codes = new Set<string>()
	const walk = (obj: object) => {
		for (const value of Object.values(obj)) {
			if (typeof value === "string") codes.add(value)
			else if (value && typeof value === "object") walk(value)
		}
	}
	walk(root)
	return codes
}

const PROFILE_CODES = collectPermissionCodes(PERM)

const featureKeyForModule = (moduleCode: string): FeatureKey | null => {
	const override = MODULE_FEATURE_OVERRIDE[moduleCode]
	if (override) return override
	if (!moduleCode.startsWith("system.")) return null
	const suffix = moduleCode.slice("system.".length)
	return (LICENSE_FEATURE_KEYS as readonly string[]).includes(suffix) ? (suffix as FeatureKey) : null
}

const filterVisibleDefinitions = (
	defs: PermissionDefinition[],
	canLoadFeature: (featureKey: FeatureKey) => boolean
): PermissionDefinition[] => {
	const inProfile = defs.filter((d) => PROFILE_CODES.has(d.code))
	const licensedParentIds = new Set(
		inProfile
			.filter((d) => {
				if (d.parent_id != null) return false
				const fk = featureKeyForModule(d.code)
				return !fk || canLoadFeature(fk)
			})
			.map((d) => d.id)
	)
	return inProfile.filter((d) =>
		d.parent_id == null ? licensedParentIds.has(d.id) : licensedParentIds.has(d.parent_id)
	)
}

const groupByParent = (defs: PermissionDefinition[]): PermissionModuleGroup[] => {
	const sorted = [...defs].sort((a, b) => a.sort_order - b.sort_order)
	const childrenByParent = new Map<number, PermissionDefinition[]>()
	for (const d of sorted) {
		if (d.parent_id == null) continue
		const list = childrenByParent.get(d.parent_id) ?? []
		list.push(d)
		childrenByParent.set(d.parent_id, list)
	}
	return sorted
		.filter((d) => d.parent_id == null)
		.map((parent) => ({
			parent,
			children: (childrenByParent.get(parent.id) ?? []).sort(
				(a, b) => a.sort_order - b.sort_order
			),
		}))
}

/** 權限定義分組：父層模組 + 子層動作（用於 UserPermissionEditor） */
export const usePermissionDefinitionsByCategory = (
	definitionsRef: Ref<PermissionDefinition[]>
) => {
	const { fetchLicense, isLoaded, canLoadFeature } = useLicense()

	onMounted(() => void fetchLicense())

	const groups = computed(() => {
		if (!isLoaded.value) return []
		const visible = filterVisibleDefinitions(definitionsRef.value, canLoadFeature)
		return visible.length ? groupByParent(visible) : []
	})

	return { groups, isLoaded }
}
