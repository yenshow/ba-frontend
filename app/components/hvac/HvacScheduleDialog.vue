<template>
	<DoScheduleDialog
		:model-value="modelValue"
		:zones="zones"
		:can-edit="canEdit"
		title="時間排程"
		system-noun="空調"
		on-time-label="開啟"
		off-time-label="關閉"
		:get-schedules="hvacApi.getSchedules"
		:put-schedules="hvacApi.putSchedules"
		@update:model-value="emit('update:modelValue', $event)"
	/>
</template>

<script setup lang="ts">
import type { HvacZone } from "~/types/hvac"
import { useHvacApi } from "~/composables/systems/hvac/useHvacApi"
import DoScheduleDialog from "~/components/schedule/DoScheduleDialog.vue"

defineProps<{
	modelValue: boolean
	zones: HvacZone[]
	canEdit?: boolean
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
}>()

const hvacApi = useHvacApi()
</script>
