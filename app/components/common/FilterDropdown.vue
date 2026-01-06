<template>
	<div class="filter-dropdown relative">
		<div class="flex items-center gap-2">
			<input
				:value="displayValue"
				readonly
				@click="showDropdown = !showDropdown"
				class="select-filter w-[125px] cursor-pointer text-center"
				:placeholder="placeholder"
			/>
			<svg
				class="h-5 w-5 cursor-pointer text-white/70"
				@click="showDropdown = !showDropdown"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>

		<!-- 下拉選單 -->
		<Transition name="fade">
			<div
				v-if="showDropdown"
				class="absolute top-full z-50 mt-2 w-64 rounded-lg border border-white/20 bg-slate-800 p-2 shadow-lg"
			>
				<div class="space-y-1">
					<button
						v-for="option in options"
						:key="option.value"
						type="button"
						@click="selectOption(option.value)"
						:class="[
							'w-full rounded px-3 py-2 text-left text-sm text-white transition-colors',
							isSelected(option.value) ? 'bg-blue-500/80 text-white' : 'hover:bg-white/10'
						]"
					>
						{{ option.label }}
					</button>
				</div>
				<slot name="custom-content" />
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
interface FilterOption {
	value: string;
	label: string;
}

interface Props {
	modelValue: string;
	options: FilterOption[];
	placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
	placeholder: "請選擇"
});

const emit = defineEmits<{
	"update:modelValue": [value: string];
}>();

const showDropdown = ref(false);

// 檢查選項是否被選中
const isSelected = (value: string): boolean => {
	// 處理空值比較
	if (
		(props.modelValue === "" || props.modelValue === null || props.modelValue === undefined) &&
		(value === "" || value === null || value === undefined)
	) {
		return true;
	}
	return props.modelValue === value;
};

// 計算顯示值
const displayValue = computed(() => {
	const selectedOption = props.options.find(opt => isSelected(opt.value));
	return selectedOption?.label || props.placeholder;
});

// 選擇選項
const selectOption = (value: string) => {
	emit("update:modelValue", value);
	showDropdown.value = false;
};

// 點擊外部關閉下拉選單
onMounted(() => {
	const handleClickOutside = (event: MouseEvent) => {
		const target = event.target as HTMLElement;
		if (showDropdown.value && !target.closest(".filter-dropdown")) {
			showDropdown.value = false;
		}
	};
	document.addEventListener("click", handleClickOutside);
	onUnmounted(() => {
		document.removeEventListener("click", handleClickOutside);
	});
});
</script>

<style scoped>
/* 過渡動畫：淡入淡出 */
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
