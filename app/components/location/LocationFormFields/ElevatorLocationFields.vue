<template>
	<div class="flex min-w-0 flex-1 flex-col gap-4">
		<label :class="fieldLabelClass">
			<span>地點名稱<span class="required-mark">*</span></span>
			<input
				v-model="localLocation.name"
				type="text"
				required
				class="form-input-small"
				placeholder="例如：A 棟電梯"
				@input="handleChange"
			/>
		</label>

		<section class="rounded-lg border border-white/10 bg-white/5 p-3">
			<h4 class="mb-3 text-sm font-semibold text-white/90 2xl:text-base">1. 設備</h4>

			<div class="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
				<div :class="deviceColumnClass">
					<span class="text-sm text-white/80 2xl:text-base">梯控設備<span class="required-mark">*</span></span>
					<div v-if="ladderDevices.length === 0" :class="emptyHintClass">
						尚無 HCNetSDK 梯控設備
					</div>
					<FilterDropdown
						v-else
						class="min-w-0"
						:model-value="ladderDeviceIdStr"
						:options="ladderDeviceOptionsRequired"
						placeholder="請選擇"
						@update:model-value="handleLadderDeviceChange"
					/>
					<div v-if="localLocation.ladderDevice?.deviceId" :class="pointRangeGridClass">
						<label :class="pointFieldClass">
							<span>起點</span>
							<input
								v-model.number="localLocation.ladderDevice!.pointStart"
								type="number"
								class="form-input-small min-w-0 w-full"
								@input="handleDeviceRangeChange"
							/>
						</label>
						<label :class="pointFieldClass">
							<span>結束</span>
							<input
								v-model.number="localLocation.ladderDevice!.pointEnd"
								type="number"
								class="form-input-small min-w-0 w-full"
								@input="handleDeviceRangeChange"
							/>
						</label>
					</div>
				</div>

				<div :class="deviceColumnClass">
					<span class="text-sm text-white/80 2xl:text-base">呼梯設備<span class="required-mark">*</span></span>
					<div v-if="ladderDevices.length === 0" :class="emptyHintClass">尚無梯控設備可選</div>
					<FilterDropdown
						v-else
						class="min-w-0"
						:model-value="callDeviceIdStr"
						:options="ladderDeviceOptionsRequired"
						placeholder="請選擇"
						@update:model-value="handleCallDeviceChange"
					/>
					<div v-if="localLocation.callDevice?.deviceId" :class="pointRangeGridClass">
						<label :class="pointFieldClass">
							<span>起點</span>
							<input
								v-model.number="localLocation.callDevice!.pointStart"
								type="number"
								class="form-input-small min-w-0 w-full"
								@input="handleDeviceRangeChange"
							/>
						</label>
						<label :class="pointFieldClass">
							<span>結束</span>
							<input
								v-model.number="localLocation.callDevice!.pointEnd"
								type="number"
								class="form-input-small min-w-0 w-full"
								@input="handleDeviceRangeChange"
							/>
						</label>
					</div>
				</div>

				<div :class="deviceColumnClass">
					<span class="text-sm text-white/80 2xl:text-base">樓層偵測<span class="required-mark">*</span></span>
					<div v-if="modbusDevices.length === 0" :class="emptyHintClass">尚無 Modbus 控制器</div>
					<FilterDropdown
						v-else
						class="min-w-0"
						:model-value="floorDetectionIdStr"
						:options="modbusDeviceOptionsRequired"
						placeholder="請選擇"
						@update:model-value="handleFloorDetectionChange"
					/>
					<div v-if="localLocation.floorDetection?.deviceId" :class="pointRangeGridClass">
						<label :class="pointFieldClass">
							<span>起點</span>
							<input
								v-model.number="localLocation.floorDetection!.pointStart"
								type="number"
								class="form-input-small min-w-0 w-full"
								@input="handleDeviceRangeChange"
							/>
						</label>
						<label :class="pointFieldClass">
							<span>結束</span>
							<input
								v-model.number="localLocation.floorDetection!.pointEnd"
								type="number"
								class="form-input-small min-w-0 w-full"
								@input="handleDeviceRangeChange"
							/>
						</label>
					</div>
				</div>
			</div>

			<div :class="[fieldLabelClass, 'mt-3']">
				<span>門禁設備<span class="required-mark">*</span></span>
				<div v-if="accessControlDeviceOptions.length === 0" :class="emptyHintClass">
					請先在設備管理新增門禁設備
				</div>
				<div v-else class="grid grid-cols-2 gap-2 lg:grid-cols-3">
					<label
						v-for="device in accessControlDeviceOptions"
						:key="`elevator-ac-${device.id}`"
						:class="[
							selectCardBaseClass,
							isAccessDeviceSelected(device.id) && selectCardSelectedClass,
						]"
					>
						<input
							type="checkbox"
							:checked="isAccessDeviceSelected(device.id)"
							class="h-4 w-4 cursor-pointer accent-cyan-400"
							@change="handleToggleAccessDevice(device.id)"
						/>
						<span class="text-xs text-white/90 2xl:text-sm">{{ device.name }}</span>
					</label>
				</div>
			</div>
		</section>

		<section class="rounded-lg border border-white/10 bg-white/5 p-3">
			<h4 class="mb-3 text-sm font-semibold text-white/90 2xl:text-base">2. 樓層與點位</h4>

			<div class="mb-3 grid grid-cols-3 gap-3">
				<label class="flex min-w-0 flex-col gap-1 text-xs text-white/70">
					<span>地下層數</span>
					<input
						v-model.number="floorCounts.basement"
						type="number"
						min="0"
						max="32"
						class="form-input-small min-w-0 w-full"
						placeholder="4"
						title="地下層數，例：4 → B4F～B1F"
						@change="applyFloorsFromCounts"
					/>
				</label>
				<label class="flex min-w-0 flex-col gap-1 text-xs text-white/70">
					<span>地上層數</span>
					<input
						v-model.number="floorCounts.standard"
						type="number"
						min="0"
						max="128"
						class="form-input-small min-w-0 w-full"
						placeholder="14"
						title="標準層數，例：14 → 1F～14F"
						@change="applyFloorsFromCounts"
					/>
				</label>
				<label class="flex min-w-0 flex-col gap-1 text-xs text-white/70">
					<span>頂樓層數</span>
					<input
						v-model.number="floorCounts.roof"
						type="number"
						min="0"
						max="16"
						class="form-input-small min-w-0 w-full"
						placeholder="2"
						title="屋頂層數，例：2 → R1F～R2F"
						@change="applyFloorsFromCounts"
					/>
				</label>
			</div>

			<div
				v-if="!isDevicesReady"
				class="rounded border border-dashed border-amber-400/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/80"
			>
				請先完成設備設定（梯控、呼梯、樓層偵測、門禁），再設定樓層層數。
			</div>

			<div v-else-if="!localLocation.floors?.length" :class="emptyHintClass">
				請至少設定一層（BF、F 或 RF 層數大於 0）
			</div>

			<div v-else class="max-h-72 overflow-y-auto rounded-lg border border-white/10">
				<table class="w-full text-left text-sm text-white/90 2xl:text-base">
					<thead>
						<tr class="border-b border-white/15 text-white/70">
							<th class="py-2 ps-3 pe-2">樓層</th>
							<th class="py-2 pe-2">樓層名稱</th>
							<th class="py-2 pe-2">開啟時間</th>
							<th class="py-2 pe-2">電梯權限</th>
							<th class="py-2 pe-2">呼梯設備</th>
							<th class="py-2 pe-2">DI 偵測</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="entry in sortedFloorsForTable"
							:key="entry.key"
							class="border-b border-white/10"
						>
							<td class="py-2 ps-3 pe-2 font-mono font-medium text-white/90">
								{{ entry.floor.label }}
							</td>
							<td class="py-2 pe-2">
								<input
									v-if="entry.index >= 0"
									v-model="localLocation.floors![entry.index].name"
									type="text"
									maxlength="32"
									class="form-input-small min-w-[4.5rem] w-full max-w-[8rem]"
									placeholder="例如：地下一層"
									title="同步至梯控設備的顯示名稱"
									@input="handleFloorMetaChange(entry.index)"
								/>
							</td>
							<td class="py-2 pe-2">
								<div v-if="entry.index >= 0" class="flex items-center gap-1">
									<input
										v-model.number="localLocation.floors![entry.index].openDuration"
										type="number"
										:min="MIN_OPEN_DURATION"
										:max="MAX_OPEN_DURATION"
										class="form-input-small w-16 px-1 text-center"
										title="梯控繼電器開啟時間（秒）"
										@input="handleFloorMetaChange(entry.index)"
									/>
									<span class="text-xs text-white/50">秒</span>
								</div>
							</td>
							<td
								v-for="binding in floorBindingColumns"
								:key="`${entry.key}-${binding.field}`"
								class="py-2 pe-2"
							>
								<div v-if="entry.index >= 0" class="relative w-20 min-w-[5rem]">
									<input
										v-model.number="localLocation.floors![entry.index][binding.field]"
										type="number"
										min="0"
										class="form-input-small w-full px-1 text-center transition-all"
										:class="{
											'form-input-modbus-issue': isBindingDuplicate(entry.index, binding.field),
										}"
										:title="
											isBindingDuplicate(entry.index, binding.field)
												? DUPLICATE_BINDING_MSG
												: undefined
										"
										@input="handleBindingOverride(entry.index)"
									/>
									<div
										v-if="isBindingDuplicate(entry.index, binding.field)"
										class="pointer-events-none absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
										:title="DUPLICATE_BINDING_MSG"
									>
										<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
												clip-rule="evenodd"
											/>
										</svg>
									</div>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue"
