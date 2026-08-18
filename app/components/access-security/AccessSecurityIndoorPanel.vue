<template>
	<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		<div
			v-if="groupedFloors.length === 0"
			class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-white/20 p-6 text-center text-sm text-white/50 2xl:text-base"
			role="status"
		>
			尚未設定室內機
		</div>
		<div v-else class="flex min-h-0 flex-1 flex-col">
			<div class="mb-3 flex flex-wrap justify-center gap-2 2xl:mb-4 2xl:gap-2.5">
				<button
					v-for="group in groupedFloors"
					:key="group.floor"
					type="button"
					class="rounded-lg border px-3 py-1 text-sm font-semibold tracking-wider text-white transition-colors 2xl:px-4 2xl:py-1.5 2xl:text-base"
					:class="
						group.floor === selectedFloor
							? 'border-cyan-300 bg-cyan-500/45'
							: 'border-white/30 bg-white/10 hover:bg-white/20'
					"
					:aria-pressed="group.floor === selectedFloor"
					:aria-label="`顯示 ${group.floor}`"
					@click="handleSelectFloor(group.floor)"
				>
					{{ group.floor }}
				</button>
			</div>

			<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto px-1">
				<div class="grid grid-cols-2 gap-3 2xl:gap-4">
					<article
						v-for="loc in pagedLocations"
						:key="loc.id"
						class="flex min-w-0 cursor-pointer flex-col gap-2 rounded-xl border-2 bg-black/30 p-2 2xl:gap-2.5 2xl:p-3"
						:class="
							focusedLocationId === loc.id
								? 'border-cyan-400 ring-2 ring-cyan-400'
								: 'border-white/40'
						"
						role="button"
						tabindex="0"
						:aria-label="`選擇 ${loc.displayName}`"
						:aria-pressed="focusedLocationId === loc.id"
						@click="emit('focus', loc.id)"
						@keydown.enter="emit('focus', loc.id)"
						@keydown.space.prevent="emit('focus', loc.id)"
					>
						<div
							class="mx-auto aspect-[300/188] w-full max-h-[150px] overflow-hidden rounded-lg 2xl:max-h-[170px]"
						>
							<AccessIntercomIndoorSvg
								:status="ringingLocationId === loc.id ? 'ringing' : 'idle'"
							/>
						</div>
						<h4
							class="line-clamp-2 shrink-0 text-center text-base font-semibold text-white 2xl:text-lg"
							:title="loc.displayName"
						>
							{{ loc.displayName }}
						</h4>
						<p class="truncate text-center text-xs text-white/70 2xl:text-sm">
							{{ loc.indoorDeviceName || "未綁定" }}
							<span v-if="loc.voipNumber"> · VoIP {{ loc.voipNumber }}</span>
						</p>
						<p class="truncate text-center text-xs text-white/50 2xl:text-sm">
							{{ loc.host || "—" }}
						</p>
						<button
							type="button"
							class="mx-auto flex h-8 min-w-[4.5rem] items-center justify-center rounded-lg border border-cyan-300/80 bg-cyan-500/50 px-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-cyan-500/65 disabled:opacity-50 2xl:h-9 2xl:min-w-[5rem] 2xl:px-3 2xl:text-sm"
							:disabled="!canRing || ringingLocationId === loc.id"
							:aria-busy="ringingLocationId === loc.id"
							:aria-label="`${loc.displayName} 語音廣播`"
							@click.stop="emit('ring', loc.id)"
						>
							{{ ringingLocationId === loc.id ? "廣播中…" : "語音廣播" }}
						</button>
					</article>
				</div>
			</div>

			<Pagination
				class="shrink-0"
				:total="floorLocations.length"
				:offset="pageOffset"
				:limit="PAGE_SIZE"
				:show="floorLocations.length > PAGE_SIZE"
				@previous="pageOffset = Math.max(0, pageOffset - PAGE_SIZE)"
				@next="pageOffset += PAGE_SIZE"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import type { AccessSecurityFloorGroup } from "~/types/accessSecurity"
import AccessIntercomIndoorSvg from "~/components/access-security/AccessIntercomIndoorSvg.vue"
import Pagination from "~/components/common/Pagination.vue"

const PAGE_SIZE = 4

const props = withDefaults(
	defineProps<{
		groupedFloors: AccessSecurityFloorGroup[]
		focusedLocationId?: number | null
		ringingLocationId?: number | null
		canRing?: boolean
	}>(),
	{
		focusedLocationId: null,
		ringingLocationId: null,
		canRing: false,
	}
)

const emit = defineEmits<{
	focus: [locationId: number]
	ring: [locationId: number]
}>()

const selectedFloor = ref("")
const pageOffset = ref(0)

const floorLocations = computed(
	() =>
		props.groupedFloors.find((group) => group.floor === selectedFloor.value)?.locations || []
)

const pagedLocations = computed(() =>
	floorLocations.value.slice(pageOffset.value, pageOffset.value + PAGE_SIZE)
)

const handleSelectFloor = (floor: string) => {
	selectedFloor.value = floor
	pageOffset.value = 0
}

const syncFloorFromFocus = () => {
	const focused = props.focusedLocationId
	if (focused == null) return
	for (const group of props.groupedFloors) {
		const index = group.locations.findIndex((loc) => loc.id === focused)
		if (index < 0) continue
		selectedFloor.value = group.floor
		pageOffset.value = Math.floor(index / PAGE_SIZE) * PAGE_SIZE
		return
	}
}

watch(
	() =>
		[
			props.groupedFloors.map((group) => group.floor).join("|"),
			props.focusedLocationId,
		] as const,
	() => {
		if (!props.groupedFloors.some((group) => group.floor === selectedFloor.value)) {
			selectedFloor.value = props.groupedFloors[0]?.floor || ""
			pageOffset.value = 0
		}
		syncFloorFromFocus()
	},
	{ immediate: true }
)
</script>
