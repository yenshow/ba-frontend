<template>
	<div class="show-scrollbar flex h-full min-h-0 flex-col space-y-4 overflow-y-auto">
		<ElevatorStatusPanel
			:current-floor="null"
			direction="idle"
			:is-connected="false"
		/>
		<div class="min-h-0 flex-1">
			<ElevatorEventLogTable :logs="logs" :display-columns="displayColumns" />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { ElevatorLog } from "~/types/elevator"
import ElevatorStatusPanel from "~/components/elevator/ElevatorStatusPanel.vue"
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
