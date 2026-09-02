<template>
	<aside
		class="col-span-12 flex min-h-0 flex-col lg:col-span-4"
		:class="panelHeightClass"
	>
		<div
			class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5"
		>
			<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-2.5">
				<div
					v-if="loading"
					class="py-10 text-center text-base text-white/60"
					role="status"
					aria-live="polite"
				>
					載入中…
				</div>
				<p v-else-if="error" class="form-error-text px-1" role="alert">{{ error }}</p>
				<div
					v-else-if="groupTree.length === 0 && !showUngrouped"
					class="py-10 text-center text-base text-white/60"
				>
					尚無群組
				</div>
				<ul v-else class="space-y-2.5" role="tree" aria-label="人員群組">
					<li
						role="treeitem"
						class="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2.5 transition-colors"
						:class="
							selectedChildId === allGroupId
								? 'bg-cyan-500/25 ring-1 ring-cyan-400/35'
								: 'hover:bg-white/[0.06]'
						"
						:aria-current="selectedChildId === allGroupId ? 'true' : undefined"
						@click="emit('select-child', allGroupId)"
					>
						<span
							class="min-w-0 flex-1 truncate text-base 2xl:text-lg"
							:class="
								selectedChildId === allGroupId
									? 'font-semibold text-white'
									: 'text-white/85'
							"
						>
							{{ allGroupName }}
						</span>
						<span
							v-if="memberCountByChildId[allGroupId] != null"
							class="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs tabular-nums text-white/55 2xl:text-sm"
						>
							{{ memberCountByChildId[allGroupId] }}
						</span>
					</li>

					<li
						v-if="showUngrouped"
						role="treeitem"
						class="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2.5 transition-colors"
						:class="
							selectedChildId === ungroupedId
								? 'bg-cyan-500/25 ring-1 ring-cyan-400/35'
								: 'hover:bg-white/[0.06]'
						"
						:aria-current="selectedChildId === ungroupedId ? 'true' : undefined"
						@click="emit('select-child', ungroupedId)"
					>
						<span
							class="min-w-0 flex-1 truncate text-base 2xl:text-lg"
							:class="
								selectedChildId === ungroupedId
									? 'font-semibold text-white'
									: 'text-white/85'
							"
						>
							{{ ungroupedName }}
						</span>
						<span
							v-if="memberCountByChildId[ungroupedId] != null"
							class="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs tabular-nums text-white/55 2xl:text-sm"
						>
							{{ memberCountByChildId[ungroupedId] }}
						</span>
					</li>

					<li
						v-for="main in groupTree"
						:key="main.id"
						class="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
						role="treeitem"
						:aria-expanded="expandedMainIds.has(main.id)"
					>
						<button
							type="button"
							class="flex w-full cursor-pointer items-center gap-1 px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
							:aria-label="
								expandedMainIds.has(main.id)
									? `收合 ${main.name}`
									: `展開 ${main.name}`
							"
							:aria-expanded="expandedMainIds.has(main.id)"
							@click="toggleMainExpanded(main.id)"
						>
							<span
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/55"
								aria-hidden="true"
							>
								<svg
									class="h-4 w-4 transition-transform duration-200 2xl:h-[1.125rem] 2xl:w-[1.125rem]"
									:class="{ 'rotate-90': expandedMainIds.has(main.id) }"
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
							</span>
							<span class="min-w-0 flex-1 truncate text-base font-medium text-white/90 2xl:text-lg">
								{{ main.name }}
							</span>
						</button>

						<div
							v-if="expandedMainIds.has(main.id)"
							class="border-t border-white/10 px-2 pb-2 pt-1.5"
						>
							<p
								v-if="(main.children || []).length === 0"
								class="px-2 py-2 text-sm text-white/45 2xl:text-base"
							>
								尚無子群組
							</p>
							<ul v-else class="space-y-0.5" role="group">
								<li
									v-for="child in main.children"
									:key="child.id"
									role="treeitem"
									class="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors"
									:class="
										selectedChildId === child.id
											? 'bg-cyan-500/25 ring-1 ring-cyan-400/35'
											: 'hover:bg-white/[0.06]'
									"
									:aria-current="selectedChildId === child.id ? 'true' : undefined"
									@click="emit('select-child', child.id)"
								>
									<span
										class="min-w-0 flex-1 truncate text-base 2xl:text-lg"
										:class="
											selectedChildId === child.id
												? 'font-semibold text-white'
												: 'text-white/85'
										"
									>
										{{ child.name }}
									</span>
									<span
										v-if="memberCountByChildId[child.id] != null"
										class="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs tabular-nums text-white/55 2xl:text-sm"
									>
										{{ memberCountByChildId[child.id] }}
									</span>
								</li>
							</ul>
						</div>
					</li>
				</ul>
			</div>
		</div>
	</aside>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import type { PersonGroup } from "~/types/personnel"
import {
	ALL_PERSON_GROUP_FILTER_ID,
	ALL_PERSON_GROUP_FILTER_NAME,
	UNGROUPED_PERSON_GROUP_ID,
	UNGROUPED_PERSON_GROUP_NAME,
} from "~/utils/personnelUtils"
import { LOCATION_MEMBERS_PANEL_HEIGHT } from "~/composables/systems/personnel/useLocationMembersStep"

const props = withDefaults(
	defineProps<{
		groupTree: PersonGroup[]
		selectedChildId: number | null
		memberCountByChildId?: Record<number, number>
		loading?: boolean
		error?: string | null
		showUngrouped?: boolean
		panelHeightClass?: string
	}>(),
	{
		panelHeightClass: LOCATION_MEMBERS_PANEL_HEIGHT,
	},
)

const emit = defineEmits<{
	"select-child": [childId: number]
}>()

const allGroupId = ALL_PERSON_GROUP_FILTER_ID
const allGroupName = ALL_PERSON_GROUP_FILTER_NAME
const ungroupedId = UNGROUPED_PERSON_GROUP_ID
const ungroupedName = UNGROUPED_PERSON_GROUP_NAME
const expandedMainIds = ref<Set<number>>(new Set())

const toggleMainExpanded = (mainId: number) => {
	const next = new Set(expandedMainIds.value)
	if (next.has(mainId)) next.delete(mainId)
	else next.add(mainId)
	expandedMainIds.value = next
}

const ensureExpandedForSelection = () => {
	if (
		props.selectedChildId == null ||
		props.selectedChildId === allGroupId ||
		props.selectedChildId === ungroupedId
	) {
		return
	}
	for (const main of props.groupTree) {
		if ((main.children || []).some((c) => c.id === props.selectedChildId)) {
			expandedMainIds.value = new Set([...expandedMainIds.value, main.id])
			return
		}
	}
}

watch(
	() => [props.groupTree, props.selectedChildId] as const,
	() => ensureExpandedForSelection(),
	{ immediate: true, deep: true },
)

watch(
	() => props.groupTree,
	(tree) => {
		if (tree.length > 0 && expandedMainIds.value.size === 0) {
			expandedMainIds.value = new Set([tree[0]!.id])
		}
	},
	{ immediate: true },
)
</script>
