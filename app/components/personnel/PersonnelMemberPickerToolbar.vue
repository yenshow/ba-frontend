<template>
	<div
		class="flex flex-col gap-2 border-b border-white/10 p-3 sm:flex-row sm:items-center sm:justify-between"
	>
		<div v-if="showContextBlock" class="min-w-0 shrink-0">
			<p v-if="contextLabel?.trim()" class="text-sm text-white/70">
				{{ contextLabel }}
			</p>
			<p
				class="truncate text-sm font-semibold text-white 2xl:text-base"
				:class="{ 'mt-0.5': contextLabel?.trim() }"
			>
				{{ resolvedContextValue }}
			</p>
		</div>

		<div class="flex w-full shrink-0 items-center gap-2 sm:w-auto sm:max-w-xs">
			<SearchInput
				:model-value="query"
				:input-id="searchInputId"
				label="搜尋人員"
				placeholder="搜尋 ID / 姓名"
				aria-label="搜尋人員"
				wrapper-class="min-w-0 w-full max-w-[11rem] sm:max-w-none sm:flex-1"
				input-wrapper-class="min-w-0 w-full"
				input-class="!w-full min-w-0"
				:disabled="isDisabled"
				:clearable="!isDisabled"
				@update:model-value="emit('update:query', $event)"
				@search="emit('search')"
				@clear="emit('search')"
			/>
			<button
				type="button"
				class="btn-secondary shrink-0 whitespace-nowrap text-sm 2xl:text-base"
				:class="{ '!text-xs 2xl:!text-sm': compactSelectAll }"
				:disabled="!canSelectAll || isDisabled"
				:aria-label="isAllSelected ? '取消全選可見人員' : '全選可見人員'"
				@click="emit('toggleSelectAll')"
			>
				{{ isAllSelected ? "取消" : "全選" }}
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import SearchInput from "~/components/common/SearchInput.vue"

const props = withDefaults(
	defineProps<{
		query: string
		searchInputId: string
		isDisabled?: boolean
		canSelectAll: boolean
		isAllSelected: boolean
		contextLabel?: string | null
		contextValue?: string | null
		contextPlaceholder?: string
		compactSelectAll?: boolean
	}>(),
	{
		isDisabled: false,
		contextPlaceholder: "請先選擇",
		compactSelectAll: false,
	},
)

const resolvedContextValue = computed(
	() => props.contextValue?.trim() || props.contextPlaceholder,
)

const showContextBlock = computed(
	() => Boolean(props.contextLabel?.trim()) || Boolean(props.contextValue?.trim()),
)

const emit = defineEmits<{
	"update:query": [value: string]
	search: []
	toggleSelectAll: []
}>()
</script>
