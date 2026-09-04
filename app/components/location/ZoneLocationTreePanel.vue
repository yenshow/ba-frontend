<template>
	<aside class="col-span-12 flex max-h-64 min-h-0 flex-col lg:col-span-4 lg:max-h-none">
		<div
			class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5"
		>
			<div class="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 2xl:px-4">
				<span class="text-sm font-medium text-white/85 2xl:text-base">區域</span>
				<div class="flex shrink-0 items-center gap-1">
					<PermissionActionButton
						v-if="groupMode !== 'none'"
						:allowed="props.allowCreateLocation"
						class="rounded-lg px-2.5 py-1 text-xs text-cyan-200/90 transition-colors enabled:hover:bg-white/10 enabled:hover:text-white 2xl:px-3 2xl:text-sm"
						:aria-label="addGroupAriaLabel"
						:disabled="!selectedZoneId"
						@click="handleAddDraftGroup"
					>
						{{ addGroupButtonLabel }}
					</PermissionActionButton>
					<PermissionActionButton
						:allowed="props.allowCreateZone"
						class="rounded-lg px-2.5 py-1 text-xs text-cyan-200/90 transition-colors enabled:hover:bg-white/10 enabled:hover:text-white 2xl:px-3 2xl:text-sm"
						aria-label="新增區域"
						@click="handleAddZone"
					>
						＋ 區域
					</PermissionActionButton>
				</div>
			</div>

			<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-2.5 2xl:p-3">
				<div
					v-if="zones.length === 0"
					class="py-10 text-center text-sm text-white/60 2xl:text-base"
				>
					尚無區域，請新增區域
				</div>
				<ul v-else class="space-y-2.5" role="tree" aria-label="區域地點樹">
					<li
						v-for="zone in zones"
						:key="getZoneId(zone)"
						class="group/zone overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-all"
						:class="[
							isNewZone(zone) ? 'border-amber-400/60 bg-amber-500/10' : '',
							rowDragClass(zoneDragKey(getZoneId(zone))),
						]"
						role="treeitem"
						:aria-expanded="expandedZoneIds.has(getZoneId(zone))"
						@dragover="(e) => handleDragOver(e, zoneDragKey(getZoneId(zone)))"
						@dragleave="handleDragLeave(zoneDragKey(getZoneId(zone)))"
						@drop="
							(e) =>
								handleDrop(e, zoneDragKey(getZoneId(zone)), (from, to) =>
									emitZoneReorder(from, to)
								)
						"
					>
						<div class="flex items-center gap-1 px-2 py-2">
							<button
								v-if="reorderable"
								type="button"
								class="export-field-drag-handle shrink-0"
								:draggable="true"
								:aria-label="`拖曳調整區域順序：${zone.name || '未命名'}`"
								@click.stop
								@dragstart="(e) => handleDragStart(e, zoneDragKey(getZoneId(zone)))"
								@dragend="handleDragEnd"
							>
								<span aria-hidden="true">⋮⋮</span>
							</button>

							<button
								type="button"
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/10 hover:text-white/90"
								:aria-label="
									expandedZoneIds.has(getZoneId(zone))
										? `收合 ${zone.name || '區域'}`
										: `展開 ${zone.name || '區域'}`
								"
								@click="toggleZoneExpanded(getZoneId(zone))"
							>
								<svg
									class="h-3.5 w-3.5 transition-transform duration-200"
									:class="{ 'rotate-90': expandedZoneIds.has(getZoneId(zone)) }"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</button>

							<button
								type="button"
								class="flex min-w-0 flex-1 items-center gap-2 text-left"
								:aria-label="`選取區域：${zone.name || '未命名'}`"
								:aria-current="isZoneSelected(getZoneId(zone)) ? 'true' : undefined"
								@click="emit('select', buildZoneSelectionKey(getZoneId(zone)))"
							>
								<span
									class="min-w-0 flex-1 truncate text-sm 2xl:text-base"
									:class="
										isZoneSelected(getZoneId(zone))
											? 'font-semibold text-white'
											: 'text-white/85'
									"
								>
									{{ zone.name || "未命名" }}
								</span>
								<span
									class="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs tabular-nums text-white/55 2xl:text-sm"
								>
									{{ countLocations(zone) }}
								</span>
							</button>

							<IconTrashButton
								:allowed="props.allowDeleteZone"
								class="shrink-0 opacity-70 transition-opacity group-hover/zone:opacity-100"
								title="刪除區域"
								:aria-label="`刪除區域 ${zone.name || '未命名'}`"
								@click="emit('delete-zone', getZoneId(zone))"
							/>
						</div>

						<div
							v-if="expandedZoneIds.has(getZoneId(zone))"
							class="border-t border-white/10 px-2 pb-2 pt-1.5"
							role="group"
						>
							<template v-if="groupMode !== 'none'">
								<div
									v-for="draft in draftsForZone(getZoneId(zone))"
									:key="draft.id"
									class="mb-2 overflow-hidden rounded-lg border border-amber-400/40 bg-amber-500/10"
								>
									<div class="flex flex-wrap items-center gap-2 px-2 py-2">
										<input
											v-model="draft.name"
											type="text"
											class="form-input-small min-w-0 flex-1 text-sm 2xl:text-base"
											:placeholder="groupNamePlaceholder"
											:aria-label="groupNamePlaceholder"
										/>
										<PermissionActionButton
											:allowed="props.allowCreateLocation"
											class="btn-secondary text-sm 2xl:text-base"
											:aria-label="`新增${locationLabel}`"
											@click="handleAddFromDraft(getZoneId(zone), draft)"
										>
											新增{{ locationLabel }}
										</PermissionActionButton>
										<IconTrashButton
											:allowed="props.allowDeleteLocation"
											:title="`移除此${groupNoun}`"
											:aria-label="`移除此${groupNoun}草稿`"
											@click="removeDraft(getZoneId(zone), draft.id)"
										/>
									</div>
								</div>

								<div
									v-for="group in groupsForZone(zone)"
									:key="group.key"
									class="mb-2 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]"
									:class="rowDragClass(groupDragKey(getZoneId(zone), group.key))"
									@dragover="
										(e) => handleDragOver(e, groupDragKey(getZoneId(zone), group.key))
									"
									@dragleave="handleDragLeave(groupDragKey(getZoneId(zone), group.key))"
									@drop="
										(e) =>
											handleDrop(e, groupDragKey(getZoneId(zone), group.key), (from, to) =>
												emitGroupReorder(getZoneId(zone), from, to)
											)
									"
								>
									<div class="flex flex-wrap items-center gap-1 px-2 py-2">
										<button
											v-if="reorderable"
											type="button"
											class="export-field-drag-handle shrink-0"
											:draggable="true"
											:aria-label="`拖曳調整${groupNoun}順序`"
											@click.stop
											@dragstart="
												(e) => handleDragStart(e, groupDragKey(getZoneId(zone), group.key))
											"
											@dragend="handleDragEnd"
										>
											<span aria-hidden="true">⋮⋮</span>
										</button>
										<button
											type="button"
											class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/10 hover:text-white/90"
											:aria-expanded="
												isGroupExpanded(groupExpandKey(getZoneId(zone), group.key))
											"
											aria-label="展開或收合"
											@click="toggleGroup(groupExpandKey(getZoneId(zone), group.key))"
										>
											<svg
												class="h-3.5 w-3.5 transition-transform duration-200 2xl:h-4 2xl:w-4"
												:class="{
													'rotate-90': isGroupExpanded(
														groupExpandKey(getZoneId(zone), group.key)
													),
												}"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 5l7 7-7 7"
												/>
											</svg>
										</button>
										<input
											v-model="groupLabels[groupExpandKey(getZoneId(zone), group.key)]"
											type="text"
											class="form-input-small min-w-0 flex-1 text-sm text-white 2xl:text-base"
											:placeholder="
												group.key === LOCATION_GROUP_EMPTY_KEY ? '未分類' : groupNamePlaceholder
											"
											:aria-label="`${groupNoun}：${group.displayLabel}`"
											@blur="commitGroupRename(getZoneId(zone), group)"
										/>
										<span
											class="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs tabular-nums text-white/55 2xl:text-sm"
										>
											{{ group.items.length }}
										</span>
									</div>

									<div
										v-show="isGroupExpanded(groupExpandKey(getZoneId(zone), group.key))"
										class="border-t border-white/10 px-1.5 pb-1.5 pt-1"
									>
										<p
											v-if="group.items.length === 0"
											class="px-2 py-2 text-xs text-white/45 2xl:text-sm"
										>
											尚無{{ locationLabel }}
										</p>
										<ul v-else class="space-y-1" role="group">
											<li
												v-for="item in group.items"
												:key="`${getZoneId(zone)}-${item.globalIndex}`"
												class="group/loc flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors"
												:class="[
													isLocationSelected(getZoneId(zone), item.globalIndex)
														? 'bg-cyan-500/25 ring-1 ring-cyan-400/35'
														: 'hover:bg-white/[0.06]',
													rowDragClass(locDragKey(getZoneId(zone), item.globalIndex)),
												]"
												@dragover="
													(e) =>
														handleDragOver(e, locDragKey(getZoneId(zone), item.globalIndex))
												"
												@dragleave="
													handleDragLeave(locDragKey(getZoneId(zone), item.globalIndex))
												"
												@drop="
													(e) =>
														handleDrop(
															e,
															locDragKey(getZoneId(zone), item.globalIndex),
															(from, to) => emitLocReorder(getZoneId(zone), from, to)
														)
												"
											>
												<button
													v-if="reorderable"
													type="button"
													class="export-field-drag-handle shrink-0"
													:draggable="true"
													:aria-label="`拖曳調整${locationLabel}順序`"
													@click.stop
													@dragstart="
														(e) =>
															handleDragStart(
																e,
																locDragKey(getZoneId(zone), item.globalIndex)
															)
													"
													@dragend="handleDragEnd"
												>
													<span aria-hidden="true">⋮⋮</span>
												</button>
												<button
													type="button"
													class="min-w-0 flex-1 truncate text-left text-sm 2xl:text-base"
													:class="
														isLocationSelected(getZoneId(zone), item.globalIndex)
															? 'font-semibold text-white'
															: 'text-white/85'
													"
													:aria-label="`選取${locationLabel}：${getLocationName(item.loc)}`"
													:aria-current="
														isLocationSelected(getZoneId(zone), item.globalIndex)
															? 'true'
															: undefined
													"
													@click="
														emit(
															'select',
															buildLocationSelectionKey(getZoneId(zone), item.globalIndex)
														)
													"
												>
													{{ getLocationName(item.loc) }}
												</button>
												<IconTrashButton
													:allowed="props.allowDeleteLocation"
													class="shrink-0 opacity-0 transition-opacity group-hover/loc:opacity-100"
													:title="`刪除${locationLabel}`"
													:aria-label="`刪除此${locationLabel}`"
													@click="
														emit('remove-location', getZoneId(zone), item.globalIndex)
													"
												/>
											</li>
										</ul>
										<button
											v-if="
												props.allowCreateLocation && group.key !== LOCATION_GROUP_EMPTY_KEY
											"
											type="button"
											class="mt-1.5 flex w-full items-center rounded-lg px-2 py-2 text-left text-xs text-white/55 transition-colors hover:bg-white/[0.04] hover:text-cyan-200/90 2xl:text-sm"
											:aria-label="`新增${locationLabel}`"
											@click="handleAddInGroup(getZoneId(zone), group)"
										>
											＋ 新增{{ locationLabel }}
										</button>
									</div>
								</div>

								<p
									v-if="
										groupsForZone(zone).length === 0 &&
										draftsForZone(getZoneId(zone)).length === 0
									"
									class="px-2 py-2 text-xs text-white/45 2xl:text-sm"
								>
									請先「{{ addGroupButtonLabel }}」後再新增{{ locationLabel }}
								</p>
							</template>

							<template v-else>
								<p
									v-if="flatEntriesForZone(zone).length === 0"
									class="px-2 py-2 text-xs text-white/45 2xl:text-sm"
								>
									尚無{{ locationLabel }}
								</p>
								<ul v-else class="space-y-1" role="group">
									<li
										v-for="entry in flatEntriesForZone(zone)"
										:key="`${getZoneId(zone)}-${entry.index}`"
										class="group/loc flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors"
										:class="[
											isLocationSelected(getZoneId(zone), entry.index)
												? 'bg-cyan-500/25 ring-1 ring-cyan-400/35'
												: 'hover:bg-white/[0.06]',
											rowDragClass(locDragKey(getZoneId(zone), entry.index)),
										]"
										@dragover="(e) => handleDragOver(e, locDragKey(getZoneId(zone), entry.index))"
										@dragleave="handleDragLeave(locDragKey(getZoneId(zone), entry.index))"
										@drop="
											(e) =>
												handleDrop(e, locDragKey(getZoneId(zone), entry.index), (from, to) =>
													emitLocReorder(getZoneId(zone), from, to)
												)
										"
									>
										<button
											v-if="reorderable"
											type="button"
											class="export-field-drag-handle shrink-0"
											:draggable="true"
											:aria-label="`拖曳調整${locationLabel}順序`"
											@click.stop
											@dragstart="
												(e) => handleDragStart(e, locDragKey(getZoneId(zone), entry.index))
											"
											@dragend="handleDragEnd"
										>
											<span aria-hidden="true">⋮⋮</span>
										</button>
										<button
											type="button"
											class="min-w-0 flex-1 truncate text-left text-sm 2xl:text-base"
											:class="
												isLocationSelected(getZoneId(zone), entry.index)
													? 'font-semibold text-white'
													: 'text-white/85'
											"
											:aria-label="`選取${locationLabel}：${getLocationName(entry.loc)}`"
											:aria-current="
												isLocationSelected(getZoneId(zone), entry.index) ? 'true' : undefined
											"
											@click="
												emit('select', buildLocationSelectionKey(getZoneId(zone), entry.index))
											"
										>
											{{ getLocationName(entry.loc) }}
										</button>
										<IconTrashButton
											:allowed="props.allowDeleteLocation"
											class="shrink-0 opacity-0 transition-opacity group-hover/loc:opacity-100"
											:title="`刪除${locationLabel}`"
											:aria-label="`刪除此${locationLabel}`"
											@click="emit('remove-location', getZoneId(zone), entry.index)"
										/>
									</li>
								</ul>
								<button
									v-if="props.allowCreateLocation"
									type="button"
									class="mt-1.5 flex w-full items-center rounded-lg px-2 py-2 text-left text-xs text-white/55 transition-colors hover:bg-white/[0.04] hover:text-cyan-200/90 2xl:text-sm"
									:aria-label="`新增${locationLabel}`"
									@click="handleAddLocation(getZoneId(zone))"
								>
									＋ 新增{{ locationLabel }}
								</button>
							</template>
						</div>
					</li>
				</ul>
			</div>
		</div>
	</aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { TOAST } from "~/config/toastCatalog"
