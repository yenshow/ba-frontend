<template>
	<section ref="sectionRef" class="relative flex-[1.2] 2xl:flex-[1.3]">
		<div class="flex overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-6 2xl:p-8">
			<div class="z-10 flex flex-col justify-between py-4 text-center text-white">
				<div class="space-y-4">
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
							class="whitespace-nowrap rounded-2xl border-2 border-white/30 bg-transparent p-3 text-base font-light text-white transition-all hover:bg-white/10 2xl:text-lg"
							title="樓層管理"
							@click="handleOpenZoneDialog"
						>
							樓層管理
						</button>
					</Transition>
					<div class="relative">
						<Transition name="fade-in">
							<button
								v-if="!isInitialLoading && isOperator"
								type="button"
								:class="[
									'whitespace-nowrap rounded-2xl p-3 text-base font-light text-white transition-all 2xl:text-lg',
									isEditMode ? 'border-2 border-white bg-white/10' : 'border-2 border-white/30 bg-transparent',
								]"
								@click="handleToggleEditMode"
							>
								{{ isEditMode ? "完成編輯" : "編輯定位" }}
							</button>
						</Transition>
						<Transition name="dropdown">
							<CategoryList
								v-if="isEditMode"
								:categories="
									allZoneLocations.map((location, index) => ({
										id: getLocationUiKey({
											zone: selectedZoneData || ({} as HvacZone),
											location,
											locationIndex: index,
										}),
										name: location.name,
										zoneId: selectedZone || '',
										location: location.location,
										modbus: location.modbus as any,
									}))
								"
								:editing="isEditMode"
								:selected-category-id="selectedCategory"
								@select="handleSelectCategory"
								@dragstart="handleCategoryListDragStart"
								@dragend="handleDragEnd"
							/>
						</Transition>
					</div>
				</div>
			</div>

			<div
				ref="zonePlanRef"
				class="map-location-dots relative h-[600px] w-full p-4 2xl:h-[780px]"
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
					@load="handleZonePlanImageLoad"
				/>
				<div v-else class="flex h-full w-full items-center justify-center text-white/50">
					<span>尚未設定區域平面圖</span>
				</div>

				<template v-for="location in currentZoneLocations" :key="getLocationIdForDisplay(location)">
					<div
						v-if="selectedZoneData && location.location"
						class="category-dot-wrapper"
						:class="{ 'is-dragging': draggingCategoryId === getLocationIdForDisplay(location) }"
						:style="{ left: `${location.location.x}%`, top: `${location.location.y}%` }"
						:draggable="isEditMode"
						@dragstart="
							handleDotDragStart(
								$event,
								location,
								findLocationIndexInZone(selectedZoneData!, location as any)
							)
						"
						@dragend="handleDragEnd"
					>
						<div
							class="category-dot"
							:class="[{ 'is-editing': isEditMode }, getLocationMapDotClass(getLocationIdForDisplay(location))]"
							role="button"
							tabindex="0"
							:data-status="getMapDotStatus(getLocationIdForDisplay(location))"
							:title="tooltipTitleByLocationId(getLocationIdForDisplay(location))"
							:aria-label="tooltipTitleByLocationId(getLocationIdForDisplay(location))"
							@click.stop="!isEditMode && handleSelectLocationByLocation(location)"
						></div>
						<CategoryTooltip
							:show="true"
							:category-name="location.name"
							:is-normal="getMapDotStatus(getLocationIdForDisplay(location)) === 'normal'"
							:status-type="getMapDotStatus(getLocationIdForDisplay(location))"
							:alert-flash="getLocationAlertFlashForTooltip(location)"
						/>
					</div>
				</template>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue"
import CategoryTooltip from "~/components/common/CategoryTooltip.vue"
import CategoryList from "~/components/common/CategoryList.vue"
import type { HvacLocation, HvacZone } from "~/types/hvac"
import { findLocationIndexInZone, getLocationUiKey } from "~/utils/locationUiId"
import { alertFlashModeToMapDotClass } from "~/utils/alertUtils"

