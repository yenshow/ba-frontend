<template>
	<h3 class="text-white text-center text-xl xl:text-2xl 2xl:text-3xl my-2 xl:my-3 2xl:my-4 tracking-[12px] ms-[12px]">樓層</h3>
	<div class="grid grid-cols-2 gap-y-2 xl:gap-y-3 2xl:gap-y-4 gap-x-4 xl:gap-x-6 2xl:gap-x-8">
		<button
			v-for="floor in sortedFloors"
			:key="floor.id"
			@click="selectFloor(floor.id)"
			:class="[
				'text-left text-lg xl:text-xl 2xl:text-2xl transition-all rounded-lg',
				selectedFloorId === floor.id ? ' text-white' : 'text-white/40 hover:text-white'
			]"
		>
			{{ floor.name }}
		</button>
	</div>
</template>

<script setup lang="ts">
import type { Floor } from "~/types/system";

interface Props {
	floors: Floor[];
	modelValue?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
	"update:modelValue": [value: string];
	"floor-selected": [floorId: string];
}>();

// 按照附圖的兩欄排序：
// 左欄：12F→11F→...→1F→B1F→B2F→B3F (從上到下，按 level 降序)
// 右欄：R3F→R2F→R1F→24F→23F→...→13F (從上到下，按 level 降序)
const sortedFloors = computed(() => {
	const leftColumn: Floor[] = [];
	const rightColumn: Floor[] = [];

	// 根據 level 分類到左欄和右欄
	props.floors.forEach((floor) => {
		const level = floor.level;
		// 左欄：level 1-12 和負數（B樓層）
		if ((level >= 1 && level <= 12) || level < 0) {
			leftColumn.push(floor);
		}
		// 右欄：level 13-24 和 level >= 25（R樓層）
		else if (level >= 13) {
			rightColumn.push(floor);
		}
	});

	// 兩欄都按 level 降序排列（負數也會正確排序：B1F(-1) > B2F(-2) > B3F(-3)）
	leftColumn.sort((a, b) => b.level - a.level);
	rightColumn.sort((a, b) => b.level - a.level);

	// 合併兩欄，按照 grid-cols-2 的順序排列（左欄第1個，右欄第1個，左欄第2個，右欄第2個...）
	const result: Floor[] = [];
	const maxLength = Math.max(leftColumn.length, rightColumn.length);

	for (let i = 0; i < maxLength; i++) {
		if (i < leftColumn.length) {
			result.push(leftColumn[i]);
		}
		if (i < rightColumn.length) {
			result.push(rightColumn[i]);
		}
	}

	return result;
});

const selectedFloorId = computed({
	get: () => props.modelValue || sortedFloors.value[0]?.id || "",
	set: (value) => {
		emit("update:modelValue", value);
		emit("floor-selected", value);
	}
});

const selectFloor = (floorId: string) => {
	selectedFloorId.value = floorId;
};
</script>