import IconTrashButton from "~/components/common/IconTrashButton.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import type { SystemType } from "~/types/location"
import { useToast } from "~/composables/core/useToast"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import { filterPeopleCountingZoneLocations } from "~/utils/peopleCountingDataSource"
import { filterVehicleAccessZoneLocations } from "~/utils/vehicleAccessDataSource"
import { getZoneUiKey } from "~/utils/locationUiId"
import { useKeyDragReorder } from "~/composables/location/ui/useKeyDragReorder"
import {
	LOCATION_GROUP_EMPTY_KEY,
	buildLocationSelectionKey,
	buildZoneSelectionKey,
	getLocationGroupMode,
	groupLocationsByMode,
	parseZoneTreeSelectionKey,
	useLocationGroupDrafts,
	type LocationGroupDraft,
	type LocationGroupRow,
} from "~/composables/location/ui/useLocationGroupTree"

interface Props {
	zones: Array<{ id?: string; name?: string; locations?: unknown[] }>
	systemType: SystemType
	selectedKey: string | null
	locationLabel: string
	allowCreateZone?: boolean
	allowCreateLocation?: boolean
	allowDeleteLocation?: boolean
	allowDeleteZone?: boolean
	reorderable?: boolean
}

interface Emits {
	(e: "select", key: string): void
	(e: "add-zone"): void
	(e: "delete-zone", zoneId: string): void
	(e: "reorder-zone", payload: { fromZoneId: string; toZoneId: string }): void
	(e: "add-location", zoneId: string, payload?: { viewCategory?: string; floor?: string }): void
	(e: "remove-location", zoneId: string, index: number): void
	(e: "reorder-location", payload: { zoneId: string; fromIndex: number; toIndex: number }): void
	(
		e: "reorder-group-block",
		payload: { zoneId: string; fromCategoryKey: string; toCategoryKey: string }
	): void
	(
		e: "rename-view-category",
		payload: { zoneId: string; oldCategory: string; newCategory: string }
	): void
	(e: "rename-floor", payload: { zoneId: string; oldFloor: string; newFloor: string }): void
}

