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
			<div class="flex min-w-0 flex-col gap-2">
				<span>樓層 *</span>
				<div class="flex max-w-[12rem] items-center gap-2">
					<input
						:value="localLocation.floorStart ?? ''"
						type="number"
						:min="MIN_ELEVATOR_FLOOR_NUMBER"
						:max="MAX_ELEVATOR_FLOOR_NUMBER"
						required
						class="form-input-small min-w-0 flex-1 px-2 text-center"
						aria-label="起始樓層"
						@focus="handleFloorRangeFocus"
						@input="handleFloorRangeInput('start', $event)"
					/>
					<span class="shrink-0 text-white/50" aria-hidden="true">—</span>
					<input
						:value="localLocation.floorEnd ?? ''"
						type="number"
						:min="MIN_ELEVATOR_FLOOR_NUMBER"
						:max="MAX_ELEVATOR_FLOOR_NUMBER"
						required
						class="form-input-small min-w-0 flex-1 px-2 text-center"
						aria-label="結束樓層"
						@focus="handleFloorRangeFocus"
						@input="handleFloorRangeInput('end', $event)"
					/>
				</div>
				<p v-if="floorRangeError" class="form-error-text text-xs" role="alert">
					{{ floorRangeError }}
				</p>
			</div>

			<div v-if="floorCount != null" class="flex min-w-0 flex-col gap-2">
				<span>樓層名稱與繼電器時間</span>
				<div
					class="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2"
					role="table"
					aria-label="樓層名稱與繼電器時間列表"
				>
					<div
						v-for="slotIndex in floorCount"
						:key="`${floorStart}-${slotIndex}`"
						class="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem] items-center gap-1.5 rounded border border-white/5 bg-white/5 px-2 py-1.5"
						role="row"
					>
						<span class="text-xs text-white/60 2xl:text-sm" role="cell">
							#{{ floorNumberAt(slotIndex - 1) }}
						</span>
						<input
							:value="floorNameAt(slotIndex - 1)"
							type="text"
							maxlength="32"
							class="form-input-small min-w-0"
							:placeholder="defaultElevatorSlotName(slotIndex - 1)"
							:aria-label="`第 ${floorNumberAt(slotIndex - 1)} 層樓層名稱`"
							@input="handleFloorNameInput(slotIndex - 1, $event)"
							@blur="handleFloorNameBlur"
						/>
						<input
							:value="floorOpenDurationAt(slotIndex - 1)"
							type="number"
							:min="MIN_ELEVATOR_OPEN_DURATION"
							:max="MAX_ELEVATOR_OPEN_DURATION"
							class="form-input-small min-w-0 px-1 text-center"
							:aria-label="`第 ${floorNumberAt(slotIndex - 1)} 層繼電器動作時間（秒）`"
							@input="handleFloorOpenDurationInput(slotIndex - 1, $event)"
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
import { computed, reactive, ref, watch } from "vue"
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
	buildDefaultFloorConfig,
	defaultElevatorSlotName,
	DEFAULT_ELEVATOR_FLOOR_COUNT,
	DEFAULT_ELEVATOR_FLOOR_START,
	DEFAULT_ELEVATOR_OPEN_DURATION,
	deriveElevatorFloorCount,
	elevatorFloorNumberAtSlot,
	fillEmptyFloorNames,
	MAX_ELEVATOR_FLOOR_NUMBER,
	MAX_ELEVATOR_OPEN_DURATION,
	MIN_ELEVATOR_FLOOR_NUMBER,
	MIN_ELEVATOR_OPEN_DURATION,
	normalizeElevatorFloorNumber,
	normalizeElevatorOpenDuration,
	remapFloorConfigForRange,
	resolveElevatorFloorRange,
	validateElevatorFloorRange,
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
const floorRangeSnapshot = ref<ReturnType<typeof resolveElevatorFloorRange>>(null)

const syncLocalLocation = (loc: ElevatorLocation) => {
	Object.assign(localLocation, {
		...loc,
		floorNames: Array.isArray(loc.floorNames) ? [...loc.floorNames] : [],
		floorOpenDurations: Array.isArray(loc.floorOpenDurations) ? [...loc.floorOpenDurations] : [],
	})
}

syncLocalLocation(props.location)

