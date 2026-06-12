<template>
	<span :class="pill.className">{{ displayLabel }}</span>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { SyncStepUiStatus } from "~/utils/personnelUtils"
import { resolveSyncStatusPill, type SyncStatusPillVariant } from "./syncStatusPillUtils"

const props = defineProps<{
	variant: SyncStatusPillVariant
	status?: string | SyncStepUiStatus | null
	label?: string
}>()

const pill = computed(() =>
	resolveSyncStatusPill({
		variant: props.variant,
		status: props.status,
		label: props.label,
	}),
)

const displayLabel = computed(() => {
	if (props.variant === "step" && props.label) return props.label
	return pill.value.label
})
</script>
