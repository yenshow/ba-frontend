<template>
	<div class="flex min-w-0 flex-1 flex-col gap-3">
		<label :class="fieldLabelClass">
			<span>地點名稱 *</span>
			<input
				v-model="localLocation.name"
				type="text"
				required
				class="form-input-small"
				placeholder="例如：A 棟電梯"
				@blur="handleChange"
			/>
		</label>

		<div :class="fieldLabelClass">
			<span>梯控設備 *</span>
			<div v-if="ladderDevices.length === 0" :class="emptyHintClass">
				尚無 HCNetSDK 梯控設備（請於設備管理建立 YS-K2210 等梯控型號）
			</div>
			<div v-else class="grid grid-cols-1 gap-2">
				<label
					v-for="device in ladderDevices"
					:key="device.id"
					:class="[selectCardBaseClass, selectedDeviceId === device.id && selectCardSelectedClass]"
				>
					<input
						type="radio"
						:value="device.id"
						:checked="selectedDeviceId === device.id"
						class="h-4 w-4 accent-cyan-400"
						@change="handleSelectDevice(device.id)"
					/>
					<span class="text-xs text-white/90 2xl:text-sm">{{ device.name }}</span>
				</label>
			</div>
		</div>

		<div :class="fieldLabelClass">
			<span>門禁設備（可複選）</span>
			<div v-if="accessControlDeviceOptions.length === 0" :class="emptyHintClass">
				請先在設備管理新增門禁設備
			</div>
			<div v-else class="grid grid-cols-2 gap-2">
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

		<div v-if="selectedDeviceId" :class="fieldLabelClass">
			<label class="flex min-w-0 flex-col gap-2">
				<span>樓層數量 *</span>
				<input
					:value="localLocation.floorCount ?? ''"
					type="number"
					min="1"
					:max="MAX_ELEVATOR_FLOOR_COUNT"
					required
					class="form-input-small max-w-[8rem]"
					placeholder="例如：4"
					@change="handleFloorCountChange"
				/>
			</label>

			<div v-if="floorCount != null" class="flex min-w-0 flex-col gap-2">
				<span>樓層名稱與繼電器時間</span>
				<div
					class="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2"
					role="table"
					aria-label="樓層名稱與繼電器時間列表"
				>
					<div
						v-for="index in floorCount"
						:key="index"
						class="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem] items-center gap-1.5 rounded border border-white/5 bg-white/5 px-2 py-1.5"
						role="row"
					>
						<span class="text-xs text-white/60 2xl:text-sm" role="cell">#{{ index }}</span>
						<input
							:value="floorNameAt(index - 1)"
							type="text"
							maxlength="32"
							class="form-input-small min-w-0"
							:placeholder="defaultElevatorFloorName(index)"
							:aria-label="`第 ${index} 層樓層名稱`"
							@input="handleFloorNameInput(index - 1, $event)"
							@blur="handleFloorNameBlur"
						/>
						<input
							:value="floorOpenDurationAt(index - 1)"
							type="number"
							:min="MIN_ELEVATOR_OPEN_DURATION"
							:max="MAX_ELEVATOR_OPEN_DURATION"
							class="form-input-small min-w-0 px-1 text-center"
							:aria-label="`第 ${index} 層繼電器動作時間（秒）`"
							@input="handleFloorOpenDurationInput(index - 1, $event)"
						/>
					</div>
				</div>
			</div>
		</div>

		<div :class="fieldLabelClass">
			<span>事件表顯示欄位</span>
			<div class="grid grid-cols-2 gap-2 lg:grid-cols-3">
				<label
					v-for="key in ELEVATOR_TOGGLEABLE_LOG_COLUMN_KEYS"
					:key="key"
					class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 px-2 py-1.5"
				>
					<input
						type="checkbox"
						:checked="isColumnEnabled(key)"
						class="h-4 w-4 accent-cyan-400"
						@change="handleToggleColumn(key)"
					/>
					<span class="text-xs text-white/90 2xl:text-sm">{{
						ELEVATOR_LOG_COLUMN_LABELS[key]
					}}</span>
				</label>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue"
import type { ElevatorLocation } from "~/types/elevator"
import { isHcnetSdkDevice, type Device } from "~/types/device"
import {
	ELEVATOR_LOG_COLUMN_LABELS,
	ELEVATOR_TOGGLEABLE_LOG_COLUMN_KEYS,
	normalizeElevatorLogDisplayColumns,
	toStoredElevatorLogDisplayColumns,
	type ElevatorLogColumnKey,
} from "~/utils/elevatorLogColumns"
import {
	defaultElevatorFloorName,
	DEFAULT_ELEVATOR_FLOOR_COUNT,
	fillEmptyFloorNames,
	MAX_ELEVATOR_FLOOR_COUNT,
	MAX_ELEVATOR_OPEN_DURATION,
	MIN_ELEVATOR_OPEN_DURATION,
	normalizeElevatorFloorCount,
	normalizeElevatorOpenDuration,
	padFloorNames,
	padFloorOpenDurations,
} from "~/utils/elevatorFloorConfig"