watch(
	() => props.location,
	(loc) => {
		syncLocalLocation(loc)
	},
	{ deep: true },
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

const floorRange = computed(() => resolveElevatorFloorRange(localLocation))
const floorCount = computed(() => floorRange.value?.floorCount ?? null)
const floorStart = computed(() => floorRange.value?.floorStart ?? DEFAULT_ELEVATOR_FLOOR_START)
const floorRangeError = computed(() =>
	validateElevatorFloorRange(localLocation.floorStart, localLocation.floorEnd),
)

const floorNumberAt = (slotIndex: number) =>
	elevatorFloorNumberAtSlot(slotIndex, floorStart.value)

const floorNameAt = (index: number) => localLocation.floorNames?.[index] ?? ""

const floorOpenDurationAt = (index: number) =>
	localLocation.floorOpenDurations?.[index] ?? DEFAULT_ELEVATOR_OPEN_DURATION

const handleFloorRangeFocus = () => {
	floorRangeSnapshot.value = resolveElevatorFloorRange(localLocation)
}

const applyFloorRange = (
	start: number,
	end: number,
	prevRange: ReturnType<typeof resolveElevatorFloorRange>,
) => {
	const count = deriveElevatorFloorCount(start, end)
	if (count == null) return

	const prevStart = prevRange?.floorStart ?? start
	const prevCount = prevRange?.floorCount ?? 0

	localLocation.floorStart = start
	localLocation.floorEnd = end
	localLocation.floorCount = count
	Object.assign(
		localLocation,
		remapFloorConfigForRange(localLocation, prevStart, prevCount, start, count),
	)
	floorRangeSnapshot.value = resolveElevatorFloorRange(localLocation)
	emitLocationUpdate()
}

const handleFloorRangeInput = (field: "start" | "end", event: Event) => {
	const prevRange = floorRangeSnapshot.value ?? resolveElevatorFloorRange(localLocation)
	const raw = (event.target as HTMLInputElement).value
	const parsed = normalizeElevatorFloorNumber(raw)

	const prevStart = prevRange?.floorStart ?? DEFAULT_ELEVATOR_FLOOR_START
	const prevEnd =
		prevRange?.floorEnd ?? prevStart + (DEFAULT_ELEVATOR_FLOOR_COUNT - 1)
	const peerStart = normalizeElevatorFloorNumber(localLocation.floorStart)
	const peerEnd = normalizeElevatorFloorNumber(localLocation.floorEnd)

	if (parsed == null) {
		if (field === "start") localLocation.floorStart = undefined
		else localLocation.floorEnd = undefined
		localLocation.floorCount = undefined
		emitLocationUpdate()
		return
	}

	const nextStart = field === "start" ? parsed : (peerStart ?? prevStart)
	const nextEnd = field === "end" ? parsed : (peerEnd ?? prevEnd)

	if (field === "start") localLocation.floorStart = parsed
	else localLocation.floorEnd = parsed

	if (validateElevatorFloorRange(nextStart, nextEnd)) {
		emitLocationUpdate()
		return
	}

	applyFloorRange(nextStart, nextEnd, prevRange)
}

const enabledColumns = computed(() =>
	normalizeElevatorLogDisplayColumns(localLocation.logDisplayColumns)
)

const isColumnEnabled = (key: ElevatorLogColumnKey) => enabledColumns.value.includes(key)

const initFloors = (count = DEFAULT_ELEVATOR_FLOOR_COUNT, start = DEFAULT_ELEVATOR_FLOOR_START) => {
	localLocation.floorStart = start
	localLocation.floorEnd = start + count - 1
	localLocation.floorCount = count
	Object.assign(localLocation, buildDefaultFloorConfig(count))
}

const handleSelectDevice = (deviceId: number) => {
	localLocation.deviceIds = [deviceId]
	if (floorCount.value == null) initFloors()
	handleChange()
}

const handleFloorNameInput = (index: number, event: Event) => {
	const count = floorCount.value
	if (count == null) return
	const names = [...(localLocation.floorNames ?? [])]
	while (names.length < count) names.push("")
	names[index] = (event.target as HTMLInputElement).value
	localLocation.floorNames = names.slice(0, count)
	handleChange()
}

const handleFloorNameBlur = () => {
	const count = floorCount.value
	if (count == null) return
	localLocation.floorNames = fillEmptyFloorNames(localLocation.floorNames ?? [], count)
	handleChange()
}

const handleFloorOpenDurationInput = (index: number, event: Event) => {
	const count = floorCount.value
	if (count == null) return
	const durations = [...(localLocation.floorOpenDurations ?? [])]
	while (durations.length < count) durations.push(DEFAULT_ELEVATOR_OPEN_DURATION)
	const normalized = normalizeElevatorOpenDuration((event.target as HTMLInputElement).value)
	durations[index] = normalized ?? durations[index] ?? MIN_ELEVATOR_OPEN_DURATION
	localLocation.floorOpenDurations = durations.slice(0, count)
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

const emitLocationUpdate = () => {
	emit("update", {
		...localLocation,
		floorNames: [...(localLocation.floorNames ?? [])],
		floorOpenDurations: [...(localLocation.floorOpenDurations ?? [])],
	})
}

const handleChange = () => {
	emitLocationUpdate()
}
</script>
