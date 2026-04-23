<template>
	<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-white 2xl:text-2xl">群組列表</h2>
			<button
				v-if="canEdit"
				type="button"
				class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 2xl:px-6 2xl:py-3 2xl:text-base"
				@click="handleCreate"
			>
				新增群組
			</button>
		</div>
		<div class="min-h-[300px]">
			<Transition name="fade" mode="out-in">
				<div v-if="groups.length > 0" key="groups">
					<table class="w-full text-center">
						<thead>
							<tr class="border-b border-white/20">
								<th :class="tableHeaderClass">名稱</th>
								<th :class="tableHeaderClass">成員</th>
								<th v-if="canEdit" :class="tableHeaderClass">操作</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="g in groups"
								:key="g.id"
								class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
							>
								<td :class="tableCellClass">{{ g.name }}</td>
								<td :class="tableCellClass">
									<div class="flex flex-wrap justify-center gap-2">
										<span
											v-for="p in (groupMemberPreviewById[g.id]?.items || []).slice(0, 4)"
											:key="p.id"
											class="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-white/85"
											:title="`${p.employee_no} ${p.full_name || ''}`"
										>
											<span>{{ p.employee_no }}</span>
											<span v-if="p.full_name" class="ms-1">{{ p.full_name }}</span>
										</span>
										<span
											v-if="
												(groupMemberPreviewById[g.id]?.total || 0) >
												(groupMemberPreviewById[g.id]?.items?.length || 0)
											"
											class="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-white/70"
											:title="`還有 ${
												(groupMemberPreviewById[g.id]?.total || 0) -
												(groupMemberPreviewById[g.id]?.items?.length || 0)
											} 位成員未顯示`"
										>
											+{{
												(groupMemberPreviewById[g.id]?.total || 0) -
												(groupMemberPreviewById[g.id]?.items?.length || 0)
											}}
										</span>
										<span
											v-if="(groupMemberPreviewById[g.id]?.total || 0) === 0"
											class="text-white/50"
										>
											—
										</span>
									</div>
								</td>
								<td v-if="canEdit" :class="tableCellClass">
									<div class="flex justify-center gap-2 2xl:gap-3">
										<button
											type="button"
											class="rounded bg-blue-500/80 px-3 py-1 text-white hover:bg-blue-400 2xl:px-4 2xl:py-2"
											@click="handleEdit(g)"
										>
											編輯
										</button>
										<button
											type="button"
											class="rounded bg-red-500/80 px-3 py-1 text-white hover:bg-red-400 2xl:px-4 2xl:py-2"
											@click="handleDelete(g)"
										>
											刪除
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<div v-else key="empty-groups" class="py-12 text-center text-white/60">
					<p class="text-base 2xl:text-lg">尚無群組，請點擊「新增群組」</p>
				</div>
			</Transition>
		</div>

		<PersonnelGroupDialog
			v-model="groupsTab.showGroupDialog.value"
			:editing-group="groupsTab.editingGroup.value"
			:form="groupsTab.groupForm"
			:is-submitting="groupsTab.isSubmitting.value"
			:error-message="groupsTab.errorMessage.value"
			:can-edit-members="canEdit"
			:all-persons="groupsTab.allPersons.value"
			:is-loading-all-persons="groupsTab.isLoadingAllPersons.value"
			:all-persons-error-text="groupsTab.allPersonsErrorText.value"
			:group-members="groupsTab.groupMembers.value"
			:is-loading-group-members="groupsTab.isLoadingGroupMembers.value"
			:group-members-error-text="groupsTab.groupMembersErrorText.value"
			@submit="groupsTab.submitGroup"
		/>
	</section>
</template>

<script setup lang="ts">
import type { Person, PersonGroup } from "~/types/personnel"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePersonnelApi, type PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { usePersonnelGroupsTab } from "~/composables/systems/personnel/usePersonnelGroupsTab"
import PersonnelGroupDialog from "~/components/personnel/PersonnelGroupDialog.vue"

const props = defineProps<{
	canEdit: boolean
	tableHeaderClass: string
	tableCellClass: string
	isActive: boolean
}>()

const toast = useToast()
const { handleError: handleApiError } = useErrorHandler()
const personnelApi: PersonnelApi = usePersonnelApi()
const groupsTab = usePersonnelGroupsTab({ personnelApi, toast, handleApiError })

watch(
	() => props.isActive,
	(v) => {
		if (!v) return
		void groupsTab.loadGroups()
	},
	{ immediate: true }
)

const groups = computed(() => groupsTab.groups.value)
const groupMemberPreviewById = computed<Record<number, { items: Person[]; total: number }>>(
	() => groupsTab.groupMemberPreviewByGroupId.value
)
const handleCreate = () => groupsTab.openGroupCreate()
const handleEdit = (group: PersonGroup) => groupsTab.editGroup(group)
const handleDelete = (group: PersonGroup) => groupsTab.confirmDeleteGroup(group)
</script>
