<template>
	<div class="vehicle-org-panel min-h-[220px] space-y-4">
		<h3
			class="vehicle-org-title bg-white/20 py-1 text-center text-lg font-semibold text-white 2xl:text-xl"
		>
			{{ panelTitle }}
		</h3>
		<div class="grid grid-cols-3 gap-4 2xl:grid-cols-4">
			<button
				v-for="group in groups"
				:key="group.groupKey"
				type="button"
				class="flex cursor-pointer flex-col items-center justify-center border-2 border-white/0 py-2 transition-all"
				:class="{
					'border-white/70': selectedGroupKey === group.groupKey,
					'bg-white/20': (group.onSiteCount || 0) > 0,
					'bg-black/20': (group.onSiteCount || 0) === 0,
				}"
				tabindex="0"
				role="button"
				:aria-label="`查看 ${group.personGroupName} 過車記錄`"
				@click="handleSelect(group)"
				@keydown.enter="handleSelect(group)"
				@keydown.space.prevent="handleSelect(group)"
			>
				<div
					class="vehicle-org-name max-w-full truncate px-1 text-base font-semibold tracking-wide text-white 2xl:text-lg"
				>
					{{ group.personGroupName }}
				</div>
				<div
					class="vehicle-org-count mt-0.5 flex items-center gap-1 text-sm text-white 2xl:text-base"
				>
					<span class="text-green-400">{{ group.onSiteCount || 0 }}</span>
					<span>/</span>
					<span>{{ group.vehicleCount || 0 }}</span>
				</div>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { VehicleOrganizationGroupItem } from "~/types/vehicleAccess"

withDefaults(
	defineProps<{
		groups: VehicleOrganizationGroupItem[]
		selectedGroupKey?: string
		panelTitle?: string
	}>(),
	{ panelTitle: "車輛群組" }
)

const emit = defineEmits<{
	(e: "select", groupKey: string): void
}>()

const handleSelect = (group: VehicleOrganizationGroupItem) => {
	if (group.groupKey) emit("select", group.groupKey)
}
</script>
