<template>
	<div class="space-y-4 min-h-[220px]">
		<h3 class="font-semibold text-lg bg-white/20 text-white text-center 2xl:text-xl py-1">
			人員群組
		</h3>
		<div class="grid grid-cols-3 2xl:grid-cols-4 gap-2 2xl:gap-4">
			<div
				v-for="unit in units"
				:key="unit.id"
				class="flex flex-col justify-center items-center border-2 border-white/0 transition-all py-2"
				:class="{
					'border-2 border-white/70': selectedUnitId === unit.id,
					'bg-white/20': (unit.currentCount || 0) > 0,
					'bg-black/20 ': (unit.currentCount || 0) === 0,
					'cursor-pointer': !isIsapiCamera,
				}"
				:tabindex="isIsapiCamera ? undefined : 0"
				:role="isIsapiCamera ? undefined : 'button'"
				:aria-label="isIsapiCamera ? `${unit.name}，進出統計` : `查看 ${unit.name} 人員名單`"
				@click="handleUnitActivate(unit.id)"
				@keydown.enter="handleUnitActivate(unit.id)"
				@keydown.space.prevent="handleUnitActivate(unit.id)"
			>
				<div class="text-base font-semibold text-white 2xl:text-lg tracking-wide">
					{{ unit.name }}
				</div>
				<template v-if="isIsapiCamera">
					<div class="text-sm text-white 2xl:text-base space-x-0.5">
						<span class="text-green-400">進 {{ unit.entryCount ?? 0 }}</span>
						<span>/</span>
						<span class="text-blue-300">出 {{ unit.exitCount ?? 0 }}</span>
					</div>
				</template>
				<template v-else>
					<div class="text-base text-white 2xl:text-lg space-x-0.5">
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
}

const props = withDefaults(defineProps<Props>(), {
	isIsapiCamera: false,
})
const emit = defineEmits<{
	select: [unitId: number]
}>()

const handleUnitActivate = (unitId: number) => {
	if (props.isIsapiCamera) return
	emit("select", unitId)
}
</script>
