<template>
	<div>
		<div class="flex justify-center gap-6 2xl:gap-8">
			<section class="relative flex-[1.2] 2xl:flex-[1.3]" ref="leftSectionRef">
				<div
					class="flex overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-6 2xl:p-8"
				>
					<!-- 左欄：與 area-point-map 相同思路——樓層／管理／檢視分類與編輯分類點分層，不互相包一層 -->
					<div
						class="relative z-10 flex h-full min-h-0 w-[min-content] min-w-[9rem] max-w-[13.5rem] flex-col justify-between py-4 text-center text-white 2xl:max-w-[15rem]"
					>
						<div class="shrink-0 space-y-4">
							<div class="py-4">
								<span
									class="inline-flex text-nowrap border-b-2 border-white/70 pb-1 tracking-widest text-3xl text-white 2xl:text-5xl"
								>
									{{ selectedZoneName }}
								</span>
							</div>

							<Transition name="fade-in">
								<button
									v-if="!isInitialLoading && isOperator"
									type="button"
									@click="handleOpenZoneDialog"
									class="whitespace-nowrap rounded-2xl border-2 border-white/30 bg-transparent p-3 text-base font-light text-white transition-all hover:bg-white/10 2xl:text-lg"
									title="樓層管理"
								>
									樓層管理
								</button>
							</Transition>

							<Transition name="fade-in">
								<button
									v-if="!isInitialLoading && isOperator"
									type="button"
									@click="handleToggleEditMode"
									:class="[
										'whitespace-nowrap rounded-2xl p-3 text-base font-light text-white transition-all 2xl:text-lg',
										isEditMode
											? 'border-2 border-white bg-white/10'
											: 'border-2 border-white/30 bg-transparent',
									]"
								>
									{{ isEditMode ? "完成編輯" : "編輯點位" }}
								</button>
							</Transition>
						</div>

						<!-- 下方：檢視分類（全域）→ 分類點（僅編輯），與 area-point-map 一樣分層、不互相包一層 -->
						<div class="flex min-h-0 shrink-0 flex-col justify-end gap-3">
							<Transition name="fade-in">
								<div v-if="!isInitialLoading" class="w-full space-y-2 px-0.5">
									<button
										v-for="tab in viewTabs"
										:key="tab.id"
										type="button"
										@click="selectedViewCategory = tab.id"
										:class="[
											'relative w-full rounded-xl border-2 p-3 text-center text-base font-light transition-all 2xl:text-lg',
											selectedViewCategory === tab.id
												? 'border-white bg-white/20 text-white'
												: 'border-white/20 bg-white/5 text-white hover:bg-white/10',
										]"
									>
										<span>{{ tab.label }}</span>
										<span
											v-if="tabAlertCount(tab.id) > 0"
											class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
											aria-hidden="true"
										>
											{{ tabAlertCount(tab.id) }}
										</span>
									</button>
								</div>
							</Transition>

							<Transition name="dropdown">
								<div
									v-if="isEditMode"
									class="max-h-[min(40vh,220px)] w-full overflow-hidden rounded-xl border-2 border-white/25 bg-white/10 px-2 py-2"
								>
									<p class="mb-2 text-center text-xs tracking-wider text-white/75">分類點</p>
									<div class="max-h-[min(36vh,180px)] overflow-y-auto pr-0.5">
										<CategoryList
											:categories="
												allZoneLocations.map((location, index) => ({
													id: getLocationId(
														selectedZoneData || ({} as DrainageZone),
														location,
														index
													),
													name: location.name,
													zoneId: selectedZone || '',
													location: location.location,
													roomIds: [],
													modbus: location.modbus,
												}))
											"
											:editing="isEditMode"
											:selected-category-id="selectedCategory"
											@select="handleSelectCategory"
											@dragstart="handleCategoryListDragStart"
											@dragend="handleDragEnd"
										/>
									</div>
								</div>
							</Transition>
						</div>
					</div>

					<div
						ref="zonePlanRef"
						class="map-location-dots map-location-dots--drainage relative h-[600px] w-full p-4 2xl:h-[780px]"
						:class="{ 'cursor-crosshair': isEditMode && !draggingCategoryId }"
						@drop="handleDrop"
						@dragover.prevent
					>
						<NuxtImg
							v-if="zonePlanImage"
							:src="zonePlanImage"
							alt="區域平面圖"
							class="image-blur-load pointer-events-none h-full w-full object-contain"
							:class="{ 'image-loaded': isZonePlanLoaded }"
							width="auto"
							height="full"
							@load="isZonePlanLoaded = true"
						/>
						<div v-else class="flex h-full w-full items-center justify-center text-white/50">
							<span>尚未設定區域平面圖</span>
						</div>

						<template
							v-for="location in filteredZoneLocations"
							:key="getLocationIdForDisplay(location)"
						>
							<div
								v-if="selectedZoneData && location.location"
								class="category-dot-wrapper"
								:class="{
									'is-dragging': draggingCategoryId === getLocationIdForDisplay(location),
								}"
								:style="{
									left: `${location.location.x}%`,
									top: `${location.location.y}%`,
								}"
								:draggable="isEditMode"
								@dragstart="
									handleDotDragStart(
										$event,
										location,
										findLocationOriginalIndex(selectedZoneData, location)
									)
								"
								@dragend="handleDragEnd"
							>
								<div
									class="category-dot"
									:class="[
										{ 'is-active': selectedCategory === getLocationIdForDisplay(location) },
										{ 'is-editing': isEditMode },
									]"
									role="button"
									tabindex="0"
									:data-status="dotStatusForLocation(location)"
									:title="tooltipTitle(location)"
									:aria-label="tooltipTitle(location)"
									@click.stop="!isEditMode && selectLocationByLocation(location)"
								></div>
								<CategoryTooltip
									:show="true"
									:category-name="location.name"
									:is-normal="isTooltipNormal(location)"
								/>
							</div>
						</template>
					</div>
				</div>
			</section>

			<aside
				class="show-scrollbar flex-[0.8] overflow-y-auto 2xl:flex-[0.7]"
				:style="{ height: leftSectionHeight ? leftSectionHeight + 'px' : 'auto' }"
			>
				<DrainageMonitorCenter
					:zones="drainageZones"
					:status-items="statusItems"
					:selected-zone="selectedZone"
					:view-filter="selectedViewCategory"
					:highlight-location-key="selectedCategory"
					@zone-selected="handleZoneSelected"
				/>
			</aside>
		</div>
	</div>

	<ZoneManagementDialog
		v-model="showZoneManagementDialog"
		:zones="drainageZones"
		system-type="drainage"
		:require-image-url="true"
		device-hint="請先在「設備管理」中建立控制器設備"
		@save="handleSaveZone"
		@delete="handleDeleteZone"
	/>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, nextTick } from "vue"
