<template>
	<input
		:value="draft"
		type="text"
		inputmode="numeric"
		autocomplete="off"
		placeholder="YYYY-MM-DD HH:mm"
		:required="required"
		:disabled="disabled"
		:class="[inputClass, 'min-w-0 w-full']"
		:aria-label="ariaLabel || undefined"
		:aria-required="required || undefined"
		@input="handleInput"
		@blur="handleBlur"
		@keydown.enter="handleBlur"
	/>
</template>

<script setup lang="ts">
import {
	formatDateTimeLocalDisplay,
	parseDateTimeLocalInput,
} from "~/utils/dateUtils"

interface Props {
	modelValue: string
	/** 搭配既有表單樣式，例如 form-input / form-input-small */
	inputClass?: string
	required?: boolean
	disabled?: boolean
	ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
	inputClass: "form-input",
	required: false,
	disabled: false,
	ariaLabel: "",
})

const emit = defineEmits<{
	"update:modelValue": [value: string]
}>()

const draft = ref(formatDateTimeLocalDisplay(props.modelValue))

watch(
	() => props.modelValue,
	(next) => {
		const display = formatDateTimeLocalDisplay(next)
		const parsedDraft = parseDateTimeLocalInput(draft.value)
		// 外部更新時同步；輸入中且內容仍對應同一值則不打斷游標
		if (parsedDraft === next || draft.value === display) return
		if (!draft.value.trim() && !next) return
		draft.value = display
	}
)

const handleInput = (event: Event) => {
	const raw = (event.target as HTMLInputElement).value
	draft.value = raw
	const parsed = parseDateTimeLocalInput(raw)
	if (parsed !== null) {
		emit("update:modelValue", parsed)
	} else if (!raw.trim()) {
		emit("update:modelValue", "")
	}
}

const handleBlur = () => {
	const raw = draft.value.trim()
	if (!raw) {
		draft.value = ""
		emit("update:modelValue", "")
		return
	}
	const parsed = parseDateTimeLocalInput(raw)
	if (parsed) {
		draft.value = formatDateTimeLocalDisplay(parsed)
		emit("update:modelValue", parsed)
		return
	}
	draft.value = formatDateTimeLocalDisplay(props.modelValue)
}
</script>