import type { ElevatorLocation } from "~/types/elevator"
import { isHcnetSdkDevice, type Device } from "~/types/device"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import {
	autoFillFloorBindings,
	clampOpenDuration,
	computePanelColumns,
	getDuplicateElevatorFloorBindingKeys,
	inferFloorCountsFromFloors,
	MAX_OPEN_DURATION,
	MIN_OPEN_DURATION,
	PANEL_ROW_COUNT,
	rebuildFloorsFromFloorCounts,
	sortFloorsByRank,
	type ElevatorFloorBindingField,
} from "~/utils/elevatorFloorModel"

const fieldLabelClass = "flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:text-base"
const deviceColumnClass = "flex min-w-0 flex-col gap-2"
const pointRangeGridClass = "mt-1 grid min-w-0 grid-cols-2 gap-2"
const pointFieldClass = "flex min-w-0 flex-col gap-1 text-xs text-white/70"
const emptyHintClass =
	"rounded-lg border border-dashed border-white/20 px-3 py-2 text-sm text-white/50"
const selectCardBaseClass =
	"relative flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2"
const selectCardSelectedClass = "border-cyan-400/60 bg-cyan-500/10"

interface Props {
	location: ElevatorLocation
	devices?: Device[]
	accessControlDevices?: Device[]
}