import CategoryTooltip from "~/components/common/CategoryTooltip.vue"
import CategoryList from "~/components/common/CategoryList.vue"
import DrainageMonitorCenter from "~/components/drainage/DrainageMonitorCenter.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import type { DrainageZone, DrainageLocation, DrainageStatusItem } from "~/types/drainage"
import { useDrainageApi } from "~/composables/systems/useDrainageApi"
import { useLocationApi } from "~/composables/systems/location/useLocationApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePolling } from "~/composables/monitoring/usePolling"
import { useZoneManagement } from "~/composables/systems/useZoneManagement"
import { useAuth } from "~/composables/core/useAuth"
import type { UnifiedZone } from "~/types/location"
import { unifiedToDrainageZone } from "~/utils/locationAdapter"

definePageMeta({
	layout: "default",
})

const { isOperator } = useAuth()
const drainageApi = useDrainageApi()
const locationApi = useLocationApi()
const { handleError } = useErrorHandler()

const leftSectionRef = ref<HTMLElement | null>(null)
const leftSectionHeight = ref<number | null>(null)
let leftSectionResizeObserver: ResizeObserver | null = null

const updateLeftSectionHeight = () => {
	if (leftSectionRef.value) {
		leftSectionHeight.value = leftSectionRef.value.offsetHeight
	}
}

