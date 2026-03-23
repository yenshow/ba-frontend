<template>
	<div
		class="show-scrollbar relative h-full overflow-hidden overflow-y-auto rounded-2xl border-2 border-white/80 bg-white/30 space-y-6 px-3 py-6 2xl:space-y-8 2xl:px-4 2xl:py-8"
	>
		<h3 class="ms-[12px] text-center text-2xl tracking-[12px] text-white 2xl:text-3xl">監控中心</h3>
		<!-- 區域區塊 -->
		<div v-for="zone in displayedZones" :key="zone.id" class="space-y-3 2xl:space-y-4">
			<div class="flex items-center justify-center gap-3">
				<!-- 區域標題 -->
				<div class="relative shrink-0">
					<button
						type="button"
						@click="handleZoneClick(zone.id || zone.name)"
						:class="[
							'cursor-pointer rounded-full border-2 p-2 transition-all',
							props.selectedZone === (zone.id || zone.name)
								? 'bg-white text-black/50'
								: 'bg-transparent text-white',
							zoneHasAbnormal(zone)
								? 'ring-2 ring-amber-400/90 ring-offset-2 ring-offset-transparent'
								: '',
						]"
						:aria-label="
							zoneHasAbnormal(zone) ? `${zone.name}，此區域有地點異常` : `${zone.name}，選取此樓層`
						"
					>
						<h4 class="w-[48px] p-2 text-xl font-semibold tracking-wider 2xl:text-2xl">
							{{ zone.name }}
						</h4>
					</button>
					<span
						v-if="zoneHasAbnormal(zone)"
					class="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-0.5 text-[9px] font-bold leading-none text-teal-950 2xl:h-5 2xl:min-w-5 2xl:text-[10px]"
						aria-hidden="true"
						title="此區域有地點異常"
					>
						!
					</span>
				</div>

				<!-- 該區域的地點（點位）- 兩列布局 -->
				<div
					v-if="getZoneLocations(zone).length > 0"
					class="grid grid-cols-2 gap-x-2 gap-y-4 2xl:gap-y-6"
				>
					<div
						v-for="(location, locationIndex) in getZoneLocations(zone)"
						:key="getLightingLocationId(zone, location, locationIndex)"
						class="flex flex-col rounded-xl border-2 border-white px-3 py-2"
					>
						<h4 class="mb-2 whitespace-nowrap text-center text-xl text-white 2xl:text-2xl">
							{{ location.name }}
						</h4>
						<div class="flex items-center gap-2">
							<!-- 左側圖示 -->
							<div class="shrink-0">
								<NuxtImg
									src="/lighting/light-bulb.png"
									alt="燈泡圖示"
									class="h-16 w-16 2xl:h-24 2xl:w-24"
									width="96"
									height="96"
								/>
							</div>

							<!-- 右側：開關在上、狀態徽章在下 -->
							<div class="flex min-w-0 flex-1 flex-col items-center gap-2">
								<div class="relative flex w-full justify-center">
									<div
										v-if="props.areaToggling.has(getLightingLocationId(zone, location, locationIndex))"
										class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
									>
										<div
											class="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white 2xl:h-7 2xl:w-7"
										></div>
									</div>
									<label
										class="relative inline-flex select-none items-center"
										:class="{
											'cursor-not-allowed':
												isLocationDisabled(getLightingLocationId(zone, location, locationIndex)) ||
												!props.canToggle,
											'cursor-pointer':
												!isLocationDisabled(getLightingLocationId(zone, location, locationIndex)) &&
												props.canToggle,
										}"
									>
										<input
											type="checkbox"
											:checked="
												getLocationStatus(getLightingLocationId(zone, location, locationIndex)).isRunning
											"
											class="peer sr-only"
											:disabled="
												isLocationDisabled(getLightingLocationId(zone, location, locationIndex)) ||
												!props.canToggle
											"
											@change="
												handleToggle(
													getLightingLocationId(zone, location, locationIndex),
													getLocationStatus(getLightingLocationId(zone, location, locationIndex)).isRunning
												)
											"
										/>
										<div
											:class="[
												'relative h-9 w-[5.125rem] shrink-0 overflow-hidden rounded-full border-2 border-white bg-white/15 transition-colors duration-200 peer-checked:bg-[#5eb8e8] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white 2xl:h-10 2xl:w-24',
												isLocationDisabled(getLightingLocationId(zone, location, locationIndex)) ||
												!props.canToggle
													? 'opacity-50'
													: '',
											]"
										>
											<span
												class="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold tracking-wide text-white transition-opacity duration-200 2xl:left-2.5 2xl:text-xs"
												:class="
													getLocationStatus(getLightingLocationId(zone, location, locationIndex)).isRunning
														? 'opacity-100'
														: 'opacity-0'
												"
											>
												ON
											</span>
											<span
												class="pointer-events-none absolute right-2 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold tracking-wide text-white transition-opacity duration-200 2xl:right-2.5 2xl:text-xs"
												:class="
													getLocationStatus(getLightingLocationId(zone, location, locationIndex)).isRunning
														? 'opacity-0'
														: 'opacity-100'
												"
											>
												OFF
											</span>
											<span
												class="pointer-events-none absolute top-1/2 block h-7 w-7 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out 2xl:h-8 2xl:w-8"
												:class="
													getLocationStatus(getLightingLocationId(zone, location, locationIndex)).isRunning
														? 'left-[calc(100%-1.75rem-0.25rem)] 2xl:left-[calc(100%-2rem-0.25rem)]'
														: 'left-1'
												"
											></span>
										</div>
									</label>
								</div>
								<div
									class="flex h-9 w-full items-center justify-center gap-2 rounded-full border border-white bg-white/10 px-2 2xl:h-10"
								>
									<div
										:class="[
											'h-4 w-4 shrink-0 rounded-full border border-white 2xl:h-5 2xl:w-5',
											isLocationNormal(getLightingLocationId(zone, location, locationIndex))
												? 'bg-emerald-300'
												: 'bg-amber-400',
										]"
									></div>
									<span class="text-sm text-white 2xl:text-base">{{
										getLocationStatus(getLightingLocationId(zone, location, locationIndex)).healthLabel
									}}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { LightingZone, LightingLocation } from "~/types/lighting"
