<template>
	<div class="flex items-center gap-2" :class="wrapperClass">
		<label v-if="label" :for="inputId" class="sr-only">{{ label }}</label>
		<svg viewBox="0 0 24 24" fill="none" class="h-5 w-5 2xl:h-6 2xl:w-6" aria-hidden="true">
			<path
				d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm11 3-6-6"
				stroke="white"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		<div class="relative" :class="inputWrapperClass">
			<input
				:id="inputId"
				:value="modelValue"
				:type="type"
				:placeholder="placeholder"
				:autocomplete="autocomplete"
				:aria-label="ariaLabel"
				class="form-input w-[220px] border-white/30 bg-white/10 py-1.5 pe-10 ps-3 text-sm text-white placeholder:text-white/40 focus:border-cyan-400/60 focus:outline-none 2xl:w-[260px] 2xl:py-2 2xl:text-base"
				:class="inputClass"
				@input="handleInput"
				@keydown.enter="handleSearch"
			/>

			<button
				v-if="clearable && modelValue.trim()"
				type="button"
				class="absolute inset-y-0 end-2 my-auto flex h-7 w-7 items-center justify-center text-white 2xl:h-8 2xl:w-8"
				aria-label="清除搜尋"
				@click="handleClear"
			>
				<svg viewBox="0 0 24 24" fill="none" class="h-4 w-4 2xl:h-5 2xl:w-5" aria-hidden="true">
					<path
						d="M6 6l12 12M18 6L6 18"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		modelValue: string;
		inputId: string;
		label?: string;
		placeholder?: string;
		ariaLabel?: string;
		type?: "text" | "search";
		autocomplete?: string;
		clearable?: boolean;
		wrapperClass?: string;
		inputWrapperClass?: string;
		inputClass?: string;
	}>(),
	{
		label: "",
		placeholder: "",
		ariaLabel: "",
		type: "text",
		autocomplete: "off",
		clearable: true,
		wrapperClass: "",
		inputWrapperClass: "",
		inputClass: ""
	}
);

const emit = defineEmits<{
	"update:modelValue": [v: string];
	search: [];
	clear: [];
}>();

const handleInput = (e: Event) => {
	const value = (e.target as HTMLInputElement | null)?.value ?? "";
	emit("update:modelValue", value);
};

const handleSearch = () => emit("search");

const handleClear = () => {
	emit("update:modelValue", "");
	emit("clear");
};
</script>