const initLeftSectionObserver = () => {
	if (typeof ResizeObserver === "undefined" || !leftSectionRef.value) return
	leftSectionResizeObserver = new ResizeObserver((entries) => {
		if (entries.length) {
			leftSectionHeight.value = entries[0].contentRect.height
		}
	})
	leftSectionResizeObserver.observe(leftSectionRef.value)
}

const getLocationId = (
	zone: DrainageZone,
	location: DrainageLocation,
	locationIndex: number
): string => {
	return location.id || `location-${zone.id || zone.name}-${locationIndex}`
}

const drainageZones = ref<DrainageZone[]>([])
const isLoadingZones = ref(false)
const isInitialLoading = ref(true)
const selectedZone = ref("")
const selectedCategory = ref("")
const isEditMode = ref(false)
const zonePlanRef = ref<HTMLElement | null>(null)
const draggingCategoryId = ref("")
const isZonePlanLoaded = ref(false)
const showZoneManagementDialog = ref(false)
const statusItems = ref<DrainageStatusItem[]>([])

const selectedViewCategory = ref<"all" | "pumping" | "sewage" | "drainage">("all")

const viewTabs: { id: typeof selectedViewCategory.value; label: string }[] = [
	{ id: "all", label: "全部" },
	{ id: "pumping", label: "揚水" },
	{ id: "sewage", label: "污水" },
	{ id: "drainage", label: "排水" },
]

const zonesById = computed(() => {
	return new Map(drainageZones.value.map((z) => [z.id || z.name, z]))
})

const selectedZoneName = computed(() => zonesById.value.get(selectedZone.value)?.name || "")
const selectedZoneData = computed(() => zonesById.value.get(selectedZone.value))
const zonePlanImage = computed(() => selectedZoneData.value?.imageUrl)

const isValidLocation = (location: { x: number; y: number } | undefined | null): boolean => {
	return (
		location != null &&
		typeof location.x === "number" &&
		typeof location.y === "number" &&
		!Number.isNaN(location.x) &&
		!Number.isNaN(location.y)
	)
}

const matchesViewFilter = (loc: DrainageLocation): boolean => {
	if (selectedViewCategory.value === "all") return true
	const vc = loc.viewCategory || "drainage"
	return vc === selectedViewCategory.value
}

const filteredZoneLocations = computed(() => {
	if (!selectedZone.value) return []
	const zone = selectedZoneData.value
	return (zone?.locations || []).filter(
		(loc) => isValidLocation(loc.location) && matchesViewFilter(loc)
	)
})

const allZoneLocations = computed(() => {
	if (!selectedZone.value) return []
	return selectedZoneData.value?.locations || []
})

const statusBySystemId = computed(() => {
	const m = new Map<string, DrainageStatusItem>()
	for (const it of statusItems.value) {
		m.set(String(it.systemId), it)
	}
	return m
})

const tabAlertCount = (tabId: typeof selectedViewCategory.value): number => {
	return statusItems.value.filter((it) => {
		if (it.uiStatus !== "warning" && it.uiStatus !== "alarm") return false
		if (tabId === "all") return true
		return String(it.viewCategory) === tabId
	}).length
}

const pumpUiStatusForLocation = (loc: DrainageLocation): DrainageStatusItem["uiStatus"] => {
	if (!loc.systemId) return "unknown"
	return statusBySystemId.value.get(String(loc.systemId))?.uiStatus ?? "unknown"
}

const dotStatusForLocation = (loc: DrainageLocation): "normal" | "warning" | "abnormal" => {
	const s = pumpUiStatusForLocation(loc)
	if (s === "normal") return "normal"
	if (s === "warning") return "warning"
	return "abnormal"
}

