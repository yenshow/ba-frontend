<template>
	<div
		v-if="items.length > 0"
		class="flex flex-wrap items-center justify-end gap-1.5"
		role="group"
		:aria-label="ariaLabel"
	>
		<span
			v-for="item in items"
			:key="item.key"
			class="inline-flex h-9 w-9 items-center justify-center rounded-md border 2xl:h-10 2xl:w-10"
			:class="syncStepIconClass(item.status)"
			:title="syncStepAriaLabel(item.label, item.status)"
			:aria-label="syncStepAriaLabel(item.label, item.status)"
		>
			<svg
				class="shrink-0"
				:class="iconSizeClass"
				:viewBox="item.viewBox"
				aria-hidden="true"
			>
				<path v-bind="item.path" />
			</svg>
		</span>
	</div>
</template>

<script setup lang="ts">
import type { SyncCredentialIndicatorItem } from "~/utils/syncCredentialIcons"
import { syncStepAriaLabel, syncStepIconClass } from "~/utils/personnelUtils"

withDefaults(
	defineProps<{
		items: SyncCredentialIndicatorItem[]
		ariaLabel?: string
	}>(),
	{ ariaLabel: "設備同步狀態" },
)

const iconSizeClass = "h-[1.125rem] w-[1.125rem] 2xl:h-5 2xl:w-5"
</script>
