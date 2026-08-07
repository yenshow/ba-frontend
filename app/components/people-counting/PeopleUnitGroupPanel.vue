<template>
	<div class="people-unit-panel min-h-[220px] space-y-4">
		<h3
			v-if="!hideTitle"
			class="people-unit-title monitoring-chip-bg py-1 text-center text-lg font-semibold text-white 2xl:text-xl"
		>
			{{ panelTitle }}
		</h3>
		<div class="grid grid-cols-3 gap-4 2xl:grid-cols-4">
			<button
				v-for="unit in units"
				:key="unit.id"
				type="button"
				class="flex flex-col items-center justify-center border-2 border-white/0 py-2 transition-all"
				:class="{
					'border-white/70': selectedUnitId === unit.id,
					'monitoring-chip-bg': (unit.currentCount || 0) > 0,
					'bg-black/20': (unit.currentCount || 0) === 0,
					'cursor-default': showRegionStats
				}"
				:disabled="showRegionStats"
				:tabindex="showRegionStats ? -1 : 0"
				:aria-label="
					showRegionStats ? `${unit.name} 進出統計` : `查看 ${unit.name} 人員名單`
				"
				@click="handleSelect(unit)"
				@keydown.enter="handleSelect(unit)"
				@keydown.space.prevent="handleSelect(unit)"
			>
				<div
					class="people-unit-name max-w-full truncate px-1 text-base font-semibold tracking-wide text-white 2xl:text-lg"
				>
					{{ unit.name }}
				</div>
				<template v-if="showRegionStats">
					<div class="people-unit-count mt-0.5 flex items-center gap-1 text-sm text-white 2xl:text-base">
						<span class="text-green-400">進 {{ unit.entryCount ?? 0 }}</span>
						<span>/</span>
						<span class="text-blue-300">出 {{ unit.exitCount ?? 0 }}</span>
					</div>
				</template>
				<template v-else>
					<div class="people-unit-count mt-0.5 flex items-center gap-1 text-sm text-white 2xl:text-base">
						<span class="text-green-400">{{ unit.currentCount || 0 }}</span>
						<span>/</span>
						<span>{{ unit.capacity || 0 }}</span>
					</div>
				</template>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingUnit } from "~/types/peopleCounting";

const props = withDefaults(
	defineProps<{
		units: PeopleCountingUnit[];
		selectedUnitId?: number | null;
		panelTitle?: string;
		hideTitle?: boolean;
		showRegionStats?: boolean;
	}>(),
	{
		selectedUnitId: null,
		panelTitle: "人員群組",
		hideTitle: false,
		showRegionStats: false
	}
);

const emit = defineEmits<{
	(e: "select", unitId: number): void;
}>();

const handleSelect = (unit: PeopleCountingUnit) => {
	if (props.showRegionStats) return;
	emit("select", unit.id);
};
</script>
