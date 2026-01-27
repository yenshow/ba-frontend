<template>
	<div class="space-y-4 min-h-[220px]">
		<h3 class="font-semibold text-lg bg-white/20 text-white text-center 2xl:text-xl py-1">進場單位</h3>
		<div class="grid grid-cols-4 gap-2 2xl:gap-4">
			<div
				v-for="unit in units"
				:key="unit.id"
				class="flex flex-col justify-center items-center border-2 border-white/0 transition-all cursor-pointer py-2"
				:class="{
					'border-2 border-white/70': selectedUnitId === unit.id,
					'bg-white/20': (unit.currentCount || 0) > 0,
					'bg-black/20 ': (unit.currentCount || 0) === 0
				}"
				@click="$emit('select', unit.id)"
			>
					<div class="text-base font-semibold text-white 2xl:text-lg tracking-wide">{{ unit.name }}</div>
					<div class="text-base  text-white 2xl:text-lg space-x-0.5">
						<span class="text-green-400">{{ unit.currentCount || 0 }}</span>
						<span>/</span>
						<span>{{ unit.capacity || 0 }}</span>
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