const props = withDefaults(defineProps<Props>(), {
	devices: () => [],
	accessControlDevices: () => [],
})

const emit = defineEmits<{ update: [location: ElevatorLocation] }>()

const createDefaultLocation = (loc: ElevatorLocation): ElevatorLocation => ({
	...loc,
	panel: {
		columns: loc.panel?.columns ?? computePanelColumns(loc.floors?.length ?? 0),
		rows: PANEL_ROW_COUNT,
	},
	floors: Array.isArray(loc.floors) ? loc.floors.map((f) => ({ ...f })) : [],
	ladderDevice: loc.ladderDevice ? { ...loc.ladderDevice } : null,
	callDevice: loc.callDevice ? { ...loc.callDevice } : null,
	floorDetection: loc.floorDetection ? { ...loc.floorDetection } : null,
	callCommandType: "visitor",
	accessDeviceIds: Array.isArray(loc.accessDeviceIds) ? [...loc.accessDeviceIds] : [],
})

const localLocation = reactive<ElevatorLocation>(createDefaultLocation(props.location))

const floorCounts = reactive({
	basement: 2,
	standard: 10,
	roof: 0,
})

const syncCountsFromFloors = (floors = localLocation.floors) => {
	if (!floors?.length) return
	const inferred = inferFloorCountsFromFloors(floors)
	floorCounts.basement = inferred.basement
	floorCounts.standard = inferred.standard
	floorCounts.roof = inferred.roof
}

