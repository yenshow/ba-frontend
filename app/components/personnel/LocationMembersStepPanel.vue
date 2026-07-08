<template>
	<div class="rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
			<div class="min-w-0 space-y-2">
				<h4 class="text-lg font-medium text-white 2xl:text-xl">{{ title }}</h4>
				<p class="text-sm text-white/60 2xl:text-base">{{ description }}</p>
			</div>
			<div class="flex min-w-0 shrink-0 items-center gap-2 lg:max-w-sm">
				<SearchInput
					:model-value="membersQuery"
					:input-id="searchInputId"
					label="搜尋可進出人員"
					placeholder="搜尋 ID / 姓名"
					aria-label="搜尋可進出人員"
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
					class="btn-secondary shrink-0 whitespace-nowrap text-xs 2xl:text-sm"
					:disabled="!hasMemberCandidates || !canEditMembers || isApplyingMembers"
					@click="emit('toggleSelectAllPage')"
				>
					{{ isAllMembersPageKept ? "取消" : "全選" }}
				</button>
			</div>
		</div>
		<AsyncPanel
			class="mt-4"
			:loading="isLoadingMembers"
			:empty="!isLoadingMembers && memberCandidateGroups.length === 0"
			empty-title="尚無可選人員"
			:min-height-class="listMinHeightClass"
		>
			<template #loading>
				<p class="sr-only">載入人員清單</p>
				<ContentSkeleton variant="member-list" />
			</template>
			<div
				class="show-scrollbar space-y-4 overflow-y-auto pe-1"
				:class="listScrollClass"
			>
				<section v-for="group in memberCandidateGroups" :key="group.groupId">
					<h5 class="mb-2 text-xs font-medium text-white/55 2xl:text-sm">
						{{ group.groupName }}
						<span class="text-white/40">（{{ group.members.length }}）</span>
					</h5>
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<label
							v-for="person in group.members"
							:key="person.id"
							class="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
						>
							<input
								type="checkbox"
								class="h-4 w-4 shrink-0 accent-cyan-400"
								:checked="isMemberKept(person.id)"
								:disabled="!canEditMembers || isApplyingMembers"
								@change="emit('toggleMember', person.id, $event)"
							/>
							<span class="min-w-0 truncate text-sm text-white/90 2xl:text-base">
								<span class="font-mono">{{ person.employee_no }}</span>
								<span class="ms-2">{{ person.full_name || "—" }}</span>
							</span>
						</label>
					</div>
				</section>
			</div>
		</AsyncPanel>
		<p v-if="membersError" class="form-error-text mt-3" role="alert">
			{{ membersError }}
		</p>
		<div class="mt-4 flex justify-end">
			<PermissionActionButton
				:allowed="canEditMembers"
				:disabled="isApplyingMembers"
				class="rounded-xl border border-white/20 bg-emerald-500/85 px-4 py-2 text-sm text-white enabled:hover:bg-emerald-500 2xl:text-base"
				aria-label="套用可進出人員名單"
				@click="emit('apply')"
			>
				{{ isApplyingMembers ? "處理中…" : applyLabel }}
			</PermissionActionButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PersonGroupMemberSection } from "~/utils/personnelUtils"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import SearchInput from "~/components/common/SearchInput.vue"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import ContentSkeleton from "~/components/common/ContentSkeleton.vue"

withDefaults(
	defineProps<{
		title?: string
		description: string
		searchInputId: string
		membersQuery: string
		hasMemberCandidates: boolean
		canEditMembers: boolean
		isApplyingMembers: boolean
		isLoadingMembers: boolean
		memberCandidateGroups: PersonGroupMemberSection[]
		membersError: string | null
		isAllMembersPageKept: boolean
		isMemberKept: (personId: number) => boolean
		applyLabel?: string
		listMinHeightClass?: string
		listScrollClass?: string
	}>(),
	{ applyLabel: "套用名單" },
)

const emit = defineEmits<{
	"update:membersQuery": [value: string]
	search: []
	toggleSelectAllPage: []
	toggleMember: [personId: number, event: Event]
	apply: []
}>()
</script>
