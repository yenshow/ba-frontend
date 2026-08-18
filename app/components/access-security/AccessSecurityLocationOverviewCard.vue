<template>
	<div
		class="flex cursor-pointer gap-2 rounded-xl bg-white/10 py-1 transition-all hover:bg-white/15 hover:ring-2 hover:ring-cyan-300/50"
		role="button"
		tabindex="0"
		:aria-label="`選擇 ${zone.name}`"
		@click="emit('select', zone.id)"
		@keydown.enter="emit('select', zone.id)"
		@keydown.space.prevent="emit('select', zone.id)"
	>
		<div class="overview-zone-tag">
			{{ zone.name || "未分類" }}
		</div>

		<div class="relative flex min-w-0 flex-1 flex-col items-center pr-2">
			<div class="flex w-full flex-col gap-3 px-3 py-2 text-white">
				<div v-if="groupedFloors.length === 0" class="py-2 text-center text-xs text-white/50">
					尚無室內機
				</div>
				<div v-for="group in groupedFloors" :key="group.floor" class="space-y-1.5">
					<p class="text-center text-xs tracking-wider text-white/55 2xl:text-sm">
						{{ group.floor }}
					</p>
					<div class="grid grid-cols-3 gap-2">
						<div
							v-for="loc in group.locations"
							:key="loc.id"
							class="flex min-h-[36px] min-w-0 flex-col items-center justify-center p-1.5 text-center"
							:class="loc.indoorDeviceId ? 'monitoring-chip-bg' : 'bg-black/20 text-white/40'"
							:title="loc.displayName"
						>
							<span class="line-clamp-1 text-[11px] font-semibold text-white 2xl:text-xs">
								{{ loc.unitName || loc.name }}
							</span>
							<span class="line-clamp-1 text-[10px] text-white/70 2xl:text-[11px]">
								{{ loc.indoorDeviceName || "—" }}
							</span>
						</div>
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
import { groupAccessSecurityLocationsByFloor } from "~/utils/accessSecurity"

const props = defineProps<{
	zone: AccessSecuritySiteZone
}>()

const emit = defineEmits<{
	select: [zoneId: number]
}>()

const groupedFloors = computed(() =>
	groupAccessSecurityLocationsByFloor(props.zone.locations || [])
)
const unitCount = computed(() => props.zone.locations?.length || 0)
const indoorCount = computed(
	() => (props.zone.locations || []).filter((loc) => loc.indoorDeviceId).length
)
</script>
