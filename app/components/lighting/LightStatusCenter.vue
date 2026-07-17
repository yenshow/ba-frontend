<template>
	<div
		class="relative flex h-full min-h-0 flex-col overflow-hidden monitoring-panel rounded-2xl px-3 py-6 2xl:px-4 2xl:py-8"
	>
		<h3
			class="ms-[12px] shrink-0 text-center text-2xl tracking-[12px] text-white 2xl:text-3xl"
		>
			監控中心
		</h3>
		<!-- 區域區塊 -->
		<div
			class="show-scrollbar mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto ps-3 pe-1 pt-2 2xl:mt-8 2xl:space-y-8"
		>
		<div v-for="zone in displayedZones" :key="zone.id" class="space-y-3 2xl:space-y-4">
			<div class="flex items-center justify-start gap-3">
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
							zoneHasWarning(zone)
								? 'ring-2 ring-amber-400/90 ring-offset-2 ring-offset-transparent'
								: '',
							getZoneAlertBlinkClass(zone),
						]"
						:aria-label="
							zoneHasWarning(zone) ? `${zone.name}，此區域有地點異常` : `${zone.name}，選取此樓層`
						"
					>
						<h4 class="w-[48px] p-2 text-xl font-semibold tracking-wider 2xl:text-2xl">
							{{ zone.name }}
						</h4>
					</button>
					<span
						v-if="zoneHasWarning(zone)"
						class="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-0.5 text-[9px] font-bold leading-none text-teal-950 2xl:h-5 2xl:min-w-5 2xl:text-[10px]"
						aria-hidden="true"
						title="此區域有地點異常"
					>
						!
					</span>
				</div>

				<!-- 該區域的地點（點位）- 兩列布局 -->
				<div
					v-if="getZoneLocationsWithIds(zone).length > 0"
					class="grid grid-cols-2 gap-x-2 gap-y-4 2xl:gap-y-6"
				>
					<div
						v-for="row in getZoneLocationsWithIds(zone)"
						:key="row.locationId"
						:class="[
							'flex flex-col rounded-xl border-2 border-white px-3 py-2',
							getLocationCardBackgroundClass(row.locationId),
							getLocationCardBlinkClass(row.locationId),
						]"
					>
						<h4 class="mb-2 whitespace-nowrap text-center text-xl text-white 2xl:text-2xl">
							{{ row.location.name }}
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
										v-if="props.areaToggling.has(row.locationId)"
										class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
									>
										<div
											class="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white 2xl:h-7 2xl:w-7"
										></div>
									</div>
									<label
										class="relative inline-flex select-none items-center"
										:class="{
											'cursor-not-allowed': isLocationDisabled(row.locationId) || !props.canToggle,
											'cursor-pointer': !isLocationDisabled(row.locationId) && props.canToggle,
										}"
									>
										<input
											type="checkbox"
											:checked="getEffectiveIsRunning(row.locationId)"
											class="peer sr-only"
											:disabled="isLocationDisabled(row.locationId) || !props.canToggle"
											@change="handleToggle(row.locationId, getEffectiveIsRunning(row.locationId))"
										/>
										<div
											:class="[
												'relative h-9 w-[5.125rem] shrink-0 overflow-hidden rounded-full border-2 border-white bg-white/15 transition-colors duration-200 peer-checked:bg-[#5eb8e8] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white 2xl:h-10 2xl:w-24',
												isLocationDisabled(row.locationId) || !props.canToggle ? 'opacity-50' : '',
											]"
										>
											<span
												class="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold tracking-wide text-white transition-opacity duration-200 2xl:left-2.5 2xl:text-xs"
												:class="getEffectiveIsRunning(row.locationId) ? 'opacity-100' : 'opacity-0'"
											>
												ON
											</span>
											<span
												class="pointer-events-none absolute right-2 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold tracking-wide text-white transition-opacity duration-200 2xl:right-2.5 2xl:text-xs"
												:class="getEffectiveIsRunning(row.locationId) ? 'opacity-0' : 'opacity-100'"
											>
												OFF
											</span>
											<span
												class="pointer-events-none absolute top-1/2 block h-7 w-7 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out 2xl:h-8 2xl:w-8"
												:class="
													getEffectiveIsRunning(row.locationId)
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
											isLocationNormal(row.locationId) ? 'bg-emerald-400' : 'bg-amber-400',
										]"
										aria-hidden="true"
									></div>
									<span class="text-sm text-white 2xl:text-base">{{
										getLocationStatus(row.locationId).healthLabel
									}}</span>
								</div>
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
import type { SystemUiStatus } from "~/utils/monitoringStatus"
import { getLocationUiKey } from "~/utils/locationUiId"
import { compareZonesLoose } from "~/utils/sortOrder"

