<template>
	<div class="space-y-3">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<span class="text-base font-medium 2xl:text-lg">點位列表</span>
			</div>
			<PermissionActionButton
				:allowed="allowCreateLocation"
				aria-label="新增分類"
				class="btn-secondary shrink-0 text-sm 2xl:text-base"
				@click="handleAddDraftCategory"
			>
				新增分類
			</PermissionActionButton>
		</div>

		<div
			v-if="locations.length === 0 && draftCategories.length === 0"
			class="rounded border border-white/10 bg-white/5 py-6 text-center text-sm text-white/60 2xl:text-base"
		>
			尚無點位。請按「新增分類」，於該列輸入分類名稱後加入點位。
		</div>

		<div v-else class="space-y-2">
			<div
				v-for="(draft, draftIndex) in draftCategories"
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
								:placeholder="categoryPlaceholder"
							/>
						</label>
					</div>

					<div class="flex shrink-0 flex-wrap items-center gap-2" @click.stop>
						<div v-if="reorderableLocations" class="btn-reorder-stack">
							<button
								type="button"
								class="btn-reorder-arrow"
								:disabled="draftIndex <= 0"
								title="分類草稿上移"
								aria-label="此分類草稿上移"
								@click="moveDraftCategory(draft.id, 'up')"
							>
								↑
							</button>
							<button
								type="button"
								class="btn-reorder-arrow"
								:disabled="draftIndex >= draftCategories.length - 1"
								title="分類草稿下移"
								aria-label="此分類草稿下移"
								@click="moveDraftCategory(draft.id, 'down')"
							>
								↓
							</button>
						</div>
						<span class="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white/90">0 點</span>
						<PermissionActionButton
							:allowed="allowCreateLocation"
							aria-label="新增點位"
							class="btn-secondary text-xs 2xl:text-sm"
							@click="handleAddPointInDraft(draft)"
						>
							新增點位
						</PermissionActionButton>
						<IconTrashButton
							:disabled="!allowDeleteLocation"
							title="移除此分類"
							aria-label="移除此分類草稿"
							@click="removeDraft(draft.id)"
						/>
					</div>
				</div>

				<div
					v-show="isDraftExpanded(draft.id)"
					class="px-3 py-4 text-center text-sm text-white/50 2xl:text-base"
				>
					輸入分類名稱後，按「此分類新增點位」加入第一個點位
				</div>
			</div>

			<div
				v-for="group in groupedLocations"
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
								v-model="categoryLabels[group.key]"
								type="text"
								class="form-input-small text-base font-medium text-white 2xl:text-lg"
								:placeholder="group.key === EMPTY_KEY ? '未分類' : ''"
								:aria-label="'檢視分類：' + group.displayLabel"
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
								:disabled="isFirstGroupedCategory(group)"
								title="分類區塊上移"
								aria-label="此檢視分類整區上移"
								@click="handleReorderCategoryBlock(group, 'up')"
							>
								↑
							</button>
							<button
								type="button"
								class="btn-reorder-arrow"
								:disabled="isLastGroupedCategory(group)"
								title="分類區塊下移"
								aria-label="此檢視分類整區下移"
								@click="handleReorderCategoryBlock(group, 'down')"
							>
								↓
							</button>
						</div>
						<span class="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white/90 2xl:text-sm">
							{{ group.items.length }} 點
						</span>
						<PermissionActionButton
							:allowed="allowCreateLocation && group.key !== EMPTY_KEY"
							aria-label="新增點位"
							class="btn-secondary text-xs 2xl:text-sm"
							@click="handleAddPointInGroup(group)"
						>
							新增點位
						</PermissionActionButton>
					</div>
				</div>

				<div v-show="isExpanded(group.key)" class="space-y-2 p-2">
					<div
						v-for="item in group.items"
						:key="getStableItemKey(item)"
						class="flex min-w-0 items-start gap-2 rounded border border-white/10 bg-white/[0.04] p-2"
					>
						<div class="min-w-0 flex-1">
							<FireLocationFields
								:location="item.loc"
								:group-view-category="group.viewCategory"
								:all-locations="locations"
								:current-index="item.globalIndex"
								:devices="devices"
								:is-loading-devices="isLoadingDevices"
								@update="handleLocationUpdate(item.globalIndex, $event)"
							/>
						</div>

						<div v-if="reorderableLocations" class="btn-reorder-stack self-start">
							<button
								type="button"
								class="btn-reorder-arrow"
								:disabled="item.globalIndex === 0"
								title="上移"
								aria-label="此點位上移"
								@click="handleReorderLocation(item.globalIndex, 'up')"
							>
								↑
							</button>
							<button
								type="button"
								class="btn-reorder-arrow"
								:disabled="item.globalIndex >= locations.length - 1"
								title="下移"
								aria-label="此點位下移"
								@click="handleReorderLocation(item.globalIndex, 'down')"
							>
								↓
							</button>
						</div>

						<IconTrashButton
					:disabled="!allowDeleteLocation"
							button-class="ml-auto flex-shrink-0"
							title="刪除點位"
							aria-label="刪除此點位"
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
import { reactive, watch } from "vue"
import IconTrashButton from "~/components/common/IconTrashButton.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"

