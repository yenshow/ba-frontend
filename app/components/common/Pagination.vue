<template>
	<div v-if="show" class="mt-6 flex items-center justify-between text-white/80">
		<div class="text-sm 2xl:text-base">
			顯示 {{ offset + 1 }}-{{ Math.min(offset + limit, total) }} / 共 {{ total }} 筆
		</div>
		<div class="flex items-center gap-2 2xl:gap-3">
			<button
				type="button"
				class="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-4 2xl:py-2 2xl:text-base"
				:disabled="offset === 0 || disabled"
				@click="handlePrevious"
			>
				上一頁
			</button>
			<button
				type="button"
				class="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-4 2xl:py-2 2xl:text-base"
				:disabled="offset + limit >= total || disabled"
				@click="handleNext"
			>
				下一頁
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	/** 總筆數 */
	total: number;
	/** 當前偏移量 */
	offset: number;
	/** 每頁筆數 */
	limit: number;
	/** 是否禁用（例如載入中） */
	disabled?: boolean;
	/** 是否顯示（通常用於判斷是否有數據且總數超過每頁限制） */
	show?: boolean;
}

interface Emits {
	(e: "previous"): void;
	(e: "next"): void;
}

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
	show: true
});

const emit = defineEmits<Emits>();

const handlePrevious = () => {
	if (props.offset > 0 && !props.disabled) {
		emit("previous");
	}
};

const handleNext = () => {
	if (props.offset + props.limit < props.total && !props.disabled) {
		emit("next");
	}
};
</script>
