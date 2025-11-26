<template>
	<div
		class="absolute top-full left-0 mt-2 w-[60px] 2xl:w-[100px] rounded-2xl overflow-hidden border-2 border-white/80 p-2 2xl:p-3 z-50 max-h-[400px] overflow-y-auto"
	>
		<div class="flex items-center justify-center mb-2 2xl:mb-3">
			<h3 class="text-white text-sm 2xl:text-base tracking-[2px] 2xl:tracking-[4px] ps-[2px] 2xl:ps-[4px]">分類點</h3>
		</div>
		<div class="space-y-1.5 2xl:space-y-2">
			<div
				v-for="category in categories"
				:key="category.id"
				:draggable="editing"
				@dragstart="handleDragStart($event, category)"
				@dragend="handleDragEnd"
				:class="['flex items-center justify-center p-1.5 2xl:p-2 rounded-lg border-2 cursor-pointer transition-all text-center']"
				@click="!editing && $emit('select', category.id)"
				:title="category.name"
			>
				<span class="text-white text-xs 2xl:text-sm">{{ category.name }}</span>
			</div>
			<div v-if="categories.length === 0" class="text-center text-white/50 py-4 text-[10px] 2xl:text-xs">暫無</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { RoomCategory } from "~/types/system";

interface Props {
	categories: RoomCategory[];
	editing?: boolean;
	selectedCategoryId?: string;
}

const props = withDefaults(defineProps<Props>(), {
	editing: false,
	selectedCategoryId: ""
});

const emit = defineEmits<{
	select: [categoryId: string];
	"drag-start": [event: DragEvent, category: RoomCategory];
	"drag-end": [];
}>();

const handleDragStart = (event: DragEvent, category: RoomCategory) => {
	if (!props.editing) return;
	event.dataTransfer!.effectAllowed = "move";
	event.dataTransfer!.setData("categoryId", category.id);
	event.dataTransfer!.setData("categoryName", category.name);
	emit("drag-start", event, category);
};

const handleDragEnd = () => {
	emit("drag-end");
};
</script>