import { getFireViewCategoryDisplayLabel, type FireZone, type FireLocation } from "~/types/fire"
import type { Device } from "~/types/device"
import FireLocationFields from "../LocationFormFields/FireLocationFields.vue"
import { useToast } from "~/composables/core/useToast"
import { getLocationUiKey } from "~/utils/locationUiId"

const EMPTY_KEY = "__empty__"

interface GroupRow {
	key: string
	viewCategory: string
	displayLabel: string
	items: { loc: FireLocation; globalIndex: number }[]
}

interface DraftCategory {
	id: string
	name: string
}

interface Props {
	zone: FireZone
	devices: Device[]
	isLoadingDevices: boolean
	deviceHint?: string
	reorderableLocations?: boolean
	allowCreateLocation?: boolean
	allowDeleteLocation?: boolean
}

interface Emits {
	(e: "add-location", payload?: { viewCategory?: string }): void
	(e: "remove-location", index: number): void
	(e: "update-location", index: number, location: FireLocation): void
	(e: "rename-view-category", payload: { oldCategory: string; newCategory: string }): void
	(e: "reorder-location", payload: { index: number; direction: "up" | "down" }): void
	(
		e: "reorder-view-category-block",
		payload: { categoryKey: string; direction: "up" | "down" }
	): void
}

const props = withDefaults(defineProps<Props>(), {
	allowCreateLocation: true,
	allowDeleteLocation: true,
	deviceHint: "請先在「設備管理」中建立控制器設備",
	reorderableLocations: false,
})

const categoryPlaceholder = "例如：灑水、泡沫、消防"

const emit = defineEmits<Emits>()
const toast = useToast()

const draftCategories = ref<DraftCategory[]>([])
const categoryLabels = reactive<Record<string, string>>({})

const expandedByKey = reactive<Record<string, boolean>>({})
const draftExpandedById = reactive<Record<string, boolean>>({})

const locations = computed(() => props.zone.locations || [])

const normalizeCategory = (loc: FireLocation) => (loc.viewCategory ?? "").trim()

const groupedLocations = computed((): GroupRow[] => {
	const map = new Map<string, GroupRow>()
	const keyOrder: string[] = []
	locations.value.forEach((loc, globalIndex) => {
		const raw = normalizeCategory(loc)
		const key = raw === "" ? EMPTY_KEY : raw
		const displayLabel = getFireViewCategoryDisplayLabel(raw)
		if (!map.has(key)) {
			map.set(key, { key, viewCategory: raw, displayLabel, items: [] })
			keyOrder.push(key)
		}
		map.get(key)!.items.push({ loc, globalIndex })
	})
	const orderedKeys = keyOrder.filter((k) => k !== EMPTY_KEY)
	if (keyOrder.includes(EMPTY_KEY)) orderedKeys.push(EMPTY_KEY)
	return orderedKeys.map((k) => map.get(k)!)
})

