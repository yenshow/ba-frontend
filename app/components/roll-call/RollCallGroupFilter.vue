<template>
	<aside
		class="flex min-h-0 shrink-0 flex-col"
		:class="compact ? 'w-[96px]' : 'w-[140px] 2xl:w-[168px]'"
		aria-label="群組篩選"
	>
		<div class="show-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
			<button
				v-for="item in filterItems"
				:key="item.id === null ? 'all' : item.id"
				type="button"
				class="flex w-full flex-col items-center justify-center rounded-xl border-2 px-1.5 py-2 text-center transition-colors"
				:class="[
					selectedGroupId === item.id
						? 'monitoring-chip-bg border-cyan-300/70'
						: 'border-transparent bg-black/25 hover:border-white/30',
					compact ? '' : 'px-2 py-3'
				]"
				:aria-pressed="selectedGroupId === item.id"
				:aria-label="`篩選群組 ${item.name}`"
				@click="emit('update:selectedGroupId', item.id)"
			>
				<span
					class="max-w-full truncate font-semibold text-white"
					:class="compact ? 'text-sm' : 'text-md 2xl:text-base'"
				>
					{{ item.name }}
				</span>
				<span class="mt-0.5 text-white/70" :class="compact ? 'text-xs' : 'text-sm 2xl:text-base'">
					<span class="text-cyan-200">{{ item.presentCount }}</span>
					/
					{{ item.totalCount }}
				</span>
			</button>
		</div>
	</aside>
</template>

<script setup lang="ts">
export type RollCallGroupFilterItem = {
	/** null＝全部 */
	id: number | null;
	name: string;
	presentCount: number;
	totalCount: number;
};

withDefaults(
	defineProps<{
		filterItems: RollCallGroupFilterItem[];
		selectedGroupId: number | null;
		/** 總覽展開時縮窄 */
		compact?: boolean;
	}>(),
	{
		compact: false
	}
);

const emit = defineEmits<{
	"update:selectedGroupId": [value: number | null];
}>();
</script>
