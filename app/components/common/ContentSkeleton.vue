<template>
	<div class="w-full" role="presentation" aria-hidden="true">
		<div v-if="variant === 'member-list'" class="space-y-4">
			<div v-for="group in groupCount" :key="`group-${group}`" class="space-y-2">
				<div class="h-4 w-28 animate-pulse rounded bg-white/10" />
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<div
						v-for="row in rowsPerGroup"
						:key="`row-${group}-${row}`"
						class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2"
					>
						<div class="h-4 w-4 shrink-0 animate-pulse rounded bg-white/15" />
						<div class="h-4 w-16 animate-pulse rounded bg-white/10" />
						<div class="h-4 min-w-0 flex-1 animate-pulse rounded bg-white/10" />
					</div>
				</div>
			</div>
		</div>

		<div v-else class="overflow-hidden rounded border border-white/10 bg-white/5 p-2">
			<div class="flex gap-3 border-b border-white/10 px-2 pb-2">
				<div
					v-for="col in columns"
					:key="`head-${col}`"
					class="h-4 animate-pulse rounded bg-white/12"
					:class="col === columns ? 'w-16' : 'flex-1'"
				/>
			</div>
			<div
				v-for="row in rows"
				:key="`row-${row}`"
				class="flex gap-3 border-b border-white/5 px-2 py-2.5 last:border-b-0"
			>
				<div
					v-for="col in columns"
					:key="`cell-${row}-${col}`"
					class="h-4 animate-pulse rounded bg-white/8"
					:class="col === columns ? 'w-16' : 'flex-1'"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		variant?: "member-list" | "table"
		rows?: number
		columns?: number
		groupCount?: number
		rowsPerGroup?: number
	}>(),
	{
		variant: "table",
		rows: 5,
		columns: 6,
		groupCount: 2,
		rowsPerGroup: 4,
	}
)
</script>
