<template>
	<section class="grid grid-cols-12 items-stretch gap-6 2xl:gap-8">
		<!-- 左：群組（3/12） -->
		<aside class="col-span-3 h-full">
			<div :class="panelClass">
				<div class="mb-4 flex items-center justify-between gap-3">
					<h2 class="text-xl font-semibold text-white 2xl:text-2xl">群組列表</h2>
					<PermissionActionButton
						:allowed="canManageGroups"
						aria-label="管理群組"
						:class="actionButtonClass"
						@click="showGroupsDialog = true"
					>
						管理群組
					</PermissionActionButton>
				</div>

				<div class="mb-4 flex flex-col gap-2 font-semibold">
					<button
						type="button"
						:class="[
							groupButtonBaseClass,
							isAllSelected ? groupButtonSelectedClass : groupButtonIdleClass,
						]"
						@click="handleSelectAll"
						aria-label="顯示全部人員"
					>
						全部人員
					</button>
					<button
						type="button"
						:class="[
							groupButtonBaseClass,
							isUngroupedSelected ? groupButtonSelectedClass : groupButtonIdleClass,
						]"
						@click="handleSelectUngrouped"
						aria-label="僅顯示未分組人員"
					>
						未分組
					</button>
				</div>

				<AsyncPanel
					panel-size="sidebar"
					:loading="groupTreeLoading"
					:empty="!groupTreeLoading && groupTree.length === 0"
					:error="groupTreeError"
					empty-title="尚無群組"
				>
					<div class="space-y-4">
						<div
							v-for="main in groupTree"
							:key="main.id"
							:class="[
								mainGroupCardBaseClass,
								isMainSelected(main.id) ? mainGroupCardSelectedClass : mainGroupCardIdleClass,
							]"
						>
							<div class="flex items-center justify-between gap-2 px-3 py-2">
								<button
									type="button"
									class="flex min-w-0 flex-1 items-center gap-2 text-left text-white/90 hover:text-white"
									@click="handleSelectMain(main)"
									:aria-label="`選取主群組：${main.name}`"
								>
									<span
										class="truncate text-lg 2xl:text-xl"
										:class="{ 'font-semibold': isMainSelected(main.id) }"
										>{{ main.name }}</span
									>
								</button>
							</div>

							<div v-if="expandedMainIds.has(main.id)" class="border-t border-white/30 px-3 py-2">
								<div v-if="(main.children || []).length === 0" class="py-2 text-sm text-white/60">
									尚無子群組
								</div>
								<div v-else class="space-y-1">
									<div
										v-for="child in main.children"
										:key="child.id"
										class="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-white/5"
										:class="{
											'bg-cyan-500/25 ring-2 ring-cyan-400/40': isChildSelected(child.id),
										}"
									>
										<button
											type="button"
											class="min-w-0 flex-1 truncate text-left text-sm text-white/85 hover:text-white 2xl:text-base"
											@click="handleSelectChild(child)"
											:aria-label="`選取子群組：${child.name}`"
										>
											<span :class="{ 'font-semibold text-white': isChildSelected(child.id) }">{{
												child.name
											}}</span>
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</AsyncPanel>

				<PersonnelGroupsDialog
					v-model="showGroupsDialog"
					:can-create-group="canCreateGroup"
					:can-update-group="canUpdateGroup"
					:can-delete-group="canDeleteGroup"
					@changed="handleGroupsChanged"
				/>
			</div>
		</aside>

		<!-- 右：人員列表（9/12） -->
		<div class="col-span-9 h-full">
			<PersonnelPersonsTab
				:can-create-person="canCreatePerson"
				:can-update-person="canUpdatePerson"
				:can-delete-person="canDeletePerson"
				:can-update-group="canUpdateGroup"
				:person-status-labels="personStatusLabels"
				:table-header-class="tableHeaderClass"
				:table-cell-class="tableCellClass"
				:get-person-status-badge-class="getPersonStatusBadgeClass"
				:persons-tab="personsTab"
				:selected-main-group-id="resolvedMainGroupId"
				:group-tree="groupTree"
				@changed="handleGroupsChanged"
			/>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { PersonGroup } from "~/types/personnel"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import PersonnelPersonsTab from "~/components/personnel/PersonnelPersonsTab.vue"
