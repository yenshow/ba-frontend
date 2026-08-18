<template>
	<div class="space-y-3">
		<label class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:text-base">
			<span>管理中心主機</span>
			<FilterDropdown
				v-model="manageDeviceIdString"
				:options="manageDeviceOptions"
				:placeholder="isLoadingDevices ? '載入中...' : '請選擇此區域主機'"
				aria-label="選擇管理中心主機"
			/>
		</label>

		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<span class="text-base font-medium 2xl:text-lg">戶別列表</span>
			</div>
			<PermissionActionButton
				:allowed="allowCreateLocation"
				aria-label="新增樓層"
				class="btn-secondary shrink-0 text-sm 2xl:text-base"
				@click="handleAddDraftFloor"
			>
				新增樓層
			</PermissionActionButton>
		</div>

		<div
			v-if="locations.length === 0 && draftFloors.length === 0"
			class="rounded border border-white/10 bg-white/5 py-6 text-center text-sm text-white/60 2xl:text-base"
		>
			尚無戶別。請按「新增樓層」，輸入樓層後加入戶別並綁定室內機。
		</div>

		<div v-else class="space-y-2">
			<div
				v-for="(draft, draftIndex) in draftFloors"
				:key="draft.id"
				class="overflow-hidden rounded-lg border border-amber-400/40 bg-amber-500/10"
			>
				<div
					class="flex cursor-pointer flex-wrap items-center gap-2 border-b border-white/10 bg-white/[0.07] p-3 hover:bg-white/10"
					@click="toggleDraft(draft.id)"
				>
					<button
						type="button"
						class="flex shrink-0 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80"
						:aria-expanded="isDraftExpanded(draft.id)"
						aria-label="展開或收合"
						@click.stop="toggleDraft(draft.id)"
					>
						<svg
							class="h-5 w-5 text-white/70 transition-transform"
							:class="{ 'rotate-90': isDraftExpanded(draft.id) }"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</button>

					<div class="min-w-0 flex-1" @click.stop>
						<label class="flex min-w-0 flex-col gap-1 text-sm text-white/75 2xl:text-base">
							<input
								v-model="draft.name"
								type="text"
								class="form-input-small"
								placeholder="例如：1F、2F、B1"
								aria-label="樓層名稱"
							/>
						</label>
					</div>

					<div class="flex shrink-0 flex-wrap items-center gap-2" @click.stop>
						<div v-if="reorderableLocations" class="btn-reorder-stack">
							<button
								type="button"
								class="btn-reorder-arrow"
								:disabled="draftIndex <= 0"
								title="樓層草稿上移"
								aria-label="此樓層草稿上移"
								@click="moveDraftFloor(draft.id, 'up')"
							>
								↑
							</button>
							<button
								type="button"
								class="btn-reorder-arrow"
								:disabled="draftIndex >= draftFloors.length - 1"
								title="樓層草稿下移"
								aria-label="此樓層草稿下移"
								@click="moveDraftFloor(draft.id, 'down')"
							>
								↓
							</button>
						</div>
						<span class="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white/90">0 戶</span>
						<PermissionActionButton
							:allowed="allowCreateLocation"
							aria-label="新增戶別"
							class="btn-secondary text-xs 2xl:text-sm"
							@click="handleAddUnitInDraft(draft)"
						>
							新增戶別
						</PermissionActionButton>
						<IconTrashButton
							:allowed="allowDeleteLocation"
							title="移除此樓層"
							aria-label="移除此樓層草稿"
							@click="removeDraft(draft.id)"
						/>
					</div>
				</div>

				<div
					v-show="isDraftExpanded(draft.id)"
					class="px-3 py-4 text-center text-sm text-white/50 2xl:text-base"
				>
					輸入樓層名稱後，按「新增戶別」加入第一個戶別
				</div>
			</div>

			<div
				v-for="(group, groupIndex) in groupedLocations"
				:key="group.key"
				class="overflow-hidden rounded-lg border border-white/15 bg-white/5"
			>
				<div
					class="flex cursor-pointer flex-wrap items-center gap-2 border-b border-white/10 bg-white/[0.07] p-3 transition-colors hover:bg-white/10"
					@click="toggleGroup(group.key)"
				>
					<button
						type="button"
						class="flex shrink-0 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80"
						:aria-expanded="isExpanded(group.key)"
						aria-label="展開或收合"
						@click.stop="toggleGroup(group.key)"
					>
						<svg
							class="h-5 w-5 text-white/70 transition-transform"
							:class="{ 'rotate-90': isExpanded(group.key) }"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</button>

					<div class="min-w-0 flex-1" @click.stop>
						<label class="flex min-w-0 flex-col gap-1 text-sm text-white/70 2xl:text-base">
							<input
								v-model="floorLabels[group.key]"
								type="text"
								class="form-input-small text-base font-medium text-white 2xl:text-lg"
								:placeholder="group.key === EMPTY_KEY ? '未分類' : '例如：1F'"
								:aria-label="'樓層：' + group.displayLabel"
								@blur="commitGroupRename(group)"
								@keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
							/>
						</label>
					</div>

					<div class="flex shrink-0 items-center gap-2" @click.stop>
						<div v-if="reorderableLocations" class="btn-reorder-stack">
							<button
								type="button"
								class="btn-reorder-arrow"
								:disabled="groupIndex === 0"
								title="樓層區塊上移"
								aria-label="此樓層整區上移"
								@click="handleReorderFloorBlock(group, 'up')"
							>
								↑
							</button>
							<button
								type="button"
								class="btn-reorder-arrow"
								:disabled="groupIndex >= groupedLocations.length - 1"
								title="樓層區塊下移"
								aria-label="此樓層整區下移"
								@click="handleReorderFloorBlock(group, 'down')"
							>
								↓
							</button>
						</div>
						<span class="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white/90 2xl:text-sm">
							{{ group.items.length }} 戶
						</span>
						<PermissionActionButton
							:allowed="allowCreateLocation"
							:disabled="group.key === EMPTY_KEY"
							aria-label="新增戶別"
							class="btn-secondary text-xs 2xl:text-sm"
							@click="handleAddUnitInGroup(group)"
						>
							新增戶別
						</PermissionActionButton>
					</div>
				</div>

				<div v-show="isExpanded(group.key)" class="space-y-2 p-2">
					<div
						v-for="(item, itemIndex) in group.items"
						:key="getStableItemKey(item)"
						class="flex min-w-0 items-start gap-2 rounded border border-white/10 bg-white/[0.04] p-2"
					>
						<div class="min-w-0 flex-1">
							<AccessSecurityLocationFields
								:location="item.loc"
								:floor="group.floor"
								:devices="devices"
								:is-loading-devices="isLoadingDevices"
								@update="handleLocationUpdate(item.globalIndex, $event)"
							/>
						</div>

						<div v-if="reorderableLocations" class="btn-reorder-stack self-start">
							<button
								type="button"
								class="btn-reorder-arrow"
								:disabled="itemIndex === 0"
								title="上移"
								aria-label="此戶別上移"
								@click="handleReorderInGroup(group, itemIndex, 'up')"
							>
								↑
							</button>
							<button
								type="button"
								class="btn-reorder-arrow"
								:disabled="itemIndex >= group.items.length - 1"
								title="下移"
								aria-label="此戶別下移"
								@click="handleReorderInGroup(group, itemIndex, 'down')"
							>
								↓
							</button>
						</div>

						<IconTrashButton
							:allowed="allowDeleteLocation"
							button-class="ml-auto flex-shrink-0"
							title="刪除戶別"
							aria-label="刪除此戶別"
							@click="handleRemoveLocation(item.globalIndex)"
						/>
					</div>
				</div>
			</div>
		</div>

		<p v-if="devices.length === 0 && !isLoadingDevices" class="mt-1 text-xs text-amber-300">
			{{ deviceHint }}
		</p>
	</div>
