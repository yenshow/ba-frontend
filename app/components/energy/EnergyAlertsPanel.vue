<script setup lang="ts">
import type { EnergyAlertDisplayItem } from "~/types/energy"
import EnergyAlertList from "~/components/energy/EnergyAlertList.vue"

const DISPLAY_LIMIT = 3

const props = defineProps<{
	alerts: EnergyAlertDisplayItem[]
}>()

const emit = defineEmits<{ "show-all": [] }>()

const hasMore = computed(() => props.alerts.length > DISPLAY_LIMIT)

const handleShowAll = () => {
	emit("show-all")
}
</script>

<template>
	<div>
		<h3 class="mb-4 text-center text-xl font-semibold tracking-[4px] 2xl:text-2xl">告警通知</h3>
		<EnergyAlertList
			:alerts="alerts"
			:limit="DISPLAY_LIMIT"
			empty-hint="契約／表計異常與用量提示會顯示於此"
		/>
		<div v-if="hasMore" class="mt-2 text-right">
			<button
				type="button"
				class="cursor-pointer border-none bg-transparent text-sm text-white/70 transition-colors hover:text-white 2xl:text-base"
				aria-label="查看更多告警通知"
				@click="handleShowAll"
			>
				查看更多 >
			</button>
		</div>
	</div>
</template>
