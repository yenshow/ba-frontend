<template>
	<div ref="dropdownRef" class="filter-dropdown relative w-full min-w-0">
		<div class="flex min-w-0 items-center gap-2">
			<span
				v-if="selectedStatus && selectedStatus !== 'normal'"
				class="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.25)]"
				:class="statusDotClass(selectedStatus)"
				:aria-label="statusAriaLabel(selectedStatus)"
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
									'flex w-full items-center justify-center gap-2 rounded px-3 py-2 text-white transition-colors',
									textSize,
									isSelected(option.value) ? 'bg-blue-500/80 text-white' : 'hover:bg-white/10',
								]"
							>
								<span
									v-if="option.status && option.status !== 'normal'"
									class="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.25)]"
									:class="statusDotClass(option.status)"
									aria-hidden="true"
								/>
								<span v-else class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
								<span>{{ option.label }}</span>
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
import type { MonitorCategoryStatus } from "~/utils/monitorViewCategoryStatus"

export type FilterOptionStatus = MonitorCategoryStatus

interface FilterOption {
	value: string
	label: string
	status?: FilterOptionStatus
}

interface Props {
	modelValue: string
	options: FilterOption[]
	placeholder?: string
	textSize?: string
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

const statusDotClass = (status: FilterOptionStatus): string => {
	if (status === "alarm") return "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.65)]"
	if (status === "warning") return "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.65)]"
	return "bg-transparent"
}

const statusAriaLabel = (status: FilterOptionStatus): string => {
	if (status === "alarm") return "此分類有警報"
	if (status === "warning") return "此分類有異常"
	return ""
}

const dropdownStyle = computed(() => {
	// 讓 scroll/resize 時能重新計算位置（不必改動 DOM）
	positionTick.value
	if (!dropdownRef.value || !showDropdown.value) {
		return {}
	}

	const rect = dropdownRef.value.getBoundingClientRect()
	const dropdownWidth = rect.width

	return {
		top: `${rect.bottom + 8}px`,
		left: `${rect.left}px`,
		width: `${dropdownWidth}px`,
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

const selectedOption = computed(() => props.options.find((opt) => isSelected(opt.value)))

const selectedStatus = computed(() => selectedOption.value?.status)

const displayValue = computed(() => selectedOption.value?.label || props.placeholder)

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
