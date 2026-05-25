<template>
	<div
		v-if="showList"
		role="tablist"
		:aria-label="ariaLabel"
		:class="mergedListClass"
	>
		<button
			v-for="(tab, index) in tabs"
			:key="tab.id"
			:id="tabButtonId(tab.id)"
			type="button"
			role="tab"
			:aria-selected="modelValue === tab.id"
			:aria-controls="tabPanelId(tab.id)"
			:tabindex="modelValue === tab.id ? 0 : -1"
			:class="resolveButtonClass(modelValue === tab.id)"
			@click="selectTab(tab.id)"
			@keydown="(event) => handleTabKeydown(event, index)"
		>
			{{ tab.label }}
		</button>
	</div>

	<template v-if="showPanels">
		<template v-if="singlePanel">
			<Transition v-if="panelTransition" name="fade" mode="out-in">
				<div
					:key="String(modelValue)"
					:id="tabPanelId(modelValue)"
					role="tabpanel"
					:class="panelClass"
					:aria-labelledby="tabButtonId(modelValue)"
				>
					<slot />
				</div>
			</Transition>
			<div
				v-else
				:id="tabPanelId(modelValue)"
				role="tabpanel"
				:class="panelClass"
				:aria-labelledby="tabButtonId(modelValue)"
			>
				<slot />
			</div>
		</template>

		<Transition v-else name="fade" mode="out-in">
			<div
				:key="String(modelValue)"
				:id="tabPanelId(modelValue)"
				role="tabpanel"
				:class="panelClass"
				:aria-labelledby="tabButtonId(modelValue)"
			>
				<slot :name="modelValue" />
			</div>
		</Transition>
	</template>
</template>

<script setup lang="ts" generic="T extends string">
export type PageTabItem<T extends string = string> = {
	id: T
	label: string
}

const LIST_CLASS = "flex gap-1 rounded-xl border border-white/20 bg-white/5 p-1"
const BUTTON_CLASS =
	"whitespace-nowrap rounded-lg px-3 py-1.5 text-base font-medium transition-colors 2xl:text-lg"

const props = withDefaults(
	defineProps<{
		modelValue: T
		tabs: PageTabItem<T>[]
		list?: boolean
		panels?: boolean
		singlePanel?: boolean
		panelTransition?: boolean
		hideListWhenSingle?: boolean
		ariaLabel?: string
		/** 附加在預設 tab 外框（如 me-auto、overflow-x-auto） */
		listClass?: string
		/** 附加在預設 tab 按鈕 */
		buttonClass?: string
		panelClass?: string
		idPrefix?: string
	}>(),
	{
		list: true,
		panels: true,
		singlePanel: false,
		panelTransition: true,
		hideListWhenSingle: true,
		ariaLabel: "分頁",
		listClass: "",
		buttonClass: "",
		panelClass: "",
		idPrefix: "page-tab",
	},
)

const emit = defineEmits<{
	"update:modelValue": [value: T]
}>()

const showList = computed(
	() =>
		props.list &&
		props.tabs.length > 0 &&
		(!props.hideListWhenSingle || props.tabs.length > 1),
)

const showPanels = computed(() => props.panels)

const mergedListClass = computed(() =>
	[LIST_CLASS, props.listClass].filter(Boolean).join(" "),
)

const resolveButtonClass = (active: boolean) =>
	[
		BUTTON_CLASS,
		props.buttonClass,
		active ? "bg-cyan-500 text-white" : "text-white/80 hover:bg-white/10",
	]
		.filter(Boolean)
		.join(" ")

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
	document.getElementById(tabButtonId(nextTab.id))?.focus()
}
</script>
