<template>
	<div
		class="flex cursor-pointer gap-2 rounded-xl bg-white/10 py-1 transition-all hover:bg-white/15 hover:ring-2 hover:ring-cyan-300/50"
		role="button"
		tabindex="0"
		:aria-label="`選擇 ${zone.name}`"
		@click="handleSelectZone"
		@keydown.enter="handleSelectZone"
		@keydown.space.prevent="handleSelectZone"
	>
		<div class="overview-zone-tag">
			{{ zone.name || "未分類" }}
		</div>

		<div class="relative flex min-w-0 flex-1 flex-col items-center pr-2">
			<div class="mb-2 flex w-[160px] items-center justify-center border-b border-white/80 pb-px">
				<h3 class="text-base text-white 2xl:text-lg">{{ zone.name }}</h3>
			</div>

			<div class="flex w-full flex-col gap-3 px-3 py-2 text-white">
				<div v-if="groupedFloors.length === 0" class="py-2 text-center text-xs text-white/50">
					尚無室內機
				</div>
				<div v-for="group in groupedFloors" :key="group.floor" class="space-y-1.5">
					<p class="text-center text-xs tracking-wider text-white/55 2xl:text-sm">
						{{ group.floor }}
					</p>
					<div class="grid grid-cols-3 gap-2">
						<button
							v-for="loc in group.locations"
							:key="loc.id"
							type="button"
							class="flex min-h-[36px] min-w-0 flex-col items-center justify-center p-1.5 text-center transition-all"
							:class="
								focusedLocationId === loc.id
									? 'monitoring-chip-bg ring-1 ring-cyan-300'
									: loc.indoorDeviceId
										? 'monitoring-chip-bg'
										: 'bg-black/20 text-white/40'
							"
							:title="loc.displayName"
							:aria-label="`選擇 ${loc.displayName}`"
							@click.stop="emit('select-unit', loc.id)"
						>
							<span class="line-clamp-1 text-[11px] font-semibold text-white 2xl:text-xs">
								{{ loc.unitName || loc.name }}
							</span>
							<span class="line-clamp-1 text-[10px] text-white/70 2xl:text-[11px]">
								{{ loc.voipNumber || loc.indoorDeviceName || "—" }}
							</span>
						</button>
					</div>
				</div>
				<p class="text-center text-[11px] text-white/50 2xl:text-xs">
					共 {{ unitCount }} 戶 · {{ indoorCount }} 台室內機
				</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { AccessSecuritySiteZone } from "~/types/accessSecurity"
import { groupAccessSecurityLocationsByFloor } from "~/utils/accessSecurityFloor"

const props = withDefaults(
	defineProps<{
		zone: AccessSecuritySiteZone
		focusedLocationId?: number | null
	}>(),
	{ focusedLocationId: null }
)

const emit = defineEmits<{
	select: [zoneId: number]
	"select-unit": [locationId: number]
}>()

const groupedFloors = computed(() =>
	groupAccessSecurityLocationsByFloor(props.zone.locations || [])
)
const unitCount = computed(() => props.zone.locations?.length || 0)
const indoorCount = computed(
	() => (props.zone.locations || []).filter((loc) => loc.indoorDeviceId).length
)

const handleSelectZone = () => {
	emit("select", props.zone.id)
}
</script>