</template>

<script setup lang="ts">
import { TOAST } from "~/config/toastCatalog"
import { computed, reactive, ref, watch } from "vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import IconTrashButton from "~/components/common/IconTrashButton.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import AccessSecurityLocationFields from "../LocationFormFields/AccessSecurityLocationFields.vue"
import type { AccessSecurityZone, AccessSecurityLocation } from "~/types/accessSecurity"
import type { Device } from "~/types/device"
import { getLocationUiKey } from "~/utils/locationUiId"
import {
	ACCESS_SECURITY_UNCLASSIFIED_FLOOR,
	normalizeAccessSecurityFloor,
} from "~/utils/accessSecurityFloor"
import { useToast } from "~/composables/core/useToast"

const EMPTY_KEY = "__empty__"

interface GroupRow {
	key: string
	floor: string
	displayLabel: string
	items: { loc: AccessSecurityLocation; globalIndex: number }[]
}

interface DraftFloor {
	id: string
	name: string
}

interface Props {
	zone: AccessSecurityZone
	devices: Device[]
	isLoadingDevices: boolean
	deviceHint?: string
	reorderableLocations?: boolean
	allowCreateLocation?: boolean
	allowDeleteLocation?: boolean
}

interface Emits {
	(e: "add-location", payload?: { floor?: string }): void
	(e: "remove-location", index: number): void
	(e: "update-location", index: number, location: AccessSecurityLocation): void
	(e: "rename-floor", payload: { oldFloor: string; newFloor: string }): void
	(e: "reorder-location", payload: { index: number; direction: "up" | "down"; swapWithIndex?: number }): void
	(e: "reorder-view-category-block", payload: { categoryKey: string; direction: "up" | "down" }): void
	(e: "update-zone", updates: Partial<AccessSecurityZone>): void
}