const props = withDefaults(defineProps<Props>(), {
	allowCreateZone: true,
	allowCreateLocation: true,
	allowDeleteLocation: true,
	allowDeleteZone: true,
	reorderable: true,
})

const emit = defineEmits<Emits>()
const toast = useToast()
const { enableYscpPeopleCounting, enableYscpVehicleAccess } = useModuleRegistry()

const {
	handleDragStart,
	handleDragEnd,
	handleDragOver,
	handleDragLeave,
	handleDrop,
	rowDragClass,
} = useKeyDragReorder({ disabled: () => !props.reorderable })

const groupMode = computed(() => getLocationGroupMode(props.systemType))
const selection = computed(() => parseZoneTreeSelectionKey(props.selectedKey))

const selectedZoneId = computed(() => selection.value?.zoneId ?? null)

const expandedZoneIds = ref(new Set<string>())

const {
	draftsByZone,
	groupLabels,
	addDraft,
	removeDraft,
	clearAllDrafts,
	isGroupExpanded,
	toggleGroup,
	setGroupExpanded,
} = useLocationGroupDrafts()

const groupNoun = computed(() => (groupMode.value === "floor" ? "樓層" : "分類"))
const addGroupButtonLabel = computed(() =>
	groupMode.value === "floor" ? "＋ 樓層" : "＋ 分類"
)
const addGroupAriaLabel = computed(() =>
	groupMode.value === "floor" ? "新增樓層" : "新增分類"
)
const groupNamePlaceholder = computed(() =>
	groupMode.value === "floor" ? "例如：1F、2F、B1" : "例如：備援、主機房"
)

