<template>
	<div
		class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5"
	>
		<PersonnelMemberPickerToolbar
			:query="query"
			:search-input-id="searchInputId"
			:is-disabled="isDisabled"
			:can-select-all="canSelectAll"
			:is-all-selected="isAllSelected"
			:context-label="contextLabel"
			:context-value="contextValue"
			:context-placeholder="contextPlaceholder"
			:compact-select-all="compactSelectAll"
			@update:query="emit('update:query', $event)"
			@search="emit('search')"
			@toggle-select-all="emit('toggleSelectAll')"
		>
			<template v-if="$slots['context-trailing']" #context-trailing>
				<slot name="context-trailing" />
			</template>
		</PersonnelMemberPickerToolbar>

		<AsyncPanel
			class="min-h-0 flex-1"
			panel-size="dense"
			:loading="isLoading"
			:empty="isEmpty"
			:empty-title="emptyTitle"
			min-height-class="min-h-0"
		>
			<template #loading>
				<p class="sr-only">載入人員清單</p>
				<ContentSkeleton variant="member-list" />
			</template>
			<template v-if="$slots['empty-state']" #empty>
				<slot name="empty-state" />
			</template>
			<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-3 pe-1">
				<PersonnelMemberCheckboxGrid
					:candidates="candidates"
					:is-checked="isChecked"
					:can-edit="canEdit"
					:is-disabled="isDisabled"
					:variant="gridVariant"
					:checkbox-aria-label="checkboxAriaLabel"
					@toggle="(personId, checked) => emit('toggle', personId, checked)"
				>
					<template #person-indicators="slotProps">
						<slot name="person-indicators" v-bind="slotProps" />
					</template>
					<template #person-extra="slotProps">
						<slot name="person-extra" v-bind="slotProps" />
					</template>
					<template #person-badge="slotProps">
						<slot name="person-badge" v-bind="slotProps" />
					</template>
				</PersonnelMemberCheckboxGrid>
			</div>
		</AsyncPanel>
	</div>
</template>

<script setup lang="ts">
import type { Person } from "~/types/personnel"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import ContentSkeleton from "~/components/common/ContentSkeleton.vue"
import PersonnelMemberCheckboxGrid from "~/components/personnel/PersonnelMemberCheckboxGrid.vue"
import PersonnelMemberPickerToolbar from "~/components/personnel/PersonnelMemberPickerToolbar.vue"

withDefaults(
	defineProps<{
		query: string
		searchInputId: string
		candidates: Person[]
		isChecked: (personId: number) => boolean
		canEdit: boolean
		isDisabled?: boolean
		isLoading?: boolean
		isEmpty: boolean
		emptyTitle?: string
		canSelectAll: boolean
		isAllSelected: boolean
		contextLabel?: string | null
		contextValue?: string | null
		contextPlaceholder?: string
		compactSelectAll?: boolean
		gridVariant?: "default" | "group"
		checkboxAriaLabel?: (person: Person) => string
	}>(),
	{
		isDisabled: false,
		isLoading: false,
		emptyTitle: "尚無人員",
		contextPlaceholder: "請先選擇",
		compactSelectAll: false,
		gridVariant: "default",
	},
)

const emit = defineEmits<{
	"update:query": [value: string]
	search: []
	toggleSelectAll: []
	toggle: [personId: number, checked: boolean]
}>()
</script>
