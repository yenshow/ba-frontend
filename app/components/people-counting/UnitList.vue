<template>
	<div class="space-y-3">
		<h3 class="text-lg font-semibold text-white xl:text-xl 2xl:text-2xl">進場單位</h3>
		<div class="space-y-2">
			<div
				v-for="unit in units"
				:key="unit.id"
				class="flex items-center justify-between rounded-lg border-2 border-white/30 bg-white/10 p-3 backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/15"
				:class="{ 'border-green-400/50 bg-green-500/20': selectedUnitId === unit.id }"
				@click="$emit('select', unit.id)"
			>
				<div class="flex-1">
					<div class="text-base font-medium text-white xl:text-lg 2xl:text-xl">{{ unit.name }}</div>
				</div>
				<div class="ml-4 text-right">
					<div class="text-sm font-semibold text-white/90 xl:text-base 2xl:text-lg">
						<span class="text-green-400">{{ unit.currentCount || 0 }}</span>
						<span class="text-white/60">/</span>
						<!-- 注意：目前使用 capacity，未來後端實作後應改為 totalCount -->
						<span class="text-white/80">{{ unit.capacity || 0 }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingUnit } from "~/types/peopleCounting";

interface Props {
	units: PeopleCountingUnit[];
	selectedUnitId?: number;
}

defineProps<Props>();
defineEmits<{
	select: [unitId: number];
}>();
</script>

