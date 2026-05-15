<template>
	<div class="show-scrollbar min-w-0 overflow-x-auto">
		<EntryExitLogTable :logs="logs" :display-columns="displayColumns" />
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingLog } from "~/types/peopleCounting"
import EntryExitLogTable from "~/components/people-counting/EntryExitLogTable.vue"
import type { PeopleCountingLogColumnKey } from "~/utils/peopleCountingLogColumns"

interface Props {
	logs: PeopleCountingLog[]
	displayColumns?: PeopleCountingLogColumnKey[] | string[] | null
}

defineProps<Props>()
</script>
