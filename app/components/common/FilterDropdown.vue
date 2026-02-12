<template>
	<div ref="dropdownRef" class="filter-dropdown relative">
		<div class="flex items-center gap-2">
			<input
				:value="displayValue"
				readonly
				@click="toggleDropdown"
				:class="['select-filter cursor-pointer text-center', textSize]"
				:placeholder="placeholder"
			/>
			<svg
				class="h-5 w-5 flex-shrink-0 cursor-pointer text-white/70"
				@click="toggleDropdown"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>

		<!-- 下拉選單（使用 Teleport 避免被容器裁剪） -->
		<Teleport to="body">
			<Transition name="fade">
				<div
					v-if="showDropdown"
					ref="dropdownMenuRef"
					class="fixed z-[9999] rounded-lg border border-white/20 bg-slate-800 shadow-lg"
					:style="dropdownStyle"
				>
					<div class="show-scrollbar max-h-60 overflow-y-auto p-2">
						<div class="space-y-1">
							<button
								v-for="option in options"
								:key="option.value"
								type="button"
								@click="selectOption(option.value)"
								:class="[
									'w-full rounded px-3 py-2 text-center text-white transition-colors',
									textSize,
									isSelected(option.value) ? 'bg-blue-500/80 text-white' : 'hover:bg-white/10'
								]"
							>
								{{ option.label }}
							</button>
						</div>
						<slot name="custom-content" />
					</div>
				</div>
			</Transition>
		</Teleport>
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
	textSize?: string;
}

const props = withDefaults(defineProps<Props>(), {
	placeholder: "請選擇",
	textSize: "text-base"
});

const emit = defineEmits<{
	"update:modelValue": [value: string];
}>();

const showDropdown = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);
const dropdownMenuRef = ref<HTMLElement | null>(null);

// 計算下拉選單位置
const dropdownStyle = computed(() => {
	if (!dropdownRef.value || !showDropdown.value) {
		return {};
	}

	const rect = dropdownRef.value.getBoundingClientRect();
	const dropdownWidth = rect.width;
	
	// 計算位置：在輸入框下方，左對齊
	// getBoundingClientRect() 返回的是相對於視口的座標，fixed 定位也是相對於視口
	return {
		top: `${rect.bottom + 8}px`, // 8px = mt-2
		left: `${rect.left}px`,
		width: `${dropdownWidth}px`
	};
});

// 切換下拉選單
const toggleDropdown = () => {
	showDropdown.value = !showDropdown.value;
};

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
const handleClickOutside = (event: MouseEvent) => {
	const target = event.target as HTMLElement;
	if (
		showDropdown.value &&
		!target.closest(".filter-dropdown") &&
		!dropdownMenuRef.value?.contains(target)
	) {
		showDropdown.value = false;
	}
};

// 監聽滾動和調整大小，更新位置
const updatePosition = () => {
	if (showDropdown.value) {
		// 觸發重新計算位置（通過響應式更新）
		nextTick(() => {
			// 位置會自動通過 computed 更新
		});
	}
};

onMounted(() => {
	document.addEventListener("click", handleClickOutside);
	window.addEventListener("scroll", updatePosition, true);
	window.addEventListener("resize", updatePosition);
});

onBeforeUnmount(() => {
	document.removeEventListener("click", handleClickOutside);
	window.removeEventListener("scroll", updatePosition, true);
	window.removeEventListener("resize", updatePosition);
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
