import type { PermissionDefinition } from "~/types/user"

export const buildGrantedMap = (
	definitions: PermissionDefinition[],
	grantedById: Record<number, boolean> = {}
): Record<number, boolean> =>
	Object.fromEntries(definitions.map((d) => [d.id, Boolean(grantedById[d.id])]))

export const permissionOverridesFromGranted = (
	definitions: PermissionDefinition[],
	granted: Record<number, boolean>
): { permission_id: number; granted: boolean }[] =>
	definitions
		.filter((d) => granted[d.id])
		.map((d) => ({ permission_id: d.id, granted: true }))

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
