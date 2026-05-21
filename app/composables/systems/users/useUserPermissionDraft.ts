import type { PermissionDefinition } from "~/types/user"

/** 依定義清單與勾選來源建立 granted map（預設皆 false） */
export const buildGrantedMap = (
	definitions: PermissionDefinition[],
	grantedById: Record<number, boolean> = {}
): Record<number, boolean> => {
	const map: Record<number, boolean> = {}
	for (const d of definitions) {
		map[d.id] = Boolean(grantedById[d.id])
	}
	return map
}

export const permissionOverridesFromGranted = (
	definitions: PermissionDefinition[],
	granted: Record<number, boolean>
): { permission_id: number; granted: boolean }[] =>
	definitions.map((d) => ({
		permission_id: d.id,
		granted: Boolean(granted[d.id]),
	}))

export const permissionGrantedMapsEqual = (
	a: Record<number, boolean>,
	b: Record<number, boolean>
): boolean => {
	const keys = new Set([...Object.keys(a), ...Object.keys(b)])
	for (const key of keys) {
		const id = Number(key)
		if (Boolean(a[id]) !== Boolean(b[id])) return false
	}
	return true
}