const fieldLabelClass = "flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:text-base"
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

const localLocation = reactive<ElevatorLocation>({ ...props.location })

watch(
	() => props.location,
	(loc) => {
		Object.assign(localLocation, loc)
	},
	{ deep: true }
)

const ladderDevices = computed(() => (props.devices || []).filter(isHcnetSdkDevice))

const accessControlDeviceOptions = computed(() =>
	(props.accessControlDevices || []).filter((d) => d.type_code === "access_control")
)

const selectedDeviceId = computed(() => localLocation.deviceIds?.[0] ?? null)

const selectedAccessDeviceIds = computed(() =>
	Array.isArray(localLocation.accessDeviceIds)
		? localLocation.accessDeviceIds.filter((id) => Number.isFinite(id) && id > 0)
		: []
)

const isAccessDeviceSelected = (deviceId: number) =>
	selectedAccessDeviceIds.value.includes(deviceId)

const handleToggleAccessDevice = (deviceId: number) => {
	const current = new Set(selectedAccessDeviceIds.value)
	if (current.has(deviceId)) current.delete(deviceId)
	else current.add(deviceId)
	localLocation.accessDeviceIds = [...current]
	handleChange()
}

const floorCount = computed(() => normalizeElevatorFloorCount(localLocation.floorCount))

const floorNameAt = (index: number) =>
	padFloorNames(localLocation.floorNames, floorCount.value ?? 0)[index] ?? ""

const floorOpenDurationAt = (index: number) =>
	padFloorOpenDurations(localLocation.floorOpenDurations, floorCount.value ?? 0)[index] ?? ""

const enabledColumns = computed(() =>
	normalizeElevatorLogDisplayColumns(localLocation.logDisplayColumns)
)

const isColumnEnabled = (key: ElevatorLogColumnKey) => enabledColumns.value.includes(key)

const initFloors = (count = DEFAULT_ELEVATOR_FLOOR_COUNT) => {
	localLocation.floorCount = count
	localLocation.floorNames = padFloorNames(localLocation.floorNames, count)
	localLocation.floorOpenDurations = padFloorOpenDurations(localLocation.floorOpenDurations, count)
}

const handleSelectDevice = (deviceId: number) => {
	localLocation.deviceIds = [deviceId]
	if (floorCount.value == null) initFloors()
	handleChange()
}

const resizeFloorArrays = (count: number) => {
	const existingNameLen = localLocation.floorNames?.length ?? 0
	const existingDurationLen = localLocation.floorOpenDurations?.length ?? 0
	const preserveLen = Math.max(count, existingNameLen, existingDurationLen)
	localLocation.floorNames = padFloorNames(localLocation.floorNames, preserveLen)
	localLocation.floorOpenDurations = padFloorOpenDurations(
		localLocation.floorOpenDurations,
		preserveLen,
	)
}

const handleFloorCountChange = (event: Event) => {
	const count = normalizeElevatorFloorCount((event.target as HTMLInputElement).value)
	if (count == null) {
		localLocation.floorCount = undefined
		localLocation.floorNames = []
		localLocation.floorOpenDurations = []
	} else {
		localLocation.floorCount = count
		resizeFloorArrays(count)
	}
	handleChange()
}

const handleFloorNameInput = (index: number, event: Event) => {
	const count = floorCount.value ?? DEFAULT_ELEVATOR_FLOOR_COUNT
	const preserveLen = Math.max(count, localLocation.floorNames?.length ?? 0)
	const names = padFloorNames(localLocation.floorNames, preserveLen)
	names[index] = (event.target as HTMLInputElement).value
	localLocation.floorNames = names
	handleChange()
}

const handleFloorNameBlur = () => {
	if (floorCount.value == null) return
	const count = floorCount.value
	const preserveLen = Math.max(count, localLocation.floorNames?.length ?? 0)
	const padded = padFloorNames(localLocation.floorNames, preserveLen)
	const visible = fillEmptyFloorNames(padded.slice(0, count), count)
	localLocation.floorNames = [...visible, ...padded.slice(count)]
	handleChange()
}

const handleFloorOpenDurationInput = (index: number, event: Event) => {
	const count = floorCount.value ?? DEFAULT_ELEVATOR_FLOOR_COUNT
	const preserveLen = Math.max(count, localLocation.floorOpenDurations?.length ?? 0)
	const durations = padFloorOpenDurations(localLocation.floorOpenDurations, preserveLen)
	const normalized = normalizeElevatorOpenDuration((event.target as HTMLInputElement).value)
	durations[index] = normalized ?? durations[index] ?? MIN_ELEVATOR_OPEN_DURATION
	localLocation.floorOpenDurations = durations
	handleChange()
}

const handleToggleColumn = (key: ElevatorLogColumnKey) => {
	const current = new Set(enabledColumns.value)
	if (current.has(key)) current.delete(key)
	else current.add(key)
	const normalized = normalizeElevatorLogDisplayColumns([...current])
	localLocation.logDisplayColumns = toStoredElevatorLogDisplayColumns(normalized)
	handleChange()
}

const handleChange = () => {
	emit("update", { ...localLocation })
}
</script>