const syncLocalLocation = (loc: ElevatorLocation) => {
	Object.assign(localLocation, createDefaultLocation(loc))
	syncCountsFromFloors(localLocation.floors)
}

syncLocalLocation(props.location)

watch(
	() => props.location,
	(loc) => syncLocalLocation(loc),
	{ deep: true }
)

const ladderDevices = computed(() => (props.devices || []).filter(isHcnetSdkDevice))
const modbusDevices = computed(() =>
	(props.devices || []).filter((d) => d.type_code === "controller" && !isHcnetSdkDevice(d))
)
const ladderDeviceOptionsRequired = computed(() =>
	ladderDevices.value.map((d) => ({ value: String(d.id), label: d.name }))
)
const modbusDeviceOptionsRequired = computed(() =>
	modbusDevices.value.map((d) => ({ value: String(d.id), label: d.name }))
)

const accessControlDeviceOptions = computed(() =>
	(props.accessControlDevices || []).filter((d) => d.type_code === "access_control")
)

const ladderDeviceIdStr = computed(() =>
	localLocation.ladderDevice?.deviceId ? String(localLocation.ladderDevice.deviceId) : ""
)
const callDeviceIdStr = computed(() =>
	localLocation.callDevice?.deviceId ? String(localLocation.callDevice.deviceId) : ""
)
const floorDetectionIdStr = computed(() =>
	localLocation.floorDetection?.deviceId ? String(localLocation.floorDetection.deviceId) : ""
)
const isDevicesReady = computed(
	() =>
		Boolean(localLocation.ladderDevice?.deviceId) &&
		Boolean(localLocation.callDevice?.deviceId) &&
		Boolean(localLocation.floorDetection?.deviceId) &&
		(localLocation.accessDeviceIds?.length ?? 0) > 0
)

const floorBindingColumns: ReadonlyArray<{ field: ElevatorFloorBindingField }> = [
	{ field: "ladderGateway" },
	{ field: "callGateway" },
	{ field: "diAddress" },
]

const sortedFloorsForTable = computed(() => {
	const floors = localLocation.floors ?? []
	return sortFloorsByRank(floors).map((floor) => ({
		floor,
		index: floors.indexOf(floor),
		key: `${floor.label}-${floor.rank}`,
	}))
})

const DUPLICATE_BINDING_MSG = "此點位已被使用"

const duplicateBindingKeys = computed(() =>
	getDuplicateElevatorFloorBindingKeys(localLocation.floors ?? [])
)

const isBindingDuplicate = (floorIndex: number, field: ElevatorFloorBindingField) =>
	duplicateBindingKeys.value.has(`${field}:${floorIndex}`)

const isAccessDeviceSelected = (deviceId: number) =>
	(localLocation.accessDeviceIds ?? []).includes(deviceId)

const handleToggleAccessDevice = (deviceId: number) => {
	const current = new Set(localLocation.accessDeviceIds ?? [])
	if (current.has(deviceId)) current.delete(deviceId)
	else current.add(deviceId)
	localLocation.accessDeviceIds = [...current]
	applyFloorsFromCounts()
}

