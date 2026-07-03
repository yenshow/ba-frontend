<template>
	<div class="flex min-w-0 flex-1 flex-col gap-3">
		<div class="flex min-w-0 flex-wrap items-end gap-2">
			<label
				class="flex min-w-0 flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
			>
				<span>地點名稱<span class="required-mark">*</span></span>
				<input
					v-model="localLocation.name"
					type="text"
					required
					class="form-input-small"
					placeholder="例如：AA工地、BB工地"
					@input="handleChange"
				/>
			</label>
		</div>

		<div>
			<span class="text-sm font-medium text-white/80 2xl:text-base">資料來源<span class="required-mark">*</span></span>
			<div class="mt-2 flex flex-wrap gap-4">
				<label v-if="enableYscpVehicleAccess" class="flex cursor-pointer items-center gap-2">
					<input
						v-model="dataSource"
						type="radio"
						value="yscp"
						class="h-4 w-4 accent-cyan-400"
						@change="handleDataSourceChange"
					/>
					<span class="text-sm text-white/90 2xl:text-base">車道資料</span>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<input
						v-model="dataSource"
						type="radio"
						value="isapi_camera"
						class="h-4 w-4 accent-cyan-400"
						@change="handleDataSourceChange"
					/>
					<span class="text-sm text-white/90 2xl:text-base">車牌辨識</span>
				</label>
			</div>
		</div>

		<div v-if="dataSource === 'isapi_camera'">
			<span class="text-sm font-medium text-white/80 2xl:text-base">營運模式<span class="required-mark">*</span></span>
			<div class="mt-2 flex flex-wrap gap-4">
				<label class="flex cursor-pointer items-center gap-2">
					<input
						v-model="operationMode"
						type="radio"
						value="construction_flow"
						class="h-4 w-4 accent-cyan-400"
						@change="handleOperationModeChange"
					/>
					<span class="text-sm text-white/90 2xl:text-base">車流統計</span>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<input
						v-model="operationMode"
						type="radio"
						value="parking"
						class="h-4 w-4 accent-cyan-400"
						@change="handleOperationModeChange"
					/>
					<span class="text-sm text-white/90 2xl:text-base">停車管理</span>
				</label>
			</div>
			<label
				v-if="operationMode === 'parking'"
				class="mt-3 flex max-w-xs flex-col gap-2 text-sm text-white/80 2xl:text-base"
			>
				<span>在場車輛上限<span class="required-mark">*</span></span>
				<input
					v-model.number="parkingCapacityInput"
					type="number"
					min="1"
					max="99999"
					required
					class="form-input-small"
					placeholder="例如：30"
					@blur="handleParkingCapacityChange"
				/>
			</label>
		</div>

		<template v-if="dataSource === 'yscp'">
			<div class="flex min-w-0 flex-wrap items-end gap-2">
				<label
					class="flex min-w-0 flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
				>
					<span>入口車道</span>
					<FilterDropdown
						v-model="entryLaneIdString"
						:options="entryLaneOptions"
						placeholder="無"
						@update:modelValue="handleEntryLaneChange"
					/>
				</label>
				<label
					class="flex min-w-0 flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
				>
					<span>出口車道</span>
					<FilterDropdown
						v-model="exitLaneIdString"
						:options="exitLaneOptions"
						placeholder="無"
						@update:modelValue="handleExitLaneChange"
					/>
				</label>
			</div>
		</template>

		<template v-else>
			<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
				<div>
					<span class="text-sm text-white/80 2xl:text-base">入口攝影機（可複選）<span class="required-mark">*</span></span>
					<div v-if="cameraDevices.length === 0" class="mt-2 text-xs text-white/50">
						請先在設備管理新增攝影機
					</div>
					<div v-else class="mt-2 grid grid-cols-1 gap-2">
						<label
							v-for="dev in cameraDevices"
							:key="`entry-${dev.id}`"
							class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2"
							:class="{
								'border-cyan-400/50 bg-cyan-500/20': isEntryCameraSelected(dev.id),
								'border-rose-400/40': isExitCameraSelected(dev.id),
							}"
						>
							<input
								type="checkbox"
								:checked="isEntryCameraSelected(dev.id)"
								:disabled="isExitCameraSelected(dev.id)"
								class="h-4 w-4 accent-cyan-400"
								@change="handleToggleEntryCamera(dev.id)"
							/>
							<span class="text-xs text-white/90 2xl:text-sm">{{ dev.name }}</span>
						</label>
					</div>
				</div>
				<div>
					<span class="text-sm text-white/80 2xl:text-base">出口攝影機（可複選）</span>
					<div v-if="cameraDevices.length === 0" class="mt-2 text-xs text-white/50">
						請先在設備管理新增攝影機
					</div>
					<div v-else class="mt-2 grid grid-cols-1 gap-2">
						<label
							v-for="dev in cameraDevices"
							:key="`exit-${dev.id}`"
							class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2"
							:class="{
								'border-cyan-400/50 bg-cyan-500/20': isExitCameraSelected(dev.id),
								'border-rose-400/40': isEntryCameraSelected(dev.id),
							}"
						>
							<input
								type="checkbox"
								:checked="isExitCameraSelected(dev.id)"
								:disabled="isEntryCameraSelected(dev.id)"
								class="h-4 w-4 accent-cyan-400"
								@change="handleToggleExitCamera(dev.id)"
							/>
							<span class="text-xs text-white/90 2xl:text-sm">{{ dev.name }}</span>
						</label>
					</div>
				</div>
			</div>
			<p v-if="dataSource === 'isapi_camera' && !hasEntryCamera" class="text-xs text-amber-300">
				至少需要選擇一台入口攝影機
			</p>
		</template>

		<div v-if="dataSource === 'yscp'" class="mt-3 border-t border-white/10 pt-3">
			<div class="mb-3">
				<span class="text-sm font-medium text-white/80 2xl:text-base">車輛群組（選填）</span>
				<p class="mt-1 text-xs text-white/55 2xl:text-sm">
					YSCP 群組來自外部資料表；未勾選時儀表板顯示全部車輛群組
				</p>
			</div>
			<div
				v-if="vehicleCustomGroups.length === 0"
				class="py-2 text-center text-xs text-white/50 2xl:text-sm"
			>
				載入中...
			</div>
			<div v-else class="grid grid-cols-2 gap-2">
				<label
					v-for="group in vehicleCustomGroups"
					:key="group.id"
					class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
					:class="{
						'border-cyan-400/50 bg-cyan-500/20': isVehicleGroupSelected(group.id),
					}"
				>
					<input
						type="checkbox"
						:checked="isVehicleGroupSelected(group.id)"
						class="h-4 w-4 cursor-pointer accent-cyan-400"
						@change="handleToggleVehicleGroupId(group.id)"
					/>
					<span class="text-xs text-white/90 2xl:text-sm">{{ group.list_name }}</span>
				</label>
			</div>
		</div>

		<div class="mt-3 border-t border-white/10 pt-3">
			<span class="text-sm font-medium text-white/80 2xl:text-base">過車紀錄顯示欄位</span>
			<div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
				<label
					v-for="colKey in TOGGLEABLE_VEHICLE_LOG_COLUMN_KEYS"
					:key="colKey"
					class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 px-2 py-1.5 transition-colors hover:bg-white/10"
					:class="{ 'border-cyan-400/50 bg-cyan-500/15': isLogColumnSelected(colKey) }"
				>
					<input
						type="checkbox"
						class="h-4 w-4 accent-cyan-400"
						:checked="isLogColumnSelected(colKey)"
						@change="handleToggleLogColumn(colKey)"
					/>
					<span class="text-xs text-white/90 2xl:text-sm">
						{{ VEHICLE_ACCESS_LOG_COLUMN_LABELS[colKey] }}
					</span>
				</label>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { VehicleAccessLocation } from "~/types/vehicleAccess"
