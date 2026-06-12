<template>
	<div v-if="locationName || entry.length > 0 || exit.length > 0" class="space-y-2">
		<p v-if="locationName" class="truncate text-base text-white 2xl:text-lg">
			{{ locationName }}
		</p>
		<div v-if="entry.length > 0 || exit.length > 0" class="flex flex-wrap gap-2 text-xs text-white/75 2xl:text-sm">
			<span
				v-for="name in entry"
				:key="`entry-${name}`"
				class="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5"
			>
				入口：{{ name }}
			</span>
			<span
				v-for="name in exit"
				:key="`exit-${name}`"
				class="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-0.5"
			>
				出口：{{ name }}
			</span>
		</div>
	</div>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		locationName?: string | null
		entry?: string[]
		exit?: string[]
	}>(),
	{
		entry: () => [],
		exit: () => [],
	},
)
</script>