interface Props {
	zones: LightingZone[]
	areaStatuses?: Record<string, { isRunning: boolean; status: SystemUiStatus }>
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

const statusLabels: Record<SystemUiStatus, string> = {
	normal: "正常",
	warning: "異常",
	// 對外僅兩態：normal / warning（alarm 視為 warning）
	alarm: "異常",
}

type PendingToggleState = {
	nextIsRunning: boolean
	expiresAt: number
}

// Modbus/快照落地有時 > 2.5s，避免 pending 過早失效造成跳回舊狀態
const PENDING_TOGGLE_EXPIRE_MS = 8000
const pendingToggles = ref<Record<string, PendingToggleState>>({})

const setPendingToggle = (locationId: string, nextIsRunning: boolean) => {
	pendingToggles.value = {
		...pendingToggles.value,
		[locationId]: {
			nextIsRunning,
			expiresAt: Date.now() + PENDING_TOGGLE_EXPIRE_MS,
		},
	}
}

const clearPendingToggle = (locationId: string) => {
	if (!pendingToggles.value[locationId]) return
	const { [locationId]: _removed, ...rest } = pendingToggles.value
	pendingToggles.value = rest
}

const pruneExpiredPendingToggles = () => {
	const now = Date.now()
	const current = pendingToggles.value
	let changed = false
	const next: Record<string, PendingToggleState> = {}
	for (const [id, state] of Object.entries(current)) {
		if (state.expiresAt > now) {
			next[id] = state
			continue
		}
		changed = true
	}
	if (!changed) return
	pendingToggles.value = next
}

// 獲取指定區域的地點
const getZoneLocations = (zone: LightingZone): LightingLocation[] => {
	return zone.locations || []
}

/** 每列只算一次 locationId，避免 template 重複呼叫 */
const getZoneLocationsWithIds = (zone: LightingZone) => {
	return getZoneLocations(zone).map((location, locationIndex) => ({
		location,
		locationIndex,
		locationId: getLocationUiKey({ zone, location, locationIndex }),
	}))
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

	// 排序：sortOrder → 名稱數字 → id（不變更 props 來源陣列）
	return [...zonesToShow].sort((a, b) => compareZonesLoose(a, b))
})

// 取得地點狀態
const getLocationStatus = (locationId: string) => {
	const status = props.areaStatuses[locationId]
	if (status) {
		const normalizedStatus: SystemUiStatus = status.status === "alarm" ? "warning" : status.status
		return {
			isRunning: status.isRunning,
			status: normalizedStatus,
			healthLabel: statusLabels[normalizedStatus],
		}
	}
	return {
		isRunning: false,
		status: "warning" as const,
		healthLabel: "異常",
	}
}

const getEffectiveIsRunning = (locationId: string) => {
	const pending = pendingToggles.value[locationId]
	if (pending) return pending.nextIsRunning
	return getLocationStatus(locationId).isRunning
}

const isLocationNormal = (locationId: string): boolean => getLocationStatus(locationId).status === "normal"

const zoneHasWarning = (zone: LightingZone): boolean => {
	return getZoneLocationsWithIds(zone).some((row) => !isLocationNormal(row.locationId))
}

const getLocationCardBlinkClass = (locationId: string): string =>
	isLocationNormal(locationId) ? "" : "blink-slow"

const getLocationCardBackgroundClass = (locationId: string): string =>
	isLocationNormal(locationId) ? "bg-white/10" : "bg-[#FFC801]/60"

const getZoneAlertBlinkClass = (zone: LightingZone): string => (zoneHasWarning(zone) ? "blink-slow" : "")

const isLocationDisabled = (locationId: string): boolean => {
	// 切換中也要禁用，避免連點造成狀態競態（UI 與實際狀態落差）
	return (
		(props.areaDisabledMap[locationId] ?? false) ||
		props.areaToggling.has(locationId) ||
		!!pendingToggles.value[locationId]
	)
}

const handleToggle = (areaId: string, isRunning: boolean) => {
	if (!props.canToggle) return
	if (isLocationDisabled(areaId)) return
	setPendingToggle(areaId, !isRunning)
	emit("toggle", areaId, !isRunning)
}

const handleZoneClick = (zoneId: string) => {
	emit("zone-selected", zoneId)
}

watch(
	() => [props.areaToggling, props.areaStatuses] as const,
	() => {
		// 1) 後端／父層狀態已追上 pending → 清掉 pending
		// 2) 開始進入 toggling（父層 debounce 後）→ 仍維持 pending；結束後會由 (1) 清掉
		for (const [locationId, pending] of Object.entries(pendingToggles.value)) {
			const actual = props.areaStatuses[locationId]?.isRunning
			if (actual === pending.nextIsRunning) {
				clearPendingToggle(locationId)
			}
		}
		pruneExpiredPendingToggles()
	},
	{ deep: true }
)

let pruneTimer: number | null = null
onMounted(() => {
	// 避免在 render 階段 mutate reactive；改用定時清理過期 pending
	pruneTimer = window.setInterval(() => {
		pruneExpiredPendingToggles()
	}, 1000)
})

onBeforeUnmount(() => {
	if (pruneTimer == null) return
	window.clearInterval(pruneTimer)
	pruneTimer = null
})
</script>
