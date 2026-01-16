<template>
	<div
		class="absolute left-0 top-full z-50 mt-2 max-h-[400px] w-[76px] space-y-2 overflow-hidden overflow-y-auto rounded-2xl border-2 border-white/80 p-2 2xl:w-[100px] 2xl:space-y-3 2xl:p-3"
	>
		<h3
			class="ps-[2px] text-sm tracking-[2px] text-white 2xl:ps-[4px] 2xl:text-base 2xl:tracking-[4px]"
		>
			地點
		</h3>
		<div class="space-y-1.5 2xl:space-y-2">
			<div
				v-for="location in locations"
				:key="location.id"
				:class="[
					'flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-1.5 text-center transition-all 2xl:p-2',
					editing
						? 'cursor-move border-white/40 bg-white/10 hover:bg-white/20'
						: 'cursor-pointer border-white/20 bg-white/5',
					!hasLocationCoordinates(location) && editing ? 'border-yellow-400/60 bg-yellow-400/10' : ''
				]"
				:draggable="editing"
				@click="!editing && $emit('select', location.id)"
				@dragstart="handleDragStart($event, location)"
				@dragend="handleDragEnd"
				:title="hasLocationCoordinates(location) ? location.name : `${location.name} (未定位)`"
			>
				<span class="line-clamp-3 text-xs leading-tight text-white 2xl:text-sm">{{
					location.name
				}}</span>
				<div v-if="!hasLocationCoordinates(location) && editing" class="text-[10px] text-yellow-400 2xl:text-xs">
					未定位
				</div>
			</div>
			<div
				v-if="locations.length === 0"
				class="py-4 text-center text-[10px] text-white/50 2xl:text-xs"
			>
				暫無
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { UnifiedLocation } from "~/types/location";
import { hasLightingCoordinates } from "~/utils/locationAdapter";

interface Props {
	locations: UnifiedLocation[];
	editing?: boolean;
	selectedLocationId?: string;
}

const props = withDefaults(defineProps<Props>(), {
	editing: false,
	selectedLocationId: ""
});

const emit = defineEmits<{
	select: [locationId: string];
	dragstart: [event: DragEvent, location: UnifiedLocation];
	dragend: [event: DragEvent];
}>();

const hasLocationCoordinates = (location: UnifiedLocation): boolean => {
	return hasLightingCoordinates(location);
};

const handleDragStart = (event: DragEvent, location: UnifiedLocation) => {
	emit("dragstart", event, location);
	event.dataTransfer!.effectAllowed = "move";
	event.dataTransfer!.setData("locationId", location.id);
	event.dataTransfer!.setData("fromLocationList", "true");
};

const handleDragEnd = (event: DragEvent) => {
	emit("dragend", event);
};
</script>

