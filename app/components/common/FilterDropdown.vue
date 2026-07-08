<template>
	<div ref="dropdownRef" class="filter-dropdown relative w-full min-w-0">
		<div class="flex min-w-0 items-center gap-2">
			<span
				v-if="statusDot"
				class="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.25)]"
				:class="statusDot.class"
				:aria-label="statusDot.label"
			/>
			<input
				:value="displayValue"
				readonly
				@click="toggleDropdown"
				:class="['select-filter min-w-0 flex-1 cursor-pointer text-center', textSize]"
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
									'w-full whitespace-nowrap rounded px-3 py-2 text-center text-white transition-colors',
									textSize,
									isSelected(option.value) ? 'bg-blue-500/80 text-white' : 'hover:bg-white/10',
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
import {
	getMonitorCategoryStatusDot,
	type MonitorCategoryStatus,
} from "~/utils/monitorViewCategoryStatus"

interface FilterOption {
	value: string
	label: string
}

interface Props {
	modelValue: string
	options: FilterOption[]
	placeholder?: string
	textSize?: string
	/** 觸發按鈕狀態圓點（監控中心檢視分類用） */
	status?: MonitorCategoryStatus
}

const props = withDefaults(defineProps<Props>(), {
	placeholder: "請選擇",
	textSize: "text-base",
})

const emit = defineEmits<{
	"update:modelValue": [value: string]
}>()

const showDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownMenuRef = ref<HTMLElement | null>(null)
const positionTick = ref(0)

const statusDot = computed(() => getMonitorCategoryStatusDot(props.status))

const dropdownStyle = computed(() => {
	positionTick.value
	if (!dropdownRef.value || !showDropdown.value) {
		return {}
	}

	const rect = dropdownRef.value.getBoundingClientRect()

	return {
		top: `${rect.bottom + 8}px`,
		left: `${rect.left}px`,
		width: `${rect.width}px`,
	}
})

const toggleDropdown = () => {
	showDropdown.value = !showDropdown.value
}

const isSelected = (value: string): boolean => {
	if (
		(props.modelValue === "" || props.modelValue === null || props.modelValue === undefined) &&
		(value === "" || value === null || value === undefined)
	) {
		return true
	}
	return props.modelValue === value
}

const displayValue = computed(() => {
	const selectedOption = props.options.find((opt) => isSelected(opt.value))
	return selectedOption?.label || props.placeholder
})

const selectOption = (value: string) => {
	emit("update:modelValue", value)
	showDropdown.value = false
}

const handleClickOutside = (event: MouseEvent) => {
	const target = event.target as HTMLElement
	if (
		showDropdown.value &&
		!target.closest(".filter-dropdown") &&
		!dropdownMenuRef.value?.contains(target)
	) {
		showDropdown.value = false
	}
}

const updatePosition = () => {
	if (!showDropdown.value) return
	positionTick.value += 1
}

onMounted(() => {
	document.addEventListener("click", handleClickOutside)
	window.addEventListener("scroll", updatePosition, true)
	window.addEventListener("resize", updatePosition)
})

onBeforeUnmount(() => {
	document.removeEventListener("click", handleClickOutside)
	window.removeEventListener("scroll", updatePosition, true)
	window.removeEventListener("resize", updatePosition)
})
</script>