import type { LaneInfo } from "~/types/vehicleAccess"
import type { Device } from "~/types/device"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import { useVehicleAccessApi } from "~/composables/systems/vehicleAccess/useVehicleAccessApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { filterLicensePlateCameraDevices } from "~/utils/cameraModelCategories"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import { storedVehicleAccessDataSource } from "~/utils/vehicleAccessDataSource"
import {
	VEHICLE_ACCESS_LOG_COLUMN_LABELS,
	TOGGLEABLE_VEHICLE_LOG_COLUMN_KEYS,
	normalizeVehicleLogDisplayColumns,
	toStoredVehicleLogDisplayColumns,
	type VehicleAccessLogColumnKey,
} from "~/utils/vehicleAccessLogColumns"
import { ref, watch, computed, onMounted } from "vue"

interface VehicleCustomGroupOption {
	id: number
	list_name: string
}

interface Props {
	location: VehicleAccessLocation
	vehicleCustomGroups?: VehicleCustomGroupOption[]
}

interface Emits {
	(e: "update", location: VehicleAccessLocation): void
}

const props = withDefaults(defineProps<Props>(), {
	vehicleCustomGroups: () => [],
})

const emit = defineEmits<Emits>()

const vehicleAccessApi = useVehicleAccessApi()
const deviceApi = useDeviceApi()
const { enableYscpVehicleAccess } = useModuleRegistry()