const props = withDefaults(defineProps<Props>(), {
	allowCreateLocation: true,
	allowDeleteLocation: true,
	deviceHint: "請先在「設備管理」建立視訊對講室內機與管理中心主機",
	reorderableLocations: false,
})

const emit = defineEmits<Emits>()
const toast = useToast()

const draftFloors = ref<DraftFloor[]>([])
const floorLabels = reactive<Record<string, string>>({})
const expandedByKey = reactive<Record<string, boolean>>({})
const draftExpandedById = reactive<Record<string, boolean>>({})

const locations = computed(() => props.zone.locations || [])

const manageDevices = computed(() =>
	(props.devices || []).filter((d) => {
		const cfg = d.config as { unitType?: string } | undefined
		return d.type_code === "video_intercom" && String(cfg?.unitType || "") === "manage"
	})
)

const manageDeviceOptions = computed(() => [
	{ value: "", label: "尚未綁定" },
	...manageDevices.value.map((d) => ({
		value: String(d.id),
		label: d.name || `設備 ${d.id}`,
	})),
])

const manageDeviceIdString = computed({
	get: () =>
		props.zone.manageDeviceId != null && props.zone.manageDeviceId > 0
			? String(props.zone.manageDeviceId)
			: "",
	set: (v: string) => {
		const n = Number(v)
		const manageDeviceId = Number.isFinite(n) && n > 0 ? n : undefined
		emit("update-zone", { manageDeviceId })
	},
})

const groupedLocations = computed((): GroupRow[] => {
	const map = new Map<string, GroupRow>()
	const keyOrder: string[] = []
	locations.value.forEach((loc, globalIndex) => {
		const raw = normalizeAccessSecurityFloor(loc.floor)
		const key = raw === "" ? EMPTY_KEY : raw
		const displayLabel = raw || ACCESS_SECURITY_UNCLASSIFIED_FLOOR
		if (!map.has(key)) {
			map.set(key, { key, floor: raw, displayLabel, items: [] })
			keyOrder.push(key)
		}
		map.get(key)!.items.push({ loc, globalIndex })
	})
	const orderedKeys = keyOrder.filter((k) => k !== EMPTY_KEY)
	if (keyOrder.includes(EMPTY_KEY)) orderedKeys.push(EMPTY_KEY)
	return orderedKeys.map((k) => map.get(k)!)
})