const zoneDragKey = (zoneId: string) => `zone:${zoneId}`
const locDragKey = (zoneId: string, index: number) => `loc:${zoneId}:${index}`
const groupDragKey = (zoneId: string, categoryKey: string) => `grp:${zoneId}:${categoryKey}`

const parseZoneDragKey = (key: string) =>
	key.startsWith("zone:") ? key.slice("zone:".length) : null

const parseLocDragKey = (key: string) => {
	if (!key.startsWith("loc:")) return null
	const rest = key.slice("loc:".length)
	const i = rest.lastIndexOf(":")
	if (i <= 0) return null
	const zoneId = rest.slice(0, i)
	const index = Number(rest.slice(i + 1))
	if (!zoneId || !Number.isFinite(index)) return null
	return { zoneId, index }
}

const parseGroupDragKey = (key: string) => {
	if (!key.startsWith("grp:")) return null
	const rest = key.slice("grp:".length)
	const i = rest.indexOf(":")
	if (i <= 0) return null
	return { zoneId: rest.slice(0, i), categoryKey: rest.slice(i + 1) }
}

const emitZoneReorder = (fromKey: string, toKey: string) => {
	const fromZoneId = parseZoneDragKey(fromKey)
	const toZoneId = parseZoneDragKey(toKey)
	if (!fromZoneId || !toZoneId) return
	emit("reorder-zone", { fromZoneId, toZoneId })
}

