<template>
	<aside
		class="col-span-12 flex min-h-0 flex-col lg:col-span-4"
		:class="panelHeightClass"
	>
		<div
			class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5"
		>
			<div class="border-b border-white/10 px-3 py-3">
				<span class="text-base font-medium text-white/85 2xl:text-lg">樓層</span>
			</div>

			<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-2.5">
				<div
					v-if="loading"
					class="py-10 text-center text-sm text-white/60"
					role="status"
					aria-live="polite"
				>
					載入中…
				</div>
				<p v-else-if="error" class="form-error-text px-1" role="alert">{{ error }}</p>
				<div
					v-else-if="floors.length === 0"
					class="py-10 text-center text-sm text-white/60"
				>
					尚無樓層
				</div>
				<ul v-else class="space-y-1" role="listbox" aria-label="樓層列表">
					<li
						v-for="floor in floors"
						:key="floor.index"
						role="option"
						class="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2.5 transition-colors"
						:class="
							selectedFloorIndex === floor.index
								? 'bg-cyan-500/25 ring-1 ring-cyan-400/35'
								: 'hover:bg-white/[0.06]'
						"
						:aria-selected="selectedFloorIndex === floor.index"
						@click="emit('select-floor', floor.index)"
					>
						<span
							class="flex h-10 min-w-[2.75rem] items-center justify-center rounded-md border border-cyan-400/30 bg-cyan-500/15 font-mono text-base font-bold text-white 2xl:text-lg"
						>
							{{ floor.code }}
						</span>
						<input
							:value="floor.name"
							type="text"
							maxlength="32"
							class="form-input-small min-w-0 flex-1 text-base 2xl:text-lg"
							placeholder="樓層名稱"
							title="同步至梯控設備的顯示名稱"
							:disabled="!canEdit || isSavingFloorName"
							:aria-label="`${floor.code} 樓層名稱`"
							@click.stop
							@keydown.enter="handleFloorNameCommit(floor, $event)"
							@blur="handleFloorNameCommit(floor, $event)"
						/>
						<span
							class="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs tabular-nums text-white/55 2xl:text-sm"
						>
							{{ selectedCountForFloor(floor.index) }}
						</span>
					</li>
				</ul>
			</div>
		</div>
	</aside>
</template>

<script setup lang="ts">
import type { ElevatorFloorAccessSlot } from "~/types/elevator"
import { LOCATION_MEMBERS_PANEL_HEIGHT } from "~/composables/systems/personnel/useLocationMembersStep"

withDefaults(
	defineProps<{
		floors: ElevatorFloorAccessSlot[]
		selectedFloorIndex: number | null
		selectedCountForFloor: (floorIndex: number) => number
		loading?: boolean
		error?: string | null
		canEdit?: boolean
		isSavingFloorName?: boolean
		panelHeightClass?: string
	}>(),
	{
		canEdit: false,
		isSavingFloorName: false,
		panelHeightClass: LOCATION_MEMBERS_PANEL_HEIGHT,
	},
)

const emit = defineEmits<{
	"select-floor": [floorIndex: number]
	"update-floor-name": [floorIndex: number, name: string]
}>()

const handleFloorNameCommit = (floor: ElevatorFloorAccessSlot, event: Event) => {
	const input = event.target as HTMLInputElement
	const nextName = input.value.trim()
	if (nextName === String(floor.name ?? "").trim()) return
	emit("update-floor-name", floor.index, nextName)
}
</script>
