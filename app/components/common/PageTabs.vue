<template>
	<div :class="rootClass">
		<!-- header：標題列 + Tab + 右側操作 -->
		<div
			v-if="layout === 'header' && (hasTabBar || $slots.prefix || $slots.suffix)"
			class="flex flex-wrap items-center justify-between gap-4"
		>
			<slot name="prefix" />
			<PageTabList
				v-if="hasTabBar"
				:model-value="modelValue"
				:tabs="tabs"
				:ariaLabel="ariaLabel"
				:id-prefix="idPrefix"
				:wrapper-class="tabListWrapperClass"
				:class="tabListClass"
				@update:model-value="selectTab"
			/>
			<slot name="suffix" />
		</div>

		<!-- section：區塊標題列 + Tab -->
		<div
			v-else-if="layout === 'section' && (hasTabBar || $slots['section-leading'])"
			class="flex flex-wrap items-center justify-between gap-4"
		>
			<slot name="section-leading" />
			<PageTabList
				v-if="hasTabBar"
				:model-value="modelValue"
				:tabs="tabs"
				:ariaLabel="ariaLabel"
				:id-prefix="idPrefix"
				:wrapper-class="tabListWrapperClass"
				:class="tabListClass"
				@update:model-value="selectTab"
			/>
		</div>

		<!-- stacked：可選 prefix + Tab 列 -->
		<slot v-if="layout === 'stacked' && $slots.prefix" name="prefix" />
		<PageTabList
			v-if="layout === 'stacked' && hasTabBar"
			:model-value="modelValue"
			:tabs="tabs"
			:ariaLabel="ariaLabel"
			:id-prefix="idPrefix"
			:wrapper-class="tabListWrapperClass"
			:class="tabListClass"
			@update:model-value="selectTab"
		/>

		<div :class="contentClass">
			<!-- 單一面板（設備管理等）：可關閉外層過渡，由頁面自行處理列表動畫 -->
			<template v-if="singlePanel">
				<Transition v-if="panelTransition" name="fade" mode="out-in">
					<div
						:key="String(modelValue)"
						:id="tabPanelId(modelValue)"
						role="tabpanel"
						:aria-labelledby="tabButtonId(modelValue)"
					>
						<slot />
					</div>
				</Transition>
				<div
					v-else
					:id="tabPanelId(modelValue)"
					role="tabpanel"
					:aria-labelledby="tabButtonId(modelValue)"
				>
					<slot />
				</div>
			</template>

			<!-- 多面板：具名 slot 對應 tab id -->
			<Transition v-else name="fade" mode="out-in">
				<div
					:key="String(modelValue)"
					:id="tabPanelId(modelValue)"
					role="tabpanel"
					:aria-labelledby="tabButtonId(modelValue)"
				>
					<slot :name="modelValue" />
				</div>
			</Transition>
		</div>
	</div>
</template>

<script setup lang="ts" generic="T extends string">
import PageTabList, { type PageTabItem } from "~/components/common/PageTabList.vue"

export type { PageTabItem }

const props = withDefaults(
	defineProps<{
		modelValue: T
		tabs: PageTabItem<T>[]
		layout?: "header" | "section" | "stacked"
		/** 單一面板：使用 default slot，適用同一區塊僅資料隨 tab 切換 */
		singlePanel?: boolean
		/** 單一面板時是否套用 fade 過渡（設備頁列表已有 Transition 時可關閉） */
		panelTransition?: boolean
		ariaLabel?: string
		tabListClass?: string
		contentClass?: string
		rootClass?: string
		idPrefix?: string
	}>(),
	{
		layout: "stacked",
		singlePanel: false,
		panelTransition: true,
		ariaLabel: "分頁",
		tabListClass: "",
		contentClass: "",
		rootClass: "",
		idPrefix: "page-tab",
	},
)

const emit = defineEmits<{
	"update:modelValue": [value: T]
}>()

const hasTabBar = computed(() => props.tabs.length > 1)

const tabListWrapperClass =
	"flex flex-wrap gap-1 rounded-xl border border-white/20 bg-white/5 p-1"

const tabButtonId = (id: T) => `${props.idPrefix}-${id}`
const tabPanelId = (id: T) => `${props.idPrefix}-panel-${id}`

const selectTab = (id: T) => {
	emit("update:modelValue", id)
}
</script>