import PersonnelGroupsDialog from "~/components/personnel/dialogs/PersonnelGroupsDialog.vue"
import { usePersonnelGroupTree } from "~/composables/systems/personnel/usePersonnelGroupTree"
import { usePersonnelPersonsTab } from "~/composables/systems/personnel/usePersonnelPersonsTab"
import { isSidebarGroupKeyValid, resolveMainGroupIdFromSidebarKey, type PersonnelGroupsChangedPayload } from "~/utils/personnelGroups"

const props = defineProps<{
	canManageGroups: boolean
	canCreateGroup: boolean
	canUpdateGroup: boolean
	canDeleteGroup: boolean
	canCreatePerson: boolean
	canUpdatePerson: boolean
	canDeletePerson: boolean
	personStatusLabels: Record<string, string>
	tableHeaderClass: string
	tableCellClass: string
	getPersonStatusBadgeClass: (status: string) => string
	personsTab: ReturnType<typeof usePersonnelPersonsTab>
}>()

const selectedKey = ref<string>("all")
const expandedMainIds = ref<Set<number>>(new Set())
const showGroupsDialog = ref(false)

const panelClass =
	"flex h-full min-h-0 flex-col rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8"
const actionButtonClass =
	"rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white enabled:hover:bg-emerald-400 2xl:px-6 2xl:py-3 2xl:text-base"
const groupButtonBaseClass =
	"w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-lg text-white/85 hover:bg-white/10 2xl:text-xl"
const groupButtonIdleClass = ""
const groupButtonSelectedClass = "border-cyan-300/60 bg-cyan-500/35 text-white ring-2 ring-cyan-400"
const mainGroupCardBaseClass = "rounded-xl border bg-white/5"
const mainGroupCardIdleClass = "border-white/10"
const mainGroupCardSelectedClass = "border-cyan-300/50 bg-cyan-500/20 ring-2 ring-cyan-400"

const {
	groupTree,
	isLoading: groupTreeLoading,
	errorMessage: groupTreeError,
	refresh: refreshGroupTree,
} = usePersonnelGroupTree()

const resolvedMainGroupId = computed(() =>
	resolveMainGroupIdFromSidebarKey(selectedKey.value, groupTree.value || [])
)

const isAllSelected = computed(() => selectedKey.value === "all")
const isUngroupedSelected = computed(() => selectedKey.value === "ungrouped")
const isMainSelected = (mainId: number) => selectedKey.value === `main:${mainId}`
const isChildSelected = (childId: number) => selectedKey.value === `child:${childId}`

const handleSelectAll = () => {
	selectedKey.value = "all"
	props.personsTab.setGroupFilterAll()
}

const handleSelectUngrouped = () => {
	selectedKey.value = "ungrouped"
	props.personsTab.setGroupFilterUngrouped()
}

const handleSelectMain = (main: PersonGroup) => {
	selectedKey.value = `main:${main.id}`
	props.personsTab.setGroupFilterByMainGroupId(main.id)

	// 點選主群組：同時切換子群組展開/收合（維持原行為）
	const next = new Set(expandedMainIds.value)
	if (next.has(main.id)) next.delete(main.id)
	else next.add(main.id)
	expandedMainIds.value = next
}

const handleSelectChild = (child: PersonGroup) => {
	selectedKey.value = `child:${child.id}`
	props.personsTab.setGroupFilterByChildGroupId(child.id)
}

const handleGroupsChanged = async (payload: PersonnelGroupsChangedPayload) => {
	if (payload.scope === "groups") {
		await refreshGroupTree()
		if (!isSidebarGroupKeyValid(selectedKey.value, groupTree.value || [])) {
			handleSelectAll()
		}
	}
	void props.personsTab.loadPersons()
}

onMounted(() => {
	if ((groupTree.value?.length ?? 0) === 0 && !groupTreeLoading.value) {
		void refreshGroupTree()
	}
})
</script>
