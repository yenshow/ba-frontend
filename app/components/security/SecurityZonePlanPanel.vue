<template>
	<section ref="sectionRef" class="relative flex-[1.2] 2xl:flex-[1.3]">
		<div class="flex monitoring-panel overflow-hidden rounded-2xl p-6 2xl:p-8">
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
						<div
							v-show="!isInitialLoading"
							class="flex flex-col items-center gap-4"
						>
							<PermissionActionButton
								:allowed="canManageZones ?? false"
								aria-label="樓層管理"
								:class="sideActionBtnClass"
								@click="emit('open-zone-management')"
							>
								樓層管理
							</PermissionActionButton>
							<PermissionActionButton
								:allowed="canManageSchedules ?? false"
								aria-label="時間排程"
								:class="sideActionBtnClass"
								@click="emit('open-schedule-management')"
							>
								時間排程
							</PermissionActionButton>
							<PermissionActionButton
								:allowed="true"
								aria-label="開啟完整報表"
								:class="sideActionBtnClass"
								@click="emit('open-full-report')"
							>
								完整報表
							</PermissionActionButton>
							<!-- 編輯定位置底：CategoryList absolute 下展才不會蓋住其他按鈕 -->
							<div class="relative">
								<PermissionActionButton
									:allowed="canWrite"
									aria-label="編輯定位"
									:class="isEditMode ? sideActionBtnActiveClass : sideActionBtnClass"
									@click="emit('toggle-edit-mode')"
								>
									{{ isEditMode ? "完成編輯" : "編輯定位" }}
								</PermissionActionButton>
								<Transition name="dropdown">
									<CategoryList
										v-if="isEditMode"
										:categories="editModeCategoryListItems"
										:editing="isEditMode"
										:selected-category-id="selectedCategory"
										@select="handleSelectCategory"
										@dragstart="handleCategoryListDragStart"
										@dragend="handleDragEnd"
									/>
								</Transition>
							</div>
						</div>
					</Transition>
				</div>
			</div>

			<div
				ref="zonePlanRef"
				class="map-location-dots relative h-[600px] min-w-0 flex-1 p-4 2xl:h-[780px]"
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
						:class="{ 'is-dragging': draggingCategoryId === getLocationIdForDisplay(location) }"
						:style="{ left: `${location.location.x}%`, top: `${location.location.y}%` }"
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
							:class="[{ 'is-editing': isEditMode }, getLocationAlertFlashClass(location)]"
							role="button"
							tabindex="0"
							:data-status="dotStatusForLocation(location)"
							:title="tooltipTitle(location)"
							:aria-label="tooltipTitle(location)"
							@click.stop="!isEditMode && emit('select-location-by-location', location)"
						></div>
						<CategoryTooltip
							:show="true"
							:category-name="location.name"
							:is-normal="dotStatusForLocation(location) === 'normal'"
							:status-type="dotStatusForLocation(location)"
							:alert-flash="getLocationAlertFlash ? getLocationAlertFlash(location) : 'none'"
						/>
					</div>
				</template>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, watch } from "vue"
import CategoryTooltip from "~/components/common/CategoryTooltip.vue"
import CategoryList from "~/components/common/CategoryList.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import type { MapDotStatus } from "~/utils/monitoringStatus"
import type { SecurityLocation, SecurityZone } from "~/types/security"
import { findLocationIndexInZone, getLocationUiKey } from "~/utils/locationUiId"
import { percentPositionFromClientPoint } from "~/utils/mapPosition"

interface Props {
	selectedZoneName: string
	isInitialLoading: boolean
	canWrite: boolean
	canManageZones?: boolean
	canManageSchedules?: boolean
	isEditMode: boolean
	selectedZone: string
	selectedZoneData: SecurityZone | undefined
	selectedCategory: string
	filteredZoneLocations: SecurityLocation[]
	zonePlanImage: string | undefined
	dotStatusForLocation: (loc: SecurityLocation) => MapDotStatus
	getLocationAlertFlash?: (loc: SecurityLocation) => "none" | "slow" | "fast"
	tooltipTitle: (loc: SecurityLocation) => string
}

const props = defineProps<Props>()

const emit = defineEmits<{
	"open-zone-management": []
	"open-schedule-management": []
	"open-full-report": []
	"toggle-edit-mode": []
	"select-category": [locationId: string]
	"save-location-position": [payload: { locationId: string; x: number; y: number }]
	"select-location-by-location": [location: SecurityLocation]
	"section-height": [height: number]
}>()

