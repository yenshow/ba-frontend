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
		<!-- 左側：區域標籤（與人流 LocationOverviewCard 一致） -->
		<div
			class="my-4 flex w-[36px] items-center justify-center bg-white px-2 text-xl 2xl:text-xl"
			style="clip-path: polygon(0 0, 100% calc(0% + 24px), 100% calc(100% - 24px), 0 100%)"
		>
			{{ summary.zoneName || "－" }}
		</div>

		<!-- 右側：內容（進場／出場／在場車輛 + 車輛群組格，對齊人流 LocationOverviewCard） -->
		<div class="flex flex-1 flex-col items-center pr-2">
			<div class="mb-2 flex w-[160px] items-center justify-center border-b border-white/80 pb-px">
				<h3 class="text-base text-white 2xl:text-lg">{{ summary.name }}</h3>
			</div>
			<div class="flex items-center gap-8 py-2 text-white">
				<!-- 進場車輛、出場車輛、在場車輛 -->
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
						<div class="text-sm font-semibold 2xl:text-base">在場車輛</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ currentCount }}
						</div>
					</div>
				</div>

				<!-- 車輛群組格（3x4，對齊 LocationOverviewCard 單位格） -->
				<div class="grid grid-cols-3 gap-2 overflow-hidden">
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
import { computed } from "vue"
import type {
	VehicleAccessLocationSummary,
	VehicleOrganizationGroupItem,
} from "~/types/vehicleAccess"

interface Props {
	summary: VehicleAccessLocationSummary & { zoneName?: string }
	/** 車輛群組列表（工程部、行銷部等），對齊 LocationOverviewCard 的 units 網格 */
	groups?: VehicleOrganizationGroupItem[]
}

const props = withDefaults(defineProps<Props>(), {
	groups: () => [],
})

const emit = defineEmits<{
	(e: "click", locationId: string): void
}>()

/** 在場車輛數：優先使用 summary.currentCount，否則以 進場－出場 計算（與人流 LocationOverviewCard 一致） */
const currentCount = computed(() => {
	const s = props.summary
	if (s.currentCount != null) return s.currentCount
	const entry = s.entryCount ?? 0
	const exit = s.exitCount ?? 0
	return Math.max(0, entry - exit)
})

/** 3x4 群組格，不足補空（對齊 LocationOverviewCard displayUnits） */
const TOTAL_GRID_CELLS = 12

const displayGroups = computed(() => {
	const list = (props.groups ?? []).slice(0, TOTAL_GRID_CELLS)
	const emptyCells = Array(TOTAL_GRID_CELLS - list.length).fill(null)
	return [...list, ...emptyCells]
})

const handleClick = () => {
	emit("click", props.summary.id ?? "")
}
</script>
