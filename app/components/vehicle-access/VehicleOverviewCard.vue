<template>
	<div
		class="flex cursor-pointer gap-2 rounded-xl bg-white/10 py-1 transition-all hover:bg-white/15"
		tabindex="0"
		role="button"
		:aria-label="`查看 ${summary.name} 過車記錄`"
		@click="handleClick"
		@keydown.enter="handleClick"
		@keydown.space.prevent="handleClick"
	>
		<div
			class="my-4 flex w-[36px] items-center justify-center bg-white px-2 text-xl 2xl:text-xl"
			style="clip-path: polygon(0 0, 100% calc(0% + 24px), 100% calc(100% - 24px), 0 100%)"
		>
			{{ summary.zoneName || "－" }}
		</div>

		<div class="relative flex flex-1 flex-col items-center pr-2">
			<button
				v-if="isIsapiLocation"
				type="button"
				class="absolute right-2 top-1 z-10 rounded-lg border border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-2 py-0.5 text-[10px] font-medium text-white transition-all hover:from-cyan-400/40 hover:to-blue-500/40 2xl:px-2.5 2xl:py-1 2xl:text-xs"
				:aria-label="showBarrierPanel ? '切換為資訊' : '切換為柵欄機控制'"
				:aria-pressed="showBarrierPanel"
				@click.stop="showBarrierPanel = !showBarrierPanel"
			>
				{{ showBarrierPanel ? "資訊" : "柵欄機" }}
			</button>

			<div class="mb-2 flex w-[160px] items-center justify-center border-b border-white/80 pb-px">
				<h3 class="text-base text-white 2xl:text-lg">{{ summary.name }}</h3>
			</div>

			<div v-if="showBarrierPanel" class="w-full max-h-[220px] overflow-y-auto py-2 text-white">
				<VehicleBarrierDeviceControls :location="location" :can-write="canWrite" />
			</div>

			<div v-else class="flex items-center gap-8 py-2 text-white">
				<div
					class="flex min-w-[140px] flex-col gap-3 border-r-2 border-white/50 pr-8 2xl:min-w-[160px]"
				>
					<div class="flex items-center justify-center gap-3 bg-white/20 p-2">
						<div class="text-sm font-semibold 2xl:text-base">進場車輛</div>

						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ summary.entryCount ?? 0 }}
						</div>
					</div>

					<div class="flex items-center justify-center gap-3 bg-white/20 p-2">
						<div class="text-sm font-semibold 2xl:text-base">出場車輛</div>

						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ summary.exitCount ?? 0 }}
						</div>
					</div>

					<div class="flex items-center justify-center gap-3 bg-white/20 p-2">
						<div class="text-sm font-semibold 2xl:text-base">{{ thirdColumn.label }}</div>

						<div
							class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl"
							:class="thirdColumn.isAtOrOverCapacity && 'text-amber-200'"
						>
							{{ thirdColumn.display }}
						</div>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-2 overflow-hidden" @click.stop>
					<div
						v-for="(group, index) in displayGroups"
						:key="group ? group.groupKey : `empty-${index}`"
						class="flex min-h-[36px] min-w-[64px] items-center justify-center p-2 text-center transition-all"
						:class="{
							'bg-white/20': group && (group.onSiteCount || 0) > 0,

							'bg-black/20': !group || (group.onSiteCount || 0) === 0,

							'text-white/90': group,

							'text-white/30': !group,
						}"
						:title="group ? group.personGroupName : ''"
					>
						<span
							v-if="group"
							class="line-clamp-2 text-[11px] font-semibold text-white 2xl:text-xs"
						>
							{{ group.personGroupName }}
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"

import type {
	VehicleAccessLocation,
	VehicleAccessLocationSummary,
	VehicleOrganizationGroupItem,
} from "~/types/vehicleAccess"

import VehicleBarrierDeviceControls from "~/components/vehicle-access/VehicleBarrierDeviceControls.vue"

const OVERVIEW_GROUP_CELLS = 12

const props = withDefaults(
	defineProps<{
		summary: VehicleAccessLocationSummary & { zoneName?: string }

		groups?: VehicleOrganizationGroupItem[]

		location?: VehicleAccessLocation | null

		canWrite?: boolean
	}>(),

	{
		groups: () => [],

		location: null,

		canWrite: false,
	}
)

const emit = defineEmits<{
	(e: "click", locationId: string): void
}>()

const showBarrierPanel = ref(false)

watch(
	() => props.summary.id ?? props.summary.locationId,

	() => {
		showBarrierPanel.value = false
	}
)

const parkingCapacity = computed(() => {
	const loc = props.location
	if (loc?.operationMode !== "parking" || loc?.dataSource !== "isapi_camera") return null
	const cap = loc.parkingCapacity
	return cap != null && cap > 0 ? cap : null
})

const thirdColumn = computed(() => {
	const onSite = props.summary.currentCount ?? 0
	const cap = parkingCapacity.value
	if (cap == null) {
		return { label: "在場車輛", display: onSite, isAtOrOverCapacity: false }
	}
	return {
		label: "剩餘車位",
		display: Math.max(0, cap - onSite),
		isAtOrOverCapacity: onSite >= cap,
	}
})

const isIsapiLocation = computed(() => props.location?.dataSource === "isapi_camera")

const displayGroups = computed(() => {
	const list = (props.groups ?? []).slice(0, OVERVIEW_GROUP_CELLS)

	return [...list, ...Array.from({ length: OVERVIEW_GROUP_CELLS - list.length }, () => null)]
})

const handleClick = () => {
	emit("click", props.summary.id ?? "")
}
</script>