import { getLightingLocationId } from "~/utils/lightingLocation"

interface Props {
	zones: LightingZone[]
	areaStatuses?: Record<string, { isRunning: boolean; status: "normal" | "warning" | "error" }>
	areaDisabledMap?: Record<string, boolean>
	areaToggling?: Set<string> // 正在處理切換操作的區域
	selectedZone?: string
	canToggle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	zones: () => [],
	areaStatuses: () => ({}),
	areaDisabledMap: () => ({}),
	areaToggling: () => new Set(),
	selectedZone: "",
	canToggle: true,
})

const emit = defineEmits<{
	toggle: [areaId: string, isRunning: boolean]
	"zone-selected": [zoneId: string]
}>()

const statusLabels: Record<"normal" | "warning" | "error", string> = {
	normal: "正常",
	warning: "警告",
	error: "異常",
}

// 獲取指定區域的地點
const getZoneLocations = (zone: LightingZone): LightingLocation[] => {
	return zone.locations || []
}

// 顯示的區域（只顯示有地點的區域）
const displayedZones = computed(() => {
	if (!props.zones || !Array.isArray(props.zones)) {
		return []
	}

	// 過濾出有地點的區域
	const zonesWithLocations = props.zones.filter((zone) => {
		return getZoneLocations(zone).length > 0
	})

	// 如果沒有有地點的區域，返回所有區域（用於顯示空狀態）
	const zonesToShow = zonesWithLocations.length > 0 ? zonesWithLocations : props.zones

	// 排序：1F 在前面，2F 在後面（按區域名稱的自然排序）
	return zonesToShow.sort((a, b) => {
		const nameA = a.name || ""
		const nameB = b.name || ""
		// 提取數字部分進行比較（例如 "1F" -> 1, "2F" -> 2）
		const numA = parseInt(nameA.match(/\d+/)?.[0] || "999") || 999
		const numB = parseInt(nameB.match(/\d+/)?.[0] || "999") || 999
		return numA - numB
	})
})

// 取得地點狀態
const getLocationStatus = (locationId: string) => {
	const status = props.areaStatuses[locationId]
	if (status) {
		return {
			isRunning: status.isRunning,
			status: status.status,
			healthLabel: statusLabels[status.status],
		}
	}
	return {
		isRunning: false,
		status: "error" as const,
		healthLabel: "異常",
	}
}

// 判斷地點是否正常
const isLocationNormal = (locationId: string): boolean => {
	const status = props.areaStatuses[locationId]
	return !!status && status.status === "normal"
}

const zoneHasAbnormal = (zone: LightingZone): boolean => {
	return getZoneLocations(zone).some((location, locationIndex) => {
		return !isLocationNormal(getLightingLocationId(zone, location, locationIndex))
	})
}

const isLocationDisabled = (locationId: string): boolean => {
	return props.areaDisabledMap[locationId] ?? false
}

const handleToggle = (areaId: string, isRunning: boolean) => {
	if (!props.canToggle) return
	emit("toggle", areaId, !isRunning)
}

const handleZoneClick = (zoneId: string) => {
	emit("zone-selected", zoneId)
}
</script>