const handleReorderLocation = (globalIndex: number, direction: "up" | "down") => {
	emit("reorder-location", { index: globalIndex, direction })
}

const handleReorderCategoryBlock = (group: GroupRow, direction: "up" | "down") => {
	emit("reorder-view-category-block", { categoryKey: group.key, direction })
}

const isFirstGroupedCategory = (group: GroupRow) => {
	const i = groupedLocations.value.findIndex((g) => g.key === group.key)
	return i <= 0
}

const isLastGroupedCategory = (group: GroupRow) => {
	const i = groupedLocations.value.findIndex((g) => g.key === group.key)
	return i < 0 || i >= groupedLocations.value.length - 1
}

const moveDraftCategory = (draftId: string, direction: "up" | "down") => {
	const i = draftCategories.value.findIndex((d) => d.id === draftId)
	const j = direction === "up" ? i - 1 : i + 1
	if (i < 0 || j < 0 || j >= draftCategories.value.length) return
	const next = [...draftCategories.value]
	;[next[i], next[j]] = [next[j]!, next[i]!]
	draftCategories.value = next
}

watch(
	() => groupedLocations.value,
	(groups) => {
		const valid = new Set(groups.map((g) => g.key))
		for (const k of Object.keys(categoryLabels)) {
			if (!valid.has(k)) delete categoryLabels[k]
		}
		for (const g of groups) {
			if (categoryLabels[g.key] === undefined) {
				categoryLabels[g.key] = g.viewCategory
			}
			if (expandedByKey[g.key] === undefined) {
				expandedByKey[g.key] = true
			}
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

watch(
	() => draftCategories.value.map((d) => d.id),
	(ids) => {
		for (const id of ids) {
			if (draftExpandedById[id] === undefined) draftExpandedById[id] = true
		}
	},
	{ immediate: true }
)

const getStableItemKey = (item: { loc: FireLocation; globalIndex: number }) =>
	getLocationUiKey({
		zone: props.zone as any,
		location: item.loc as any,
		locationIndex: item.globalIndex,
	})

const handleAddDraftCategory = () => {
	const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
	draftCategories.value.unshift({ id, name: "" })
	draftExpandedById[id] = true
}

const removeDraft = (id: string) => {
	const i = draftCategories.value.findIndex((d) => d.id === id)
	if (i !== -1) draftCategories.value.splice(i, 1)
	delete draftExpandedById[id]
}

const handleAddPointInDraft = (draft: DraftCategory) => {
	const name = draft.name.trim()
	if (!name) {
		toast.error(TOAST.VIEW_CATEGORY_NAME_REQUIRED)
		return
	}
	emit("add-location", { viewCategory: name })
	removeDraft(draft.id)
	expandedByKey[name] = true
}

const handleAddPointInGroup = (group: GroupRow) => {
	emit("add-location", { viewCategory: group.viewCategory })
	expandedByKey[group.key] = true
}

const commitGroupRename = (group: GroupRow) => {
	const nextName = (categoryLabels[group.key] ?? "").trim()
	const prev = group.viewCategory.trim()
	if (nextName === prev) return

	if (group.key !== EMPTY_KEY && nextName === "") {
		toast.error(TOAST.VIEW_CATEGORY_NAME_BLANK)
		categoryLabels[group.key] = group.viewCategory
		return
	}

	if (group.key === EMPTY_KEY && nextName === "") return

	emit("rename-view-category", { oldCategory: group.viewCategory, newCategory: nextName })

	const wasOpen = isExpanded(group.key)
	const newExpandKey = group.key === EMPTY_KEY ? nextName : nextName
	if (newExpandKey !== group.key) {
		expandedByKey[newExpandKey] = wasOpen
		delete expandedByKey[group.key]
	}
}

const handleRemoveLocation = (locationIndex: number) => {
	emit("remove-location", locationIndex)
}

const handleLocationUpdate = (locationIndex: number, updatedLocation: FireLocation) => {
	emit("update-location", locationIndex, updatedLocation)
}
</script>
