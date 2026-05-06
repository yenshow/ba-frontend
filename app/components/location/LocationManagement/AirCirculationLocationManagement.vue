<template>
	<div class="space-y-3">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<span class="text-base font-medium 2xl:text-lg">點位列表</span>
			</div>
			<button
				type="button"
				class="btn-secondary shrink-0 text-sm 2xl:text-base"
				@click="handleAddDraftCategory"
			>
				新增分類
			</button>
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
								placeholder="例如：送風、排風、導流風機"
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
						<button
							type="button"
							class="btn-secondary text-xs 2xl:text-sm"
							@click="handleAddPointInDraft(draft)"
						>
							新增點位
						</button>
						<button
							type="button"
							class="p-2 text-rose-400 hover:text-rose-300"
							title="移除此分類"
							aria-label="移除此分類草稿"
							@click="removeDraft(draft.id)"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</button>
					</div>
				</div>

				<div
					v-show="isDraftExpanded(draft.id)"
					class="px-3 py-4 text-center text-sm text-white/50 2xl:text-base"
				>
					輸入分類名稱後，按「新增點位」加入第一個點位
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
						<button
							v-if="group.key !== EMPTY_KEY"
							type="button"
							class="btn-secondary text-xs 2xl:text-sm"
							@click="handleAddPointInGroup(group)"
						>
							新增點位
						</button>
					</div>
				</div>

				<div v-show="isExpanded(group.key)" class="space-y-2 p-2">
					<div
						v-for="item in group.items"
						:key="getStableItemKey(item)"
						class="flex min-w-0 items-start gap-2 rounded border border-white/10 bg-white/[0.04] p-2"
					>
						<div class="min-w-0 flex-1">
							<AirCirculationLocationFields
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

						<button
							type="button"
							class="ml-auto flex-shrink-0 p-2 text-rose-400 transition-colors hover:text-rose-300"
							@click="handleRemoveLocation(item.globalIndex)"
							title="刪除點位"
							aria-label="刪除此點位"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</button>
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
import { computed, reactive, ref, watch } from "vue"
import type { AirCirculationZone, AirCirculationLocation } from "~/types/air-circulation"
import { getAirCirculationViewCategoryDisplayLabel } from "~/types/air-circulation"
import type { Device } from "~/types/device"
import AirCirculationLocationFields from "../LocationFormFields/AirCirculationLocationFields.vue"
import { getLocationUiKey } from "~/utils/locationUiId"
import { useToast } from "~/composables/core/useToast"

const EMPTY_KEY = "__empty__"

interface GroupRow {
	key: string
	viewCategory: string
	displayLabel: string
	items: { loc: AirCirculationLocation; globalIndex: number }[]
}

interface DraftCategory {
	id: string
	name: string
}

interface Props {
	zone: AirCirculationZone
	devices: Device[]
	isLoadingDevices: boolean
	deviceHint?: string
	reorderableLocations?: boolean
}

interface Emits {
	(e: "add-location", payload?: { viewCategory?: string }): void
	(e: "remove-location", index: number): void
	(e: "update-location", index: number, location: AirCirculationLocation): void
	(e: "reorder-location", payload: { index: number; direction: "up" | "down" }): void
	(e: "rename-view-category", payload: { oldCategory: string; newCategory: string }): void
	(
		e: "reorder-view-category-block",
		payload: { categoryKey: string; direction: "up" | "down" }
	): void
}

const props = withDefaults(defineProps<Props>(), {
	deviceHint: "請先在「設備管理」中建立控制器設備",
	reorderableLocations: false,
})

const emit = defineEmits<Emits>()
const toast = useToast()

const locations = computed(() => props.zone.locations || [])

const draftCategories = ref<DraftCategory[]>([])
const categoryLabels = reactive<Record<string, string>>({})

const expandedByKey = reactive<Record<string, boolean>>({})
const draftExpandedById = reactive<Record<string, boolean>>({})

const normalizeCategory = (loc: AirCirculationLocation) => (loc.viewCategory ?? "").trim()

/** 分組順序依 zone.locations（後端 sort_order）首次出現分類的順序；未分類置於最後 */
const groupedLocations = computed((): GroupRow[] => {
	const map = new Map<string, GroupRow>()
	const keyOrder: string[] = []
	locations.value.forEach((loc, globalIndex) => {
		const raw = normalizeCategory(loc)
		const key = raw === "" ? EMPTY_KEY : raw
		const displayLabel = getAirCirculationViewCategoryDisplayLabel(raw)
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

watch(
	() => groupedLocations.value,
	(groups) => {
		const valid = new Set(groups.map((g) => g.key))
		for (const k of Object.keys(categoryLabels)) {
			if (!valid.has(k)) delete categoryLabels[k]
		}
		for (const g of groups) {
			if (categoryLabels[g.key] === undefined) categoryLabels[g.key] = g.viewCategory
			if (expandedByKey[g.key] === undefined) expandedByKey[g.key] = true
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

const getStableItemKey = (item: { loc: AirCirculationLocation; globalIndex: number }) =>
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

const moveDraftCategory = (draftId: string, direction: "up" | "down") => {
	const i = draftCategories.value.findIndex((d) => d.id === draftId)
	const j = direction === "up" ? i - 1 : i + 1
	if (i < 0 || j < 0 || j >= draftCategories.value.length) return
	const next = [...draftCategories.value]
	;[next[i], next[j]] = [next[j]!, next[i]!]
	draftCategories.value = next
}

const handleAddPointInDraft = (draft: DraftCategory) => {
	const name = draft.name.trim()
	if (!name) {
		toast.error("請先輸入檢視分類名稱")
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
		toast.error("分類名稱不可為空白")
		categoryLabels[group.key] = group.viewCategory
		return
	}

	if (group.key === EMPTY_KEY && nextName === "") return

	emit("rename-view-category", { oldCategory: group.viewCategory, newCategory: nextName })

	const wasOpen = isExpanded(group.key)
	const newExpandKey = nextName
	if (newExpandKey !== group.key) {
		expandedByKey[newExpandKey] = wasOpen
		delete expandedByKey[group.key]
	}
}

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

const handleRemoveLocation = (locationIndex: number) => {
	emit("remove-location", locationIndex)
}

const handleLocationUpdate = (locationIndex: number, updatedLocation: AirCirculationLocation) => {
	emit("update-location", locationIndex, updatedLocation)
}
</script>
