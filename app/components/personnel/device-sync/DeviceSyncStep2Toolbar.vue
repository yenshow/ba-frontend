<template>
	<div class="space-y-3">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
			<p
				v-if="description"
				class="min-w-0 flex-1 text-base leading-relaxed text-white/70 2xl:text-lg"
			>
				{{ description }}
			</p>
			<div class="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:justify-start">
				<button
					type="button"
					class="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-base text-white/90 hover:bg-white/20 disabled:opacity-50 2xl:text-lg"
					:disabled="warningsCount === 0"
					@click="emit('openWarnings')"
				>
					查看錯誤
					<span v-if="warningsCount > 0" class="ms-1 text-amber-200">({{ warningsCount }})</span>
				</button>
				<PermissionActionButton
					:allowed="canResync"
					:disabled="isResyncDisabled"
					class="rounded-xl border border-white/20 bg-emerald-500/85 px-4 py-2.5 text-base text-white enabled:hover:bg-emerald-500 2xl:text-lg"
					:aria-label="resyncAriaLabel"
					@click="emit('resync')"
				>
					{{ isResyncing ? "同步中…" : "重新同步" }}
				</PermissionActionButton>
				<slot name="actions" />
			</div>
		</div>

		<div
			v-if="entryDevices.length > 0 || exitDevices.length > 0 || cameraDevices.length > 0"
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
			<span
				v-for="name in cameraDevices"
				:key="`cam-${name}`"
				class="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5"
			>
				{{ cameraPrefix }}：{{ name }}
			</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"

withDefaults(
	defineProps<{
		description?: string
		warningsCount: number
		canResync: boolean
		isResyncDisabled?: boolean
		isResyncing?: boolean
		resyncAriaLabel?: string
		entryDevices?: string[]
		exitDevices?: string[]
		cameraDevices?: string[]
		entryPrefix?: string
		exitPrefix?: string
		cameraPrefix?: string
	}>(),
	{
		entryDevices: () => [],
		exitDevices: () => [],
		cameraDevices: () => [],
		entryPrefix: "入口",
		exitPrefix: "出口",
		cameraPrefix: "攝影機",
	},
)

const emit = defineEmits<{
	openWarnings: []
	resync: []
}>()
</script>
