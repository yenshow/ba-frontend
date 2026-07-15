<template>
	<div class="space-y-4 min-h-[220px]">
		<h3
			v-if="!hideTitle"
			class="people-unit-title monitoring-chip-bg py-1 text-center text-lg font-semibold text-white 2xl:text-xl"
		>
			人員群組
		</h3>
		<div class="grid grid-cols-3 2xl:grid-cols-4 gap-2 2xl:gap-4">
			<div
				v-for="unit in units"
				:key="unit.id"
				class="flex flex-col justify-center items-center border-2 border-white/0 transition-all py-2"
				:class="{
					'border-2 border-white/70': selectedUnitId === unit.id,
					'monitoring-chip-bg': (unit.currentCount || 0) > 0,
					'bg-black/20': (unit.currentCount || 0) === 0,
					'cursor-pointer': !isIsapiCamera,
				}"
				:tabindex="isIsapiCamera ? undefined : 0"
				:role="isIsapiCamera ? undefined : 'button'"
				:aria-label="isIsapiCamera ? `${unit.name}，進出統計` : `查看 ${unit.name} 人員名單`"
				@click="handleUnitActivate(unit.id)"
				@keydown.enter="handleUnitActivate(unit.id)"
				@keydown.space.prevent="handleUnitActivate(unit.id)"
			>
				<div class="people-unit-name text-base font-semibold tracking-wide text-white 2xl:text-lg">
					{{ unit.name }}
				</div>
				<template v-if="isIsapiCamera">
					<div class="people-unit-count space-x-0.5 text-sm text-white 2xl:text-base">
						<span class="text-green-400">進 {{ unit.entryCount ?? 0 }}</span>
						<span>/</span>
						<span class="text-blue-300">出 {{ unit.exitCount ?? 0 }}</span>
					</div>
				</template>
				<template v-else>
					<div class="people-unit-count space-x-0.5 text-base text-white 2xl:text-lg">
						<span class="text-green-400">{{ unit.currentCount || 0 }}</span>
						<span>/</span>
						<span>{{ unit.capacity || 0 }}</span>
					</div>
				</template>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingUnit } from "~/types/peopleCounting"

interface Props {
	units: PeopleCountingUnit[]
	selectedUnitId?: number
	isIsapiCamera?: boolean
	hideTitle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	isIsapiCamera: false,
	hideTitle: false,
})
const emit = defineEmits<{
	select: [unitId: number]
}>()

const handleUnitActivate = (unitId: number) => {
	if (props.isIsapiCamera) return
	emit("select", unitId)
}
</script>
