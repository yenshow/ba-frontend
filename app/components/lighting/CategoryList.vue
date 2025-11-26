<template>
	<div
		class="absolute top-full left-0 mt-2 w-[76px] 2xl:w-[100px] rounded-2xl overflow-hidden border-2 border-white/80 p-2 2xl:p-3 z-50 max-h-[400px] overflow-y-auto space-y-2 2xl:space-y-3"
	>
		<h3 class="text-white text-sm 2xl:text-base tracking-[2px] 2xl:tracking-[4px] ps-[2px] 2xl:ps-[4px]">分類點</h3>
		<div class="space-y-1.5 2xl:space-y-2">
			<div
				v-for="category in categories"
				:key="category.id"
				:draggable="editing"
				@dragstart="handleDragStart($event, category)"
				@dragend="handleDragEnd"
				:class="[
					'flex flex-col items-center justify-center gap-1 p-1.5 2xl:p-2 rounded-lg border-2 cursor-pointer transition-all text-center',
					editing ? 'border-white/40 bg-white/10 hover:bg-white/20 cursor-move' : 'border-white/20 bg-white/5'
				]"
				@click="!editing && $emit('select', category.id)"
				:title="category.name"
			>
				<span class="text-white text-xs 2xl:text-sm leading-tight line-clamp-3">{{ category.name }}</span>
				<div v-if="editing" class="flex items-center gap-1">
					<button
						type="button"
						class="p-0.5 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
						@click.stop="$emit('edit', category)"
						:title="`編輯 ${category.name}`"
					>
						<span class="sr-only">編輯 {{ category.name }}</span>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							/>
						</svg>
					</button>
					<button
						type="button"
						class="p-0.5 rounded hover:bg-red-500/30 text-white/70 hover:text-red-200 transition-colors"
						@click.stop="$emit('delete', category.id)"
						:title="`刪除 ${category.name}`"
					>
						<span class="sr-only">刪除 {{ category.name }}</span>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
					</button>
				</div>
			</div>
			<div v-if="categories.length === 0" class="text-center text-white/50 py-4 text-[10px] 2xl:text-xs">暫無</div>
		</div>
		<button
			v-if="editing"
			type="button"
			class="text-xs 2xl:text-sm px-2 py-1 rounded-xl border border-dashed border-white/40 text-white/80 hover:text-white hover:bg-white/20 transition"
			@click="$emit('add')"
		>
			+ 新增
		</button>
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
	add: [];
	edit: [category: RoomCategory];
	delete: [categoryId: string];
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
