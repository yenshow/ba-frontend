<template>
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
		<p
			v-if="description"
			class="min-w-0 flex-1 text-sm leading-relaxed text-white/70 2xl:text-base"
		>
			{{ description }}
		</p>
		<div class="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:justify-start">
			<button
				type="button"
				class="btn-dialog-muted"
				:disabled="warningsCount === 0"
				@click="emit('openWarnings')"
			>
				查看錯誤
				<span v-if="warningsCount > 0" class="ms-1 text-amber-200">({{ warningsCount }})</span>
			</button>
			<PermissionActionButton
				:allowed="canResync"
				:disabled="isResyncDisabled"
				class="btn-action-emerald"
				:aria-label="resyncAriaLabel"
				@click="emit('resync')"
			>
				{{ isResyncing ? "同步中…" : "重新同步" }}
			</PermissionActionButton>
			<slot name="actions" />
		</div>
	</div>
</template>

<script setup lang="ts">
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"

defineProps<{
	description?: string
	warningsCount: number
	canResync: boolean
	isResyncDisabled?: boolean
	isResyncing?: boolean
	resyncAriaLabel?: string
}>()

const emit = defineEmits<{
	openWarnings: []
	resync: []
}>()
</script>
