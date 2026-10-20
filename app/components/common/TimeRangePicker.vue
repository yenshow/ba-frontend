<template>
	<div class="time-range-picker relative">
		<div class="flex items-center gap-2">
			<input
				:value="displayValue"
				readonly
				class="select-filter w-[250px] cursor-pointer text-center text-base"
				placeholder="選擇時間範圍"
				aria-label="選擇時間範圍"
				@click="showDropdown = !showDropdown"
			/>
			<svg
				class="h-5 w-5 cursor-pointer text-white/70"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
				@click="showDropdown = !showDropdown"
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
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
				@click="showDropdown = !showDropdown"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>

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
						:class="[
							'w-full rounded px-3 py-2 text-left text-sm text-white transition-colors',
							selectedPreset === preset.value ? 'bg-blue-500/80 text-white' : 'hover:bg-white/10',
						]"
						@click="handleSelectPreset(preset.value)"
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
						class="w-full rounded bg-blue-500/80 px-3 py-2 text-sm text-white hover:bg-blue-500"
						@click="handleApplyCustomRange"
					>
						套用
					</button>
				</div>
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import {
	formatDateInput,
	formatInclusiveLocalRangeDisplay,
	getTimeRangeUTC,
	isoRangeToInclusiveYmd,
	localDayRangeFromInclusiveYmd,
} from "~/utils/dateUtils";

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

watch(
	() => props.modelValue.preset,
	(preset) => {
		if (preset) selectedPreset.value = preset;
	},
);

const displayValue = computed(() => {
	if (!props.modelValue.startDate || !props.modelValue.endDate) {
		return "選擇時間範圍";
	}
	if (selectedPreset.value !== "custom") {
		return props.presets.find((p) => p.value === selectedPreset.value)?.label || "選擇時間範圍";
	}
	return formatInclusiveLocalRangeDisplay(props.modelValue.startDate, props.modelValue.endDate);
});

const syncCustomInputs = () => {
	if (props.modelValue.preset === "custom" && props.modelValue.startDate && props.modelValue.endDate) {
		const { startDate, endDate } = isoRangeToInclusiveYmd(
			props.modelValue.startDate,
			props.modelValue.endDate,
		);
		customStartDate.value = startDate;
		customEndDate.value = endDate;
		return;
	}
	if (!customStartDate.value || !customEndDate.value) {
		const today = formatDateInput(new Date());
		customStartDate.value = today;
		customEndDate.value = today;
	}
};

const handleSelectPreset = (preset: string) => {
	selectedPreset.value = preset;
	if (preset === "custom") {
		syncCustomInputs();
		return;
	}
	const { start, end } = getTimeRangeUTC(preset);
	emit("update:modelValue", {
		startDate: start.toISOString(),
		endDate: end.toISOString(),
		preset,
	});
	showDropdown.value = false;
};

const handleApplyCustomRange = () => {
	const range = localDayRangeFromInclusiveYmd(customStartDate.value, customEndDate.value);
	if (!range) return;
	emit("update:modelValue", {
		startDate: range.start.toISOString(),
		endDate: range.end.toISOString(),
		preset: "custom",
	});
	showDropdown.value = false;
};

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
