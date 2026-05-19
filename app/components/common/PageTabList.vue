<template>
	<div :class="wrapperClass" role="tablist" :aria-label="ariaLabel">
		<button
			v-for="(tab, index) in tabs"
			:key="tab.id"
			:id="tabButtonId(tab.id)"
			type="button"
			role="tab"
			:aria-selected="modelValue === tab.id"
			:aria-controls="tabPanelId(tab.id)"
			:tabindex="modelValue === tab.id ? 0 : -1"
			:class="tabButtonClass(modelValue === tab.id)"
			@click="selectTab(tab.id)"
			@keydown="(e) => handleTabKeydown(e, index)"
		>
			{{ tab.label }}
		</button>
	</div>
</template>

<script setup lang="ts" generic="T extends string">
export type PageTabItem<T extends string = string> = {
	id: T
	label: string
}

const props = defineProps<{
	modelValue: T
	tabs: PageTabItem<T>[]
	ariaLabel: string
	idPrefix: string
	wrapperClass: string
}>()

const emit = defineEmits<{
	"update:modelValue": [value: T]
}>()

const tabButtonClass = (isActive: boolean) => [
	"whitespace-nowrap rounded-lg px-3 py-1.5 text-base font-medium transition-colors 2xl:text-lg",
	isActive ? "bg-cyan-500 text-white" : "text-white/80 hover:bg-white/10",
]

const tabButtonId = (id: T) => `${props.idPrefix}-${id}`
const tabPanelId = (id: T) => `${props.idPrefix}-panel-${id}`

const selectTab = (id: T) => {
	emit("update:modelValue", id)
}

const handleTabKeydown = (event: KeyboardEvent, index: number) => {
	if (props.tabs.length === 0) return

	let nextIndex = index
	if (event.key === "ArrowRight") {
		event.preventDefault()
		nextIndex = (index + 1) % props.tabs.length
	} else if (event.key === "ArrowLeft") {
		event.preventDefault()
		nextIndex = (index - 1 + props.tabs.length) % props.tabs.length
	} else if (event.key === "Home") {
		event.preventDefault()
		nextIndex = 0
	} else if (event.key === "End") {
		event.preventDefault()
		nextIndex = props.tabs.length - 1
	} else {
		return
	}

	const nextTab = props.tabs[nextIndex]
	if (!nextTab) return
	selectTab(nextTab.id)
	const el = document.getElementById(tabButtonId(nextTab.id))
	el?.focus()
}
</script>
