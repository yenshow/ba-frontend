<template>
	<div class="flex min-h-0 flex-1 flex-col rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5">
		<slot name="toolbar" />

		<div class="mt-4 grid min-h-0 grid-cols-12 items-stretch gap-4 2xl:gap-5">
			<PersonnelGroupBrowseTree
				:group-tree="groupTree"
				:selected-child-id="selectedChildGroupId"
				:member-count-by-child-id="memberCountByChildId"
				:loading="isGroupTreeLoading"
				:error="groupTreeError"
				:show-ungrouped="hasUngroupedCandidates"
				:panel-height-class="panelHeightClass"
				@select-child="emit('selectChild', $event)"
			/>

			<section
				class="col-span-12 flex min-h-0 flex-col lg:col-span-8"
				:class="panelHeightClass"
			>
				<div
					class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5"
				>
					<div class="flex flex-col gap-2 border-b border-white/10 p-3 sm:flex-row sm:items-center">
						<p
							v-if="selectedGroupLabel"
							class="shrink-0 text-sm font-medium text-white/75 2xl:text-base"
						>
							{{ selectedGroupLabel }}
						</p>
						<div class="flex min-w-0 flex-1 items-center gap-2">
							<SearchInput
								:model-value="membersQuery"
								:input-id="searchInputId"
								label="搜尋人員"
								placeholder="搜尋 ID / 姓名"
								aria-label="搜尋人員"
								wrapper-class="min-w-0 flex-1"
								input-wrapper-class="min-w-0 flex-1"
								input-class="!w-full min-w-0"
								:disabled="isApplyingMembers"
								:clearable="!isApplyingMembers"
								@update:model-value="emit('update:membersQuery', $event)"
								@search="emit('search')"
								@clear="emit('search')"
							/>
							<button
								type="button"
								class="btn-secondary shrink-0 whitespace-nowrap text-sm 2xl:text-base"
								:disabled="!hasFilteredCandidates || !canEditMembers || isApplyingMembers"
								@click="emit('toggleSelectAll')"
							>
								{{ isAllFilteredKept ? "取消" : "全選" }}
							</button>
						</div>
					</div>

					<AsyncPanel
						class="min-h-0 flex-1"
						panel-size="dense"
						:loading="isLoadingMembers"
						:empty="!isLoadingMembers && filteredCandidates.length === 0"
						:empty-title="emptyTitle"
						min-height-class="min-h-0"
					>
						<template #loading>
							<p class="sr-only">載入人員清單</p>
							<ContentSkeleton variant="member-list" />
						</template>
						<div
							class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-3 pe-1"
						>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
								<div
									v-for="person in filteredCandidates"
									:key="person.id"
									class="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
									:class="{
										'ring-1 ring-cyan-400/35': isMemberKept(person.id),
									}"
								>
									<label class="flex cursor-pointer items-center gap-2.5">
										<input
											type="checkbox"
											class="h-[1.125rem] w-[1.125rem] shrink-0 accent-cyan-400 2xl:h-5 2xl:w-5"
											:checked="isMemberKept(person.id)"
											:disabled="!canEditMembers || isApplyingMembers"
											@change="emit('toggleMember', person.id, $event)"
										/>
										<span class="min-w-0 flex-1 truncate text-base text-white/90 2xl:text-lg">
											<span class="font-mono">{{ person.employee_no }}</span>
											<span class="ms-2">{{ person.full_name || "—" }}</span>
										</span>
									<div class="shrink-0">
										<slot name="person-indicators" :person="person" />
									</div>
								</label>
									<slot name="person-extra" :person="person" />
								</div>
							</div>
						</div>
					</AsyncPanel>
				</div>
			</section>
		</div>

		<p v-if="membersError" class="form-error-text mt-3" role="alert">
			{{ membersError }}
		</p>

		<div class="mt-4 flex justify-end">
			<PermissionActionButton
				:allowed="canEditMembers"
				:disabled="isApplyingMembers"
				class="rounded-xl border border-white/20 bg-emerald-500/85 px-4 py-2 text-sm text-white enabled:hover:bg-emerald-500 2xl:text-base"
				:aria-label="applyAriaLabel"
				@click="emit('apply')"
			>
				{{ isApplyingMembers ? "處理中…" : applyLabel }}
			</PermissionActionButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Person, PersonGroup } from "~/types/personnel"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import SearchInput from "~/components/common/SearchInput.vue"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import ContentSkeleton from "~/components/common/ContentSkeleton.vue"
import PersonnelGroupBrowseTree from "~/components/personnel/PersonnelGroupBrowseTree.vue"
import { LOCATION_MEMBERS_PANEL_HEIGHT } from "~/composables/systems/personnel/useLocationMembersStep"

withDefaults(
	defineProps<{
		groupTree: PersonGroup[]
		selectedChildGroupId: number | null
		memberCountByChildId: Record<number, number>
		hasUngroupedCandidates: boolean
		isGroupTreeLoading?: boolean
		groupTreeError?: string | null
		membersQuery: string
		searchInputId: string
		filteredCandidates: Person[]
		hasFilteredCandidates: boolean
		canEditMembers: boolean
		isApplyingMembers: boolean
		isLoadingMembers: boolean
		membersError: string | null
		isAllFilteredKept: boolean
		isMemberKept: (personId: number) => boolean
		selectedGroupLabel?: string | null
		applyLabel?: string
		applyAriaLabel?: string
		emptyTitle?: string
		panelHeightClass?: string
	}>(),
	{
		applyLabel: "套用權限",
		applyAriaLabel: "套用權限",
		emptyTitle: "尚無人員",
		panelHeightClass: LOCATION_MEMBERS_PANEL_HEIGHT,
	},
)

const emit = defineEmits<{
	"update:membersQuery": [value: string]
	search: []
	selectChild: [childId: number]
	toggleSelectAll: []
	toggleMember: [personId: number, event: Event]
	apply: []
}>()
</script>
