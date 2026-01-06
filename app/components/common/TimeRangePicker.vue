<template>
	<div class="time-range-picker relative">
		<div class="flex items-center gap-2">
			<input
				:value="displayValue"
				readonly
				@click="showDropdown = !showDropdown"
				class="select-filter w-[250px] cursor-pointer text-center"
				placeholder="選擇時間範圍"
			/>
			<svg
				class="h-5 w-5 cursor-pointer text-white/70"
				@click="showDropdown = !showDropdown"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
			<svg
				class="h-4 w-4 cursor-pointer text-white/70 transition-transform"
				:class="{ 'rotate-180': showDropdown }"
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
						v-for="preset in presets"
						:key="preset.value"
						type="button"
						@click="selectPreset(preset.value)"
						:class="[
							'w-full rounded px-3 py-2 text-left text-sm text-white transition-colors',
							selectedPreset === preset.value ? 'bg-blue-500/80 text-white' : 'hover:bg-white/10'
						]"
					>
						{{ preset.label }}
					</button>
				</div>
				<div v-if="selectedPreset === 'custom'" class="mt-3 space-y-2 border-t border-white/10 pt-2">
					<div>
						<label class="mb-1 block text-xs text-white/70">開始日期</label>
						<input
							v-model="customStartDate"
							type="date"
							class="w-full rounded border border-white/20 bg-slate-700 px-2 py-1 text-sm text-white"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs text-white/70">結束日期</label>
						<input
							v-model="customEndDate"
							type="date"
							class="w-full rounded border border-white/20 bg-slate-700 px-2 py-1 text-sm text-white"
						/>
					</div>
					<button
						type="button"
						@click="applyCustomRange"
						class="w-full rounded bg-blue-500/80 px-3 py-2 text-sm text-white hover:bg-blue-500"
					>
						套用
					</button>
				</div>
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
interface TimeRangePreset {
	value: string;
	label: string;
}

interface Props {
	modelValue: {
		startDate: string;
		endDate: string;
		preset: string;
	};
	presets: TimeRangePreset[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
	"update:modelValue": [value: { startDate: string; endDate: string; preset: string }];
}>();

const showDropdown = ref(false);
const selectedPreset = ref(props.modelValue.preset || "today");
const customStartDate = ref("");
const customEndDate = ref("");

// 輔助函數：補零
const padZero = (n: number): string => String(n).padStart(2, "0");

// 格式化日期（用於顯示）
const formatDateRange = (date: Date): string => {
	return `${date.getFullYear()}/${padZero(date.getMonth() + 1)}/${padZero(date.getDate())}`;
};

// 計算顯示值
const displayValue = computed(() => {
	if (!props.modelValue.startDate || !props.modelValue.endDate) {
		return "選擇時間範圍";
	}

	// 如果不是自訂選項，顯示選項名稱
	if (selectedPreset.value !== "custom") {
		const preset = props.presets.find(p => p.value === selectedPreset.value);
		return preset?.label || "選擇時間範圍";
	}

	// 自訂選項時，只顯示日期
	return `${formatDateRange(new Date(props.modelValue.startDate))} - ${formatDateRange(new Date(props.modelValue.endDate))}`;
});

// 獲取時間範圍
const getTimeRange = (preset: string): { start: Date; end: Date } => {
	const now = new Date();
	const end = new Date(now);
	let start = new Date(now);

	switch (preset) {
		case "past_hour":
			start = new Date(now.getTime() - 60 * 60 * 1000);
			break;
		case "today":
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			break;
		case "yesterday":
			start.setDate(start.getDate() - 1);
			start.setHours(0, 0, 0, 0);
			end.setDate(end.getDate() - 1);
			end.setHours(23, 59, 59, 999);
			break;
		case "this_week":
			const dayOfWeek = start.getDay();
			const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
			start.setDate(diff);
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			break;
		case "last_week":
			const lastWeekDayOfWeek = start.getDay();
			const lastWeekDiff = start.getDate() - lastWeekDayOfWeek - 6 + (lastWeekDayOfWeek === 0 ? -6 : 1);
			start.setDate(lastWeekDiff);
			start.setHours(0, 0, 0, 0);
			end.setDate(lastWeekDiff + 6);
			end.setHours(23, 59, 59, 999);
			break;
		case "last_7_days":
			start.setDate(start.getDate() - 7);
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			break;
		case "last_30_days":
			start.setDate(start.getDate() - 30);
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			break;
		default:
			return { start: new Date(), end: new Date() };
	}

	return { start, end };
};

// 格式化為 date 格式 (YYYY-MM-DD)
const formatDateLocal = (date: Date): string => {
	return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
};

// 選擇預設選項
const selectPreset = (preset: string) => {
	selectedPreset.value = preset;

	if (preset !== "custom") {
		const { start, end } = getTimeRange(preset);
		emit("update:modelValue", {
			startDate: start.toISOString(),
			endDate: end.toISOString(),
			preset
		});
		showDropdown.value = false;
	} else {
		// 自訂模式，保持下拉選單開啟
		if (!customStartDate.value || !customEndDate.value) {
			const today = new Date();
			customStartDate.value = formatDateLocal(today);
			customEndDate.value = formatDateLocal(today);
		}
	}
};

// 套用自訂時間範圍
const applyCustomRange = () => {
	if (customStartDate.value && customEndDate.value) {
		const start = new Date(customStartDate.value);
		start.setHours(0, 0, 0, 0);
		const end = new Date(customEndDate.value);
		end.setHours(23, 59, 59, 999);

		emit("update:modelValue", {
			startDate: start.toISOString(),
			endDate: end.toISOString(),
			preset: "custom"
		});
		showDropdown.value = false;
	}
};

// 點擊外部關閉下拉選單
onMounted(() => {
	const handleClickOutside = (event: MouseEvent) => {
		const target = event.target as HTMLElement;
		if (showDropdown.value && !target.closest(".time-range-picker")) {
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

