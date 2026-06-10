<template>
	<div class="show-scrollbar flex h-full flex-col overflow-y-auto">
		<ElevatorEventLogTable :logs="logs" :display-columns="displayColumns" />
	</div>
</template>

<script setup lang="ts">
import type { ElevatorLog } from "~/types/elevator"
import ElevatorEventLogTable from "~/components/elevator/ElevatorEventLogTable.vue"

interface Props {
	logs: ElevatorLog[]
	displayColumns?: string[]
}

withDefaults(defineProps<Props>(), {
	logs: () => [],
	displayColumns: undefined,
})
</script>