/** 側欄操作鈕：透明描邊（與其他基礎設施 ZonePlanPanel 一致） */
const sideActionBtnClass =
	"whitespace-nowrap rounded-2xl border-2 border-white/30 bg-transparent p-3 text-base font-light text-white transition-all enabled:hover:bg-white/10 2xl:text-lg"
const sideActionBtnActiveClass =
	"whitespace-nowrap rounded-2xl border-2 border-white bg-white/10 p-3 text-base font-light text-white transition-all enabled:hover:bg-white/10 2xl:text-lg"

const sectionRef = ref<HTMLElement | null>(null)
const zonePlanRef = ref<HTMLElement | null>(null)
const draggingCategoryId = ref("")
const isZonePlanLoaded = ref(false)
let sectionResizeObserver: ResizeObserver | null = null

const updateSectionHeight = () => {
	if (sectionRef.value) emit("section-height", sectionRef.value.offsetHeight)
}

const initSectionObserver = () => {
	if (typeof ResizeObserver === "undefined" || !sectionRef.value) return
	sectionResizeObserver = new ResizeObserver((entries) => {
		if (entries.length) emit("section-height", entries[0].contentRect.height)
	})
	sectionResizeObserver.observe(sectionRef.value)
}

const findLocationOriginalIndex = (zone: SecurityZone, target: SecurityLocation) => {
	return findLocationIndexInZone(zone as any, target as any)
}

const getLocationIdForDisplay = (location: SecurityLocation): string => {
	const zone = props.selectedZoneData
	if (!zone) return ""
	const idx = findLocationOriginalIndex(zone, location)
	return idx !== -1
		? getLocationUiKey({ zone: zone as any, location: location as any, locationIndex: idx })
		: ""
}

const getLocationAlertFlashClass = (location: SecurityLocation): string => {
	const mode = props.getLocationAlertFlash?.(location) ?? "none"
	if (mode === "fast") return "blink-fast"
	if (mode === "slow") return "blink-slow"
	return ""
}

const editModeCategoryListItems = computed(() => {
	const zone = props.selectedZoneData
	if (!zone) return []
	return props.filteredZoneLocations
		.map((location) => {
			const idx = findLocationOriginalIndex(zone, location)
			if (idx === -1) return null
			return {
				id: getLocationUiKey({ zone: zone as any, location: location as any, locationIndex: idx }),
				name: location.name,
				zoneId: props.selectedZone || "",
				location: location.location,
				modbus: location.modbus,
			}
		})
		.filter((item): item is NonNullable<typeof item> => item != null)
})

const handleSelectCategory = (locationId: string) => {
	emit("select-category", locationId)
}

const handleDotDragStart = (
	event: DragEvent,
	location: SecurityLocation,
	locationIndex: number
) => {
	if (!props.isEditMode || !props.selectedZoneData) return
	const locationId = getLocationUiKey({
		zone: props.selectedZoneData as any,
		location: location as any,
		locationIndex,
	})
	startDrag(event, locationId)
}

const handleCategoryListDragStart = (event: DragEvent, category: { id: string }) => {
	if (!props.isEditMode || !props.selectedZoneData) return
	startDrag(event, category.id, true)
}

const startDrag = (event: DragEvent, locationId: string, fromCategoryList = false) => {
	draggingCategoryId.value = locationId
	event.dataTransfer!.effectAllowed = "move"
	event.dataTransfer!.setData("locationId", locationId)
	if (fromCategoryList) event.dataTransfer!.setData("fromCategoryList", "true")
}

const handleDragEnd = () => {
	draggingCategoryId.value = ""
}

const handleDrop = (event: DragEvent) => {
	if (!props.isEditMode || !zonePlanRef.value) return
	event.preventDefault()
	const locationId = event.dataTransfer?.getData("locationId")
	if (!locationId) return
	const { x, y } = percentPositionFromClientPoint(
		zonePlanRef.value,
		event.clientX,
		event.clientY
	)
	emit("save-location-position", { locationId, x, y })
	draggingCategoryId.value = ""
}

watch(
	() => props.zonePlanImage,
	() => {
		isZonePlanLoaded.value = false
	}
)

onMounted(() => {
	initSectionObserver()
	nextTick(updateSectionHeight)
})

onBeforeUnmount(() => {
	if (sectionResizeObserver && sectionRef.value) {
		sectionResizeObserver.unobserve(sectionRef.value)
		sectionResizeObserver.disconnect()
		sectionResizeObserver = null
	}
})
</script>