interface Props {
	selectedZoneName: string
	isInitialLoading: boolean
	isOperator: boolean
	isEditMode: boolean
	selectedZone: string
	selectedZoneData: HvacZone | undefined
	selectedCategory: string
	allZoneLocations: HvacLocation[]
	currentZoneLocations: HvacLocation[]
	zonePlanImage: string | undefined
	dotStatusForLocationId: (locationId: string) => "normal" | "warning" | "alarm"
	tooltipTitleByLocationId: (locationId: string) => string
	getLocationAlertFlash?: (locationId: string) => "none" | "slow" | "fast"
}

const props = defineProps<Props>()

const emit = defineEmits<{
	"open-zone-management": []
	"toggle-edit-mode": []
	"select-category": [locationId: string]
	"save-location-position": [payload: { locationId: string; x: number; y: number }]
	"select-location-by-location": [location: HvacLocation]
	"section-height": [height: number]
}>()

const sectionRef = ref<HTMLElement | null>(null)
const zonePlanRef = ref<HTMLElement | null>(null)
const draggingCategoryId = ref("")
const isZonePlanLoaded = ref(false)

let sectionResizeObserver: ResizeObserver | null = null

const initSectionObserver = () => {
	if (typeof ResizeObserver === "undefined" || !sectionRef.value) return
	sectionResizeObserver = new ResizeObserver((entries) => {
		if (entries.length) emit("section-height", entries[0].contentRect.height)
	})
	sectionResizeObserver.observe(sectionRef.value)
}

const handleOpenZoneDialog = () => emit("open-zone-management")
const handleToggleEditMode = () => emit("toggle-edit-mode")
const handleSelectCategory = (locationId: string) => emit("select-category", locationId)

const getLocationIdForDisplay = (location: HvacLocation): string => {
	const zone = props.selectedZoneData
	if (!zone) return ""
	const originalIndex = findLocationIndexInZone(zone as any, location as any)
	return originalIndex !== -1 ? getLocationUiKey({ zone: zone as any, location: location as any, locationIndex: originalIndex }) : ""
}

const getLocationAlertFlashForTooltip = (location: HvacLocation) => {
	const id = getLocationIdForDisplay(location)
	if (!id || !props.getLocationAlertFlash) return "none" as const
	return props.getLocationAlertFlash(id)
}

const getLocationMapDotClass = (locationId: string) => {
	const mode = props.getLocationAlertFlash?.(locationId) ?? "none"
	return alertFlashModeToMapDotClass(mode)
}

const getMapDotStatus = (locationId: string): "normal" | "abnormal" | "alarm" => {
	const status = props.dotStatusForLocationId(locationId)
	if (status === "warning") return "abnormal"
	return status
}

const handleSelectLocationByLocation = (location: HvacLocation) => emit("select-location-by-location", location)

const startDrag = (event: DragEvent, locationId: string, fromCategoryList = false) => {
	draggingCategoryId.value = locationId
	event.dataTransfer!.effectAllowed = "move"
	event.dataTransfer!.setData("locationId", locationId)
	if (fromCategoryList) event.dataTransfer!.setData("fromCategoryList", "true")
}

const handleDotDragStart = (event: DragEvent, location: HvacLocation, locationIndex: number) => {
	if (!props.isEditMode || !props.selectedZoneData) return
	const locationId = getLocationUiKey({ zone: props.selectedZoneData as any, location: location as any, locationIndex })
	startDrag(event, locationId)
}

const handleCategoryListDragStart = (event: DragEvent, category: { id: string }) => {
	if (!props.isEditMode || !props.selectedZoneData) return
	startDrag(event, category.id, true)
}

const handleDragEnd = () => {
	draggingCategoryId.value = ""
}

const handleDrop = (event: DragEvent) => {
	if (!props.isEditMode || !zonePlanRef.value) return
	event.preventDefault()
	const locationId = event.dataTransfer?.getData("locationId")
	if (!locationId) return
	const rect = zonePlanRef.value.getBoundingClientRect()
	const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))
	const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))
	emit("save-location-position", { locationId, x, y })
	draggingCategoryId.value = ""
}

const handleZonePlanImageLoad = () => {
	isZonePlanLoaded.value = true
}

onMounted(() => initSectionObserver())
onBeforeUnmount(() => sectionResizeObserver?.disconnect())
</script>

