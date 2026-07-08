<template>
	<div class="space-y-3">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0 space-y-2">
				<h4 class="text-lg font-medium text-white 2xl:text-xl">{{ title }}</h4>
				<p class="text-sm text-white/60 2xl:text-base">{{ description }}</p>
			</div>
			<div class="flex shrink-0 flex-wrap items-center gap-2">
				<button
					type="button"
					class="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90 hover:bg-white/20 disabled:opacity-50 2xl:text-base"
					:disabled="warningsCount === 0"
					@click="emit('openWarnings')"
				>
					查看錯誤
					<span v-if="warningsCount > 0" class="ms-1 text-amber-200">({{ warningsCount }})</span>
				</button>
				<PermissionActionButton
					:allowed="canResync"
					:disabled="isResyncDisabled"
					class="rounded-xl border border-white/20 bg-emerald-500/85 px-4 py-2 text-sm text-white enabled:hover:bg-emerald-500 2xl:text-base"
					:aria-label="resyncAriaLabel"
					@click="emit('resync')"
				>
					{{ isResyncing ? "同步中…" : "重新同步" }}
				</PermissionActionButton>
				<slot name="actions" />
			</div>
		</div>

		<div
			v-if="locationName || entryDevices.length > 0 || exitDevices.length > 0"
			class="space-y-2"
		>
			<p v-if="locationName" class="truncate text-base text-white 2xl:text-lg">
				{{ locationName }}
			</p>
			<div
				v-if="entryDevices.length > 0 || exitDevices.length > 0"
				class="flex flex-wrap gap-2 text-xs text-white/75 2xl:text-sm"
			>
				<span
					v-for="name in entryDevices"
					:key="`entry-${name}`"
					class="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-0.5"
				>
					{{ entryPrefix }}：{{ name }}
				</span>
				<span
					v-for="name in exitDevices"
					:key="`exit-${name}`"
					class="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-0.5"
				>
					{{ exitPrefix }}：{{ name }}
				</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"

withDefaults(
	defineProps<{
		title?: string
		description: string
		warningsCount: number
		canResync: boolean
		isResyncDisabled?: boolean
		isResyncing?: boolean
		resyncAriaLabel?: string
		locationName?: string | null
		entryDevices?: string[]
		exitDevices?: string[]
		entryPrefix?: string
		exitPrefix?: string
	}>(),
	{
		entryDevices: () => [],
		exitDevices: () => [],
		entryPrefix: "入口",
		exitPrefix: "出口",
	},
)

const emit = defineEmits<{
	openWarnings: []
	resync: []
}>()
</script>