const localLocation = ref<VehicleAccessLocation>({
	...props.location,
	dataSource: storedVehicleAccessDataSource(props.location.dataSource),
	vehicleGroupIds: props.location.vehicleGroupIds ?? [],
})
const dataSource = ref(storedVehicleAccessDataSource(props.location.dataSource))
const operationMode = ref<"construction_flow" | "parking">(
	props.location.operationMode === "parking" ? "parking" : "construction_flow"
)
const parkingCapacityInput = ref<number | "">(
	props.location.parkingCapacity != null && props.location.parkingCapacity > 0
		? props.location.parkingCapacity
		: ""
)
const entryLaneIdString = ref("")
const exitLaneIdString = ref("")
const laneList = ref<LaneInfo[]>([])
const cameraDevices = ref<Device[]>([])

const activeLogColumns = computed(() =>
	normalizeVehicleLogDisplayColumns(localLocation.value.logDisplayColumns)
)

const isLogColumnSelected = (key: VehicleAccessLogColumnKey): boolean =>
	activeLogColumns.value.includes(key)

const handleToggleLogColumn = (key: VehicleAccessLogColumnKey) => {
	const next = new Set(activeLogColumns.value)
	if (next.has(key)) next.delete(key)
	else next.add(key)
	localLocation.value.logDisplayColumns = toStoredVehicleLogDisplayColumns(
		normalizeVehicleLogDisplayColumns([...next])
	)
	handleChange()
}

onMounted(async () => {
	if (!enableYscpVehicleAccess.value) {
		laneList.value = []
	} else {
		try {
			const list = await vehicleAccessApi.getLaneInfoList()
			laneList.value = list || []
		} catch {
			laneList.value = []
		}
	}
	try {
		const res = await deviceApi.getDevices({ type_code: "camera", limit: 200, offset: 0 })
		const devices = Array.isArray(res?.devices) ? res.devices : []
		cameraDevices.value = filterLicensePlateCameraDevices(devices)
	} catch {
		cameraDevices.value = []
	}
})

const entryLaneOptions = computed(() => {
	const options = laneList.value
		.filter((l) => l.lane_type === 1)
		.map((lane) => ({ value: String(lane.id), label: lane.lane_name ?? `車道 ${lane.id}` }))
	return [{ value: "", label: "無" }, ...options]
})

const exitLaneOptions = computed(() => {
	const options = laneList.value
		.filter((l) => l.lane_type === 2)
		.map((lane) => ({ value: String(lane.id), label: lane.lane_name ?? `車道 ${lane.id}` }))
	return [{ value: "", label: "無" }, ...options]
})

