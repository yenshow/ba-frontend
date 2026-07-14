import type { MaybeRefOrGetter } from "vue"
import { computed, ref, toValue, watch } from "vue"
import type { PeopleCountingLocation } from "~/types/peopleCounting"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"

type DoorDevice = { id: number; label: string }

const buildRolesById = (location: PeopleCountingLocation | null | undefined) => {
	const rolesById = new Map<number, { entry: boolean; exit: boolean }>()
	const push = (raw: unknown, role: "entry" | "exit") => {
		const id = Number(raw)
		if (!Number.isFinite(id) || id <= 0) return
		const cur = rolesById.get(id) ?? { entry: false, exit: false }
		cur[role] = true
		rolesById.set(id, cur)
	}
	for (const raw of location?.entryDeviceIds ?? []) push(raw, "entry")
	for (const raw of location?.exitDeviceIds ?? []) push(raw, "exit")
	return rolesById
}

const roleLabel = (roles: { entry: boolean; exit: boolean }) =>
	roles.entry && roles.exit ? "進出" : roles.entry ? "入口" : "出口"

/** access_control 地點：入口＋出口門禁設備（含名稱與進／出口標籤） */
export const usePeopleCountingDoorDevices = (
	location: MaybeRefOrGetter<PeopleCountingLocation | null | undefined>
) => {
	const deviceApi = useDeviceApi()
	const nameMap = ref<Record<number, string>>({})

	const rolesById = computed(() => buildRolesById(toValue(location)))
	const deviceIdsKey = computed(() => [...rolesById.value.keys()].join(","))

	const devices = computed<DoorDevice[]>(() =>
		[...rolesById.value.entries()].map(([id, roles]) => ({
			id,
			label: `${roleLabel(roles)}｜${nameMap.value[id]?.trim() || `設備 #${id}`}`,
		}))
	)

	watch(
		deviceIdsKey,
		async (key) => {
			const ids = key ? key.split(",").map(Number) : []
			if (ids.length === 0) {
				nameMap.value = {}
				return
			}
			const fallback = Object.fromEntries(ids.map((id) => [id, `設備 #${id}`]))
			try {
				const res = await deviceApi.getDevices({ type_code: "access_control", limit: 200 })
				const idSet = new Set(ids)
				const map = { ...fallback }
				for (const dev of res.devices ?? []) {
					if (dev.id != null && idSet.has(dev.id)) {
						map[dev.id] = dev.name?.trim() || fallback[dev.id]
					}
				}
				nameMap.value = map
			} catch {
				nameMap.value = fallback
			}
		},
		{ immediate: true }
	)

	return { devices }
}