const emitLocReorder = (zoneId: string, fromKey: string, toKey: string) => {
	const from = parseLocDragKey(fromKey)
	const to = parseLocDragKey(toKey)
	if (!from || !to || from.zoneId !== zoneId || to.zoneId !== zoneId) return
	emit("reorder-location", { zoneId, fromIndex: from.index, toIndex: to.index })
}

const emitGroupReorder = (zoneId: string, fromKey: string, toKey: string) => {
	const from = parseGroupDragKey(fromKey)
	const to = parseGroupDragKey(toKey)
	if (!from || !to || from.zoneId !== zoneId || to.zoneId !== zoneId) return
	emit("reorder-group-block", {
		zoneId,
		fromCategoryKey: from.categoryKey,
		toCategoryKey: to.categoryKey,
	})
}

const getZoneId = (zone: { id?: string }) => getZoneUiKey(zone as any)

const isNewZone = (zone: { id?: string }) => Boolean(getZoneId(zone)?.startsWith("temp-"))

const isZoneSelected = (zoneId: string) =>
	selection.value?.type === "zone" && selection.value.zoneId === zoneId

const isLocationSelected = (zoneId: string, index: number) =>
	selection.value?.type === "location" &&
	selection.value.zoneId === zoneId &&
	selection.value.index === index