const syncDevicePointEnds = (floorCount: number) => {
	if (floorCount <= 0) return
	const syncRole = (role: { pointStart?: number; pointEnd?: number } | null | undefined) => {
		if (!role || role.pointStart == null) return
		role.pointEnd = role.pointStart + floorCount - 1
	}
	syncRole(localLocation.ladderDevice)
	syncRole(localLocation.callDevice)
	if (localLocation.floorDetection?.pointStart != null) {
		localLocation.floorDetection.pointEnd = localLocation.floorDetection.pointStart + floorCount - 1
	}
}

type DeviceRoleKey = "ladderDevice" | "callDevice" | "floorDetection"

const handleDeviceRoleChange = (
	key: DeviceRoleKey,
	value: string,
	defaultPointStart: number,
	resolveDefaultPointEnd: (
		floorCount: number,
		prev?: { pointStart?: number; pointEnd?: number }
	) => number
) => {
	if (!value) {
		localLocation[key] = null
	} else {
		const floorCount = localLocation.floors?.length ?? 0
		const prev = localLocation[key]
		localLocation[key] = {
			deviceId: Number(value),
			pointStart: prev?.pointStart ?? defaultPointStart,
			pointEnd: prev?.pointEnd ?? resolveDefaultPointEnd(floorCount, prev ?? undefined),
		}
	}
	applyFloorsFromCounts()
}

const handleLadderDeviceChange = (value: string) =>
	handleDeviceRoleChange("ladderDevice", value, 1, (count) => Math.max(count, 1))

const handleCallDeviceChange = (value: string) =>
	handleDeviceRoleChange("callDevice", value, 1, (count) => Math.max(count, 1))

const handleFloorDetectionChange = (value: string) =>
	handleDeviceRoleChange("floorDetection", value, 0, (count, prev) =>
		Math.max(count - 1, prev?.pointStart ?? 0)
	)

const applyFloorsFromCounts = () => {
	if (!isDevicesReady.value) {
		handleChange()
		return
	}

	const floors = rebuildFloorsFromFloorCounts(
		{
			basement: floorCounts.basement,
			standard: floorCounts.standard,
			roof: floorCounts.roof,
		},
		localLocation.floors ?? []
	)
	if (!floors.length) {
		localLocation.floors = []
		handleChange()
		return
	}

	localLocation.floors = floors
	localLocation.panel = {
		rows: PANEL_ROW_COUNT,
		columns: computePanelColumns(floors.length),
	}
	syncDevicePointEnds(floors.length)
	handleAutoFillBindings()
}

const handleDeviceRangeChange = () => {
	handleAutoFillBindings()
}

const handleAutoFillBindings = () => {
	if (!localLocation.floors?.length) {
		handleChange()
		return
	}
	localLocation.floors = autoFillFloorBindings(localLocation.floors, {
		ladderDevice: localLocation.ladderDevice,
		callDevice: localLocation.callDevice,
		floorDetection: localLocation.floorDetection,
	})
	handleChange()
}

const handleBindingOverride = (index: number) => {
	const floor = localLocation.floors?.[index]
	if (floor) floor.bindingOverridden = true
	handleChange()
}

const handleFloorMetaChange = (index: number) => {
	const floor = localLocation.floors?.[index]
	if (!floor) return
	floor.name = String(floor.name ?? "").trimStart()
	floor.openDuration = clampOpenDuration(floor.openDuration)
	handleChange()
}

const emitLocationUpdate = () => {
	emit("update", {
		...localLocation,
		panel: {
			rows: PANEL_ROW_COUNT,
			columns: computePanelColumns(localLocation.floors?.length ?? 0),
		},
		floors: (localLocation.floors ?? []).map((f) => ({ ...f })),
		ladderDevice: localLocation.ladderDevice ? { ...localLocation.ladderDevice } : null,
		callDevice: localLocation.callDevice ? { ...localLocation.callDevice } : null,
		floorDetection: localLocation.floorDetection ? { ...localLocation.floorDetection } : null,
		callCommandType: "visitor",
		accessDeviceIds: [...(localLocation.accessDeviceIds ?? [])],
	})
}

const handleChange = () => {
	emitLocationUpdate()
}
</script>
