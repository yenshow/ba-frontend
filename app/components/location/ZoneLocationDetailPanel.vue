<template>
	<section
		class="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5 lg:col-span-8"
		aria-label="區域地點詳細設定"
	>
		<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-4 2xl:p-5">
			<div
				v-if="!selection"
				class="flex min-h-[12rem] flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/[0.04] px-4 py-8 text-center"
			>
				<svg
					class="mx-auto mb-2 h-10 w-10 text-white/40"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
					/>
				</svg>
				<p class="text-sm font-medium text-white/85 2xl:text-base">
					請從左側選擇區域或{{ locationLabel }}
				</p>
				<p class="mt-1 text-xs text-white/55 2xl:text-sm">選取後即可於右側調整詳細設定</p>
			</div>

			<template v-else-if="selection.type === 'zone' && selectedZone">
				<div class="space-y-4">
					<ZoneFormFields
						:zone="zoneForFormFields"
						:require-image-url="requireImageUrl"
						@update="emit('update-zone', selection.zoneId, $event)"
					/>

					<div
						v-if="systemType === 'access_security'"
						class="rounded-lg border border-white/10 bg-white/[0.04] p-3"
					>
						<label class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<span>管理中心主機<span class="required-mark">*</span></span>
							<FilterDropdown
								:model-value="manageDeviceIdString"
								:options="manageDeviceOptions"
								:placeholder="isLoadingDevices ? '載入中...' : '請選擇此區域主機'"
								aria-label="選擇管理中心主機"
								@update:model-value="handleManageDeviceChange"
							/>
						</label>
						<p v-if="devices.length === 0 && !isLoadingDevices" class="mt-2 text-xs text-amber-300">
							{{ deviceHint }}
						</p>
					</div>

					<div
						v-if="zoneLocationCount === 0"
						class="flex min-h-[10rem] flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/[0.04] px-4 py-8 text-center"
					>
						<svg
							class="mx-auto mb-2 h-10 w-10 text-white/40"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
							/>
						</svg>
						<p class="text-sm font-medium text-white/85 2xl:text-base">
							尚無{{ locationLabel }}
						</p>
						<p class="mt-1 text-xs text-white/55 2xl:text-sm">
							請於左側展開此區域後按「＋」新增{{ locationLabel }}
						</p>
					</div>
				</div>
			</template>

			<template
				v-else-if="
					selection.type === 'location' && selectedZone != null && selectedLocationIndex >= 0
				"
			>
				<component
					:is="locationManagementComponent"
					:zone="selectedZone"
					:selected-location-index="selectedLocationIndex"
					:devices="devices"
					:is-loading-devices="isLoadingDevices"
					:device-hint="deviceHint"
					:person-groups="personGroups"
					:vehicle-custom-groups="vehicleCustomGroups"
					:doors="doors"
					:access-control-devices="accessControlDevices"
					:isapi-camera-devices="isapiCameraDevices"
					:surveillance-camera-devices="surveillanceCameraDevices"
					@update-location="
						(index: number, location: unknown) =>
							emit('update-location', selection.zoneId, index, location)
					"
				/>
			</template>

			<div
				v-else
				class="flex min-h-[12rem] flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/[0.04] px-4 py-8 text-center"
			>
				<p class="text-sm font-medium text-white/85 2xl:text-base">所選項目已不存在</p>
				<p class="mt-1 text-xs text-white/55 2xl:text-sm">請從左側重新選擇</p>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { computed, type Component } from "vue"
import type { SystemType, UnifiedZone } from "~/types/location"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import ZoneFormFields from "./ZoneFormFields.vue"
import {
	parseZoneTreeSelectionKey,
	type ZoneTreeSelection,
} from "~/composables/location/ui/useLocationGroupTree"
import { pickSortOrder } from "~/utils/sortOrder"

interface Props {
	selectedKey: string | null
	zones: Array<{
		id?: string
		name?: string
		imageUrl?: string
		description?: string
		sortOrder?: number | null
		manageDeviceId?: number
		locations?: unknown[]
	}>
	systemType: SystemType
	locationLabel: string
	requireImageUrl?: boolean
	locationManagementComponent: Component
	getZoneId: (zone: any) => string
	devices?: any[]
	isLoadingDevices?: boolean
	deviceHint?: string
	personGroups?: any[]
	vehicleCustomGroups?: any[]
	doors?: any[]
	accessControlDevices?: any[]
	isapiCameraDevices?: any[]
	surveillanceCameraDevices?: any[]
}

interface Emits {
	(e: "update-zone", zoneId: string, updates: Partial<UnifiedZone>): void
	(e: "patch-zone", zoneId: string, updates: Record<string, unknown>): void
	(e: "update-location", zoneId: string, index: number, location: unknown): void
}

const props = withDefaults(defineProps<Props>(), {
	requireImageUrl: false,
	devices: () => [],
	isLoadingDevices: false,
	deviceHint: "請先在「設備管理」中建立設備",
	personGroups: () => [],
	vehicleCustomGroups: () => [],
	doors: () => [],
	accessControlDevices: () => [],
	isapiCameraDevices: () => [],
	surveillanceCameraDevices: () => [],
})

const emit = defineEmits<Emits>()

const selection = computed((): ZoneTreeSelection | null =>
	parseZoneTreeSelectionKey(props.selectedKey)
)

const selectedZone = computed(() => {
	const sel = selection.value
	if (!sel) return null
	return props.zones.find((z) => props.getZoneId(z) === sel.zoneId) ?? null
})

const selectedLocationIndex = computed(() => {
	const sel = selection.value
	if (!sel || sel.type !== "location") return -1
	return sel.index
})

const zoneLocationCount = computed(() => (selectedZone.value?.locations || []).length)

const zoneForFormFields = computed((): UnifiedZone => {
	const zone = selectedZone.value
	if (!zone) {
		return { id: "", name: "", locations: [] }
	}
	return {
		id: props.getZoneId(zone),
		name: zone.name || "",
		imageUrl: zone.imageUrl,
		description: zone.description,
		...pickSortOrder(zone.sortOrder),
		locations: [],
	} as UnifiedZone
})

const manageDevices = computed(() =>
	(props.devices || []).filter((d) => {
		const cfg = d.config as { unitType?: string } | undefined
		return d.type_code === "video_intercom" && String(cfg?.unitType || "") === "manage"
	})
)

const manageDeviceOptions = computed(() =>
	manageDevices.value.map((d) => ({
		value: String(d.id),
		label: d.name || `設備 ${d.id}`,
	}))
)

const manageDeviceIdString = computed(() => {
	const id = selectedZone.value?.manageDeviceId
	return id != null && id > 0 ? String(id) : ""
})

const handleManageDeviceChange = (value: string) => {
	const sel = selection.value
	if (!sel || sel.type !== "zone") return
	const n = Number(value)
	const manageDeviceId = Number.isFinite(n) && n > 0 ? n : undefined
	emit("patch-zone", sel.zoneId, { manageDeviceId })
}
</script>
