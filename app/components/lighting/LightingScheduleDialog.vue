<template>
	<DoScheduleDialog
		:model-value="modelValue"
		:zones="zones"
		:can-edit="canEdit"
		title="時間排程"
		system-noun="照明"
		on-time-label="開燈"
		off-time-label="關燈"
		:get-schedules="lightingApi.getSchedules"
		:put-schedules="lightingApi.putSchedules"
		@update:model-value="emit('update:modelValue', $event)"
	/>
</template>

<script setup lang="ts">
import type { LightingZone } from "~/types/lighting"
import { useLightingApi } from "~/composables/systems/lighting/useLightingApi"
import DoScheduleDialog from "~/components/schedule/DoScheduleDialog.vue"

defineProps<{
	modelValue: boolean
	zones: LightingZone[]
	canEdit?: boolean
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
}>()

const lightingApi = useLightingApi()
</script>