const entryCameraIds = computed(() => localLocation.value.entryCameraDeviceIds ?? [])
const exitCameraIds = computed(() => localLocation.value.exitCameraDeviceIds ?? [])
const hasEntryCamera = computed(() => entryCameraIds.value.length > 0)

const isEntryCameraSelected = (id: number) => entryCameraIds.value.includes(id)
const isExitCameraSelected = (id: number) => exitCameraIds.value.includes(id)

const isVehicleGroupSelected = (id: number) =>
	(localLocation.value.vehicleGroupIds ?? []).includes(id)

const handleToggleVehicleGroupId = (id: number) => {
	const ids = new Set(localLocation.value.vehicleGroupIds ?? [])
	if (ids.has(id)) ids.delete(id)
	else ids.add(id)
	localLocation.value.vehicleGroupIds = [...ids]
	handleChange()
}

watch(
	() => props.location,
	(newLocation) => {
		const ds = storedVehicleAccessDataSource(newLocation.dataSource)
		localLocation.value = {
			...newLocation,
			dataSource: ds,
			entryCameraDeviceIds: newLocation.entryCameraDeviceIds ?? [],
			exitCameraDeviceIds: newLocation.exitCameraDeviceIds ?? [],
			vehicleGroupIds: newLocation.vehicleGroupIds ?? [],
			logDisplayColumns: toStoredVehicleLogDisplayColumns(
				normalizeVehicleLogDisplayColumns(newLocation.logDisplayColumns)
			),
		}
		dataSource.value = ds
		operationMode.value = newLocation.operationMode === "parking" ? "parking" : "construction_flow"
		if (ds === "yscp") {
			operationMode.value = "construction_flow"
		}
		parkingCapacityInput.value =
			newLocation.parkingCapacity != null && newLocation.parkingCapacity > 0
				? newLocation.parkingCapacity
				: ""
		entryLaneIdString.value = newLocation.entryLaneId != null ? String(newLocation.entryLaneId) : ""
		exitLaneIdString.value = newLocation.exitLaneId != null ? String(newLocation.exitLaneId) : ""
	},
	{ immediate: true, deep: true }
)

const syncParkingCapacityToLocation = () => {
	if (operationMode.value !== "parking") {
		localLocation.value.parkingCapacity = undefined
		return
	}
	const n = Number(parkingCapacityInput.value)
	localLocation.value.parkingCapacity = Number.isFinite(n) && n >= 1 ? Math.trunc(n) : undefined
}

const handleChange = () => {
	syncParkingCapacityToLocation()
	emit("update", {
		...localLocation.value,
		dataSource: dataSource.value,
		operationMode: operationMode.value,
	})
}

const handleParkingCapacityChange = () => {
	syncParkingCapacityToLocation()
	handleChange()
}

const handleDataSourceChange = () => {
	localLocation.value.dataSource = dataSource.value
	if (dataSource.value === "yscp") {
		operationMode.value = "construction_flow"
		localLocation.value.operationMode = "construction_flow"
	}
	handleChange()
}

const handleOperationModeChange = () => {
	localLocation.value.operationMode = operationMode.value
	if (operationMode.value !== "parking") {
		parkingCapacityInput.value = ""
	}
	syncParkingCapacityToLocation()
	handleChange()
}

const handleEntryLaneChange = (value: string) => {
	localLocation.value.entryLaneId = value ? Number(value) : undefined
	handleChange()
}

const handleExitLaneChange = (value: string) => {
	localLocation.value.exitLaneId = value ? Number(value) : undefined
	handleChange()
}

const handleToggleEntryCamera = (id: number) => {
	const ids = new Set(entryCameraIds.value)
	if (ids.has(id)) ids.delete(id)
	else ids.add(id)
	localLocation.value.entryCameraDeviceIds = [...ids]
	handleChange()
}

const handleToggleExitCamera = (id: number) => {
	const ids = new Set(exitCameraIds.value)
	if (ids.has(id)) ids.delete(id)
	else ids.add(id)
	localLocation.value.exitCameraDeviceIds = [...ids]
	handleChange()
}
</script>