const getLocationName = (loc: unknown) => {
	const name = (loc as { name?: string })?.name
	return name?.trim() || "未命名"
}

const groupExpandKey = (zoneId: string, groupKey: string) => `${zoneId}::${groupKey}`

const getLocationsRaw = (zone: { locations?: unknown[] }) =>
	(zone.locations || []) as Array<{
		name?: string
		viewCategory?: string
		floor?: string
		dataSource?: string
	}>

const getVisibleLocationEntries = (zone: { locations?: unknown[] }) => {
	const locs = getLocationsRaw(zone)
	if (props.systemType === "people_counting") {
		return filterPeopleCountingZoneLocations(locs as any, enableYscpPeopleCounting.value)
	}
	if (props.systemType === "vehicle_access") {
		return filterVehicleAccessZoneLocations(locs as any, enableYscpVehicleAccess.value)
	}
	return locs.map((location, locationIndex) => ({ location, locationIndex }))
}

const flatEntriesForZone = (zone: { locations?: unknown[] }) =>
	getVisibleLocationEntries(zone).map((entry) => ({
		loc: entry.location,
		index: entry.locationIndex,
	}))

const countLocations = (zone: { locations?: unknown[] }) =>
	getVisibleLocationEntries(zone).length

const groupsForZone = (zone: { locations?: unknown[] }): LocationGroupRow[] => {
	if (groupMode.value === "none") return []
	return groupLocationsByMode(getLocationsRaw(zone), groupMode.value)
}

const draftsForZone = (zoneId: string): LocationGroupDraft[] => draftsByZone[zoneId] ?? []

watch(
	() => props.selectedKey,
	(key) => {
		const sel = parseZoneTreeSelectionKey(key)
		if (!sel) return
		expandedZoneIds.value.add(sel.zoneId)
		expandedZoneIds.value = new Set(expandedZoneIds.value)
	},
	{ immediate: true }
)