const isTooltipNormal = (loc: DrainageLocation) => pumpUiStatusForLocation(loc) === "normal"

const tooltipTitle = (loc: DrainageLocation) => {
	const s = pumpUiStatusForLocation(loc)
	const label =
		s === "normal"
			? "正常"
			: s === "warning"
				? "異常"
				: s === "alarm"
					? "警報"
					: s === "offline"
						? "離線"
						: "未知"
	return `${loc.name}：${label}`
}

const handleZoneSelected = (zoneId: string) => {
	selectedZone.value = zoneId
	selectedCategory.value = ""
}

const findLocationOriginalIndex = (zone: DrainageZone, target: DrainageLocation) => {
	return zone.locations.findIndex((location) => {
		if (location.id && target.id) return location.id === target.id
		return location === target
	})
}

const getLocationIdForDisplay = (location: DrainageLocation): string => {
	const zone = selectedZoneData.value
	if (!zone) return ""
	const idx = findLocationOriginalIndex(zone, location)
	return idx !== -1 ? getLocationId(zone, location, idx) : ""
}

const selectLocationByLocation = (location: DrainageLocation) => {
	const zone = selectedZoneData.value
	if (!zone) return
	const idx = findLocationOriginalIndex(zone, location)
	if (idx !== -1) {
		selectedCategory.value = getLocationId(zone, location, idx)
	}
}

const handleSelectCategory = (locationId: string) => {
	selectedCategory.value = locationId
}

const findLocationById = (
	locationId: string
): { zone: DrainageZone; locationIndex: number } | null => {
	for (const zone of drainageZones.value) {
		const idx = zone.locations.findIndex((loc, i) => getLocationId(zone, loc, i) === locationId)
		if (idx !== -1) return { zone, locationIndex: idx }
	}
	return null
}

const handleDotDragStart = (
	event: DragEvent,
	location: DrainageLocation,
	locationIndex: number
) => {
	if (!isEditMode.value || !selectedZoneData.value) return
	const locationId = getLocationId(selectedZoneData.value, location, locationIndex)
	startDrag(event, locationId)
}

const handleCategoryListDragStart = (event: DragEvent, category: { id: string }) => {
	if (!isEditMode.value || !selectedZoneData.value) return
	startDrag(event, category.id, true)
}

const startDrag = (event: DragEvent, locationId: string, fromCategoryList = false) => {
	draggingCategoryId.value = locationId
	event.dataTransfer!.effectAllowed = "move"
	event.dataTransfer!.setData("locationId", locationId)
	if (fromCategoryList) {
		event.dataTransfer!.setData("fromCategoryList", "true")
	}
}

const handleDragEnd = () => {
	draggingCategoryId.value = ""
}

const handleDrop = async (event: DragEvent) => {
	if (!isEditMode.value || !zonePlanRef.value) return
	event.preventDefault()
	const locationId = event.dataTransfer?.getData("locationId")
	if (!locationId) return
	const found = findLocationById(locationId)
	if (!found) return
	const { zone: targetZone, locationIndex: targetLocationIndex } = found
	const rect = zonePlanRef.value.getBoundingClientRect()
	const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))
	const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))
	const updatedLocations = targetZone.locations.map((location, index) =>
		index === targetLocationIndex ? { ...location, location: { x, y } } : location
	)
	try {
		const result = await drainageApi.updateZone(targetZone.id!, {
			name: targetZone.name,
			imageUrl: targetZone.imageUrl,
			locations: updatedLocations,
		})
		const zi = drainageZones.value.findIndex((z) => z.id === targetZone.id)
		if (zi > -1) drainageZones.value[zi] = result.zone
	} catch (error) {
		handleError(error, "更新位置失敗")
	}
	draggingCategoryId.value = ""
}

