<template>
	<div
		class="flex cursor-pointer gap-2 rounded-xl bg-white/10 py-1 transition-all hover:bg-white/15 hover:ring-2 hover:ring-cyan-300/50"
		role="button"
		tabindex="0"
		:aria-label="cardAriaLabel"
		@click="handleSelect"
		@keydown.enter="handleSelect"
		@keydown.space.prevent="handleSelect"
	>
		<div class="overview-zone-tag">
			{{ zone.name || "未分類" }}
		</div>

		<div class="relative flex min-w-0 flex-1 flex-col items-center pr-2">
			<div class="mb-2 flex w-[160px] items-center justify-center border-b border-white/80 pb-px">
				<h3 class="truncate text-base text-white 2xl:text-lg" :title="stationTitle">
					{{ stationTitle }}
				</h3>
			</div>

			<div class="flex items-center gap-8 py-2">
				<div
					class="flex min-w-[140px] flex-col gap-3 border-r-2 border-white/50 pr-8 text-white 2xl:min-w-[160px]"
				>
					<div
						v-for="row in statRows"
						:key="row.label"
						class="flex items-center justify-center gap-3 monitoring-chip-bg p-2"
					>
						<div class="overview-stat-label">{{ row.label }}</div>
						<div
							class="w-[80px] bg-black/20 text-center 2xl:w-[100px]"
							:class="[
								row.compact ? 'text-sm 2xl:text-base' : 'text-xl 2xl:text-2xl',
								row.warn && 'text-amber-200',
							]"
						>
							{{ row.value }}
						</div>
					</div>
				</div>

				<div class="flex items-start gap-1">
					<div
						class="grid gap-2 overflow-hidden"
						:class="selected ? 'grid-cols-3' : 'grid-cols-2'"
					>
						<div
							v-for="(cell, index) in displayUnits"
							:key="cell?.kind === 'unit' ? cell.location.id : `pad-${index}`"
							class="flex min-h-[36px] min-w-[64px] items-center justify-center p-2 text-center"
							:class="
								isActiveCell(cell)
									? 'monitoring-chip-bg text-white/90'
									: 'bg-black/20 text-white/30'
							"
							:title="cellTitle(cell)"
						>
							<span
								v-if="cell?.kind === 'unit'"
								class="line-clamp-2 text-[11px] font-semibold text-white 2xl:text-xs"
							>
								{{ cell.location.displayName || cell.location.name }}
							</span>
							<span
								v-else-if="cell?.kind === 'overflow'"
								class="text-[11px] font-semibold text-white 2xl:text-xs"
							>
								+{{ cell.count }}
							</span>
						</div>
					</div>
					<StatusCenterCollapsedMore
						:show="hiddenUnitCount > 0"
						aria-label="還有未展開的戶別，選取後展開"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { IntercomMainStation, IntercomSiteZone } from "~/types/intercom"
import StatusCenterCollapsedMore from "~/components/common/StatusCenterCollapsedMore.vue"
import {
	buildIntercomOverviewGrid,
	formatIntercomArmingLabel,
	resolveIntercomZoneStation,
	type IntercomOverviewGridCell,
} from "~/utils/intercom"
import { STATUS_CENTER_COLLAPSED_LIMIT } from "~/utils/toggleStatusCenterOrder"

const props = withDefaults(
	defineProps<{
		zone: IntercomSiteZone
		stations?: IntercomMainStation[]
		/** 選取後展開完整總覽格；未選取只顯示優先序前 2 戶 */
		selected?: boolean
	}>(),
	{
		stations: () => [],
		selected: false,
	}
)

const emit = defineEmits<{
	select: [zoneId: number]
}>()

const station = computed(() =>
	resolveIntercomZoneStation(props.zone, props.stations || [])
)
const unitCount = computed(() => props.zone.locations?.length || 0)
const displayUnits = computed(() =>
	buildIntercomOverviewGrid(props.zone.locations || [], {
		maxVisibleUnits: props.selected ? undefined : STATUS_CENTER_COLLAPSED_LIMIT,
		padToFullGrid: props.selected,
	})
)
const hiddenUnitCount = computed(() =>
	props.selected ? 0 : Math.max(0, unitCount.value - STATUS_CENTER_COLLAPSED_LIMIT)
)
const indoorCount = computed(
	() => (props.zone.locations || []).filter((loc) => loc.indoorDeviceId).length
)
const stationTitle = computed(() => station.value?.name?.trim() || "尚未綁定主機")
const armingLabel = computed(() => formatIntercomArmingLabel(station.value))
const statRows = computed(() => [
	{ label: "戶數", value: unitCount.value, warn: false, compact: false },
	{
		label: "室內機",
		value: indoorCount.value,
		warn: indoorCount.value < unitCount.value,
		compact: false,
	},
	{
		label: "主機",
		value: armingLabel.value,
		warn: !station.value?.armed,
		compact: true,
	},
])
const cardAriaLabel = computed(
	() =>
		`選擇 ${props.zone.name || "未分類"}，${stationTitle.value}，${unitCount.value} 戶 ${indoorCount.value} 台室內機，主機${armingLabel.value}`
)

const isActiveCell = (cell: IntercomOverviewGridCell): boolean =>
	cell?.kind === "overflow" || (cell?.kind === "unit" && Boolean(cell.location.indoorDeviceId))

const cellTitle = (cell: IntercomOverviewGridCell): string => {
	if (cell?.kind === "overflow") return `尚有 ${cell.count} 戶`
	if (cell?.kind !== "unit") return ""
	return `${cell.location.displayName || cell.location.name}　${cell.location.indoorDeviceName || "未綁定"}`
}

const handleSelect = () => {
	emit("select", props.zone.id)
}
</script>
