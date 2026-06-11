<template>
	<div class="flex items-center gap-1.5" role="tablist" :aria-label="ariaLabel">
		<button
			v-for="n in count"
			:key="`tab-${n}`"
			type="button"
			role="tab"
			:aria-selected="activeIndex === n - 1"
			:aria-label="`${ariaLabel} 第 ${n} 筆`"
			class="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm transition-colors 2xl:h-9 2xl:min-w-9 2xl:text-base"
			:class="
				activeIndex === n - 1
					? 'bg-cyan-500/80 text-white'
					: 'border border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
			"
			@click="emit('update:activeIndex', n - 1)"
		>
			{{ n }}
		</button>
		<button
			v-if="unlimited || count < max"
			type="button"
			role="tab"
			aria-label="新增一筆"
			class="flex h-8 min-w-8 items-center justify-center rounded-lg border border-dashed border-white/25 bg-white/5 px-2 text-sm text-white/80 transition-colors hover:border-cyan-400/50 hover:bg-white/10 hover:text-white 2xl:h-9 2xl:min-w-9 2xl:text-base"
			@click="emit('add')"
		>
			+
		</button>
	</div>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		count: number
		activeIndex: number
		max?: number
		ariaLabel?: string
		unlimited?: boolean
	}>(),
	{
		max: 5,
		ariaLabel: "項目",
		unlimited: false,
	},
)

const emit = defineEmits<{
	"update:activeIndex": [index: number]
	add: []
}>()
</script>