const loadZonesFromAPI = async () => {
	if (isLoadingZones.value) return
	isLoadingZones.value = true
	try {
		const result = await drainageApi.getZones()
		drainageZones.value = result.zones || []
		if (!selectedZone.value && drainageZones.value.length > 0) {
			const z1 = drainageZones.value.find(
				(z) => z.name === "1F" || z.name.toLowerCase().includes("1f")
			)
			selectedZone.value = z1
				? z1.id || z1.name
				: drainageZones.value[0].id || drainageZones.value[0].name
		}
	} catch (error) {
		handleError(error, "載入區域列表失敗")
	} finally {
		isLoadingZones.value = false
	}
}

const loadStatus = async () => {
	try {
		const res = await drainageApi.getStatus()
		statusItems.value = res.items || []
	} catch (error) {
		handleError(error, "載入排水狀態失敗")
	}
}

const { start: startPolling, stop: stopPolling } = usePolling({
	callback: () => loadStatus(),
	interval: 5000,
	immediate: false,
	enabled: () => typeof document !== "undefined" && document.visibilityState === "visible",
})

const handleVisibilityChange = () => {
	if (document.visibilityState === "visible") {
		void loadStatus()
	}
}

const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone } =
	useZoneManagement<DrainageZone & { id: string }>()

const handleSaveZone = async (zone: DrainageZone) => {
	await baseHandleSaveZone(
		zone as DrainageZone & { id: string },
		drainageZones as Ref<(DrainageZone & { id: string })[]>,
		async (z: DrainageZone & { id: string }) => {
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await drainageApi.updateZone(z.id, {
						name: z.name,
						imageUrl: z.imageUrl,
						locations: z.locations,
					})
				: await drainageApi.createZone({
						name: z.name,
						imageUrl: z.imageUrl,
						locations: z.locations,
					})
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as DrainageZone & {
				id: string
			}
			return { merged: result.merged, message: result.message, zone: zoneWithId }
		},
		{ selectedZoneRef: selectedZone }
	)
}

const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(
		zoneId,
		drainageZones as Ref<(DrainageZone & { id: string })[]>,
		drainageApi.deleteZone,
		{
			selectedZoneRef: selectedZone,
			systemType: "drainage",
			getFullZoneApiCall: (id: string) => locationApi.getZone(id),
			updateZoneApiCall: async (id: string, data: { locations: UnifiedZone["locations"] }) => {
				const response = await locationApi.updateZone(id, { locations: data.locations })
				const dz = unifiedToDrainageZone(response.zone)
				return {
					merged: response.merged,
					message: response.message,
					zone: { ...dz, id: dz.id || id } as DrainageZone & { id: string },
				}
			},
			onAfterDelete: async () => {
				await loadZonesFromAPI()
			},
		}
	)
}

const handleOpenZoneDialog = async () => {
	if (drainageZones.value.length === 0) await loadZonesFromAPI()
	showZoneManagementDialog.value = true
}

const handleToggleEditMode = () => {
	if (!isEditMode.value && drainageZones.value.length === 0) {
		void loadZonesFromAPI()
	}
	isEditMode.value = !isEditMode.value
}

watch(
	() => drainageZones.value,
	() => {
		nextTick(() => updateLeftSectionHeight())
	},
	{ deep: true }
)

onMounted(async () => {
	initLeftSectionObserver()
	try {
		await loadZonesFromAPI()
		await loadStatus()
		nextTick(() => updateLeftSectionHeight())
	} finally {
		isInitialLoading.value = false
	}
	startPolling()
	document.addEventListener("visibilitychange", handleVisibilityChange)
})

onBeforeUnmount(() => {
	stopPolling()
	document.removeEventListener("visibilitychange", handleVisibilityChange)
	if (leftSectionResizeObserver && leftSectionRef.value) {
		leftSectionResizeObserver.unobserve(leftSectionRef.value)
		leftSectionResizeObserver.disconnect()
		leftSectionResizeObserver = null
	}
})
</script>
