<template>
	<div class="group relative min-w-0 w-full">
		<div
			class="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-white/60 transition-colors group-focus-within:text-teal-200"
			aria-hidden="true"
		>
			<svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
				/>
			</svg>
		</div>
		<input
			:id="inputId"
			:value="modelValue"
			:type="show ? 'text' : 'password'"
			spellcheck="false"
			autocomplete="off"
			class="relative z-0 w-full min-w-0 rounded-lg border border-white/20 bg-black/30 py-2.5 pl-11 pr-11 font-mono text-sm text-white caret-white placeholder:text-white/40 transition-colors focus:border-teal-400/60 focus:outline-none focus:ring-1 focus:ring-teal-400/40 disabled:cursor-not-allowed disabled:opacity-50 2xl:text-base"
			:disabled="disabled"
			:placeholder="placeholder"
			:aria-label="ariaLabel"
			@input="handleInput"
		/>
		<button
			type="button"
			class="absolute inset-y-0 right-0 z-20 flex items-center pr-3 text-white/70 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
			:disabled="disabled"
			:aria-label="show ? '隱藏密碼' : '顯示密碼'"
			:aria-pressed="show"
			@click="handleToggle"
		>
			<svg
				v-if="!show"
				class="h-5 w-5 shrink-0"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
				/>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
				/>
			</svg>
			<svg v-else class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
				/>
			</svg>
		</button>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	modelValue: string
	inputId: string
	ariaLabel: string
	placeholder?: string
	disabled?: boolean
}>()

const emit = defineEmits<{
	"update:modelValue": [value: string]
}>()

const show = ref(false)

const handleInput = (e: Event) => {
	emit("update:modelValue", (e.target as HTMLInputElement).value)
}

const handleToggle = () => {
	if (props.disabled) return
	show.value = !show.value
}
</script>