watch(
	() => {
		if (groupMode.value === "none") return [] as Array<{ key: string; value: string }>
		return props.zones.flatMap((z) => {
			const zoneId = getZoneId(z)
			return groupsForZone(z).map((g) => ({
				key: groupExpandKey(zoneId, g.key),
				value: g.value,
			}))
		})
	},
	(entries) => {
		const valid = new Set(entries.map((e) => e.key))
		for (const k of Object.keys(groupLabels)) {
			if (!valid.has(k)) delete groupLabels[k]
		}
		for (const e of entries) {
			if (groupLabels[e.key] === undefined) groupLabels[e.key] = e.value
		}
	},
	{ immediate: true, deep: true }
)

const toggleZoneExpanded = (zoneId: string) => {
	if (expandedZoneIds.value.has(zoneId)) expandedZoneIds.value.delete(zoneId)
	else expandedZoneIds.value.add(zoneId)
	expandedZoneIds.value = new Set(expandedZoneIds.value)
}

const handleAddZone = () => {
	emit("add-zone")
}

const handleAddLocation = (zoneId: string) => {
	emit("add-location", zoneId)
	expandedZoneIds.value.add(zoneId)
	expandedZoneIds.value = new Set(expandedZoneIds.value)
}

const handleAddDraftGroup = () => {
	const zoneId = selectedZoneId.value
	if (!zoneId) return
	addDraft(zoneId)
	expandedZoneIds.value.add(zoneId)
	expandedZoneIds.value = new Set(expandedZoneIds.value)
}

const handleAddFromDraft = (zoneId: string, draft: LocationGroupDraft) => {
	const name = draft.name.trim()
	if (!name) {
		toast.error(
			groupMode.value === "floor"
				? TOAST.ACCESS_SECURITY_FLOOR_NAME_REQUIRED
				: TOAST.VIEW_CATEGORY_NAME_REQUIRED
		)
		return
	}
	if (groupMode.value === "floor") emit("add-location", zoneId, { floor: name })
	else emit("add-location", zoneId, { viewCategory: name })
	removeDraft(zoneId, draft.id)
	setGroupExpanded(groupExpandKey(zoneId, name), true)
}

const handleAddInGroup = (zoneId: string, group: LocationGroupRow) => {
	if (groupMode.value === "floor") emit("add-location", zoneId, { floor: group.value })
	else emit("add-location", zoneId, { viewCategory: group.value })
	setGroupExpanded(groupExpandKey(zoneId, group.key), true)
}

const commitGroupRename = (zoneId: string, group: LocationGroupRow) => {
	const labelKey = groupExpandKey(zoneId, group.key)
	const nextName = (groupLabels[labelKey] ?? "").trim()
	const prev = group.value.trim()
	if (nextName === prev) return

	if (group.key !== LOCATION_GROUP_EMPTY_KEY && nextName === "") {
		toast.error(
			groupMode.value === "floor"
				? TOAST.ACCESS_SECURITY_FLOOR_NAME_BLANK
				: TOAST.VIEW_CATEGORY_NAME_BLANK
		)
		groupLabels[labelKey] = group.value
		return
	}
	if (group.key === LOCATION_GROUP_EMPTY_KEY && nextName === "") return

	if (groupMode.value === "floor") {
		emit("rename-floor", { zoneId, oldFloor: group.value, newFloor: nextName })
	} else {
		emit("rename-view-category", {
			zoneId,
			oldCategory: group.value,
			newCategory: nextName,
		})
	}

	const wasOpen = isGroupExpanded(labelKey)
	const newKey = groupExpandKey(zoneId, nextName || LOCATION_GROUP_EMPTY_KEY)
	if (newKey !== labelKey) {
		setGroupExpanded(newKey, wasOpen)
		delete groupLabels[labelKey]
		groupLabels[newKey] = nextName
	}
}

const expandZone = (zoneId: string) => {
	expandedZoneIds.value.add(zoneId)
	expandedZoneIds.value = new Set(expandedZoneIds.value)
}

defineExpose({
	clearAllDrafts,
	expandZone,
})
</script>