watch(
	() => groupedLocations.value,
	(groups) => {
		const valid = new Set(groups.map((g) => g.key))
		for (const k of Object.keys(floorLabels)) {
			if (!valid.has(k)) delete floorLabels[k]
		}
		for (const g of groups) {
			if (floorLabels[g.key] === undefined) {
				floorLabels[g.key] = g.floor
			}
			if (expandedByKey[g.key] === undefined) {
				expandedByKey[g.key] = true
			}
		}
	},
	{ immediate: true }
)

watch(
	() => draftFloors.value.map((d) => d.id),
	(ids) => {
		for (const id of ids) {
			if (draftExpandedById[id] === undefined) draftExpandedById[id] = true
		}
	},
	{ immediate: true }
)

const isExpanded = (key: string) => expandedByKey[key] !== false
const toggleGroup = (key: string) => {
	expandedByKey[key] = !isExpanded(key)
}
const isDraftExpanded = (id: string) => draftExpandedById[id] !== false
const toggleDraft = (id: string) => {
	draftExpandedById[id] = !isDraftExpanded(id)
}

const handleReorderFloorBlock = (group: GroupRow, direction: "up" | "down") => {
	emit("reorder-view-category-block", { categoryKey: group.key, direction })
}

const handleReorderInGroup = (group: GroupRow, itemIndex: number, direction: "up" | "down") => {
	const j = direction === "up" ? itemIndex - 1 : itemIndex + 1
	const current = group.items[itemIndex]
	const target = group.items[j]
	if (!current || !target) return
	emit("reorder-location", {
		index: current.globalIndex,
		direction,
		swapWithIndex: target.globalIndex,
	})
}

const moveDraftFloor = (draftId: string, direction: "up" | "down") => {
	const i = draftFloors.value.findIndex((d) => d.id === draftId)
	const j = direction === "up" ? i - 1 : i + 1
	if (i < 0 || j < 0 || j >= draftFloors.value.length) return
	const next = [...draftFloors.value]
	;[next[i], next[j]] = [next[j]!, next[i]!]
	draftFloors.value = next
}

const handleAddDraftFloor = () => {
	const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
	draftFloors.value.unshift({ id, name: "" })
	draftExpandedById[id] = true
}

const removeDraft = (id: string) => {
	const i = draftFloors.value.findIndex((d) => d.id === id)
	if (i !== -1) draftFloors.value.splice(i, 1)
	delete draftExpandedById[id]
}

const handleAddUnitInDraft = (draft: DraftFloor) => {
	const name = draft.name.trim()
	if (!name) {
		toast.error(TOAST.ACCESS_SECURITY_FLOOR_NAME_REQUIRED)
		return
	}
	emit("add-location", { floor: name })
	removeDraft(draft.id)
	expandedByKey[name] = true
}

const handleAddUnitInGroup = (group: GroupRow) => {
	emit("add-location", { floor: group.floor })
	expandedByKey[group.key] = true
}

const commitGroupRename = (group: GroupRow) => {
	const nextName = (floorLabels[group.key] ?? "").trim()
	const prev = group.floor.trim()
	if (nextName === prev) return

	if (group.key !== EMPTY_KEY && nextName === "") {
		toast.error(TOAST.ACCESS_SECURITY_FLOOR_NAME_BLANK)
		floorLabels[group.key] = group.floor
		return
	}

	if (group.key === EMPTY_KEY && nextName === "") return

	emit("rename-floor", { oldFloor: group.floor, newFloor: nextName })

	const wasOpen = isExpanded(group.key)
	if (nextName !== group.key) {
		expandedByKey[nextName] = wasOpen
		delete expandedByKey[group.key]
	}
}

const getStableItemKey = (item: { loc: AccessSecurityLocation; globalIndex: number }) =>
	getLocationUiKey({
		zone: props.zone as any,
		location: item.loc as any,
		locationIndex: item.globalIndex,
	})

const handleRemoveLocation = (locationIndex: number) => emit("remove-location", locationIndex)

const handleLocationUpdate = (locationIndex: number, updatedLocation: AccessSecurityLocation) => {
	emit("update-location", locationIndex, updatedLocation)
}
</script>
